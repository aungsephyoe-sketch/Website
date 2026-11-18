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
