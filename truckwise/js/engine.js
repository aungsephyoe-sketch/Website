// TruckWise calculation engine. Pure functions only (no DOM, no storage) so
// they can be unit-tested in Node: `node --test truckwise/tests/`.
import {
  CLASSES, MAINTENANCE, CATEGORIES, KNOWN_ISSUES, GENERIC_RISKS, CHECKUPS, DUTY_CYCLES,
  LABOR_RATE, profileFor, regionForZip,
} from './data.js';

/* ------------------------------------------------------------------ */
/* Formatting helpers                                                  */
/* ------------------------------------------------------------------ */
export const fmtMoney = (n, digits = 0) =>
  (n == null || Number.isNaN(n)) ? '—' :
    Number(n).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: digits, maximumFractionDigits: digits });
export const fmtNum = (n) => (n == null || Number.isNaN(n)) ? '—' : Math.round(Number(n)).toLocaleString('en-US');
export const fmtMiles = (n) => fmtNum(n) + ' mi';
export const fmtRange = ([lo, hi]) => lo === hi ? fmtMoney(lo) : `${fmtMoney(lo)}–${fmtMoney(hi)}`;
const round10 = (n) => Math.round(n / 10) * 10;
const DAY = 86400000;
export const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / DAY);
export const addMonths = (date, m) => { const d = new Date(date); d.setMonth(d.getMonth() + m); return d; };
export const isoDate = (d) => new Date(d).toISOString().slice(0, 10);

/* ------------------------------------------------------------------ */
/* VIN                                                                 */
/* ------------------------------------------------------------------ */
const VIN_MAP = { A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8, J: 1, K: 2, L: 3, M: 4, N: 5, P: 7, R: 9, S: 2, T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9 };
const VIN_WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];

export function normalizeVin(v) { return String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); }

export function vinCheckDigit(vin) {
  const v = normalizeVin(vin);
  if (v.length !== 17) return null;
  let sum = 0;
  for (let i = 0; i < 17; i++) {
    const c = v[i];
    const val = /\d/.test(c) ? Number(c) : VIN_MAP[c];
    if (val === undefined) return null; // I, O, Q are invalid
    sum += val * VIN_WEIGHTS[i];
  }
  const r = sum % 11;
  return r === 10 ? 'X' : String(r);
}

export function validateVin(vin) {
  const v = normalizeVin(vin);
  if (!v) return { ok: false, error: 'Enter a VIN.' };
  if (v.length !== 17) return { ok: false, error: `A VIN has 17 characters (you entered ${v.length}).` };
  if (/[IOQ]/.test(v)) return { ok: false, error: 'VINs never contain the letters I, O or Q. Check for 1 vs I and 0 vs O.' };
  const cd = vinCheckDigit(v);
  // North American VINs use position 9 as a check digit. Warn rather than block.
  return { ok: true, vin: v, checkDigitOk: cd === v[8], expected: cd };
}

// Position 10 model year. Ambiguous across 30-year cycles; position 7 helps for
// light vehicles (letter = 2010+), but for trucks we prefer the most recent
// plausible year not in the future.
const YEAR_CODES = 'ABCDEFGHJKLMNPRSTVWXY123456789';
export function modelYearFromVin(vin, now = new Date()) {
  const v = normalizeVin(vin);
  if (v.length !== 17) return null;
  const idx = YEAR_CODES.indexOf(v[9]);
  if (idx < 0) return null;
  const maxYear = now.getFullYear() + 1;
  let y = 1980 + idx;
  while (y + 30 <= maxYear) y += 30;
  return y;
}

export function classFromGvwr(lbs) {
  const n = Number(lbs);
  if (!n) return null;
  return CLASSES.find((c) => n >= c.min && n <= c.max)?.id ?? null;
}

