import { store } from '../store.js';
import { CATEGORIES, DATA_SOURCE_NOTE, regionForZip } from '../data.js';
import {
  scheduleFor, forecast, knownIssues, checkupsFor, riskLevel, laborRate, fmtMoney, fmtNum, fmtRange, STATUS,
} from '../engine.js';
import { actions, lives, rerender, esc, icon, pill, tabs, formData } from '../ui.js';
import { truckName } from '../assistant.js';

let filter = 'all';

export function maintenanceView({ truck, args }) {
  const tab = args[0] || '';
  const head = `<div class="page-head"><div><h1>Maintenance</h1><div class="muted">${esc(truckName(truck))} · ${fmtNum(truck.mileage)} mi</div></div>
    <div class="row gap-sm wrap"><button class="btn btn-secondary" data-action="update-mileage" data-truck="${truck.id}">${icon('gauge', 18)} Update mileage</button>
    <button class="btn btn-primary" data-action="add-record" data-truck="${truck.id}">${icon('plus', 18)} Add record</button></div></div>
    ${tabs('maintenance', [['', 'Schedule'], ['history', 'History'], ['checkups', 'Checkups'], ['forecast', 'Forecast & risks']], tab)}`;
  if (tab === 'history') return head + historyTab(truck);
  if (tab === 'checkups') return head + checkupsTab(truck);
  if (tab === 'forecast') return head + forecastTab(truck);
  return head + scheduleTab(truck);
}

/* ------------------------------------------------------------------ */
function scheduleTab(truck) {
  const sched = scheduleFor(truck);
  const counts = Object.fromEntries(Object.keys(STATUS).map((k) => [k, sched.filter((s) => s.status === k).length]));
  const shown = sched.filter((s) => filter === 'all' || s.status === filter);
  const chips = [['all', `All (${sched.length})`], ['overdue', `Overdue (${counts.overdue})`], ['soon', `Due soon (${counts.soon})`], ['upcoming', `Upcoming (${counts.upcoming})`], ['ok', `Up to date (${counts.ok})`], ['unknown', `No record (${counts.unknown})`]];
  const byCat = CATEGORIES.map((c) => ({ c, rows: shown.filter((s) => s.item.cat === c.id) })).filter((g) => g.rows.length);
  return `
  <form class="filter-chips" data-live="maint-filter" role="radiogroup" aria-label="Filter by status">${chips.map(([k, l]) => `<label class="fchip fchip-${STATUS[k]?.color || 'all'}"><input type="radio" name="f" value="${k}" ${filter === k ? 'checked' : ''}><span>${l}</span></label>`).join('')}</form>
  <div class="legend muted small"><span class="dot-g"></span> Up to date <span class="dot-y"></span> Upcoming <span class="dot-o"></span> Due soon <span class="dot-r"></span> Overdue <span class="dot-n"></span> No record yet</div>
  ${byCat.map(({ c, rows }) => `<section class="maint-group"><h2 class="group-title">${icon(c.icon, 20)} ${esc(c.label)}</h2>
    ${rows.map((s) => itemCard(truck, s)).join('')}</section>`).join('') || '<p class="muted">Nothing matches this filter.</p>'}
  <p class="muted small">${esc(DATA_SOURCE_NOTE)} Labor estimated at ~${fmtMoney(laborRate(truck))}/hr (${esc(regionForZip(truck.zip).label)}).</p>`;
}
lives['maint-filter'] = (form) => { filter = formData(form).f; rerender(); };

function dueText(s) {
  if (s.status === 'unknown') {
    return `No record yet · every ${s.interval ? fmtNum(s.interval) + ' mi' : ''}${s.interval && s.months ? ' / ' : ''}${s.months ? s.months + ' mo' : ''}`;
  }
  const parts = [];
  if (s.remaining != null) parts.push(s.remaining < 0 ? `${fmtNum(-s.remaining)} mi overdue` : `due in ${fmtNum(s.remaining)} mi (at ${fmtNum(s.dueMiles)})`);
  if (s.daysLeft != null) parts.push(s.daysLeft < 0 ? `${-s.daysLeft} days past due` : `${s.dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`);
  return parts.join(' · ');
}

