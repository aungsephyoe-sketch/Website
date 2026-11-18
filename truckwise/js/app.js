import { store, uid } from './store.js';
import {
  CLASSES, CONFIG_GROUPS, FUEL_TYPES, TRANSMISSIONS, DRIVETRAINS, DUTY_CYCLES, MILEAGE_PRESETS, PLANS,
  regionForZip, profileFor, PROFILE_LABELS, DATA_SOURCE_NOTE, FUEL_REFERENCE_DATE, complianceFor,
} from './data.js';
import {
  validateVin, modelYearFromVin, missingFields, scheduleFor, overallStatus, healthBySystem, forecast, ownership,
  notificationsFor, fmtMoney, fmtNum, fmtRange, STATUS, applicableItems, intervalFor, monthsFor, monthlyMiles,
} from './engine.js';
import { decodeVin, fetchRecalls } from './api.js';
import {
  actions, submits, lives, setRerender, rerender, go, esc, $, $$, icon, pill, openModal, closeModal, toast, confirmBox,
  formData, num, field, input, select, emptyState,
} from './ui.js';
import { truckName } from './assistant.js';
import './modals.js';
import { maintenanceView } from './views/maintenance.js';
import { costsView } from './views/costs.js';
import { assistantView } from './views/assistant.js';
import { inspectionsView, shopsView, documentsView, recallsView, reportsView } from './views/tools.js';

const view = document.getElementById('view');