// vPIC GVWR strings look like "Class 8: 33,001 lb and above (14,969 kg and above)"
// or "Class 2E: 6,001 - 7,000 lb (2,722 - 3,175 kg)".
export function parseGvwr(str) {
  if (!str) return { class: null, lbs: null };
  const m = String(str).match(/Class\s*(\d)/i);
  const cls = m ? Number(m[1]) : null;
  const nums = [...String(str).matchAll(/([\d,]{4,})\s*(?:-\s*([\d,]{4,}))?\s*lb/gi)];
  let lbs = null;
  if (nums.length) {
    const hi = nums[0][2] ? Number(nums[0][2].replace(/,/g, '')) : Number(nums[0][1].replace(/,/g, ''));
    lbs = hi;
  }
  return { class: cls || classFromGvwr(lbs), lbs };
}

// Map an NHTSA vPIC DecodeVinValuesExtended result row to a truck draft.
export function mapVpic(r) {
  if (!r) return {};
  const clean = (x) => (x == null ? '' : String(x).trim()).replace(/^Not Applicable$/i, '');
  const g = parseGvwr(clean(r.GVWR));
  const gTo = parseGvwr(clean(r.GVWR_to));
  const disp = clean(r.DisplacementL) ? `${Number(r.DisplacementL).toFixed(1)}L` : '';
  const fuel = clean(r.FuelTypePrimary);
  const fuelNorm = /diesel/i.test(fuel) ? 'Diesel' : /gasoline|flex/i.test(fuel) ? 'Gasoline' : /electric/i.test(fuel) ? 'Electric'
    : /natural gas|cng/i.test(fuel) ? 'CNG' : /propane|lpg/i.test(fuel) ? 'Propane' : '';
  const trans = clean(r.TransmissionStyle);
  const transNorm = /automated manual/i.test(trans) ? 'Automated manual (AMT)' : /manual/i.test(trans) ? 'Manual' : /automatic/i.test(trans) ? 'Automatic' : '';
  const drive = clean(r.DriveType);
  const driveNorm = /4x4|4wd|awd/i.test(drive) ? '4x4' : /6x4/i.test(drive) ? '6x4' : /6x2/i.test(drive) ? '6x2' : /4x2|2wd|rwd/i.test(drive) ? '4x2' : '';
  const engineModel = [clean(r.EngineModel), clean(r.EngineConfiguration) && clean(r.EngineCylinders) ? `${clean(r.EngineCylinders)}-cyl` : ''].filter(Boolean).join(' ');
  return {
    year: Number(clean(r.ModelYear)) || null,
    make: titleCase(clean(r.Make)),
    model: clean(r.Model),
    trim: [clean(r.Trim), clean(r.Series)].filter(Boolean).join(' '),
    manufacturer: clean(r.Manufacturer),
    bodyClass: clean(r.BodyClass),
    vehicleType: clean(r.VehicleType),
    gvwrText: clean(r.GVWR),
    gvwrLbs: g.lbs,
    class: g.class || gTo.class || null,
    engineMfr: clean(r.EngineManufacturer),
    engine: [clean(r.EngineManufacturer), engineModel, disp].filter(Boolean).join(' ').trim(),
    displacement: disp,
    engineHp: clean(r.EngineHP),
    fuel: fuelNorm,
    transmission: transNorm,
    transmissionSpeeds: clean(r.TransmissionSpeeds),
    drivetrain: driveNorm,
    axles: clean(r.Axles),
    axleConfig: clean(r.AxleConfiguration),
    brakeSystem: clean(r.BrakeSystemType),
    airBrakes: /air/i.test(clean(r.BrakeSystemType)) ? true : (/hydraulic/i.test(clean(r.BrakeSystemType)) ? false : undefined),
    plant: [clean(r.PlantCity), clean(r.PlantState), clean(r.PlantCountry)].filter(Boolean).join(', '),
    cab: clean(r.CabType),
    errorCode: clean(r.ErrorCode),
    errorText: clean(r.ErrorText),
  };
}
function titleCase(s) { return s ? s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : s; }

// Which important fields are still missing after a decode.
export function missingFields(t) {
  const need = [['year', 'Year'], ['make', 'Make'], ['model', 'Model'], ['class', 'Weight class'], ['fuel', 'Fuel type'], ['engine', 'Engine'], ['transmission', 'Transmission']];
  return need.filter(([k]) => !t[k]).map(([, l]) => l);
}