function itemCard(truck, s) {
  const it = s.item;
  const urg = { critical: 'Safety-critical', high: 'High', medium: 'Medium', low: 'Low' }[it.urgency];
  return `<details class="maint-item card status-edge-${STATUS[s.status].color}">
    <summary>
      <span class="mi-main"><strong>${esc(it.name)}</strong><span class="muted small block">${dueText(s)}${s.postponed ? ' · postponed' : ''}</span></span>
      <span class="mi-cost">${fmtRange(s.cost.total)}</span>
      ${pill(s.status)}
    </summary>
    <div class="mi-body">
      <div class="mi-grid">
        <div><h4>Why it matters</h4><p>${esc(it.why)}</p></div>
        <div><h4>If ignored</h4><p>${esc(it.ignored)}</p></div>
        <div><h4>Interval</h4><p>${s.interval ? 'Every ' + fmtNum(s.interval) + ' mi' : ''}${s.interval && s.months ? ' or ' : ''}${s.months ? s.months + ' months' : ''}${s.interval || s.months ? ', whichever first' : ''}${truck.overrides?.[it.id] ? ' (your custom interval)' : ' (typical)'}</p></div>
        <div><h4>Estimated cost</h4><p>${fmtRange(s.cost.total)}<br><span class="muted small">Parts ${fmtRange(s.cost.parts)} · Labor ${fmtRange(s.cost.labor)} (${s.cost.hours[0]}–${s.cost.hours[1]} hr)</span></p></div>
        <div><h4>Parts usually needed</h4><p>${it.partsList.map(esc).join(', ')}</p></div>
        <div><h4>Type & urgency</h4><p>${it.req === 'required' ? 'Manufacturer-scheduled' : 'Recommended'} ${it.kind === 'inspect' ? 'inspection' : 'service'} · ${urg} priority</p></div>
        <div><h4>Last done</h4><p>${s.last ? `${esc(s.last.date || 'Date unknown')} at ${fmtNum(s.last.mileage)} mi${s.last.kind === 'inspect' ? ' (inspected)' : ''}` : 'No record'}</p></div>
      </div>
      ${it.note ? `<p class="notice notice-blue small">${icon('info', 16)} ${esc(it.note)}</p>` : ''}
      <div class="row gap-sm wrap">
        <button class="btn btn-sm btn-primary" data-action="add-record" data-truck="${truck.id}" data-items="${it.id}">${icon('check', 16)} Mark completed</button>
        <button class="btn btn-sm btn-secondary" data-action="mark-inspected" data-truck="${truck.id}" data-item="${it.id}">${icon('eye', 16)} Inspected — OK</button>
        <button class="btn btn-sm btn-ghost" data-action="postpone" data-truck="${truck.id}" data-item="${it.id}">${icon('pause', 16)} Postpone</button>
        <a class="btn btn-sm btn-ghost" href="#/trucks/${truck.id}">${icon('edit', 16)} Edit interval</a>
      </div>
    </div></details>`;
}

/* ------------------------------------------------------------------ */
function historyTab(truck) {
  const recs = (truck.records || []).slice().sort((a, b) => (b.mileage || 0) - (a.mileage || 0) || (b.date || '').localeCompare(a.date || ''));
  const total = recs.reduce((s, r) => s + (Number(r.total) || 0), 0);
  const parts = recs.reduce((s, r) => s + (Number(r.partsCost) || 0), 0);
  const labor = recs.reduce((s, r) => s + (Number(r.laborCost) || 0), 0);
  const byYear = {};
  recs.forEach((r) => { const y = (r.date || '').slice(0, 4) || '—'; byYear[y] = (byYear[y] || 0) + (Number(r.total) || 0); });
  if (!recs.length) {
    return `<div class="empty card card-pad"><div class="empty-icon">${icon('report', 32)}</div><h3>No maintenance history yet</h3>
      <p class="muted">Add past services too — a complete history makes due dates accurate and raises resale value.</p>
      <button class="btn btn-primary" data-action="add-record" data-truck="${truck.id}">${icon('plus')} Add first record</button></div>`;
  }
  return `<section class="widgets widgets-4">
      <div class="widget card"><span class="label">Total spent</span><div class="widget-value">${fmtMoney(total)}</div><div class="muted small">${recs.length} records</div></div>
      <div class="widget card"><span class="label">Parts</span><div class="widget-value">${fmtMoney(parts)}</div></div>
      <div class="widget card"><span class="label">Labor</span><div class="widget-value">${fmtMoney(labor)}</div></div>
      <div class="widget card"><span class="label">By year</span><div class="small">${Object.entries(byYear).sort().reverse().slice(0, 4).map(([y, v]) => `${y}: <strong>${fmtMoney(v)}</strong>`).join('<br>')}</div></div>
    </section>
    <section class="card"><div class="table-wrap"><table class="table">
      <thead><tr><th>Date</th><th class="num">Mileage</th><th>Service</th><th>Shop</th><th class="num">Parts</th><th class="num">Labor</th><th class="num">Total</th><th>Files</th><th></th></tr></thead>
      <tbody>${recs.map((r) => `<tr>
        <td class="nowrap">${esc(r.date || '—')}</td><td class="num">${fmtNum(r.mileage)}</td>
        <td><strong>${esc(r.title || 'Service')}</strong>${r.parts ? `<div class="muted small">Parts: ${esc(r.parts)}</div>` : ''}${r.notes ? `<div class="muted small">${esc(r.notes)}</div>` : ''}${r.warranty ? `<div class="small">${icon('shield', 14)} ${esc(r.warranty)}</div>` : ''}</td>
        <td>${esc(r.shop || '')}</td><td class="num">${r.partsCost != null ? fmtMoney(r.partsCost) : ''}</td><td class="num">${r.laborCost != null ? fmtMoney(r.laborCost) : ''}</td>
        <td class="num strong">${r.total != null ? fmtMoney(r.total) : ''}</td>
        <td>${(r.files || []).map((f) => `<button class="link small block" data-action="open-file" data-file="${f.id}">${icon('file', 14)} ${esc(f.name.length > 18 ? f.name.slice(0, 16) + '…' : f.name)}</button>`).join('')}</td>
        <td><button class="icon-btn" data-action="edit-record" data-truck="${truck.id}" data-record="${r.id}" aria-label="Edit record">${icon('edit', 18)}</button></td></tr>`).join('')}
      </tbody></table></div></section>`;
}

