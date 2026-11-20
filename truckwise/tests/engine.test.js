import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../js/engine.js';
import { stateFromZip, regionForZip, profileFor } from '../js/data.js';

test('VIN check digit and validation', () => {
  // Known valid VIN (check digit X): 1M8GDM9AXKP042788
  assert.equal(E.vinCheckDigit('1M8GDM9AXKP042788'), 'X');
  const v = E.validateVin('1m8gdm9a-xkp042788');
  assert.equal(v.ok, true); assert.equal(v.checkDigitOk, true);
  assert.equal(E.validateVin('1M8GDM9AXKP04278').ok, false);
  assert.equal(E.validateVin('1M8GDM9AXKP0427O8').ok, false); // contains O
});

test('model year from VIN position 10', () => {
  const now = new Date('2026-11-18');
  assert.equal(E.modelYearFromVin('3AKJHHDR0MSMJ1234', now), 2021); // M
  assert.equal(E.modelYearFromVin('1FT8W3BT0LEC12345', now), 2020); // L
  assert.equal(E.modelYearFromVin('1XKYD49X0RJ123456', now), 2024); // R
});

test('GVWR parsing and class mapping', () => {
  assert.deepEqual(E.parseGvwr('Class 8: 33,001 lb and above (14,969 kg and above)'), { class: 8, lbs: 33001 });
  assert.deepEqual(E.parseGvwr('Class 2E: 6,001 - 7,000 lb (2,722 - 3,175 kg)'), { class: 2, lbs: 7000 });
  assert.equal(E.classFromGvwr(26000), 6);
  assert.equal(E.classFromGvwr(26001), 7);
  assert.equal(E.classFromGvwr(80000), 8);
});

test('fuel cost formula matches spec example', () => {
  assert.equal(E.monthlyFuelCost(5000, 7, 3.75).toFixed(2), '2678.57');
});

test('loan math', () => {
  assert.equal(E.loanPayment(120000, 0, 60), 2000);
  assert.equal(E.loanPayment(100000, 6, 60).toFixed(2), '1933.28');
  const p = E.payoff(100000, 6, 1933.28);
  assert.ok(p.months === 60 || p.months === 61);
});

test('ZIP to state/region', () => {
  assert.equal(stateFromZip('75201'), 'TX');
  assert.equal(stateFromZip('90210'), 'CA');
  assert.equal(stateFromZip('10001'), 'NY');
  assert.equal(regionForZip('60601').key, 'MW');
  assert.equal(regionForZip('abc').key, 'US');
});

const cascadia = {
  id: 't1', year: 2021, make: 'Freightliner', model: 'Cascadia', class: 8, fuel: 'Diesel', engine: 'Detroit DD15',
  configs: ['Sleeper cab tractor'], mileage: 450000, zip: '75201', duty: 'highway', monthlyMiles: 10000, records: [],
};

test('profile selection', () => {
  assert.equal(profileFor(cascadia), 'hd');
  assert.equal(profileFor({ class: 2, fuel: 'Gasoline' }), 'lg');
  assert.equal(profileFor({ class: 3, fuel: 'Diesel' }), 'ld');
  assert.equal(profileFor({ class: 6, fuel: 'Diesel' }), 'md');
});

test('schedule with no history is "unknown"; with records computes statuses', () => {
  let s = E.scheduleFor(cascadia, new Date('2026-11-18'));
  assert.ok(s.length > 10);
  assert.ok(s.every((r) => r.status === 'unknown'));
  assert.ok(s.find((r) => r.item.id === 'fifthwheel'), 'tractor gets fifth wheel');
  assert.ok(s.find((r) => r.item.id === 'dpf'), 'modern diesel gets DPF');
  assert.ok(!s.find((r) => r.item.id === 'sparkplugs'), 'diesel has no spark plugs');

  const t = { ...cascadia, records: [
    { id: 'r1', date: '2026-10-01', mileage: 415000, items: ['oil'] }, // due 455k -> 5k left of 40k -> 12.5% -> upcoming
    { id: 'r2', date: '2026-01-01', mileage: 300000, items: ['fuelfilter'] }, // due 350k -> overdue
    { id: 'r3', date: '2026-11-01', mileage: 449000, items: ['brakes'] }, // fresh -> ok
  ] };
  s = E.scheduleFor(t, new Date('2026-11-18'));
  const by = Object.fromEntries(s.map((r) => [r.item.id, r]));
  assert.equal(by.oil.dueMiles, 455000);
  assert.equal(by.oil.status, 'upcoming');
  assert.equal(by.fuelfilter.status, 'overdue');
  assert.equal(by.brakes.status, 'ok');
  assert.equal(E.overallStatus(s).key, 'overdue');
  const health = E.healthBySystem(s);
  assert.equal(health.find((h) => h.cat.id === 'electrical').key, 'unknown');
});

