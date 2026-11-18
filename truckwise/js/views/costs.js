import { store } from '../store.js';
import { MILEAGE_PRESETS, regionForZip, FUEL_REFERENCE_DATE, MAINTENANCE } from '../data.js';
import {
  ownership, loanPayment, totalInterest, payoff, monthlyFuelCost, costPerHour, breakEven, depreciation, forecast,
  compareQuote, costFor, applicableItems, defaultMpg, monthlyMiles, fmtMoney, fmtNum, fmtRange,
} from '../engine.js';
import { lives, actions, rerender, esc, icon, tabs, field, input, select, formData, num, toast } from '../ui.js';
import { truckName } from '../assistant.js';

export function costsView({ truck, args, mount }) {
  const tab = args[0] || '';
  const head = `<div class="page-head"><div><h1>Costs</h1><div class="muted">${esc(truckName(truck))}</div></div></div>
    ${tabs('costs', [['', 'Monthly cost'], ['tools', 'Calculators'], ['trip', 'Trip & route fuel'], ['value', 'Value & quotes']], tab)}`;
  mount((root) => root.querySelectorAll('form[data-live]').forEach((f) => lives[f.dataset.live]?.(f)));
  if (tab === 'tools') return head + toolsTab(truck);
  if (tab === 'trip') return head + tripTab(truck);
  if (tab === 'value') return head + valueTab(truck);
  return head + monthlyTab(truck);
}

/* ------------------------------------------------------------------ */
/* Monthly ownership                                                   */
/* ------------------------------------------------------------------ */
const money = (name, label, v, hint = '') => field(label, `<span class="input-prefix-wrap"><span class="input-prefix">$</span>${input(name, v ?? '', 'type="number" inputmode="decimal" min="0" step="any" placeholder="Skip if unknown"')}</span>`, hint);

function monthlyTab(truck) {
  const c = truck.costs || {};
  const reg = regionForZip(truck.zip);
  const diesel = /diesel/i.test(truck.fuel || 'diesel');
  const mm = c.monthlyMiles || monthlyMiles(truck);
  return `<div class="cost-layout">
    <form class="card card-pad stack" data-live="ownership" data-truck="${truck.id}">
      <h2>Your numbers</h2><p class="muted small">Fill in what you know. Anything blank uses a clearly labeled estimate. Saved automatically.</p>
      <h3 class="h4">Driving</h3>
      <div class="chips chips-radio" role="radiogroup" aria-label="Monthly miles">${MILEAGE_PRESETS.map((m) => `<label class="chip"><input type="radio" name="mpreset" value="${m}" ${Number(mm) === m ? 'checked' : ''}><span>${fmtNum(m)}${m === 10000 ? '+' : ''}</span></label>`).join('')}</div>
      <div class="form-grid">
        ${field('Monthly miles', input('monthlyMiles', c.monthlyMiles ?? '', `type="number" min="0" placeholder="${fmtNum(monthlyMiles(truck))}"`))}
        ${field('Average MPG', input('mpg', c.mpg ?? '', `type="number" min="0" step="0.1" placeholder="${defaultMpg(truck)} (typical)"`))}
        ${field(`${diesel ? 'Diesel' : 'Fuel'} price ($/gal)`, input('fuelPrice', c.fuelPrice ?? '', `type="number" min="0" step="0.01" placeholder="${(diesel ? reg.diesel : reg.gas).toFixed(2)} (reference)"`),
    `${esc(reg.label)} reference value, ${FUEL_REFERENCE_DATE} — enter today’s pump price. <a href="https://www.eia.gov/petroleum/gasdiesel/" target="_blank" rel="noopener">EIA weekly prices</a>`)}
        ${field('Engine hours / month', input('hours', c.hours ?? '', 'type="number" min="0" placeholder="Optional"'))}
      </div>
      <h3 class="h4">Truck & financing</h3>
      <div class="form-grid">
        ${money('purchasePrice', 'Purchase price', c.purchasePrice)}
        ${money('downPayment', 'Down payment', c.downPayment)}
        ${money('loanBalance', 'Current loan balance', c.loanBalance)}
        ${money('loanPayment', 'Monthly loan payment', c.loanPayment, 'Leave blank to calculate from balance, rate and term.')}
        ${field('Interest rate (APR %)', input('apr', c.apr ?? '', 'type="number" min="0" step="0.01" placeholder="e.g. 8.9"'))}
        ${field('Months left on loan', input('loanTermLeft', c.loanTermLeft ?? '', 'type="number" min="0" placeholder="e.g. 48"'))}
      </div>
      <h3 class="h4">Operating</h3>
      <div class="form-grid">
        ${money('insurance', 'Insurance (monthly)', c.insurance)}
        ${money('maintenance', 'Maintenance budget (monthly)', c.maintenance, 'Blank = forecast from your schedule')}
        ${money('tires', 'Tire budget (monthly)', c.tires, 'Blank = estimate from tire life')}
        ${money('permitsAnnual', 'Registration & permits (yearly)', c.permitsAnnual, 'IRP, IFTA, UCR, 2290, state fees')}
        ${money('tolls', 'Tolls & parking (monthly)', c.tolls)}
        ${money('def', 'DEF (monthly)', c.def, diesel ? 'Blank = ~2.5% of diesel use' : '')}
        ${money('other', 'Other expenses (monthly)', c.other, 'Phone, ELD, load boards, accounting…')}
      </div>
    </form>
    <div class="stack sticky-col">
      <section class="card card-pad" data-out="ownership"></section>
      <section class="card card-pad" data-out="scenarios"></section>
    </div></div>`;
}