/* ------------------------------------------------------------------ */
const ZONES = { cooling: 'front', brakes: 'wheels', tires: 'wheels', electrical: 'battery', driveline: 'driveline', suspension: 'frontaxle', turbo: 'engine', aftertreatment: 'exhaust', major: 'engine' };

function diagram(zone, heavy) {
  const on = (z) => (z === zone ? 'zone on' : 'zone');
  // Simple side-view illustration with highlighted component areas.
  return `<svg viewBox="0 0 320 130" class="truck-diagram" role="img" aria-label="Where to look: highlighted area on a truck outline">
    ${heavy
    ? `<path d="M20 30h70l18 22v40H20z" class="body"/><path d="M108 80h190v12H108z" class="body"/><rect x="230" y="62" width="60" height="10" rx="2" class="body"/>`
    : `<path d="M20 50h50l20-20h70l10 20h120v42H20z" class="body"/>`}
    <circle cx="${heavy ? 55 : 70}" cy="100" r="16" class="${on('wheels')}"/><circle cx="${heavy ? 225 : 250}" cy="100" r="16" class="${on('wheels')}"/>${heavy ? `<circle cx="262" cy="100" r="16" class="${on('wheels')}"/>` : ''}
    <rect x="${heavy ? 22 : 22}" y="${heavy ? 40 : 56}" width="10" height="${heavy ? 40 : 30}" rx="2" class="${on('front')}"/>
    <rect x="${heavy ? 36 : 34}" y="${heavy ? 52 : 60}" width="34" height="26" rx="4" class="${on('engine')}"/>
    <rect x="${heavy ? 92 : 120}" y="84" width="22" height="12" rx="2" class="${on('battery')}"/>
    <rect x="${heavy ? 120 : 140}" y="96" width="${heavy ? 90 : 95}" height="5" rx="2" class="${on('driveline')}"/>
    <rect x="${heavy ? 116 : 96}" y="70" width="28" height="10" rx="5" class="${on('exhaust')}"/>
    <rect x="${heavy ? 40 : 55}" y="96" width="30" height="5" rx="2" class="${on('frontaxle')}"/>
  </svg>`;
}