/* ------------------------------------------------------------------ */
/* Maintenance schedule                                                */
/* ------------------------------------------------------------------ */
export function dutyFactor(truck) {
  return DUTY_CYCLES.find((d) => d.id === truck.duty)?.factor ?? 1;
}

export function intervalFor(item, truck) {
  const ov = truck.overrides?.[item.id];
  if (ov && ov.miles) return Number(ov.miles);
  const base = item.interval?.[profileFor(truck)];
  if (!base) return null;
  // Severe duty shortens wear-related intervals. Regulatory/time items stay fixed.
  const f = dutyFactor(truck);
  return Math.max(1000, Math.round((base * f) / 500) * 500);
}
export function monthsFor(item, truck) {
  const ov = truck.overrides?.[item.id];
  if (ov && ov.months) return Number(ov.months);
  return item.months || null;
}

export function applicableItems(truck) {
  const p = profileFor(truck);
  return MAINTENANCE.filter((it) => {
    if (truck.disabledItems?.includes(it.id)) return false;
    if (!it.applies(truck)) return false;
    const hasMiles = it.interval && it.interval[p] != null;
    const hasMonths = !!it.months && Object.prototype.hasOwnProperty.call(it.interval || {}, p);
    return hasMiles || hasMonths || (it.id === 'annual');
  });
}

export function laborRate(truck) {
  if (truck.laborRateOverride) return Number(truck.laborRateOverride);
  const base = LABOR_RATE[profileFor(truck)];
  return Math.round(base * regionForZip(truck.zip).labor);
}

export function costFor(item, truck) {
  const p = profileFor(truck);
  const parts = item.parts?.[p] || [0, 0];
  const labor = item.labor?.[p] || [0, 0];
  const rate = laborRate(truck);
  const laborCost = [labor[0] * rate, labor[1] * rate];
  return {
    parts: parts.map(round10),
    labor: laborCost.map(round10),
    total: [round10(parts[0] + laborCost[0]), round10(parts[1] + laborCost[1])],
    hours: labor,
    rate,
  };
}

// All service events that touched an item, newest first.
export function eventsFor(truck, itemId) {
  return (truck.records || [])
    .filter((r) => (r.items || []).includes(itemId))
    .sort((a, b) => (b.mileage || 0) - (a.mileage || 0) || new Date(b.date) - new Date(a.date));
}

export const STATUS = {
  ok: { label: 'Up to date', color: 'green', rank: 0 },
  upcoming: { label: 'Upcoming', color: 'yellow', rank: 1 },
  soon: { label: 'Due soon', color: 'orange', rank: 2 },
  overdue: { label: 'Overdue', color: 'red', rank: 3 },
  unknown: { label: 'No record', color: 'gray', rank: 1.5 },
};

export function scheduleFor(truck, today = new Date()) {
  const current = Number(truck.mileage) || 0;
  return applicableItems(truck).map((item) => {
    const interval = intervalFor(item, truck);
    const months = monthsFor(item, truck);
    const last = eventsFor(truck, item.id)[0] || null;
    const postpone = Number(truck.postponed?.[item.id]?.miles || 0);
    const postponeDays = Number(truck.postponed?.[item.id]?.days || 0);
    let dueMiles = null; let dueDate = null; let status; let noHistory = !last;

    if (last) {
      if (interval) dueMiles = (Number(last.mileage) || current) + interval + postpone;
      if (months && last.date) dueDate = addMonths(last.date, months);
    } else if (truck.baseline?.[item.id]) {
      // Optional "last done at" mileage given during onboarding.
      noHistory = false;
      if (interval) dueMiles = Number(truck.baseline[item.id]) + interval + postpone;
    }
    if (dueDate && postponeDays) dueDate = new Date(dueDate.getTime() + postponeDays * DAY);

    const remaining = dueMiles != null ? dueMiles - current : null;
    const daysLeft = dueDate ? daysBetween(today, dueDate) : null;

    if (noHistory) {
      status = 'unknown';
    } else {
      const soonMiles = interval ? Math.max(500, interval * 0.1) : 0;
      const upMiles = interval ? interval * 0.25 : 0;
      const over = (remaining != null && remaining < 0) || (daysLeft != null && daysLeft < 0);
      const soon = (remaining != null && remaining <= soonMiles) || (daysLeft != null && daysLeft <= 14);
      const up = (remaining != null && remaining <= upMiles) || (daysLeft != null && daysLeft <= 45);
      status = over ? 'overdue' : soon ? 'soon' : up ? 'upcoming' : 'ok';
    }

    // Projected next due for planning when there is no history: next multiple of the interval.
    const projectedMiles = dueMiles ?? (interval ? Math.ceil((current + 1) / interval) * interval : null);

    return {
      item, interval, months, last, dueMiles, dueDate, remaining, daysLeft, status, noHistory,
      projectedMiles, postponed: postpone > 0 || postponeDays > 0, cost: costFor(item, truck),
    };
  }).sort((a, b) => STATUS[b.status].rank - STATUS[a.status].rank || (a.remaining ?? 1e12) - (b.remaining ?? 1e12));
}