/* ------------------------------------------------------------------ */
/* Theme                                                               */
/* ------------------------------------------------------------------ */
function applyTheme() {
  const t = store.settings().theme;
  if (t === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', t);
}
applyTheme();

/* ------------------------------------------------------------------ */
/* Shell                                                               */
/* ------------------------------------------------------------------ */
const PRIMARY = [
  ['dashboard', 'Dashboard', 'dashboard'], ['trucks', 'My Trucks', 'truck'], ['maintenance', 'Maintenance', 'wrench'],
  ['costs', 'Costs', 'dollar'], ['assistant', 'Assistant', 'chat'],
];
const SECONDARY = [
  ['inspections', 'Inspections', 'clipboard'], ['alerts', 'Reminders', 'bell'], ['recalls', 'Recalls & warranty', 'shield'],
  ['shops', 'Repair shops', 'map'], ['documents', 'Documents', 'file'], ['reports', 'Reports', 'report'],
  ['settings', 'Settings', 'settings'], ['plans', 'Plans', 'star'],
];

function allNotifications() {
  const prefs = store.settings();
  const dismissed = new Set(store.get().dismissed || []);
  return store.get().trucks.flatMap((t) => notificationsFor(t, new Date(), prefs)).filter((n) => !dismissed.has(n.text + n.truckId));
}

function shell(route) {
  const s = store.get();
  const active = store.activeTruck();
  const notes = allNotifications();
  const nav = (items, cls) => items.map(([id, label, ic]) =>
    `<a href="#/${id}" class="${cls} ${route === id ? 'active' : ''}" ${route === id ? 'aria-current="page"' : ''}>${icon(ic, 22)}<span>${label}</span>${id === 'alerts' && notes.length ? `<b class="badge">${notes.length}</b>` : ''}</a>`).join('');
  document.getElementById('sidebar').innerHTML = `
    <a class="brand" href="#/dashboard" aria-label="TruckWise home">${logo()}<span>TruckWise</span></a>
    <nav class="side-nav" aria-label="Main">${nav(PRIMARY, 'side-link')}</nav>
    <div class="side-sep">Tools</div>
    <nav class="side-nav" aria-label="Tools">${nav(SECONDARY, 'side-link')}</nav>
    <div class="side-foot muted">Data stays on this device.<br><a href="#/settings">Back up your data</a></div>`;
  document.getElementById('tabbar').innerHTML = nav(PRIMARY, 'tab-link');
  document.getElementById('topbar').innerHTML = `
    <a class="brand brand-mobile" href="#/dashboard">${logo()}<span>TruckWise</span></a>
    ${s.trucks.length ? `<label class="truck-switch"><span class="sr-only">Active truck</span>
      <select data-live-select="active-truck">${s.trucks.map((t) => `<option value="${t.id}" ${active?.id === t.id ? 'selected' : ''}>${esc(truckName(t))}</option>`).join('')}
      <option value="__new">+ Add a truck</option></select></label>` : '<span class="grow"></span>'}
    <a href="#/alerts" class="icon-btn" aria-label="Reminders (${notes.length})">${icon('bell')}${notes.length ? `<b class="dot">${notes.length > 9 ? '9+' : notes.length}</b>` : ''}</a>
    <button class="icon-btn" data-action="toggle-theme" aria-label="Toggle dark mode">${icon('eye')}</button>
    <button class="icon-btn mobile-only" data-action="more-menu" aria-label="More">${icon('more')}</button>`;
}

function logo() {
  return `<svg width="28" height="28" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="9" fill="var(--brand)"/><path d="M7 11h11v9H7zM18 14h4l3 3v3h-7" fill="none" stroke="#fff" stroke-width="2" stroke-linejoin="round"/><circle cx="11" cy="21.5" r="2" fill="#fff"/><circle cx="21" cy="21.5" r="2" fill="#fff"/></svg>`;
}

document.addEventListener('change', (e) => {
  const sel = e.target.closest('[data-live-select="active-truck"]');
  if (!sel) return;
  if (sel.value === '__new') { resetOnboarding(); go('#/onboard'); return; }
  store.setActive(sel.value); rerender();
});

actions['toggle-theme'] = () => {
  const cur = document.documentElement.getAttribute('data-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  store.setSetting('theme', cur === 'dark' ? 'light' : 'dark'); applyTheme();
};
actions['more-menu'] = () => {
  openModal(`<h2>More</h2><nav class="more-grid">${SECONDARY.map(([id, label, ic]) => `<a href="#/${id}" class="more-item" data-action="close-modal">${icon(ic, 24)}<span>${label}</span></a>`).join('')}</nav>`);
};

/* ------------------------------------------------------------------ */
/* Router                                                              */
/* ------------------------------------------------------------------ */
const ROUTES = {
  welcome: welcomeView, onboard: onboardView, dashboard: dashboardView, trucks: trucksView, maintenance: maintenanceView,
  costs: costsView, assistant: assistantView, inspections: inspectionsView, alerts: alertsView, recalls: recallsView,
  shops: shopsView, documents: documentsView, reports: reportsView, settings: settingsView, plans: plansView,
};
const OPEN = ['welcome', 'onboard', 'settings', 'plans'];

function render() {
  const [route0, ...rest] = location.hash.replace(/^#\/?/, '').split('/');
  let route = route0 || 'dashboard';
  if (!store.get().trucks.length && !OPEN.includes(route)) route = 'welcome';
  if (!ROUTES[route]) route = 'dashboard';
  document.body.dataset.route = route;
  shell(route);
  const fn = ROUTES[route];
  const truck = store.activeTruck();
  const mounts = [];
  view.innerHTML = fn({ truck, args: rest, mount: (f) => mounts.push(f) });
  mounts.forEach((f) => f(view));
  const h = view.querySelector('h1');
  document.title = (h ? h.textContent.trim() + ' · ' : '') + 'TruckWise';
}
setRerender(render);

let lastRoute = '';
window.addEventListener('hashchange', () => {
  const r = location.hash.split('/')[1] || '';
  render();
  if (r !== lastRoute) { window.scrollTo(0, 0); view.focus({ preventScroll: true }); }
  lastRoute = r;
});

// Delegated events
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const fn = actions[el.dataset.action];
  if (fn) { if (el.tagName === 'A' && !el.getAttribute('href')?.startsWith('#/')) e.preventDefault(); if (el.tagName === 'BUTTON') e.preventDefault(); fn(el, e); }
});
document.addEventListener('submit', (e) => {
  const form = e.target.closest('[data-submit]');
  if (!form) return;
  e.preventDefault();
  submits[form.dataset.submit]?.(form, e);
});
document.addEventListener('input', (e) => {
  const form = e.target.closest('[data-live]');
  if (form) lives[form.dataset.live]?.(form, e);
});

/* ------------------------------------------------------------------ */
/* Welcome + onboarding                                                */
/* ------------------------------------------------------------------ */
function welcomeView() {
  return `<section class="welcome">
    <div class="welcome-hero">
      <div class="welcome-mark">${logo()}</div>
      <h1>Know your truck.<br>Plan your maintenance.<br>Control your costs.</h1>
      <p class="lead">TruckWise identifies your exact truck from its VIN, builds a maintenance schedule for it, and shows what it really costs to run — for pickups through Class 8 tractors.</p>
      <div class="row gap"><a class="btn btn-primary btn-xl" href="#/onboard" data-action="start-onboard">${icon('plus')} Add My Truck</a>
      ${store.get().trucks.length ? '<a class="btn btn-ghost btn-xl" href="#/dashboard">Go to dashboard</a>' : ''}</div>
      <p class="muted small">Takes about two minutes. Skip anything you don’t know.</p>
    </div>
    <div class="welcome-points">
      ${[['wrench', 'Personal maintenance schedule', 'Built for your class, engine, fuel and duty cycle — with what each service costs near you.'],
    ['dollar', 'True monthly cost', 'Payment, insurance, fuel, maintenance and tires in one number, plus cost per mile.'],
    ['clipboard', 'Inspections & records', 'Pre-trip checklists, service history, receipts and printable reports.']]
    .map(([i, h, p]) => `<div class="point">${icon(i, 26)}<div><h3>${h}</h3><p class="muted">${p}</p></div></div>`).join('')}
    </div></section>`;
}

let ob = null;
function resetOnboarding() { ob = { step: 'vin', draft: { configs: [], duty: 'highway' }, decoding: false, error: '', warning: '' }; }
actions['start-onboard'] = () => resetOnboarding();

const STEPS = [['vin', 'Identify'], ['confirm', 'Confirm'], ['mileage', 'Mileage'], ['zip', 'Location'], ['habits', 'Driving'], ['profile', 'Maintenance']];

function onboardView() {
  if (!ob) resetOnboarding();
  const idx = STEPS.findIndex(([s]) => s === ob.step);
  const d = ob.draft;
  const prog = `<ol class="steps" aria-label="Setup progress">${STEPS.map(([, l], i) => `<li class="${i < idx ? 'done' : i === idx ? 'current' : ''}"><span>${i < idx ? icon('check', 14) : i + 1}</span>${l}</li>`).join('')}</ol>`;
  let body = '';
  if (ob.step === 'vin') {
    body = `<h1>Identify your truck</h1>
      <p class="lead">Enter the 17-character VIN. It’s on your registration, insurance card, the driver’s door jamb, or the lower windshield.</p>
      <form data-submit="ob-vin" class="stack">
        ${field('VIN', input('vin', d.vin || '', 'class="input-xl mono" maxlength="20" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="1FUJHHDR0MLMJ1234"'))}
        ${ob.error ? `<div class="notice notice-red">${icon('alert', 18)} ${esc(ob.error)}</div>` : ''}
        <div class="row gap wrap"><button class="btn btn-primary btn-lg" ${ob.decoding ? 'disabled' : ''}>${ob.decoding ? '<span class="spinner"></span> Decoding…' : 'Decode VIN'}</button>
        <button type="button" class="btn btn-ghost btn-lg" data-action="ob-manual">I don’t have the VIN — enter details manually</button></div>
      </form>
      <p class="muted small">VIN decoding uses the free NHTSA vPIC database. Some heavy-truck details (exact engine rating, axle ratios) may not be in the VIN — you’ll confirm them next.</p>`;
  } else if (ob.step === 'confirm') {
    const missing = missingFields(d);
    const groupsOrder = Number(d.class) >= 7 ? ['heavy', 'medium', 'light'] : Number(d.class) >= 4 ? ['medium', 'light', 'heavy'] : ['light', 'medium', 'heavy'];
    body = `<h1>Confirm truck details</h1>
      ${d.decodeOk ? `<div class="notice notice-green">${icon('check', 18)} Found: <strong>${esc([d.year, d.make, d.model, d.trim].filter(Boolean).join(' '))}</strong> from NHTSA.</div>` : ''}
      ${ob.warning ? `<div class="notice notice-yellow">${icon('info', 18)} ${esc(ob.warning)}</div>` : ''}
      ${missing.length ? `<p class="muted">Please confirm: <strong>${missing.join(', ')}</strong>. We don’t guess — pick “Unknown” if you’re not sure.</p>` : '<p class="muted">Check everything looks right. Fix anything that’s wrong.</p>'}
      <form data-submit="ob-confirm" class="form-grid">
        ${field('Year', input('year', d.year || '', 'type="number" min="1980" max="2030" required'))}
        ${field('Make', input('make', d.make || '', 'required placeholder="Freightliner"'))}
        ${field('Model', input('model', d.model || '', 'required placeholder="Cascadia"'))}
        ${field('Trim / series', input('trim', d.trim || ''))}
        ${field('Weight class (GVWR)', select('class', [['', 'Select class…'], ...CLASSES.map((c) => [c.id, `${c.label} · ${c.range}`])], d.class, 'required'), d.gvwrText ? `From VIN: ${esc(d.gvwrText)}` : 'Use the GVWR on the door-jamb label, not the actual weight.')}
        ${field('Fuel type', select('fuel', [['', 'Select…'], ...FUEL_TYPES], d.fuel, 'required'))}
        ${field('Engine (if known)', input('engine', d.engine || '', 'placeholder="e.g. Detroit DD15, Cummins X15, 6.7L Power Stroke"'))}
        ${field('Transmission (if known)', select('transmission', [['', 'Unknown'], ...TRANSMISSIONS.filter((x) => x !== 'Unknown')], d.transmission))}
        ${field('Drivetrain / axles', select('drivetrain', [['', 'Unknown'], ...DRIVETRAINS.filter((x) => x !== 'Unknown')], d.drivetrain))}
        ${field('Brakes', select('airBrakes', [['', 'Not sure'], ['true', 'Air brakes'], ['false', 'Hydraulic brakes']], d.airBrakes === undefined ? '' : String(d.airBrakes)))}
        ${field('Nickname (optional)', input('nickname', d.nickname || '', 'placeholder="e.g. Unit 12"'))}
        ${field('VIN', input('vin', d.vin || '', 'class="mono" maxlength="17"'))}
        <fieldset class="field span-2"><legend class="field-label">Truck type / configuration <span class="muted">(choose all that apply)</span></legend>
          ${configPicker(d.configs, groupsOrder)}
        </fieldset>
        <div class="span-2 row gap"><button type="button" class="btn btn-ghost" data-action="ob-back">Back</button><span class="grow"></span><button class="btn btn-primary btn-lg">Continue</button></div>
      </form>`;
  } else if (ob.step === 'mileage') {
    body = `<h1>Current mileage</h1><p class="lead">Enter the odometer reading. This drives every due date in your schedule.</p>
      <form data-submit="ob-mileage" class="stack narrow">
        ${field('Odometer (miles)', input('mileage', d.mileage ?? '', 'type="number" inputmode="numeric" min="0" required class="input-xl" placeholder="125000"'))}
        ${field('Engine hours (optional)', input('engineHours', d.engineHours ?? '', 'type="number" inputmode="numeric" min="0"'), 'Useful for vocational trucks and reefers.')}
        <div class="row gap"><button type="button" class="btn btn-ghost" data-action="ob-back">Back</button><span class="grow"></span><button class="btn btn-primary btn-lg">Continue</button></div>
      </form>`;
  } else if (ob.step === 'zip') {
    const reg = d.zip ? regionForZip(d.zip) : null;
    body = `<h1>Where is the truck based?</h1><p class="lead">Your ZIP code personalizes fuel and repair labor estimates. You can change it any time.</p>
      <form data-submit="ob-zip" data-live="ob-zip" class="stack narrow">
        ${field('ZIP code', input('zip', d.zip || '', 'inputmode="numeric" pattern="\\d{5}" maxlength="5" class="input-xl" placeholder="75201"'))}
        <p class="muted" data-zip-hint>${reg ? `${esc(reg.state || '')} · ${esc(reg.label)} region` : ''}</p>
        <div class="row gap"><button type="button" class="btn btn-ghost" data-action="ob-back">Back</button><button type="button" class="btn btn-ghost" data-action="ob-skip">Skip</button><span class="grow"></span><button class="btn btn-primary btn-lg">Continue</button></div>
      </form>`;
  } else if (ob.step === 'habits') {
    body = `<h1>How much do you drive?</h1><p class="lead">About how many miles does this truck travel per month?</p>
      <form data-submit="ob-habits" class="stack">
        <div class="choice-grid">${MILEAGE_PRESETS.map((m) => `<label class="choice"><input type="radio" name="preset" value="${m}" ${Number(d.monthlyMiles) === m ? 'checked' : ''}><span>${fmtNum(m)}${m === 10000 ? '+' : ''}<small>mi / month</small></span></label>`).join('')}
          <label class="choice"><input type="radio" name="preset" value="custom" ${d.monthlyMiles && !MILEAGE_PRESETS.includes(Number(d.monthlyMiles)) ? 'checked' : ''}><span>Custom<small><input name="custom" type="number" min="0" value="${d.monthlyMiles && !MILEAGE_PRESETS.includes(Number(d.monthlyMiles)) ? esc(d.monthlyMiles) : ''}" placeholder="miles" aria-label="Custom monthly miles"></small></span></label></div>
        <h2 class="h3">How is the truck used?</h2>
        <div class="choice-grid choice-grid-3">${DUTY_CYCLES.map((c) => `<label class="choice choice-wide"><input type="radio" name="duty" value="${c.id}" ${d.duty === c.id ? 'checked' : ''}><span>${esc(c.label)}<small>${esc(c.desc)}</small></span></label>`).join('')}</div>
        <p class="muted small">Severe service (stop-and-go, heavy loads, lots of idling) shortens many service intervals.</p>
        <div class="row gap"><button type="button" class="btn btn-ghost" data-action="ob-back">Back</button><button type="button" class="btn btn-ghost" data-action="ob-skip">Skip</button><span class="grow"></span><button class="btn btn-primary btn-lg">Continue</button></div>
      </form>`;
  } else if (ob.step === 'profile') {
    const items = applicableItems(d);
    const key = items.filter((i) => ['oil', 'fuelfilter', 'brakes', 'airfilter', 'annual', 'tirerotate', 'tireinspect'].includes(i.id));
    body = `<h1>Your maintenance profile</h1>
      <div class="notice notice-blue">${icon('sparkle', 18)} Built <strong>${items.length} maintenance items</strong> for a ${esc(PROFILE_LABELS[profileFor(d)].toLowerCase())} ${d.duty === 'severe' ? 'in severe service' : ''} truck.</div>
      <p class="lead">When were these last done? Fill in what you know so TruckWise can calculate exact due dates. Leave the rest blank.</p>
      <form data-submit="ob-finish" class="stack">
        <div class="baseline-grid">${key.map((i) => `<div class="baseline">
          <div><strong>${esc(i.name)}</strong><div class="muted small">Every ${intervalFor(i, d) ? fmtNum(intervalFor(i, d)) + ' mi' : ''}${intervalFor(i, d) && monthsFor(i, d) ? ' or ' : ''}${monthsFor(i, d) ? monthsFor(i, d) + ' months' : ''} (typical)</div></div>
          <div class="row gap-sm">${input(`b_${i.id}_m`, '', 'type="number" inputmode="numeric" min="0" placeholder="at mileage" aria-label="Mileage when last done"')}${input(`b_${i.id}_d`, '', 'type="date" aria-label="Date when last done"')}</div></div>`).join('')}</div>
        <p class="muted small">${esc(DATA_SOURCE_NOTE)}</p>
        <div class="row gap"><button type="button" class="btn btn-ghost" data-action="ob-back">Back</button><span class="grow"></span><button class="btn btn-primary btn-xl">Finish — show my dashboard</button></div>
      </form>`;
  }
  return `<section class="onboard">${prog}<div class="card card-pad onboard-card">${body}</div></section>`;
}

function configPicker(selected = [], order = ['light', 'medium', 'heavy']) {
  const sel = new Set(selected);
  return order.map((gid) => {
    const g = CONFIG_GROUPS.find((x) => x.id === gid);
    return `<details class="config-group" ${gid === order[0] || g.items.some((i) => sel.has(i)) ? 'open' : ''}><summary>${esc(g.label)}</summary>
      <div class="chips">${g.items.map((c) => `<label class="chip"><input type="checkbox" name="configs[]" value="${esc(c)}" ${sel.has(c) ? 'checked' : ''}><span>${esc(c)}</span></label>`).join('')}</div></details>`;
  }).join('');
}

const nextStep = () => { const i = STEPS.findIndex(([s]) => s === ob.step); ob.step = STEPS[Math.min(i + 1, STEPS.length - 1)][0]; ob.error = ''; rerender(); window.scrollTo(0, 0); };
actions['ob-back'] = () => { const i = STEPS.findIndex(([s]) => s === ob.step); if (i <= 0) go('#/welcome'); else { ob.step = STEPS[i - 1][0]; rerender(); } };
actions['ob-skip'] = () => nextStep();
actions['ob-manual'] = () => {
  const v = $('input[name=vin]')?.value;
  if (v) { const r = validateVin(v); if (r.ok) { ob.draft.vin = r.vin; ob.draft.year = modelYearFromVin(r.vin); } }
  ob.warning = ''; ob.step = 'confirm'; rerender();
};

submits['ob-vin'] = async (form) => {
  const raw = formData(form).vin;
  const v = validateVin(raw);
  ob.draft.vin = raw;
  if (!v.ok) { ob.error = v.error; rerender(); return; }
  ob.decoding = true; ob.error = ''; rerender();
  try {
    const res = await decodeVin(v.vin);
    ob.decoding = false;
    if (!res.decodeOk) { ob.error = 'NHTSA could not decode this VIN. Double-check it, or enter the details manually.'; rerender(); return; }
    const keep = { configs: ob.draft.configs, duty: ob.draft.duty };
    ob.draft = { ...ob.draft, ...Object.fromEntries(Object.entries(res).filter(([, val]) => val !== '' && val != null)), ...keep, vin: v.vin };
    ob.warning = !v.checkDigitOk ? 'The VIN check digit doesn’t match. Make sure every character is correct.' : (res.warnings ? `NHTSA note: ${res.warnings}` : '');
    ob.step = 'confirm'; rerender();
  } catch (e) {
    ob.decoding = false;
    ob.draft.year = modelYearFromVin(v.vin);
    ob.draft.vin = v.vin;
    ob.warning = 'We couldn’t reach the VIN database (you may be offline). Enter the details below — you can re-decode later from the truck profile.';
    ob.step = 'confirm'; rerender();
  }
};

function readTruckForm(d) {
  return {
    year: num(d.year), make: d.make, model: d.model, trim: d.trim, class: num(d.class), fuel: d.fuel,
    engine: d.engine, transmission: d.transmission, drivetrain: d.drivetrain,
    airBrakes: d.airBrakes === '' || d.airBrakes == null ? undefined : d.airBrakes === 'true',
    nickname: d.nickname, vin: (d.vin || '').toUpperCase(), configs: d.configs || [],
  };
}
submits['ob-confirm'] = (form) => { Object.assign(ob.draft, readTruckForm(formData(form))); nextStep(); };
submits['ob-mileage'] = (form) => { const d = formData(form); ob.draft.mileage = num(d.mileage); ob.draft.engineHours = num(d.engineHours); nextStep(); };
lives['ob-zip'] = (form) => {
  const z = form.elements.zip.value; const h = form.querySelector('[data-zip-hint]');
  const r = /^\d{5}$/.test(z) ? regionForZip(z) : null;
  h.textContent = r ? `${r.state || 'Unknown state'} · ${r.label} region` : '';
};
submits['ob-zip'] = (form) => {
  const z = formData(form).zip;
  if (z && !/^\d{5}$/.test(z)) { toast('Enter a 5-digit ZIP code.', 'warn'); return; }
  ob.draft.zip = z; nextStep();
};
submits['ob-habits'] = (form) => {
  const d = formData(form);
  ob.draft.monthlyMiles = d.preset === 'custom' ? num(d.custom) : num(d.preset);
  ob.draft.duty = d.duty || 'highway'; nextStep();
};
submits['ob-finish'] = (form) => {
  const d = formData(form);
  const draft = { ...ob.draft };
  delete draft.errorCode; delete draft.errorText; delete draft.warnings;
  const records = [];
  for (const it of applicableItems(draft)) {
    const m = num(d[`b_${it.id}_m`]); const dt = d[`b_${it.id}_d`];
    if (m != null || dt) records.push({ id: uid(), date: dt || '', mileage: m ?? Number(draft.mileage), items: [it.id], title: `${it.name} (entered at setup)`, kind: 'service', source: 'setup' });
  }
  store.addTruck({ ...draft, records });
  ob = null;
  toast('Truck added. Your maintenance schedule is ready.');
  go('#/dashboard');
};

/* ------------------------------------------------------------------ */
/* Dashboard                                                           */
/* ------------------------------------------------------------------ */
function dashboardView({ truck }) {
  const sched = scheduleFor(truck);
  const status = overallStatus(sched);
  const health = healthBySystem(sched);
  const fc = forecast(truck, 12);
  const own = ownership(truck, truck.costs || {});
  const fuelLine = own.lines.find((l) => l.key === 'fuel');
  const notes = notificationsFor(truck, new Date(), store.settings());
  const overdue = sched.filter((s) => s.status === 'overdue');
  const known = sched.filter((s) => s.status !== 'unknown' && s.remaining != null).sort((a, b) => a.remaining - b.remaining);
  const next = known.find((s) => s.status !== 'overdue') || known[0];
  const unknownCount = sched.filter((s) => s.status === 'unknown').length;
  const spent = (truck.records || []).reduce((s, r) => s + (Number(r.total) || 0), 0);
  const yr = new Date().getFullYear();
  const spentYtd = (truck.records || []).filter((r) => (r.date || '').startsWith(String(yr))).reduce((s, r) => s + (Number(r.total) || 0), 0);
  const recent = (truck.records || []).slice().sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.mileage || 0) - (a.mileage || 0)).slice(0, 4);
  const timeline = fc.events.filter((e) => e.miles).slice(0, 6);

  return `
  <section class="truck-hero card">
    <div class="truck-hero-main">
      <div class="eyebrow">${esc(CLASSES.find((c) => c.id === Number(truck.class))?.label || 'Class ?')} · ${esc(truck.fuel || 'Fuel ?')}${truck.configs?.length ? ' · ' + esc(truck.configs.slice(0, 2).join(', ')) : ''}</div>
      <h1>${esc(truckName(truck))}</h1>
      <div class="muted">${esc(truck.engine || 'Engine not confirmed')}${truck.transmission ? ' · ' + esc(truck.transmission) : ''}${truck.vin ? ` · <span class="mono">${esc(truck.vin)}</span>` : ''}</div>
      <div class="hero-stats">
        <div><span class="label">Current mileage</span><span class="big">${fmtNum(truck.mileage)}</span><span class="muted small">mi${truck.mileageLog?.length ? ' · updated ' + esc(truck.mileageLog[truck.mileageLog.length - 1].date) : ''}</span></div>
        <div><span class="label">Maintenance status</span><span class="status-big status-${status.key}">${esc(status.label)}</span></div>
      </div>
    </div>
    <div class="hero-actions">
      <button class="btn btn-primary btn-xl" data-action="add-record" data-truck="${truck.id}">${icon('plus')} Add Maintenance Record</button>
      <button class="btn btn-secondary btn-xl" data-action="update-mileage" data-truck="${truck.id}">${icon('gauge')} Update Mileage</button>
    </div>
  </section>

  ${notes.length ? `<section class="alerts-strip">${notes.slice(0, 3).map((n) => `<a href="${n.route || '#/maintenance'}" class="alert alert-${n.level}">${icon(n.level === 'red' ? 'alert' : 'bell', 18)}<span>${esc(n.text)}</span>${icon('chevron', 16)}</a>`).join('')}${notes.length > 3 ? `<a href="#/alerts" class="alert alert-more">+${notes.length - 3} more</a>` : ''}</section>` : ''}

  ${unknownCount && unknownCount === sched.length ? `<div class="notice notice-blue">${icon('info', 18)} <span>No service history yet. Add your most recent services so TruckWise can calculate exact due dates — until then items show “No record”.</span> <button class="btn btn-sm btn-primary" data-action="add-record" data-truck="${truck.id}">Add a record</button></div>` : ''}

  <section class="widgets">
    ${widget('Next maintenance due', next ? `${esc(next.item.name)}` : 'Add history to calculate', next ? `${next.status === 'overdue' ? 'Overdue by' : 'In'} ${fmtNum(Math.abs(next.remaining))} mi · ${fmtNum(next.dueMiles)} mi` : `${unknownCount} items with no record`, next ? next.status : 'unknown', '#/maintenance', 'wrench')}
    ${widget('Overdue maintenance', String(overdue.length), overdue.length ? overdue.slice(0, 2).map((o) => esc(o.item.name)).join(', ') : 'Nothing overdue', overdue.length ? 'overdue' : 'ok', '#/maintenance', 'alert')}
    ${widget('Monthly fuel', fmtMoney(fuelLine?.value), `${fmtNum(own.miles)} mi · ${own.mpg} MPG · ${fmtMoney(own.price, 2)}/gal${fuelLine?.estimated ? ' (est.)' : ''}`, null, '#/costs', 'dollar')}
    ${widget('Monthly ownership cost', fmtMoney(own.total), `${fmtMoney(own.perMile, 2)} per mile${own.lines.some((l) => l.estimated) ? ' · includes estimates' : ''}`, null, '#/costs', 'truck')}
    ${widget('Upcoming 12-month maintenance', fmtRange(fc.total), `Save ${fmtRange(fc.monthlyReserve)} / month`, null, '#/maintenance/forecast', 'calendar')}
    ${widget('Maintenance spending', fmtMoney(spent), `${fmtMoney(spentYtd)} this year · ${truck.records?.length || 0} records`, null, '#/maintenance/history', 'report')}
    ${widget('Annual operating cost', fmtMoney(own.annual), 'Based on your cost settings', null, '#/costs', 'dollar')}
  </section>

  <div class="two-col">
    <section class="card card-pad">
      <div class="card-head"><h2>Truck health overview</h2><a href="#/maintenance" class="link">Schedule</a></div>
      <p class="muted small">Based on your service records and schedule — not a physical inspection.</p>
      <ul class="health-list">${health.map((h) => `<li><span class="health-ic">${icon(h.cat.icon, 20)}</span><span>${esc(h.cat.label)}</span><span class="grow"></span>${pill(h.key, h.label)}</li>`).join('')}</ul>
    </section>
    <section class="card card-pad">
      <div class="card-head"><h2>Maintenance timeline</h2><a href="#/maintenance/forecast" class="link">Forecast</a></div>
      ${timeline.length ? `<ol class="timeline">${timeline.map((e) => `<li class="tl-${STATUS[e.status]?.color || 'gray'}"><div class="tl-mi">${fmtNum(e.miles)} mi</div><div><strong>${esc(e.item.name)}</strong><div class="muted small">~${e.date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} · ${fmtRange(e.cost)}${e.status === 'unknown' ? ' · projected' : ''}</div></div></li>`).join('')}</ol>` : '<p class="muted">Nothing scheduled in the next 12 months.</p>'}
    </section>
  </div>

  <section class="card card-pad">
    <div class="card-head"><h2>Recent maintenance</h2><a href="#/maintenance/history" class="link">All history</a></div>
    ${recent.length ? `<ul class="list">${recent.map((r) => `<li><button class="list-row" data-action="edit-record" data-truck="${truck.id}" data-record="${r.id}"><span class="date">${esc(r.date || 'Date unknown')}</span><span class="grow"><strong>${esc(r.title || 'Service')}</strong><span class="muted small block">${fmtNum(r.mileage)} mi${r.shop ? ' · ' + esc(r.shop) : ''}</span></span><span>${r.total ? fmtMoney(r.total) : ''}</span></button></li>`).join('')}</ul>`
    : '<p class="muted">No records yet.</p>'}
  </section>`;
}