function checkupsTab(truck) {
  const list = checkupsFor(truck);
  const rate = laborRate(truck);
  const heavy = Number(truck.class) >= 6;
  return `<p class="lead">What to check on ${esc(truckName(truck))} at ${fmtNum(truck.mileage)} miles — and the warning signs that mean it’s time to see a mechanic.</p>
  <div class="checkups">${list.map((c) => `<article class="card card-pad checkup">
    <div class="checkup-head"><div><div class="eyebrow">Recommended checkup</div><h2>${esc(c.title)}</h2></div>
      <div class="muted small right">Est. inspection<br><strong>${fmtRange([Math.round(c.cost[0] * rate / 10) * 10, Math.round(c.cost[1] * rate / 10) * 10])}</strong></div></div>
    ${diagram(ZONES[c.id], heavy)}
    <p class="muted small">${icon('map', 14)} ${esc(c.where)}</p>
    <div class="mi-grid">
      <div><h4>What to inspect</h4><ul>${c.inspect.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
      <div><h4>Warning signs</h4><ul class="warn-list">${c.signs.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    </div>
    <p class="notice notice-red small">${icon('alert', 16)} <span><strong>If ignored:</strong> ${esc(c.ignored)}</span></p>
  </article>`).join('')}</div>
  <p class="muted small">Inspection guidance is general. Your owner’s manual and a qualified technician take priority. Inspection costs use ~${fmtMoney(rate)}/hr.</p>`;
}

/* ------------------------------------------------------------------ */
let horizon = 12;
function forecastTab(truck) {
  const fc = forecast(truck, horizon);
  const issues = knownIssues(truck);
  const byMonth = {};
  fc.events.forEach((e) => {
    const k = e.date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    (byMonth[k] ||= []).push(e);
  });
  const monthTotals = Object.entries(byMonth).map(([m, es]) => [m, es.reduce((a, e) => [a[0] + e.cost[0], a[1] + e.cost[1]], [0, 0])]);
  const max = Math.max(1, ...monthTotals.map(([, t]) => t[1]));
  const mileage = Number(truck.mileage) || 0;

  const riskCard = (i, title) => {
    const lvl = riskLevel(i.window, mileage);
    return `<article class="card card-pad risk risk-${lvl.key}">
      <div class="risk-head"><div>${title ? `<div class="eyebrow">${esc(title)}</div>` : ''}<h3>${esc(i.issue)}</h3></div>
        <span class="pill ${i.type === 'routine' ? 'pill-blue' : 'pill-orange'}">${i.type === 'routine' ? 'Routine wear item' : 'Potential failure'}</span></div>
      <dl class="risk-dl">
        <dt>Why it can happen</dt><dd>${esc(i.why)}</dd>
        <dt>Warning signs</dt><dd>${esc(i.signs)}</dd>
        <dt>Prevention</dt><dd>${esc(i.prevent)}</dd>
        <dt>Typical repair cost</dt><dd>${i.cost ? fmtRange(i.cost) : '—'}</dd>
        <dt>Inspection window</dt><dd>${i.window ? `${fmtNum(i.window[0])}–${fmtNum(i.window[1])} mi · <strong>${esc(lvl.label)}</strong>` : 'Condition-based — inspect on schedule'}</dd>
      </dl></article>`;
  };

  return `<section class="card card-pad">
    <div class="card-head wrap"><h2>Upcoming maintenance forecast</h2>
      <form data-live="horizon" class="row gap-sm">${[[6, '6 months'], [12, '12 months'], [24, '24 months']].map(([v, l]) => `<label class="choice choice-inline"><input type="radio" name="h" value="${v}" ${horizon === v ? 'checked' : ''}><span>${l}</span></label>`).join('')}</form></div>
    <div class="forecast-sum">
      <div><span class="label">Estimated scheduled maintenance</span><span class="big">${fmtRange(fc.total)}</span></div>
      <div><span class="label">Suggested monthly savings</span><span class="big">${fmtRange(fc.monthlyReserve)}</span></div>
      <div><span class="label">Assumed driving</span><span class="big">${fmtNum(fc.monthlyMiles)}</span><span class="muted small">mi / month</span></div>
    </div>
    <p class="muted small">Planning estimates from your schedule, mileage and regional labor rates. Items with no service record are projected at the next interval. Unplanned repairs are not included — many owners add 20–30%.</p>
    <div class="month-bars">${monthTotals.map(([m, t]) => `<div class="mb-row"><span class="mb-label">${esc(m)}</span><span class="mb-track"><span class="mb-bar" style="width:${(t[1] / max) * 100}%"></span></span><span class="mb-val">${fmtRange(t.map((x) => Math.round(x / 10) * 10))}</span></div>`).join('')}</div>
    <div class="table-wrap"><table class="table table-compact"><thead><tr><th>When (est.)</th><th class="num">Mileage</th><th>Service</th><th class="num">Est. cost</th></tr></thead><tbody>
      ${fc.events.map((e) => `<tr><td class="nowrap">${e.date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</td><td class="num">${e.miles ? fmtNum(e.miles) : '—'}</td><td>${esc(e.item.name)}${e.status === 'unknown' ? ' <span class="muted small">(projected)</span>' : ''}${e.status === 'overdue' ? ' <span class="pill pill-red">overdue</span>' : ''}</td><td class="num">${fmtRange(e.cost)}</td></tr>`).join('')}
    </tbody></table></div>
  </section>

  <section><h2 class="section-title">Repair risk indicators</h2>
    <p class="muted">Known concerns and common wear items for this truck${issues.specific.length ? ` and its engine (${esc(issues.specific.map((s) => s.title).join(', '))})` : ''}. These are planning estimates, <strong>not predictions</strong> — many trucks never have these problems.</p>
    ${issues.specific.length ? '' : `<div class="notice notice-blue">${icon('info', 18)} Add the exact engine model on the <a href="#/trucks/${truck.id}">truck profile</a> to see engine-specific concerns.</div>`}
    <div class="risk-grid">${issues.specific.flatMap((s) => s.items.map((i) => riskCard(i, s.title))).join('')}${issues.generic.map((g) => riskCard(g, 'Common wear')).join('')}</div>
  </section>`;
}
lives['horizon'] = (form) => { horizon = Number(formData(form).h) || 12; rerender(); };