test('severe duty shortens intervals; overrides win', () => {
  const oil = E.applicableItems(cascadia).find((i) => i.id === 'oil');
  assert.equal(E.intervalFor(oil, cascadia), 40000);
  assert.equal(E.intervalFor(oil, { ...cascadia, duty: 'severe' }), 20000);
  assert.equal(E.intervalFor(oil, { ...cascadia, overrides: { oil: { miles: 50000 } } }), 50000);
});

test('postponing pushes the due mileage', () => {
  const t = { ...cascadia, records: [{ id: 'r', date: '2026-06-01', mileage: 400000, items: ['oil'] }], postponed: { oil: { miles: 5000 } } };
  const oil = E.scheduleFor(t, new Date('2026-11-18')).find((r) => r.item.id === 'oil');
  assert.equal(oil.dueMiles, 445000);
  assert.equal(oil.status, 'overdue');
});

test('forecast and ownership produce sane numbers', () => {
  const f = E.forecast(cascadia, 12, new Date('2026-11-18'));
  assert.ok(f.events.length > 5);
  assert.ok(f.total[0] > 0 && f.total[1] >= f.total[0]);
  const o = E.ownership(cascadia, { loanPayment: 1200, insurance: 450, mpg: 7, fuelPrice: 3.75, monthlyMiles: 5000 }, new Date('2026-11-18'));
  assert.equal(o.lines.find((l) => l.key === 'fuel').value.toFixed(2), '2678.57');
  assert.ok(o.total > 4000);
  assert.ok(o.perMile > 0.5);
});

test('known issues match by engine and risk levels', () => {
  const k = E.knownIssues(cascadia);
  assert.ok(k.specific.some((x) => /Detroit/.test(x.title)));
  assert.equal(E.riskLevel([300000, 600000], 100000).key, 'low');
  assert.equal(E.riskLevel([300000, 600000], 450000).key, 'watch');
  assert.equal(E.riskLevel([300000, 600000], 700000).key, 'elevated');
});

test('vPIC mapping', () => {
  const m = E.mapVpic({ Make: 'FREIGHTLINER', Model: 'Cascadia', ModelYear: '2021', GVWR: 'Class 8: 33,001 lb and above (14,969 kg and above)',
    FuelTypePrimary: 'Diesel', EngineManufacturer: 'Detroit Diesel', EngineModel: 'DD15', DisplacementL: '14.8', BrakeSystemType: 'Air', DriveType: '6x4', TransmissionStyle: 'Automated Manual Transmission (AMT)' });
  assert.equal(m.make, 'Freightliner'); assert.equal(m.class, 8); assert.equal(m.fuel, 'Diesel');
  assert.equal(m.airBrakes, true); assert.equal(m.drivetrain, '6x4'); assert.equal(m.transmission, 'Automated manual (AMT)');
  assert.match(m.engine, /Detroit Diesel DD15 14\.8L/);
  assert.deepEqual(E.missingFields(m), []);
});

test('notifications include overdue items and renewals', () => {
  const t = { ...cascadia, records: [{ id: 'r2', date: '2026-01-01', mileage: 300000, items: ['fuelfilter'] }], dates: { insuranceDue: '2026-12-01' } };
  const n = E.notificationsFor(t, new Date('2026-11-18'));
  assert.ok(n.some((x) => /Fuel filter/.test(x.text) && x.level === 'red'));
  assert.ok(n.some((x) => /Insurance renewal in 13 days/.test(x.text)));
});

test('quote comparison', () => {
  assert.equal(E.compareQuote(300, [250, 450]).key, 'fair');
  assert.equal(E.compareQuote(900, [250, 450]).key, 'veryhigh');
});