lives['ownership'] = (form, e) => {
  const t = store.truck(form.dataset.truck); if (!t) return;
  const d = formData(form);
  if (e?.target?.name === 'mpreset') { form.elements.monthlyMiles.value = d.mpreset; d.monthlyMiles = d.mpreset; }
  const keys = ['monthlyMiles', 'mpg', 'fuelPrice', 'hours', 'purchasePrice', 'downPayment', 'loanBalance', 'loanPayment', 'apr', 'loanTermLeft', 'insurance', 'maintenance', 'tires', 'permitsAnnual', 'tolls', 'def', 'other'];
  const costs = Object.fromEntries(keys.map((k) => [k, num(d[k])]).filter(([, v]) => v != null && !Number.isNaN(v)));
  if (e) store.updateTruck(t.id, { costs });
  const o = ownership(t, costs);
  const max = Math.max(1, ...o.lines.map((l) => l.value));
  const out = document.querySelector('[data-out="ownership"]');
  if (out) {
    out.innerHTML = `<div class="card-head"><h2>Monthly cost of ownership</h2></div>
      <div class="big-total">${fmtMoney(o.total)}<span class="muted"> / month</span></div>
      <div class="kpis"><div><span class="label">Cost per mile</span><strong>${fmtMoney(o.perMile, 2)}</strong></div>
        <div><span class="label">Annual</span><strong>${fmtMoney(o.annual)}</strong></div>
        ${costs.hours ? `<div><span class="label">Per engine hour</span><strong>${fmtMoney(costPerHour(o.total, costs.hours), 2)}</strong></div>` : ''}
        <div><span class="label">Fuel / month</span><strong>${fmtNum(o.miles / o.mpg)} gal</strong></div></div>
      <table class="table table-compact breakdown"><tbody>${o.lines.filter((l) => l.value > 0 || ['payment', 'insurance'].includes(l.key)).map((l) => `<tr>
        <td>${esc(l.label)}${l.estimated ? ' <span class="est">est.</span>' : ''}${!l.value && ['payment', 'insurance'].includes(l.key) ? ' <span class="muted small">(not entered)</span>' : ''}</td>
        <td class="bar-cell"><span class="hbar" style="width:${(l.value / max) * 100}%"></span></td>
        <td class="num">${fmtMoney(l.value)}</td></tr>`).join('')}
        <tr class="total-row"><td>Total</td><td></td><td class="num">${fmtMoney(o.total)}</td></tr></tbody></table>
      <p class="muted small">Fuel: ${fmtNum(o.miles)} mi ÷ ${o.mpg} MPG × ${fmtMoney(o.price, 2)}/gal. <span class="est">est.</span> = TruckWise estimate; enter your own value to replace it.</p>`;
  }
  const sc = document.querySelector('[data-out="scenarios"]');
  if (sc) {
    const scen = MILEAGE_PRESETS.map((m) => ({ m, o: ownership(t, { ...costs, monthlyMiles: m }) }));
    sc.innerHTML = `<h2>Compare mileage scenarios</h2><p class="muted small">Fixed costs stay the same; fuel, maintenance, tires and DEF scale with miles.</p>
      <div class="table-wrap"><table class="table table-compact"><thead><tr><th class="num">Miles / mo</th><th class="num">Monthly</th><th class="num">Per mile</th><th class="num">Annual</th></tr></thead>
      <tbody>${scen.map(({ m, o: so }) => `<tr class="${Number(o.miles) === m ? 'row-active' : ''}"><td class="num">${fmtNum(m)}</td><td class="num">${fmtMoney(so.total)}</td><td class="num">${fmtMoney(so.perMile, 2)}</td><td class="num">${fmtMoney(so.annual)}</td></tr>`).join('')}</tbody></table></div>`;
  }
};