function widget(label, value, sub, status, href, ic) {
  return `<a class="widget card" href="${href}"><div class="widget-top"><span class="label">${esc(label)}</span>${icon(ic, 18, 'muted')}</div>
    <div class="widget-value ${status ? 'status-text-' + (STATUS[status]?.color || '') : ''}">${value}</div><div class="muted small">${sub}</div></a>`;
}

/* ------------------------------------------------------------------ */
/* Trucks & fleet                                                      */
/* ------------------------------------------------------------------ */
let fleetFilter = { status: 'all', sort: 'status' };
function trucksView({ args }) {
  if (args[0] === 'new') { resetOnboarding(); setTimeout(() => go('#/onboard'), 0); return ''; }
  if (args[0]) return truckDetail(args[0]);
  const trucks = store.get().trucks;
  const rows = trucks.map((t) => {
    const s = scheduleFor(t); const st = overallStatus(s); const own = ownership(t, t.costs || {});
    return { t, st, own, overdue: s.filter((x) => x.status === 'overdue').length, soon: s.filter((x) => x.status === 'soon').length };
  });
  let shown = rows.filter((r) => fleetFilter.status === 'all' || r.st.key === fleetFilter.status);
  const sorters = { status: (a, b) => STATUS[b.st.key].rank - STATUS[a.st.key].rank, mileage: (a, b) => b.t.mileage - a.t.mileage, cost: (a, b) => b.own.total - a.own.total, name: (a, b) => truckName(a.t).localeCompare(truckName(b.t)) };
  shown = shown.sort(sorters[fleetFilter.sort]);
  const totalCost = rows.reduce((s, r) => s + r.own.total, 0);
  return `<div class="page-head"><h1>My Trucks</h1><a class="btn btn-primary" href="#/trucks/new">${icon('plus')} Add truck</a></div>
    ${trucks.length > 1 ? `<section class="widgets widgets-4">
      ${widget('Trucks', String(trucks.length), 'Registered under this account', null, '#/trucks', 'truck')}
      ${widget('Need attention', String(rows.filter((r) => r.st.key === 'overdue').length), 'With overdue items', rows.some((r) => r.st.key === 'overdue') ? 'overdue' : 'ok', '#/alerts', 'alert')}
      ${widget('Fleet monthly cost', fmtMoney(totalCost), `${fmtMoney(totalCost * 12)} per year`, null, '#/costs', 'dollar')}
      ${widget('Fleet miles / month', fmtNum(rows.reduce((s, r) => s + r.own.miles, 0)), 'Estimated', null, '#/costs', 'gauge')}
    </section>` : ''}
    <section class="card card-pad">
      <div class="card-head wrap"><h2>${trucks.length > 1 ? 'Fleet' : 'Your truck'}</h2>
        <form class="row gap-sm wrap" data-live="fleet-filter">
          ${select('status', [['all', 'All statuses'], ['overdue', 'Needs attention'], ['soon', 'Due soon'], ['upcoming', 'Upcoming'], ['ok', 'Up to date'], ['unknown', 'No history']], fleetFilter.status, 'aria-label="Filter by status"')}
          ${select('sort', [['status', 'Sort: status'], ['mileage', 'Sort: mileage'], ['cost', 'Sort: monthly cost'], ['name', 'Sort: name']], fleetFilter.sort, 'aria-label="Sort"')}
        </form></div>
      <div class="table-wrap"><table class="table"><thead><tr><th>Truck</th><th>Class</th><th class="num">Mileage</th><th>Status</th><th class="num">Monthly cost</th><th class="num">Per mile</th><th></th></tr></thead>
      <tbody>${shown.map(({ t, st, own, overdue, soon }) => `<tr>
        <td><a href="#/trucks/${t.id}" class="strong">${esc(truckName(t))}</a><div class="muted small mono">${esc(t.vin || 'No VIN')}</div></td>
        <td>${t.class ? 'Class ' + t.class : '—'}</td><td class="num">${fmtNum(t.mileage)}</td>
        <td>${pill(st.key, st.label)}${overdue || soon ? `<div class="muted small">${overdue} overdue · ${soon} due soon</div>` : ''}</td>
        <td class="num">${fmtMoney(own.total)}</td><td class="num">${fmtMoney(own.perMile, 2)}</td>
        <td class="row gap-sm"><button class="btn btn-sm btn-ghost" data-action="switch-truck" data-truck="${t.id}">Open</button></td></tr>`).join('') || '<tr><td colspan="7" class="muted">No trucks match this filter.</td></tr>'}</tbody></table></div>
    </section>
    <p class="muted small">Team access with per-employee permissions (owner, manager, driver, mechanic) arrives with cloud accounts on the Fleet plan. See <a href="#/plans">Plans</a>.</p>`;
}
lives['fleet-filter'] = (form) => { fleetFilter = { ...fleetFilter, ...formData(form) }; rerender(); };
actions['switch-truck'] = (el) => { store.setActive(el.dataset.truck); go('#/dashboard'); };