export function overallStatus(schedule) {
  if (schedule.some((s) => s.status === 'overdue')) return { key: 'overdue', label: 'Needs attention' };
  if (schedule.some((s) => s.status === 'soon')) return { key: 'soon', label: 'Service due soon' };
  if (schedule.some((s) => s.status === 'upcoming')) return { key: 'upcoming', label: 'Service upcoming' };
  if (schedule.every((s) => s.status === 'unknown')) return { key: 'unknown', label: 'Add service history' };
  return { key: 'ok', label: 'Up to date' };
}

// Per-system health. Only rated when there is at least one record for the system.
export function healthBySystem(schedule) {
  return CATEGORIES.map((cat) => {
    const rows = schedule.filter((s) => s.item.cat === cat.id);
    if (!rows.length) return null;
    const known = rows.filter((r) => r.status !== 'unknown');
    if (!known.length) return { cat, key: 'unknown', label: 'Not enough info', rows };
    const worst = known.reduce((w, r) => (STATUS[r.status].rank > STATUS[w.status].rank ? r : w), known[0]);
    const label = { ok: 'Good', upcoming: 'Upcoming service', soon: 'Check soon', overdue: 'Needs attention' }[worst.status];
    return { cat, key: worst.status, label, rows, partial: known.length < rows.length };
  }).filter(Boolean);
}

/* ------------------------------------------------------------------ */
/* Forecasts                                                           */
/* ------------------------------------------------------------------ */
export function monthlyMiles(truck) {
  if (Number(truck.monthlyMiles) > 0) return Number(truck.monthlyMiles);
  const log = (truck.mileageLog || []).slice().sort((a, b) => new Date(a.date) - new Date(b.date));
  if (log.length >= 2) {
    const a = log[0]; const b = log[log.length - 1];
    const days = daysBetween(a.date, b.date);
    if (days >= 14) return Math.max(0, Math.round(((b.mileage - a.mileage) / days) * 30.4));
  }
  return Number(truck.class) >= 8 ? 8000 : 2000;
}

// Every scheduled service expected in the next `months` months.
export function forecast(truck, months = 12, today = new Date()) {
  const mpm = monthlyMiles(truck);
  const current = Number(truck.mileage) || 0;
  const horizon = current + mpm * months;
  const end = addMonths(today, months);
  const out = [];
  for (const s of scheduleFor(truck, today)) {
    const seen = new Set();
    const push = (miles, date, why) => {
      const key = Math.round((date - today) / (DAY * 20));
      if (seen.has(key)) return; seen.add(key);
      out.push({ item: s.item, miles, date, cost: s.cost.total, basis: why, status: seen.size === 1 ? s.status : (s.status === 'unknown' ? 'unknown' : 'ok') });
    };
    if (s.interval) {
      let m = s.status === 'overdue' ? current : (s.projectedMiles ?? current);
      for (let i = 0; i < 50 && m <= horizon; i++) {
        const date = mpm > 0 ? new Date(today.getTime() + ((m - current) / mpm) * 30.4 * DAY) : today;
        if (s.dueDate && s.dueDate < date && i === 0) push(m, new Date(Math.max(today, s.dueDate)), 'time');
        else push(m, date, 'miles');
        m += s.interval;
      }
    } else if (s.months) {
      let d = s.dueDate ? new Date(Math.max(today, s.dueDate)) : today;
      for (let i = 0; i < 24 && d <= end; i++) { push(null, d, 'time'); d = addMonths(d, s.months); }
    }
  }
  out.sort((a, b) => a.date - b.date);
  const total = out.reduce((acc, e) => [acc[0] + e.cost[0], acc[1] + e.cost[1]], [0, 0]);
  return { events: out, total, monthlyReserve: [total[0] / months, total[1] / months].map(round10), months, monthlyMiles: mpm };
}