/* ------------------------------------------------------------------ */
/* Calculators                                                         */
/* ------------------------------------------------------------------ */
function calc(id, title, desc, fields) {
  return `<form class="card card-pad calc" data-live="calc" data-calc="${id}"><h2>${title}</h2><p class="muted small">${desc}</p>
    <div class="form-grid">${fields}</div><div class="calc-out" aria-live="polite"></div></form>`;
}
const nf = (name, label, v, attrs = '') => field(label, input(name, v ?? '', `type="number" inputmode="decimal" min="0" step="any" ${attrs}`));

function toolsTab(truck) {
  const c = truck.costs || {};
  const o = ownership(truck, c);
  const fc = forecast(truck, 12);
  return `<div class="calc-grid">
    ${calc('loan', 'Loan payment & total interest', 'What a truck loan really costs.',
    nf('price', 'Truck price ($)', c.purchasePrice) + nf('down', 'Down payment ($)', c.downPayment) + nf('apr', 'APR (%)', c.apr ?? 9) + nf('term', 'Term (months)', 60))}
    ${calc('payoff', 'Loan payoff', 'How fast extra payments pay off your loan.',
      nf('balance', 'Current balance ($)', c.loanBalance) + nf('apr', 'APR (%)', c.apr ?? 9) + nf('payment', 'Monthly payment ($)', c.loanPayment) + nf('extra', 'Extra per month ($)', 200))}
    ${calc('cpm', 'Cost per mile & per hour', 'Your all-in operating cost per mile and per engine hour.',
      nf('monthly', 'Monthly total cost ($)', Math.round(o.total)) + nf('miles', 'Miles per month', o.miles) + nf('hours', 'Engine hours per month', c.hours ?? ''))}
    ${calc('profit', 'Break-even & profitability', 'Revenue you need per mile, and what you keep.',
      nf('monthly', 'Monthly operating cost ($)', Math.round(o.total)) + nf('miles', 'Loaded + empty miles / month', o.miles) + nf('rate', 'Average revenue per mile ($)', 2.5) +
      nf('driver', 'Driver pay per mile ($)', 0) + nf('target', 'Target monthly profit ($)', 3000))}
    ${calc('fuel', 'Fuel consumption', 'Gallons and cost for any distance — and what better MPG is worth.',
      nf('miles', 'Miles', o.miles) + nf('mpg', 'MPG', o.mpg) + nf('price', 'Price per gallon ($)', o.price.toFixed(2)))}
    ${calc('reserve', 'Maintenance savings', 'Set a monthly savings goal for repairs.',
      nf('annual', 'Expected annual maintenance ($)', Math.round((fc.total[0] + fc.total[1]) / 2)) + nf('buffer', 'Unplanned-repair buffer (%)', 25) + nf('saved', 'Already saved ($)', 0))}
  </div>`;
}