function truckDetail(id) {
  const t = store.truck(id);
  if (!t) return emptyState('Truck not found', 'It may have been removed.', '<a class="btn btn-primary" href="#/trucks">Back to trucks</a>');
  const groupsOrder = Number(t.class) >= 7 ? ['heavy', 'medium', 'light'] : ['light', 'medium', 'heavy'];
  const items = applicableItems({ ...t, disabledItems: [] });
  const comp = complianceFor(t);
  const dates = t.dates || {};
  return `<div class="page-head"><div><a href="#/trucks" class="link small">← All trucks</a><h1>${esc(truckName(t))}</h1></div>
      <div class="row gap-sm"><button class="btn btn-ghost" data-action="redecode" data-truck="${t.id}">Re-decode VIN</button><button class="btn btn-ghost" data-action="switch-truck" data-truck="${t.id}">Open dashboard</button></div></div>
    <form data-submit="save-truck" data-truck="${t.id}" class="stack">
    <section class="card card-pad"><h2>Vehicle details</h2>
      ${t.decodedAt || t.source ? `<p class="muted small">Decoded from NHTSA vPIC${t.decodedAt ? ' on ' + esc(t.decodedAt.slice(0, 10)) : ''}. ${t.plant ? 'Built in ' + esc(t.plant) + '.' : ''}</p>` : ''}
      <div class="form-grid">
        ${field('Nickname', input('nickname', t.nickname || ''))}
        ${field('VIN', input('vin', t.vin || '', 'class="mono" maxlength="17"'))}
        ${field('Year', input('year', t.year || '', 'type="number"'))}
        ${field('Make', input('make', t.make || ''))}
        ${field('Model', input('model', t.model || ''))}
        ${field('Trim / series', input('trim', t.trim || ''))}
        ${field('Weight class', select('class', CLASSES.map((c) => [c.id, `${c.label} · ${c.range}`]), t.class), t.gvwrText ? esc(t.gvwrText) : '')}
        ${field('Fuel', select('fuel', FUEL_TYPES, t.fuel))}
        ${field('Engine', input('engine', t.engine || ''))}
        ${field('Transmission', select('transmission', [['', 'Unknown'], ...TRANSMISSIONS.filter((x) => x !== 'Unknown')], t.transmission))}
        ${field('Drivetrain', select('drivetrain', [['', 'Unknown'], ...DRIVETRAINS.filter((x) => x !== 'Unknown')], t.drivetrain))}
        ${field('Brakes', select('airBrakes', [['', 'Not sure'], ['true', 'Air brakes'], ['false', 'Hydraulic brakes']], t.airBrakes === undefined ? '' : String(t.airBrakes)))}
        ${field('ZIP code', input('zip', t.zip || '', 'inputmode="numeric" maxlength="5"'), t.zip ? esc(regionForZip(t.zip).label) + ' region' : '')}
        ${field('Monthly miles', input('monthlyMiles', t.monthlyMiles || '', 'type="number" min="0"'), `Used for forecasts. Currently ${fmtNum(monthlyMiles(t))}.`)}
        ${field('Duty cycle', select('duty', DUTY_CYCLES.map((c) => [c.id, c.label]), t.duty))}
        ${field('Shop labor rate override ($/hr)', input('laborRateOverride', t.laborRateOverride || '', 'type="number" min="0" placeholder="Use regional estimate"'))}
        <fieldset class="field span-2"><legend class="field-label">Configurations</legend>${configPicker(t.configs, groupsOrder)}</fieldset>
      </div>
    </section>
    <section class="card card-pad"><h2>Important dates</h2><p class="muted small">Used for reminders.</p>
      <div class="form-grid">
        ${field('Registration renewal', input('d_registrationDue', dates.registrationDue || '', 'type="date"'))}
        ${field('Insurance renewal', input('d_insuranceDue', dates.insuranceDue || '', 'type="date"'))}
        ${field('Annual DOT inspection due', input('d_annualInspectionDue', dates.annualInspectionDue || '', 'type="date"'))}
        ${field('Permits (IFTA / IRP / UCR) renewal', input('d_permitsDue', dates.permitsDue || '', 'type="date"'))}
      </div></section>
    <section class="card card-pad"><h2>Service intervals</h2>
      <p class="muted small">Typical intervals for your profile (${esc(PROFILE_LABELS[profileFor(t)])}${t.duty === 'severe' ? ', severe duty' : ''}). Replace them with the values in your owner’s or engine manual. Uncheck items that don’t apply.</p>
      <div class="table-wrap"><table class="table table-compact"><thead><tr><th>Track</th><th>Item</th><th class="num">Miles</th><th class="num">Months</th></tr></thead><tbody>
      ${items.map((it) => `<tr><td><input type="checkbox" name="track[]" value="${it.id}" ${(t.disabledItems || []).includes(it.id) ? '' : 'checked'} aria-label="Track ${esc(it.name)}"></td>
        <td>${esc(it.name)}${t.overrides?.[it.id] ? ' <span class="pill pill-blue">custom</span>' : ''}</td>
        <td class="num"><input class="input-sm" name="ov_${it.id}_m" type="number" min="0" step="500" placeholder="${fmtNum(intervalFor(it, { ...t, overrides: {} }) || 0)}" value="${esc(t.overrides?.[it.id]?.miles || '')}"></td>
        <td class="num"><input class="input-sm" name="ov_${it.id}_mo" type="number" min="0" placeholder="${it.months || ''}" value="${esc(t.overrides?.[it.id]?.months || '')}"></td></tr>`).join('')}
      </tbody></table></div></section>
    <div class="row gap sticky-actions"><button type="button" class="btn btn-ghost danger-text" data-action="delete-truck" data-truck="${t.id}">${icon('trash', 18)} Delete truck</button><span class="grow"></span><button class="btn btn-primary btn-lg">Save changes</button></div>
    </form>
    <section class="card card-pad"><h2>Registration & compliance checklist</h2><p class="muted small">Federal items that commonly apply at this weight. Requirements depend on how the truck operates (interstate vs. intrastate, for-hire, cargo). Confirm with FMCSA and your state.</p>
      <ul class="list">${comp.map((c) => `<li class="list-static"><div><strong>${esc(c.name)}</strong><div class="muted small">${esc(c.detail)}</div></div><a class="link small" href="${c.url}" target="_blank" rel="noopener">Official info</a></li>`).join('')}</ul></section>`;
}