/* ---------------- Regression tests for fixes ---------------- */
import { localAnswer } from '../js/assistant.js';

test('fuel price: state average by ZIP, diesel vs gasoline, priority order', () => {
  const tx = { class: 8, fuel: 'Diesel', zip: '75201' };
  let fi = E.fuelInfo(tx, {});
  assert.equal(fi.kind, 'diesel'); assert.equal(fi.price, 3.45); assert.match(fi.source, /TX state average/);
  const ca = E.fuelInfo({ class: 8, fuel: 'Diesel', zip: '90210' }, {});
  assert.equal(ca.price, 5.2);
  const gas = E.fuelInfo({ class: 2, fuel: 'Gasoline', zip: '75201' }, {});
  assert.equal(gas.kind, 'gasoline'); assert.equal(gas.price, 2.75);
  // Blank fuel on a Class 8 is diesel, never gasoline
  assert.equal(E.fuelInfo({ class: 8, zip: '75201' }, {}).kind, 'diesel');
  assert.equal(E.fuelInfo({ class: 2, zip: '75201' }, {}).kind, 'gasoline');
  // Live EIA price beats the state average; user's price beats both
  E.liveFuel.GC = { diesel: 3.611, gas: 2.9, period: '2026-11-16' };
  fi = E.fuelInfo(tx, {}); assert.equal(fi.price, 3.611); assert.ok(fi.live);
  fi = E.fuelInfo(tx, { fuelPrice: 3.99 }); assert.equal(fi.price, 3.99); assert.equal(fi.estimated, false);
  delete E.liveFuel.GC;
  // Ownership uses the same price and labels the line Diesel
  const o = E.ownership({ ...tx, mileage: 1, monthlyMiles: 7000, records: [] }, { mpg: 7 });
  const line = o.lines.find((l) => l.key === 'fuel');
  assert.equal(line.label, 'Diesel'); assert.equal(Math.round(line.value), Math.round(7000 / 7 * 3.45));
});

test('blank fuel type gives consistent diesel maintenance items on a Class 8', () => {
  const ids = E.applicableItems({ class: 8, configs: [] }).map((i) => i.id);
  assert.ok(ids.includes('fuelfilter') && ids.includes('dpf') && !ids.includes('sparkplugs'));
});

test('"Inspected OK" does not count as replacing a service item', () => {
  const t = { ...cascadia, mileage: 470000, records: [
    { id: 'a', date: '2026-01-01', mileage: 415000, items: ['oil'], kind: 'service' },
    { id: 'b', date: '2026-11-01', mileage: 450000, items: ['oil'], kind: 'inspect' },
  ] };
  const oil = E.scheduleFor(t, new Date('2026-11-18')).find((r) => r.item.id === 'oil');
  assert.equal(oil.last.id, 'a');
  assert.equal(oil.dueMiles, 460000); // 450,000 + 25% of 40,000, not 490,000
  assert.equal(oil.status, 'overdue');
});

test('record with no date and no mileage interval stays "No record", not "Up to date"', () => {
  const t = { ...cascadia, records: [{ id: 'x', date: '', mileage: 400000, items: ['annual'] }] };
  const annual = E.scheduleFor(t, new Date('2026-11-18')).find((r) => r.item.id === 'annual');
  assert.equal(annual.status, 'unknown');
});

test('forecast keeps every occurrence of short-interval items', () => {
  const t = { class: 2, fuel: 'Gasoline', duty: 'severe', mileage: 10000, monthlyMiles: 10000, zip: '75201', configs: [],
    records: [{ id: 'r', date: '2026-11-01', mileage: 10000, items: ['tirerotate'] }] };
  const n = E.forecast(t, 3, new Date('2026-11-18')).events.filter((e) => e.item.id === 'tirerotate').length;
  assert.ok(n >= 7, `expected ~8 rotations in 30,000 mi at a 3,500 mi interval, got ${n}`);
});

test('assistant: "fuel filter cost" is a service-cost answer, fuel-use uses diesel price', () => {
  const a = localAnswer(cascadia, 'How much does a fuel filter cost?');
  assert.match(a, /Fuel filter replacement/);
  const b = localAnswer(cascadia, 'How much diesel will I use driving 2,000 miles?');
  assert.match(b, /of diesel/); assert.match(b, /TX state average/);
});