const CALCS = {
  loan: (d) => {
    const P = Math.max(0, (num(d.price) || 0) - (num(d.down) || 0));
    if (!P || !num(d.term)) return '';
    const pay = loanPayment(P, num(d.apr) || 0, num(d.term)); const int = totalInterest(P, num(d.apr) || 0, num(d.term));
    return out([['Monthly payment', fmtMoney(pay, 2)], ['Total interest', fmtMoney(int)], ['Total paid', fmtMoney(pay * num(d.term) + (num(d.down) || 0))], ['Amount financed', fmtMoney(P)]]);
  },
  payoff: (d) => {
    const b = num(d.balance); const p = num(d.payment);
    if (!b || !p) return '<p class="muted small">Enter balance and payment.</p>';
    const base = payoff(b, num(d.apr) || 0, p); const fast = payoff(b, num(d.apr) || 0, p, num(d.extra) || 0);
    if (!Number.isFinite(base.months)) return '<p class="notice notice-red small">The payment doesn’t cover the monthly interest — the balance would never go down.</p>';
    return out([['Payoff (current)', `${base.months} months`], ['Interest (current)', fmtMoney(base.interest)], ['Payoff with extra', `${fast.months} months`], ['Interest saved', fmtMoney(base.interest - fast.interest)]]);
  },
  cpm: (d) => out([['Cost per mile', fmtMoney((num(d.monthly) || 0) / (num(d.miles) || 1), 3)], ['Cost per hour', num(d.hours) ? fmtMoney(costPerHour(num(d.monthly), num(d.hours)), 2) : '—'], ['Annual cost', fmtMoney((num(d.monthly) || 0) * 12)], ['Annual miles', fmtNum((num(d.miles) || 0) * 12)]]),
  profit: (d) => {
    const miles = num(d.miles) || 0; const monthly = num(d.monthly) || 0; const driver = num(d.driver) || 0;
    const be = breakEven(monthly, miles, 0, driver); const target = breakEven(monthly, miles, num(d.target) || 0, driver);
    const revenue = (num(d.rate) || 0) * miles; const profit = revenue - monthly - driver * miles;
    return out([['Break-even rate', fmtMoney(be.perMile, 2) + '/mi'], ['Needed for target', fmtMoney(target.perMile, 2) + '/mi'], ['Monthly revenue', fmtMoney(revenue)],
      [profit >= 0 ? 'Monthly profit' : 'Monthly loss', `<span class="${profit >= 0 ? 'status-text-green' : 'status-text-red'}">${fmtMoney(profit)}</span>`], ['Margin', revenue ? Math.round((profit / revenue) * 100) + '%' : '—'], ['Annual profit', fmtMoney(profit * 12)]]);
  },
  fuel: (d) => {
    const m = num(d.miles) || 0; const mpg = num(d.mpg) || 0; const p = num(d.price) || 0;
    const cost = monthlyFuelCost(m, mpg, p); const better = monthlyFuelCost(m, mpg + 0.5, p);
    return out([['Gallons', fmtNum(mpg ? m / mpg : 0)], ['Fuel cost', fmtMoney(cost, 2)], ['Cost per mile', fmtMoney(mpg ? p / mpg : 0, 3)], ['+0.5 MPG saves', fmtMoney(cost - better) + ' (' + fmtMoney((cost - better) * 12) + '/yr if monthly)']]);
  },
  reserve: (d) => {
    const a = (num(d.annual) || 0) * (1 + (num(d.buffer) || 0) / 100);
    const need = Math.max(0, a - (num(d.saved) || 0));
    return out([['Annual target', fmtMoney(a)], ['Save per month', fmtMoney(need / 12)], ['Save per week', fmtMoney(need / 52)], ['Per mile (at your miles)', fmtMoney(need / 12 / (monthlyMiles(store.activeTruck()) || 1), 3)]]);
  },
};
const out = (pairs) => `<div class="kpis">${pairs.map(([k, v]) => `<div><span class="label">${k}</span><strong>${v}</strong></div>`).join('')}</div>`;
lives['calc'] = (form) => { const fn = CALCS[form.dataset.calc]; if (fn) form.querySelector('.calc-out').innerHTML = fn(formData(form)); };