submits['save-truck'] = (form) => {
  const d = formData(form);
  const t = store.truck(form.dataset.truck);
  const items = applicableItems({ ...t, disabledItems: [] });
  const track = new Set(d.track || []);
  const overrides = {};
  for (const it of items) {
    const m = num(d[`ov_${it.id}_m`]); const mo = num(d[`ov_${it.id}_mo`]);
    if (m || mo) overrides[it.id] = { miles: m || undefined, months: mo || undefined };
  }
  if (d.zip && !/^\d{5}$/.test(d.zip)) { toast('ZIP code must be 5 digits.', 'warn'); return; }
  store.updateTruck(t.id, {
    ...readTruckForm(d), zip: d.zip, monthlyMiles: num(d.monthlyMiles), duty: d.duty, laborRateOverride: num(d.laborRateOverride),
    dates: { registrationDue: d.d_registrationDue, insuranceDue: d.d_insuranceDue, annualInspectionDue: d.d_annualInspectionDue, permitsDue: d.d_permitsDue },
    overrides, disabledItems: items.filter((i) => !track.has(i.id)).map((i) => i.id),
  });
  toast('Truck saved. Schedule and costs updated.'); rerender();
};
actions['delete-truck'] = async (el) => {
  if (!(await confirmBox('This truck, its maintenance history, inspections and documents will be permanently deleted from this device.', 'Delete truck'))) return;
  store.removeTruck(el.dataset.truck); toast('Truck deleted.'); go(store.get().trucks.length ? '#/trucks' : '#/welcome');
};
actions['redecode'] = async (el) => {
  const t = store.truck(el.dataset.truck);
  const v = validateVin(t.vin);
  if (!v.ok) { toast(v.error, 'warn'); return; }
  el.disabled = true; el.innerHTML = '<span class="spinner"></span> Decoding…';
  try {
    const res = await decodeVin(v.vin);
    const fill = {};
    for (const [k, val] of Object.entries(res)) if (val !== '' && val != null && (t[k] == null || t[k] === '')) fill[k] = val;
    fill.decodedAt = res.decodedAt; fill.source = res.source; fill.gvwrText = res.gvwrText || t.gvwrText; fill.plant = res.plant || t.plant;
    store.updateTruck(t.id, fill);
    toast(`Decoded. Filled ${Object.keys(fill).length - 4 > 0 ? Object.keys(fill).length - 4 : 0} empty field(s); your entries were kept.`);
  } catch { toast('Could not reach the VIN database. Try again later.', 'warn'); }
  rerender();
};