export function knownIssues(truck) {
  const hay = [truck.make, truck.model, truck.engine, truck.engineMfr, truck.displacement, truck.fuel].filter(Boolean).join(' ');
  const specific = KNOWN_ISSUES.filter((k) => k.match.test(hay));
  const diesel = /diesel/i.test(truck.fuel || '');
  const modern = (Number(truck.year) || 2020) >= 2007;
  const generic = GENERIC_RISKS.filter((g) => (!g.diesel || diesel) && (!g.modern || modern)).map((g) => {
    if (g.costKey) {
      const item = MAINTENANCE.find((m) => m.id === g.costKey);
      return { ...g, cost: costFor(item, truck).total, window: null };
    }
    // Scale heavy-truck windows down for light trucks.
    const scale = Number(truck.class) >= 7 ? 1 : 0.4;
    return { ...g, window: g.window?.map((w) => Math.round((w * scale) / 10000) * 10000) };
  });
  return { specific, generic };
}

export function riskLevel(window, mileage) {
  if (!window) return { key: 'ongoing', label: 'Ongoing wear item' };
  const [lo, hi] = window;
  if (mileage < lo * 0.8) return { key: 'low', label: 'Lower risk at current mileage' };
  if (mileage <= hi) return { key: 'watch', label: 'Inside typical window — watch for signs' };
  return { key: 'elevated', label: 'Past typical window — inspect proactively' };
}

export function checkupsFor(truck) {
  const diesel = /diesel/i.test(truck.fuel || '');
  const m = Number(truck.mileage) || 0;
  const scale = Number(truck.class) >= 7 ? 1 : 0.5;
  return CHECKUPS.filter((c) => (!c.diesel || diesel) && m >= c.minMiles * scale);
}

/* ------------------------------------------------------------------ */
/* Finance                                                             */
/* ------------------------------------------------------------------ */
export function monthlyFuelCost(miles, mpg, price) {
  if (!(miles > 0) || !(mpg > 0) || !(price > 0)) return 0;
  return (miles / mpg) * price;
}

export function loanPayment(principal, aprPct, months) {
  const P = Number(principal); const n = Number(months); const r = Number(aprPct) / 100 / 12;
  if (!(P > 0) || !(n > 0)) return 0;
  if (!r) return P / n;
  return (P * r) / (1 - Math.pow(1 + r, -n));
}

export function totalInterest(principal, aprPct, months) {
  return loanPayment(principal, aprPct, months) * months - principal;
}

// Months to pay off a balance with a given payment (+ optional extra).
export function payoff(balance, aprPct, payment, extra = 0) {
  let b = Number(balance); const r = Number(aprPct) / 100 / 12; const pay = Number(payment) + Number(extra);
  if (!(b > 0) || !(pay > 0)) return { months: 0, interest: 0 };
  if (r && pay <= b * r) return { months: Infinity, interest: Infinity };
  let months = 0; let interest = 0;
  while (b > 0.005 && months < 1200) { const i = b * r; interest += i; b = b + i - pay; months++; }
  return { months, interest };
}