/* ------------------------------------------------------------------ */
/* Trip / route fuel                                                   */
/* ------------------------------------------------------------------ */
let legs = null;
function tripTab(truck) {
  const o = ownership(truck, truck.costs || {});
  legs ||= [{ label: 'Leg 1', miles: '', price: o.price.toFixed(2) }];
  return `<div class="cost-layout">
  <form class="card card-pad stack" data-live="trip" id="trip-form">
    <h2>Trip fuel calculator</h2>
    <div class="form-grid">
      ${field('Start ZIP', input('from', truck.zip || '', 'inputmode="numeric" maxlength="5"'))}
      ${field('Destination ZIP', input('to', '', 'inputmode="numeric" maxlength="5"'))}
      ${nf('mpg', 'MPG', o.mpg)}
      ${nf('days', 'Days on the road (optional)', '')}
    </div>
    <p class="muted small"><a href="#" data-action="open-route" class="link">${icon('route', 14)} Get the driving distance in Google Maps</a> — use a truck-safe route.</p>
    <h3 class="h4">Route legs</h3><p class="muted small">Split long-haul trips by where you’ll fuel up. Prices along the route often differ a lot from home.</p>
    <div class="legs">${legs.map((l, i) => `<div class="leg row gap-sm">
      <input name="leg_label_${i}" value="${esc(l.label)}" aria-label="Leg name" class="grow">
      <input name="leg_miles_${i}" value="${esc(l.miles)}" type="number" min="0" placeholder="miles" aria-label="Leg miles">
      <span class="input-prefix-wrap"><input name="leg_price_${i}" value="${esc(l.price)}" type="number" min="0" step="0.01" placeholder="$/gal" aria-label="Fuel price on this leg"></span>
      ${legs.length > 1 ? `<button type="button" class="icon-btn" data-action="trip-remove" data-i="${i}" aria-label="Remove leg">${icon('close', 18)}</button>` : ''}</div>`).join('')}</div>
    <button type="button" class="btn btn-sm btn-ghost" data-action="trip-add">${icon('plus', 16)} Add leg</button>
    <p class="muted small">Live truck-stop pricing along a route needs a commercial fuel-price provider and is planned for the hosted version.</p>
  </form>
  <section class="card card-pad sticky-col" data-out="trip"></section></div>`;
}
function readLegs(form) {
  const d = formData(form);
  legs = legs.map((_, i) => ({ label: d[`leg_label_${i}`], miles: d[`leg_miles_${i}`], price: d[`leg_price_${i}`] }));
  return d;
}
lives['trip'] = (form) => {
  const d = readLegs(form); const mpg = num(d.mpg) || 1;
  let miles = 0; let cost = 0;
  legs.forEach((l) => { const m = num(l.miles) || 0; miles += m; cost += (m / mpg) * (num(l.price) || 0); });
  const t = store.activeTruck(); const o = ownership(t, t.costs || {});
  const perMileAllIn = o.perMile;
  const el = document.querySelector('[data-out="trip"]');
  if (el) el.innerHTML = `<h2>Trip estimate</h2><div class="big-total">${fmtMoney(cost)}<span class="muted"> fuel</span></div>
    ${out([['Total miles', fmtNum(miles)], ['Gallons', fmtNum(miles / mpg)], ['Avg price', miles ? fmtMoney(cost / (miles / mpg), 2) : '—'], ['All-in cost (at ' + fmtMoney(perMileAllIn, 2) + '/mi)', fmtMoney(miles * perMileAllIn)],
      ...(num(d.days) ? [['Per day', fmtMoney(cost / num(d.days))]] : [])])}
    <p class="muted small">All-in cost uses your monthly cost-per-mile, including payment, insurance and maintenance reserve.</p>`;
};
actions['trip-add'] = () => { const f = document.getElementById('trip-form'); readLegs(f); legs.push({ label: `Leg ${legs.length + 1}`, miles: '', price: legs[legs.length - 1]?.price || '' }); rerender(); };
actions['trip-remove'] = (el) => { const f = document.getElementById('trip-form'); readLegs(f); legs.splice(Number(el.dataset.i), 1); rerender(); };
actions['open-route'] = () => {
  const f = document.getElementById('trip-form'); const d = formData(f);
  if (!d.from || !d.to) { toast('Enter start and destination ZIP codes.', 'warn'); return; }
  window.open(`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(d.from)}&destination=${encodeURIComponent(d.to)}&travelmode=driving`, '_blank', 'noopener');
};