/* ------------------------------------------------------------------ */
/* Alerts                                                              */
/* ------------------------------------------------------------------ */
function alertsView() {
  const s = store.settings();
  const notes = allNotifications();
  return `<div class="page-head"><h1>Reminders</h1></div>
    <section class="card card-pad">${notes.length ? `<ul class="list">${notes.map((n) => `<li class="list-static alert-row alert-row-${n.level}">
      <span class="alert-dot"></span><div class="grow"><strong>${esc(n.text)}</strong><div class="muted small">${esc(n.sub || '')}</div></div>
      ${n.itemId ? `<button class="btn btn-sm btn-secondary" data-action="add-record" data-truck="${n.truckId}" data-items="${n.itemId}">Mark done</button>` : ''}
      <button class="btn btn-sm btn-ghost" data-action="dismiss" data-key="${esc(n.text + n.truckId)}">Dismiss</button></li>`).join('')}</ul>`
    : '<p class="muted">You’re all caught up. Reminders appear here when service is due, renewals approach or recalls are found.</p>'}</section>
    <section class="card card-pad"><h2>Notification settings</h2>
      <form data-live="notif-prefs" class="form-grid">
        ${field('Remind me this many miles before a service is due', select('leadMiles', [[250, '250 miles'], [500, '500 miles'], [1000, '1,000 miles'], [2500, '2,500 miles'], [5000, '5,000 miles']], s.leadMiles))}
        <label class="field"><span class="field-label">Browser notifications</span>
          <span class="row gap-sm"><input type="checkbox" name="browserNotifications" ${s.browserNotifications ? 'checked' : ''}> Show a notification when I open TruckWise and something is due</span></label>
        <label class="field"><span class="field-label">Email reminders</span><span class="row gap-sm muted"><input type="checkbox" disabled> Available with a cloud account</span></label>
        <label class="field"><span class="field-label">Text message reminders</span><span class="row gap-sm muted"><input type="checkbox" disabled> Available with a cloud account</span></label>
      </form>
      ${store.get().dismissed?.length ? `<button class="btn btn-sm btn-ghost" data-action="undismiss">Restore ${store.get().dismissed.length} dismissed reminder(s)</button>` : ''}
    </section>`;
}
actions['dismiss'] = (el) => { store.update((s) => { s.dismissed = [...(s.dismissed || []), el.dataset.key]; }); rerender(); };
actions['undismiss'] = () => { store.update((s) => { s.dismissed = []; }); rerender(); };
lives['notif-prefs'] = async (form) => {
  const d = formData(form);
  store.setSetting('leadMiles', num(d.leadMiles));
  const want = !!form.elements.browserNotifications.checked;
  if (want && 'Notification' in window && Notification.permission !== 'granted') {
    const p = await Notification.requestPermission();
    if (p !== 'granted') { form.elements.browserNotifications.checked = false; toast('Notifications were blocked by the browser.', 'warn'); store.setSetting('browserNotifications', false); return; }
  }
  store.setSetting('browserNotifications', want);
};