// Ownership breakdown. Inputs may be blank; estimates are flagged.
export function ownership(truck, costs = {}, today = new Date()) {
  const miles = Number(costs.monthlyMiles) || monthlyMiles(truck);
  const region = regionForZip(truck.zip);
  const diesel = /diesel/i.test(truck.fuel || 'diesel');
  const mpg = Number(costs.mpg) || defaultMpg(truck);
  const price = Number(costs.fuelPrice) || (diesel ? region.diesel : region.gas);
  // Forecast at the mileage being modeled so maintenance scales with miles.
  const fc = forecast({ ...truck, monthlyMiles: miles }, 12, today);
  const lines = [];
  const add = (key, label, value, estimated) => lines.push({ key, label, value: Math.max(0, Number(value) || 0), estimated });

  let pay = Number(costs.loanPayment);
  let payEst = false;
  if (!pay && Number(costs.loanBalance) && Number(costs.loanTermLeft)) { pay = loanPayment(costs.loanBalance, costs.apr || 0, costs.loanTermLeft); payEst = true; }
  add('payment', 'Truck payment', pay || 0, payEst);
  add('insurance', 'Insurance', costs.insurance || 0, false);
  add('fuel', diesel ? 'Diesel' : 'Fuel', monthlyFuelCost(miles, mpg, price), !costs.mpg || !costs.fuelPrice);
  add('maintenance', 'Maintenance reserve', Number(costs.maintenance) || (fc.total[0] + fc.total[1]) / 2 / 12, !costs.maintenance);
  add('tires', 'Tire reserve', Number(costs.tires) || defaultTireReserve(truck, miles), !costs.tires);
  add('permits', 'Registration & permits', Number(costs.permits) || (Number(costs.permitsAnnual) ? costs.permitsAnnual / 12 : defaultPermits(truck)), !costs.permits && !costs.permitsAnnual);
  add('tolls', 'Tolls & parking', costs.tolls || 0, false);
  add('other', 'Other expenses', costs.other || 0, false);
  if (Number(costs.def) || (diesel && (Number(truck.year) || 0) >= 2010)) {
    // DEF consumption is roughly 2–3% of diesel volume.
    const def = Number(costs.def) || (diesel ? (miles / mpg) * 0.025 * 3.5 : 0);
    if (def) add('def', 'DEF', def, !costs.def);
  }
  const total = lines.reduce((s, l) => s + l.value, 0);
  return { lines, total, miles, mpg, price, perMile: miles ? total / miles : 0, annual: total * 12, region };
}

export function defaultMpg(truck) {
  const c = Number(truck.class) || 8;
  const diesel = /diesel/i.test(truck.fuel || 'diesel');
  if (c >= 8) return 6.8; if (c >= 7) return 7.5; if (c >= 6) return 9;
  if (c >= 4) return diesel ? 11 : 9; if (c === 3) return diesel ? 14 : 11;
  return diesel ? 18 : 15;
}
export function defaultTireReserve(truck, miles) {
  const item = MAINTENANCE.find((m) => m.id === 'tirereplace');
  const p = profileFor(truck);
  const c = costFor(item, truck).total;
  const life = item.interval[p] || 50000;
  return ((c[0] + c[1]) / 2 / life) * miles;
}
export function defaultPermits(truck) {
  const c = Number(truck.class) || 8;
  return c >= 8 ? 250 : c >= 7 ? 120 : c >= 4 ? 60 : 25;
}

export function costPerHour(monthlyTotal, hoursPerMonth) {
  return hoursPerMonth > 0 ? monthlyTotal / hoursPerMonth : 0;
}

export function breakEven(monthlyTotal, monthlyMilesN, targetProfitMonthly = 0, driverPayPerMile = 0) {
  const miles = Number(monthlyMilesN) || 0;
  if (!miles) return { perMile: 0, monthlyRevenue: 0 };
  const monthlyRevenue = Number(monthlyTotal) + Number(targetProfitMonthly) + Number(driverPayPerMile) * miles;
  return { perMile: monthlyRevenue / miles, monthlyRevenue };
}