/* ------------------------------------------------------------------ */
/* Resale value & quote comparison                                     */
/* ------------------------------------------------------------------ */
function valueTab(truck) {
  const c = truck.costs || {};
  const items = applicableItems(truck);
  return `<div class="calc-grid">
    ${calc('value', 'Resale value estimator', 'A rough depreciation-based estimate to plan around. Real values depend heavily on spec, condition and market.',
    nf('price', 'Original purchase price ($)', c.purchasePrice) + nf('year', 'Model year', truck.year) + nf('mileage', 'Mileage', truck.mileage) +
      field('Condition', select('cond', [['1.08', 'Excellent'], ['1', 'Good'], ['0.9', 'Fair'], ['0.75', 'Needs work']], '1')))}
    ${calc('quote', 'Is this repair quote reasonable?', 'Compare a shop’s quote with TruckWise’s regional estimate.',
      field('Repair', select('item', items.map((i) => [i.id, i.name]), 'oil')) + nf('quote', 'Quoted price ($)', ''))}
  </div>
  <p class="muted small">Resale estimates use a generic depreciation curve with mileage and condition adjustments — they are not market appraisals. Check recent auction and dealer listings for comparable trucks.</p>`;
}
CALCS.value = (d) => {
  const t = store.activeTruck();
  const dep = depreciation({ price: num(d.price), year: num(d.year), mileage: num(d.mileage), cls: t.class });
  if (!dep) return '<p class="muted small">Enter the purchase price.</p>';
  const k = Number(d.cond) || 1;
  return out([['Estimated value', fmtMoney(dep.estimate * k)], ['Likely range', `${fmtMoney(dep.low * k)}–${fmtMoney(dep.high * k)}`], ['Age', `${dep.age} yr`], ['Mileage adjustment', `${dep.mileageAdj >= 0 ? '+' : ''}${Math.round(dep.mileageAdj * 100)}%`]]) +
    `<div class="month-bars">${dep.curve.slice(0, 8).map((p) => `<div class="mb-row"><span class="mb-label">Year ${p.year}</span><span class="mb-track"><span class="mb-bar" style="width:${(p.value / dep.curve[0].value) * 100}%"></span></span><span class="mb-val">${fmtMoney(p.value * k)}</span></div>`).join('')}</div>`;
};
CALCS.quote = (d) => {
  const t = store.activeTruck();
  const item = MAINTENANCE.find((m) => m.id === d.item);
  if (!item) return '';
  const est = costFor(item, t);
  const v = compareQuote(num(d.quote), est.total);
  return out([['TruckWise estimate', fmtRange(est.total)], ['Labor', `${est.hours[0]}–${est.hours[1]} hr @ ~${fmtMoney(est.rate)}`]]) +
    (v ? `<p class="notice ${v.key === 'fair' ? 'notice-green' : v.key === 'low' ? 'notice-yellow' : 'notice-red'} small">${esc(v.label)}</p>` : '<p class="muted small">Enter the quoted price.</p>');
};