function maybeBrowserNotify() {
  if (!store.settings().browserNotifications || !('Notification' in window) || Notification.permission !== 'granted') return;
  const key = 'truckwise.lastNotify';
  const todayStr = new Date().toISOString().slice(0, 10);
  try { if (localStorage.getItem(key) === todayStr) return; localStorage.setItem(key, todayStr); } catch { /* ignore */ }
  const urgent = allNotifications().filter((n) => n.level !== 'yellow');
  if (urgent.length) new Notification('TruckWise', { body: urgent.slice(0, 3).map((n) => n.text).join('\n') });
}

/* ------------------------------------------------------------------ */
/* Settings & plans                                                    */
/* ------------------------------------------------------------------ */
function settingsView() {
  const s = store.settings();
  return `<div class="page-head"><h1>Settings</h1></div>
    <section class="card card-pad"><h2>Appearance</h2>
      <form data-live="theme" class="row gap wrap">${[['auto', 'Match device'], ['light', 'Light'], ['dark', 'Dark']].map(([v, l]) => `<label class="choice choice-inline"><input type="radio" name="theme" value="${v}" ${s.theme === v ? 'checked' : ''}><span>${l}</span></label>`).join('')}</form></section>
    <section class="card card-pad"><h2>AI assistant</h2>
      <p class="muted">The built-in assistant answers common questions offline from your truck data. For open-ended questions and photo analysis (warning lights, damaged parts, invoices), connect Claude with your own Anthropic API key.</p>
      <div class="notice notice-yellow">${icon('info', 18)} <span>Your key is stored only in this browser and sent only to Anthropic. Don’t use a shared or company-wide key on a shared device. In the hosted version, AI requests go through the TruckWise server and no key is needed.</span></div>
      <form data-submit="save-key" class="row gap wrap">
        <input name="key" type="password" autocomplete="off" placeholder="${s.claudeKey ? 'Key saved ••••' + esc(s.claudeKey.slice(-4)) : 'sk-ant-…'}" aria-label="Anthropic API key" class="grow">
        <button class="btn btn-primary">Save key</button>${s.claudeKey ? '<button type="button" class="btn btn-ghost danger-text" data-action="remove-key">Remove</button>' : ''}
      </form></section>
    <section class="card card-pad"><h2>Your data</h2>
      <p class="muted">Trucks, records and settings are saved in this browser. Back them up regularly, or move them to another device with export/import. (Uploaded files stay on this device.)</p>
      <div class="row gap wrap"><button class="btn btn-secondary" data-action="export">${icon('upload', 18)} Export backup</button>
      <label class="btn btn-secondary">Import backup<input type="file" accept="application/json" data-import hidden></label>
      <button class="btn btn-ghost danger-text" data-action="reset-all">Erase all data</button></div></section>
    <section class="card card-pad"><h2>Data sources</h2>
      <ul class="list">
        <li class="list-static"><div><strong>VIN decoding & recalls</strong><div class="muted small">NHTSA vPIC and Recalls APIs (public U.S. government data), queried live from your browser.</div></div></li>
        <li class="list-static"><div><strong>Maintenance intervals & costs</strong><div class="muted small">${esc(DATA_SOURCE_NOTE)}</div></div></li>
        <li class="list-static"><div><strong>Fuel prices</strong><div class="muted small">Regional reference values (as of ${FUEL_REFERENCE_DATE}). Enter your actual pump price on the Costs page for accurate numbers. Live ZIP-level prices require a commercial fuel-price provider and are planned for the hosted version.</div></div></li>
        <li class="list-static"><div><strong>Compliance</strong><div class="muted small">FMCSA regulations (49 CFR Parts 393 & 396). Always check current rules and your state’s requirements.</div></div></li>
      </ul></section>`;
}
lives['theme'] = (form) => { store.setSetting('theme', formData(form).theme); applyTheme(); };
submits['save-key'] = (form) => {
  const k = formData(form).key;
  if (!k) return;
  if (!/^sk-ant-/.test(k)) { toast('That doesn’t look like an Anthropic API key (it should start with sk-ant-).', 'warn'); return; }
  store.setSetting('claudeKey', k); toast('Claude connected.'); rerender();
};
actions['remove-key'] = () => { store.setSetting('claudeKey', ''); toast('Key removed.'); rerender(); };
actions['export'] = () => {
  const blob = new Blob([store.exportJson()], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = `truckwise-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};
document.addEventListener('change', async (e) => {
  if (!e.target.matches('[data-import]')) return;
  const f = e.target.files[0]; if (!f) return;
  try { store.importJson(await f.text()); toast('Backup imported.'); go('#/dashboard'); } catch (err) { toast(err.message || 'Import failed.', 'warn'); }
});
actions['reset-all'] = async () => {
  if (!(await confirmBox('Every truck, record, inspection and setting on this device will be erased. Export a backup first if you might need it.', 'Erase everything'))) return;
  store.reset(); try { indexedDB.deleteDatabase('truckwise-files'); } catch { /* ignore */ }
  go('#/welcome');
};

function plansView() {
  const cur = store.settings().plan;
  return `<div class="page-head"><h1>Plans</h1></div>
    <p class="lead">Everything in this version is unlocked while TruckWise is in early access. Proposed pricing for launch:</p>
    <section class="plans">${PLANS.map((p) => `<div class="card card-pad plan ${p.id === 'pro' ? 'plan-featured' : ''}">
      ${p.id === 'pro' ? '<span class="pill pill-blue">Most popular</span>' : ''}<h2>${esc(p.name)}</h2><div class="plan-price">${esc(p.price)}</div>
      <ul class="checks">${p.features.map((f) => `<li>${icon('check', 16)} ${esc(f)}</li>`).join('')}</ul>
      ${cur === p.id ? '<span class="muted small">Current plan</span>' : ''}</div>`).join('')}</section>
    <p class="muted small">Prices are proposed tiers for customer testing, not final. Billing is not active.</p>`;
}

/* ------------------------------------------------------------------ */
/* Recall auto-check (once a week per truck, when online)              */
/* ------------------------------------------------------------------ */
async function autoRecalls() {
  for (const t of store.get().trucks) {
    const last = t.recalls?.checkedAt ? new Date(t.recalls.checkedAt) : null;
    if (last && Date.now() - last < 7 * 86400000) continue;
    if (!t.make || !t.model || !t.year) continue;
    try {
      const items = await fetchRecalls(t);
      store.updateTruck(t.id, (tr) => { tr.recalls = { ...(tr.recalls || {}), items, checkedAt: new Date().toISOString() }; });
    } catch { /* offline or blocked: try again next visit */ }
  }
}

/* ------------------------------------------------------------------ */
/* Boot                                                                */
/* ------------------------------------------------------------------ */
store.subscribe(() => { /* views re-render explicitly */ });
lastRoute = location.hash.split('/')[1] || '';
render();
maybeBrowserNotify();
setTimeout(() => autoRecalls().then(() => { if (['dashboard', 'alerts', 'recalls'].includes(document.body.dataset.route)) rerender(); }), 1500);