// Rough straight-line depreciation curve for planning only.
export function depreciation({ price, year, mileage, cls }, now = new Date()) {
  const P = Number(price); if (!(P > 0)) return null;
  const age = Math.max(0, now.getFullYear() - (Number(year) || now.getFullYear()));
  const heavy = Number(cls) >= 7;
  const firstYear = heavy ? 0.2 : 0.15; const later = heavy ? 0.12 : 0.1;
  let value = P;
  const curve = [{ year: 0, value: P }];
  for (let i = 1; i <= Math.max(age, 7); i++) {
    value *= 1 - (i === 1 ? firstYear : later);
    curve.push({ year: i, value });
  }
  let est = curve[Math.min(age, curve.length - 1)].value;
  // Mileage adjustment vs. a typical-use expectation.
  const typical = (heavy ? 100000 : 15000) * Math.max(age, 1);
  const m = Number(mileage) || typical;
  const adj = Math.max(-0.25, Math.min(0.15, ((typical - m) / typical) * 0.2));
  est *= 1 + adj;
  return { estimate: est, low: est * 0.85, high: est * 1.15, curve, age, mileageAdj: adj };
}

export function compareQuote(quote, range) {
  const q = Number(quote); const [lo, hi] = range;
  if (!(q > 0)) return null;
  if (q < lo * 0.85) return { key: 'low', label: 'Below typical range — confirm the scope and parts quality.' };
  if (q <= hi * 1.1) return { key: 'fair', label: 'Within the typical range for this job.' };
  if (q <= hi * 1.4) return { key: 'high', label: 'Above typical — ask what is included or get a second quote.' };
  return { key: 'veryhigh', label: 'Well above typical — a second quote is strongly recommended.' };
}

/* ------------------------------------------------------------------ */
/* Notifications                                                       */
/* ------------------------------------------------------------------ */
export function notificationsFor(truck, today = new Date(), prefs = {}) {
  const out = [];
  const name = truck.nickname || [truck.year, truck.make, truck.model].filter(Boolean).join(' ');
  const lead = Number(prefs.leadMiles) || 500;
  for (const s of scheduleFor(truck, today)) {
    if (s.status === 'overdue') out.push({ level: 'red', truckId: truck.id, itemId: s.item.id, text: `${s.item.name} is overdue`, sub: name });
    else if (s.status === 'soon' || (s.remaining != null && s.remaining <= lead && s.status !== 'unknown')) {
      const what = s.remaining != null ? `due in ${fmtNum(Math.max(0, s.remaining))} miles` : `due in ${s.daysLeft} days`;
      out.push({ level: 'orange', truckId: truck.id, itemId: s.item.id, text: `${s.item.name} ${what}`, sub: name });
    }
  }
  const dateItems = [
    ['registrationDue', 'Registration renewal'], ['insuranceDue', 'Insurance renewal'], ['annualInspectionDue', 'Annual inspection'], ['permitsDue', 'Permit renewal'],
  ];
  for (const [k, label] of dateItems) {
    if (!truck.dates?.[k]) continue;
    const d = daysBetween(today, truck.dates[k]);
    if (d < 0) out.push({ level: 'red', truckId: truck.id, text: `${label} is past due`, sub: name });
    else if (d <= 30) out.push({ level: 'orange', truckId: truck.id, text: `${label} in ${d} day${d === 1 ? '' : 's'}`, sub: name });
  }
  for (const w of truck.warranties || []) {
    if (!w.expires) continue;
    const d = daysBetween(today, w.expires);
    const milesLeft = w.maxMiles ? Number(w.maxMiles) - Number(truck.mileage) : null;
    if ((d >= 0 && d <= 60) || (milesLeft != null && milesLeft >= 0 && milesLeft <= 5000)) {
      out.push({ level: 'yellow', truckId: truck.id, text: `Warranty “${w.name}” ends soon`, sub: d >= 0 ? `${d} days left` : '' });
    }
  }
  const openRecalls = (truck.recalls?.items || []).filter((r) => !truck.recalls?.resolved?.includes(r.NHTSACampaignNumber));
  if (openRecalls.length) out.push({ level: 'red', truckId: truck.id, text: `${openRecalls.length} recall${openRecalls.length > 1 ? 's' : ''} may apply`, sub: name, route: '#/recalls' });
  return out;
}

// Trip fuel cost
export function tripCost(miles, mpg, price, stopsPerDay = 0) {
  const gallons = miles > 0 && mpg > 0 ? miles / mpg : 0;
  return { gallons, cost: gallons * (Number(price) || 0) };
}
