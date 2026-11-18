import { store, files, uid } from '../store.js';
import { INSPECTION_CATEGORIES, COMPLIANCE_REFERENCES, CLASSES, isTractor } from '../data.js';
import { scheduleFor, forecast, overallStatus, ownership, fmtMoney, fmtNum, fmtRange, STATUS, daysBetween } from '../engine.js';
import { fetchRecalls } from '../api.js';
import { actions, submits, rerender, go, esc, icon, pill, field, input, select, formData, num, toast, confirmBox, openModal, closeModal, emptyState } from '../ui.js';
import { truckName } from '../assistant.js';

const today = () => new Date().toISOString().slice(0, 10);

/* ------------------------------------------------------------------ */
/* Inspections (DVIR)                                                  */
/* ------------------------------------------------------------------ */
const TYPES = { pre: 'Pre-trip inspection', post: 'Post-trip inspection', periodic: 'Periodic inspection' };
const airBrakes = (t) => t.airBrakes === true || (t.airBrakes !== false && Number(t.class) >= 7);
const catsFor = (t) => INSPECTION_CATEGORIES.filter((c) => (!c.tractorOnly || isTractor(t)) && (!c.airOnly || airBrakes(t)));

export function inspectionsView({ truck, args }) {
  if (args[0] === 'new') return inspectionForm(truck, args[1] || 'pre');
  if (args[0]) return inspectionDetail(truck, args[0]);
  const list = (truck.inspections || []).slice().sort((a, b) => new Date(b.date) - new Date(a.date));
  return `<div class="page-head"><div><h1>Inspection Center</h1><div class="muted">${esc(truckName(truck))}</div></div></div>
    <section class="start-grid">${Object.entries(TYPES).map(([k, l]) => `<a class="card card-pad start-card" href="#/inspections/new/${k}">${icon('clipboard', 28)}<strong>${l}</strong><span class="muted small">${k === 'pre' ? 'Before driving' : k === 'post' ? 'End of day — DVIR' : 'Monthly / annual checks'}</span></a>`).join('')}</section>
    <section class="card card-pad"><h2>Inspection history</h2>
      ${list.length ? `<ul class="list">${list.map((i) => { const bad = Object.values(i.results || {}).filter((r) => r.status === 'attention').length; return `<li><a class="list-row" href="#/inspections/${i.id}"><span class="date">${esc(i.date)}</span><span class="grow"><strong>${esc(TYPES[i.type] || 'Inspection')}</strong><span class="muted small block">${fmtNum(i.mileage)} mi${i.driver ? ' · ' + esc(i.driver) : ''}</span></span>${bad ? pill('overdue', `${bad} need attention`) : pill('ok', 'No defects')}</a></li>`; }).join('')}</ul>` : '<p class="muted">No inspections saved yet.</p>'}
    </section>
    <section class="card card-pad"><h2>Regulations & references</h2>
      <p class="muted small">This checklist helps you inspect consistently. It does not replace the inspections and records required by FMCSA or your state, or an inspection by a qualified inspector.</p>
      <ul class="list">${COMPLIANCE_REFERENCES.map((r) => `<li class="list-static"><a class="link" href="${r.url}" target="_blank" rel="noopener">${esc(r.label)}</a></li>`).join('')}</ul></section>`;
}

function inspectionForm(truck, type) {
  const cats = catsFor(truck);
  return `<div class="page-head"><div><a href="#/inspections" class="link small">← Inspections</a><h1>${esc(TYPES[type] || 'Inspection')}</h1><div class="muted">${esc(truckName(truck))}</div></div>
    <button class="btn btn-secondary" data-action="all-pass">${icon('check', 18)} Mark all passed</button></div>
    <form data-submit="save-inspection" data-truck="${truck.id}" data-type="${type}" class="stack">
      <section class="card card-pad form-grid">
        ${field('Date', input('date', today(), 'type="date" required'))}
        ${field('Odometer', input('mileage', truck.mileage, 'type="number" min="0" required'))}
        ${field('Driver / inspector', input('driver', store.get().lastDriver || '', 'autocomplete="name"'))}
        ${field('Location', input('location', ''))}
      </section>
      ${cats.map((c) => `<section class="card card-pad insp-cat"><h2>${esc(c.label)}</h2>
        ${c.items.map((it, j) => { const key = `${c.id}__${j}`; return `<div class="insp-row">
          <span class="grow">${esc(it)}</span>
          <div class="seg" role="radiogroup" aria-label="${esc(it)}">
            <label class="seg-ok"><input type="radio" name="r_${key}" value="pass"><span>${icon('check', 16)} Pass</span></label>
            <label class="seg-bad"><input type="radio" name="r_${key}" value="attention"><span>${icon('alert', 16)} Needs attention</span></label>
          </div>
          <input class="insp-comment" name="c_${key}" placeholder="Comment (optional)" aria-label="Comment for ${esc(it)}"></div>`; }).join('')}
      </section>`).join('')}
      <section class="card card-pad form-grid">
        <label class="field span-2"><span class="field-label">Remarks / defects found</span><textarea name="remarks" rows="3"></textarea></label>
        <label class="field span-2"><span class="field-label">Photos</span><input type="file" name="photos" accept="image/*" multiple capture="environment"></label>
        ${field('Signature (type your name)', input('signature', '', 'required'))}
        <label class="field"><span class="field-label">Defects</span><span class="row gap-sm"><input type="checkbox" name="corrected"> Listed defects were corrected or don’t affect safe operation</span></label>
      </section>
      <div class="row gap sticky-actions"><a class="btn btn-ghost" href="#/inspections">Cancel</a><span class="grow"></span><button class="btn btn-primary btn-lg">Save inspection</button></div>
    </form>`;
}
actions['all-pass'] = () => document.querySelectorAll('.seg-ok input').forEach((i) => { i.checked = true; });

submits['save-inspection'] = async (form) => {
  const t = store.truck(form.dataset.truck);
  const d = formData(form);
  const results = {};
  for (const c of catsFor(t)) c.items.forEach((it, j) => {
    const key = `${c.id}__${j}`;
    results[key] = { category: c.label, item: it, status: d[`r_${key}`] || 'unchecked', comment: d[`c_${key}`] || '' };
  });
  const unchecked = Object.values(results).filter((r) => r.status === 'unchecked').length;
  if (unchecked && !(await confirmBox(`${unchecked} item(s) were not checked. Save anyway?`, 'Save'))) return;
  const photos = [];
  for (const f of [...(form.elements.photos?.files || [])]) { try { photos.push(await files.put(f)); } catch { /* skip */ } }
  const insp = { id: uid(), type: form.dataset.type, date: d.date, mileage: num(d.mileage), driver: d.driver, location: d.location, results, remarks: d.remarks, signature: d.signature, corrected: !!form.elements.corrected.checked, photos, created: new Date().toISOString() };
  store.update((s) => { s.lastDriver = d.driver; });
  store.updateTruck(t.id, (tr) => {
    tr.inspections = [...(tr.inspections || []), insp];
    if (insp.mileage > Number(tr.mileage)) { tr.mileage = insp.mileage; tr.mileageLog = [...(tr.mileageLog || []), { date: insp.date, mileage: insp.mileage }]; }
  });
  const bad = Object.values(results).filter((r) => r.status === 'attention').length;
  toast(bad ? `Saved. ${bad} item(s) need attention — don’t drive with safety defects.` : 'Inspection saved.', bad ? 'warn' : 'ok');
  go(`#/inspections/${insp.id}`);
};

function inspectionDetail(truck, id) {
  const i = (truck.inspections || []).find((x) => x.id === id);
  if (!i) return emptyState('Inspection not found', '', '<a class="btn btn-primary" href="#/inspections">Back</a>');
  const rows = Object.values(i.results || {});
  const bad = rows.filter((r) => r.status === 'attention');
  return `<div class="page-head"><div><a href="#/inspections" class="link small">← Inspections</a><h1>${esc(TYPES[i.type])}</h1><div class="muted">${esc(i.date)} · ${fmtNum(i.mileage)} mi · ${esc(truckName(truck))}</div></div>
    <div class="row gap-sm"><button class="btn btn-secondary" data-action="print-inspection" data-id="${i.id}">${icon('print', 18)} PDF report</button><button class="btn btn-ghost danger-text" data-action="delete-inspection" data-id="${i.id}">${icon('trash', 18)}</button></div></div>
    ${bad.length ? `<div class="notice notice-red">${icon('alert', 18)} <span><strong>${bad.length} item(s) need attention.</strong> ${i.corrected ? 'Marked as corrected / not affecting safe operation.' : 'Have safety defects repaired before driving.'}</span>
      <button class="btn btn-sm btn-primary" data-action="add-record" data-truck="${truck.id}">Log the repair</button></div>` : `<div class="notice notice-green">${icon('check', 18)} No defects reported.</div>`}
    <section class="card"><div class="table-wrap"><table class="table table-compact"><thead><tr><th>Category</th><th>Item</th><th>Result</th><th>Comment</th></tr></thead><tbody>
      ${rows.map((r) => `<tr><td>${esc(r.category)}</td><td>${esc(r.item)}</td><td>${r.status === 'pass' ? pill('ok', 'Pass') : r.status === 'attention' ? pill('overdue', 'Attention') : pill('unknown', 'Not checked')}</td><td>${esc(r.comment)}</td></tr>`).join('')}
    </tbody></table></div></section>
    ${i.remarks ? `<section class="card card-pad"><h2>Remarks</h2><p>${esc(i.remarks)}</p></section>` : ''}
    ${i.photos?.length ? `<section class="card card-pad"><h2>Photos</h2><div class="row gap-sm wrap">${i.photos.map((p) => `<button class="btn btn-sm btn-ghost" data-action="open-file" data-file="${p.id}">${icon('camera', 16)} ${esc(p.name)}</button>`).join('')}</div></section>` : ''}
    <p class="muted small">Signed: ${esc(i.signature || '—')}${i.driver ? ' · ' + esc(i.driver) : ''}${i.location ? ' · ' + esc(i.location) : ''}</p>`;
}
actions['delete-inspection'] = async (el) => {
  if (!(await confirmBox('Delete this inspection record?'))) return;
  const t = store.activeTruck();
  store.updateTruck(t.id, (tr) => { tr.inspections = tr.inspections.filter((x) => x.id !== el.dataset.id); });
  go('#/inspections');
};
actions['print-inspection'] = (el) => {
  const t = store.activeTruck(); const i = t.inspections.find((x) => x.id === el.dataset.id);
  const rows = Object.values(i.results || {});
  printDoc(`${TYPES[i.type]} — ${truckName(t)}`, `
    ${vehicleBlock(t)}
    <table class="kv"><tr><th>Date</th><td>${esc(i.date)}</td><th>Odometer</th><td>${fmtNum(i.mileage)} mi</td></tr>
    <tr><th>Driver / inspector</th><td>${esc(i.driver || '')}</td><th>Location</th><td>${esc(i.location || '')}</td></tr></table>
    <h2>Results</h2><table><thead><tr><th>Category</th><th>Item</th><th>Result</th><th>Comment</th></tr></thead><tbody>
    ${rows.map((r) => `<tr><td>${esc(r.category)}</td><td>${esc(r.item)}</td><td class="${r.status}">${r.status === 'pass' ? 'Pass' : r.status === 'attention' ? 'NEEDS ATTENTION' : 'Not checked'}</td><td>${esc(r.comment)}</td></tr>`).join('')}</tbody></table>
    <h2>Remarks</h2><p>${esc(i.remarks || 'None')}</p>
    <p>${i.corrected ? '☑' : '☐'} Defects corrected or do not affect safe operation</p>
    <p class="sig">Driver signature: <strong>${esc(i.signature || '')}</strong></p>
    <p class="small">Generated by TruckWise. This report supports, but does not replace, records required under 49 CFR Part 396.</p>`);
};

/* ------------------------------------------------------------------ */
/* Recalls & warranty                                                  */
/* ------------------------------------------------------------------ */
export function recallsView({ truck }) {
  const r = truck.recalls || {};
  const resolved = new Set(r.resolved || []);
  const items = r.items || [];
  const ws = truck.warranties || [];
  return `<div class="page-head"><div><h1>Recalls & warranty</h1><div class="muted">${esc(truckName(truck))}</div></div>
    <button class="btn btn-secondary" data-action="check-recalls">${icon('shield', 18)} Check recalls now</button></div>
    <section class="card card-pad"><h2>Safety recalls</h2>
      <p class="muted small">From NHTSA for the ${esc([truck.year, truck.make, truck.model].filter(Boolean).join(' '))}${r.checkedAt ? ` · checked ${esc(r.checkedAt.slice(0, 10))}` : ''}. Recalls are listed by model and may not apply to your specific truck — confirm open recalls for your VIN
      ${truck.vin ? `at <a class="link" href="https://www.nhtsa.gov/recalls?vin=${encodeURIComponent(truck.vin)}" target="_blank" rel="noopener">nhtsa.gov/recalls</a>` : 'at nhtsa.gov/recalls'} or with your dealer.</p>
      ${!r.checkedAt ? '<p class="muted">Not checked yet.</p>' : items.length ? `<ul class="list">${items.map((x) => `<li class="list-static recall ${resolved.has(x.NHTSACampaignNumber) ? 'resolved' : ''}">
        <div class="grow"><div class="row gap-sm wrap"><strong>${esc(x.component || 'Recall')}</strong><span class="muted small mono">${esc(x.NHTSACampaignNumber)}</span>${resolved.has(x.NHTSACampaignNumber) ? pill('ok', 'Resolved / not applicable') : pill('overdue', 'Check')}</div>
        <details><summary class="link small">Details</summary><p class="small"><strong>Summary:</strong> ${esc(x.summary)}</p><p class="small"><strong>Risk:</strong> ${esc(x.consequence)}</p><p class="small"><strong>Remedy:</strong> ${esc(x.remedy)}</p></details></div>
        <button class="btn btn-sm btn-ghost" data-action="toggle-recall" data-id="${esc(x.NHTSACampaignNumber)}">${resolved.has(x.NHTSACampaignNumber) ? 'Reopen' : 'Mark resolved'}</button></li>`).join('')}</ul>`
    : `<div class="notice notice-green">${icon('check', 18)} No recalls found for this model and year.</div>`}
    </section>
    <section class="card card-pad"><div class="card-head"><h2>Warranties</h2><button class="btn btn-sm btn-primary" data-action="add-warranty">${icon('plus', 16)} Add warranty</button></div>
      ${ws.length ? `<ul class="list">${ws.map((w) => { const d = w.expires ? daysBetween(new Date(), w.expires) : null; const ml = w.maxMiles ? Number(w.maxMiles) - Number(truck.mileage) : null; const expired = (d != null && d < 0) || (ml != null && ml < 0);
        return `<li class="list-static"><div class="grow"><strong>${esc(w.name)}</strong><div class="muted small">${esc(w.provider || '')}${w.coverage ? ' · ' + esc(w.coverage) : ''}</div>
          <div class="small">${w.expires ? `Until ${esc(w.expires)}${d != null && d >= 0 ? ` (${d} days)` : ''}` : ''}${w.maxMiles ? ` · or ${fmtNum(w.maxMiles)} mi${ml != null && ml >= 0 ? ` (${fmtNum(ml)} mi left)` : ''}` : ''}</div></div>
          ${expired ? pill('unknown', 'Expired') : (d != null && d <= 60) || (ml != null && ml <= 5000) ? pill('soon', 'Ending soon') : pill('ok', 'Active')}
          <button class="icon-btn" data-action="delete-warranty" data-id="${w.id}" aria-label="Delete warranty">${icon('trash', 18)}</button></li>`; }).join('')}</ul>`
    : '<p class="muted">Track factory, extended and component warranties (engine, aftertreatment, tires, repairs) and get reminded before coverage ends.</p>'}
    </section>`;
}
actions['check-recalls'] = async (el) => {
  const t = store.activeTruck();
  el.disabled = true; el.innerHTML = '<span class="spinner"></span> Checking…';
  try {
    const items = await fetchRecalls(t);
    store.updateTruck(t.id, (tr) => { tr.recalls = { ...(tr.recalls || {}), items, checkedAt: new Date().toISOString() }; });
    toast(items.length ? `${items.length} recall(s) found for this model.` : 'No recalls found.');
  } catch (e) { toast(e.message?.includes('needed') ? e.message : 'Could not reach NHTSA. Try again later.', 'warn'); }
  rerender();
};
actions['toggle-recall'] = (el) => {
  const t = store.activeTruck();
  store.updateTruck(t.id, (tr) => {
    const set = new Set(tr.recalls?.resolved || []);
    set.has(el.dataset.id) ? set.delete(el.dataset.id) : set.add(el.dataset.id);
    tr.recalls = { ...(tr.recalls || {}), resolved: [...set] };
  });
  rerender();
};
actions['add-warranty'] = () => {
  openModal(`<h2>Add warranty</h2><form data-submit="save-warranty" class="form-grid">
    ${field('Name', input('name', '', 'required placeholder="e.g. Engine extended warranty"'))}
    ${field('Provider', input('provider', '', 'placeholder="Dealer / manufacturer / shop"'))}
    ${field('Expires on', input('expires', '', 'type="date"'))}
    ${field('Or at mileage', input('maxMiles', '', 'type="number" min="0"'))}
    <label class="field span-2"><span class="field-label">Coverage notes</span><input name="coverage" placeholder="What’s covered, deductible, claim phone"></label>
    <div class="modal-actions span-2"><button type="button" class="btn btn-ghost" data-action="close-modal">Cancel</button><button class="btn btn-primary">Save</button></div></form>`);
};
submits['save-warranty'] = (form) => {
  const d = formData(form); const t = store.activeTruck();
  store.updateTruck(t.id, (tr) => { tr.warranties = [...(tr.warranties || []), { id: uid(), ...d, maxMiles: num(d.maxMiles) }]; });
  closeModal(); toast('Warranty saved.'); rerender();
};
actions['delete-warranty'] = async (el) => {
  if (!(await confirmBox('Delete this warranty?'))) return;
  const t = store.activeTruck();
  store.updateTruck(t.id, (tr) => { tr.warranties = tr.warranties.filter((w) => w.id !== el.dataset.id); });
  rerender();
};

/* ------------------------------------------------------------------ */
/* Repair shops                                                        */
/* ------------------------------------------------------------------ */
const SHOP_TYPES = [
  ['semi truck repair', 'Commercial truck repair'], ['mobile diesel mechanic', 'Mobile diesel mechanic'], ['commercial truck tire shop', 'Tire shop'],
  ['truck transmission repair', 'Transmission specialist'], ['diesel engine repair', 'Engine specialist'], ['heavy duty towing', 'Towing & roadside'],
  ['truck parts store', 'Truck parts'], ['truck dealership service', 'Dealer service'],
];
export function shopsView({ truck }) {
  const shops = store.get().shops || [];
  return `<div class="page-head"><h1>Repair shops & parts</h1></div>
    <form class="card card-pad" data-submit="shop-search">
      <h2>Find help near you</h2>
      <div class="form-grid form-grid-3">
        ${field('What do you need?', select('type', SHOP_TYPES, 'semi truck repair'))}
        ${field('ZIP code', input('zip', truck.zip || '', 'inputmode="numeric" maxlength="5"'))}
        ${field('Distance', select('dist', [['10', '10 miles'], ['25', '25 miles'], ['50', '50 miles'], ['100', '100 miles']], '25'))}
      </div>
      <div class="row gap-sm wrap"><button class="btn btn-primary">${icon('map', 18)} Search on map</button>
        <a class="btn btn-ghost" href="#/costs/value">Compare a repair quote</a></div>
      <p class="muted small">Opens Google Maps with reviews, hours and directions. Built-in shop listings with labor rates are planned for the hosted version.</p>
    </form>
    <section class="card card-pad"><div class="card-head"><h2>Saved shops</h2><button class="btn btn-sm btn-primary" data-action="add-shop">${icon('plus', 16)} Add shop</button></div>
      ${shops.length ? `<ul class="list">${shops.map((s) => `<li class="list-static"><div class="grow"><strong>${esc(s.name)}</strong> ${s.preferred ? pill('ok', 'Preferred') : ''}
        <div class="muted small">${esc(SHOP_TYPES.find(([k]) => k === s.type)?.[1] || s.type || '')}${s.address ? ' · ' + esc(s.address) : ''}${s.laborRate ? ` · ${fmtMoney(s.laborRate)}/hr` : ''}${s.rating ? ' · ' + '★'.repeat(Number(s.rating)) : ''}</div>
        ${s.notes ? `<div class="small">${esc(s.notes)}</div>` : ''}</div>
        ${s.phone ? `<a class="btn btn-sm btn-secondary" href="tel:${esc(s.phone.replace(/[^\d+]/g, ''))}">${icon('phone', 16)} Call</a>` : ''}
        <button class="icon-btn" data-action="edit-shop" data-id="${s.id}" aria-label="Edit shop">${icon('edit', 18)}</button></li>`).join('')}</ul>`
    : '<p class="muted">Save the shops you trust, with phone numbers and labor rates, so they’re one tap away.</p>'}
    </section>`;
}
submits['shop-search'] = (form) => {
  const d = formData(form);
  const q = `${d.type} within ${d.dist} miles of ${d.zip || 'me'}`;
  window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`, '_blank', 'noopener');
};
function shopModal(s = {}) {
  openModal(`<h2>${s.id ? 'Edit shop' : 'Add shop'}</h2><form data-submit="save-shop" data-id="${s.id || ''}" class="form-grid">
    ${field('Name', input('name', s.name, 'required'))}
    ${field('Type', select('type', SHOP_TYPES, s.type))}
    ${field('Phone', input('phone', s.phone, 'type="tel"'))}
    ${field('Address', input('address', s.address))}
    ${field('Labor rate ($/hr)', input('laborRate', s.laborRate, 'type="number" min="0"'))}
    ${field('Your rating', select('rating', [['', '—'], ['5', '★★★★★'], ['4', '★★★★'], ['3', '★★★'], ['2', '★★'], ['1', '★']], s.rating))}
    <label class="field span-2"><span class="field-label">Notes</span><input name="notes" value="${esc(s.notes || '')}"></label>
    <label class="field span-2 row gap-sm"><input type="checkbox" name="preferred" ${s.preferred ? 'checked' : ''}> Preferred shop</label>
    <div class="modal-actions span-2">${s.id ? `<button type="button" class="btn btn-ghost danger-text" data-action="delete-shop" data-id="${s.id}">Delete</button>` : ''}<span class="grow"></span><button type="button" class="btn btn-ghost" data-action="close-modal">Cancel</button><button class="btn btn-primary">Save</button></div></form>`);
}
actions['add-shop'] = () => shopModal();
actions['edit-shop'] = (el) => shopModal(store.get().shops.find((s) => s.id === el.dataset.id));
submits['save-shop'] = (form) => {
  const d = formData(form);
  const shop = { ...d, laborRate: num(d.laborRate), preferred: !!form.elements.preferred.checked };
  store.update((s) => {
    if (form.dataset.id) Object.assign(s.shops.find((x) => x.id === form.dataset.id), shop);
    else s.shops.push({ id: uid(), ...shop });
  });
  closeModal(); toast('Shop saved.'); rerender();
};
actions['delete-shop'] = (el) => { store.update((s) => { s.shops = s.shops.filter((x) => x.id !== el.dataset.id); }); closeModal(); rerender(); };

/* ------------------------------------------------------------------ */
/* Documents                                                           */
/* ------------------------------------------------------------------ */
const DOC_TYPES = ['Repair invoice', 'Receipt', 'Inspection report', 'Photo', 'Warranty', 'Registration', 'Insurance', 'Permit', 'Title / bill of sale', 'Other'];
export function documentsView({ truck }) {
  const docs = (truck.documents || []).slice().sort((a, b) => (b.added || '').localeCompare(a.added || ''));
  const attached = (truck.records || []).flatMap((r) => (r.files || []).map((f) => ({ ...f, rec: r })));
  return `<div class="page-head"><div><h1>Documents</h1><div class="muted">${esc(truckName(truck))}</div></div></div>
    <form class="card card-pad" data-submit="upload-doc">
      <h2>Upload</h2><div class="form-grid form-grid-3">
        ${field('Type', select('type', DOC_TYPES))}
        ${field('Description', input('label', '', 'placeholder="Optional"'))}
        ${field('File(s)', '<input type="file" name="file" multiple required accept="image/*,application/pdf,.doc,.docx,.txt,.xls,.xlsx">')}
      </div><button class="btn btn-primary">${icon('upload', 18)} Upload</button>
      <p class="muted small">Files are stored on this device only (up to 25 MB each). Export doesn’t include files.</p></form>
    <section class="card card-pad"><h2>Truck documents</h2>
      ${docs.length ? `<ul class="list">${docs.map((d) => `<li class="list-static"><span class="file-ic">${icon(d.mime?.startsWith('image/') ? 'camera' : 'file', 20)}</span><div class="grow"><button class="link strong" data-action="open-file" data-file="${d.fileId}">${esc(d.label || d.name)}</button><div class="muted small">${esc(d.type)} · ${esc((d.added || '').slice(0, 10))} · ${Math.max(1, Math.round((d.size || 0) / 1024))} KB</div></div>
        <button class="icon-btn" data-action="delete-doc" data-id="${d.id}" aria-label="Delete document">${icon('trash', 18)}</button></li>`).join('')}</ul>` : '<p class="muted">No documents yet.</p>'}
    </section>
    ${attached.length ? `<section class="card card-pad"><h2>Attached to maintenance records</h2><ul class="list">${attached.map((f) => `<li class="list-static"><span class="file-ic">${icon('file', 20)}</span><div class="grow"><button class="link strong" data-action="open-file" data-file="${f.id}">${esc(f.name)}</button><div class="muted small">${esc(f.rec.date)} · ${esc(f.rec.title || '')}</div></div></li>`).join('')}</ul></section>` : ''}`;
}
submits['upload-doc'] = async (form) => {
  const d = formData(form); const t = store.activeTruck();
  const list = [...form.elements.file.files];
  const added = [];
  for (const f of list) {
    if (f.size > 25 * 1024 * 1024) { toast(`${f.name} is over 25 MB.`, 'warn'); continue; }
    try { const s = await files.put(f); added.push({ id: uid(), fileId: s.id, name: f.name, mime: f.type, size: f.size, type: d.type, label: list.length === 1 ? d.label : '', added: new Date().toISOString() }); }
    catch { toast(`Could not save ${f.name}.`, 'warn'); }
  }
  store.updateTruck(t.id, (tr) => { tr.documents = [...(tr.documents || []), ...added]; });
  toast(`${added.length} document(s) uploaded.`); rerender();
};
actions['delete-doc'] = async (el) => {
  if (!(await confirmBox('Delete this document?'))) return;
  const t = store.activeTruck(); const doc = t.documents.find((x) => x.id === el.dataset.id);
  if (doc) files.remove(doc.fileId);
  store.updateTruck(t.id, (tr) => { tr.documents = tr.documents.filter((x) => x.id !== el.dataset.id); });
  rerender();
};

/* ------------------------------------------------------------------ */
/* Reports                                                             */
/* ------------------------------------------------------------------ */
export function reportsView({ truck }) {
  const n = store.get().trucks.length;
  return `<div class="page-head"><h1>Reports</h1></div>
    <section class="start-grid">
      <button class="card card-pad start-card" data-action="report-vehicle">${icon('report', 28)}<strong>Vehicle report</strong><span class="muted small">VIN, mileage, full maintenance & repair history, upcoming service, expenses and inspections. Great when selling.</span></button>
      <button class="card card-pad start-card" data-action="report-fleet">${icon('truck', 28)}<strong>Fleet summary</strong><span class="muted small">${n} truck(s): status, mileage, monthly cost and overdue items.</span></button>
      <a class="card card-pad start-card" href="#/inspections">${icon('clipboard', 28)}<strong>Inspection reports</strong><span class="muted small">Open any saved inspection and choose “PDF report”.</span></a>
    </section>
    <p class="muted small">Reports open in a new tab and print dialog. Choose “Save as PDF” as the printer to download.</p>`;
}

function vehicleBlock(t) {
  return `<table class="kv"><tr><th>Vehicle</th><td>${esc([t.year, t.make, t.model, t.trim].filter(Boolean).join(' '))}</td><th>VIN</th><td class="mono">${esc(t.vin || '—')}</td></tr>
    <tr><th>Class</th><td>${esc(CLASSES.find((c) => c.id === Number(t.class))?.label || '—')}${t.gvwrText ? ' · ' + esc(t.gvwrText) : ''}</td><th>Mileage</th><td>${fmtNum(t.mileage)} mi</td></tr>
    <tr><th>Engine</th><td>${esc(t.engine || '—')}</td><th>Fuel / transmission</th><td>${esc([t.fuel, t.transmission].filter(Boolean).join(' / ') || '—')}</td></tr></table>`;
}

actions['report-vehicle'] = () => {
  const t = store.activeTruck();
  const recs = (t.records || []).slice().sort((a, b) => new Date(a.date) - new Date(b.date));
  const sched = scheduleFor(t);
  const fc = forecast(t, 12);
  const total = recs.reduce((s, r) => s + (Number(r.total) || 0), 0);
  const insp = (t.inspections || []).slice().sort((a, b) => new Date(b.date) - new Date(a.date));
  printDoc(`Vehicle report — ${truckName(t)}`, `
    ${vehicleBlock(t)}
    <div class="stats"><div><span>Maintenance status</span><strong>${esc(overallStatus(sched).label)}</strong></div><div><span>Service records</span><strong>${recs.length}</strong></div><div><span>Total maintenance spend</span><strong>${fmtMoney(total)}</strong></div><div><span>Next 12 months (est.)</span><strong>${fmtRange(fc.total)}</strong></div></div>
    <h2>Maintenance & repair history</h2>
    ${recs.length ? `<table><thead><tr><th>Date</th><th>Mileage</th><th>Service</th><th>Shop</th><th>Total</th></tr></thead><tbody>${recs.map((r) => `<tr><td>${esc(r.date)}</td><td>${fmtNum(r.mileage)}</td><td>${esc(r.title || '')}${r.parts ? `<br><small>${esc(r.parts)}</small>` : ''}</td><td>${esc(r.shop || '')}</td><td>${r.total != null ? fmtMoney(r.total) : ''}</td></tr>`).join('')}</tbody></table>` : '<p>No records.</p>'}
    <h2>Upcoming maintenance</h2>
    <table><thead><tr><th>Item</th><th>Status</th><th>Due</th><th>Est. cost</th></tr></thead><tbody>${sched.filter((s) => s.status !== 'ok').slice(0, 20).map((s) => `<tr><td>${esc(s.item.name)}</td><td>${esc(STATUS[s.status].label)}</td><td>${s.dueMiles ? fmtNum(s.dueMiles) + ' mi' : s.dueDate ? s.dueDate.toISOString().slice(0, 10) : 'No record'}</td><td>${fmtRange(s.cost.total)}</td></tr>`).join('')}</tbody></table>
    <h2>Inspections</h2>
    ${insp.length ? `<table><thead><tr><th>Date</th><th>Type</th><th>Mileage</th><th>Defects</th></tr></thead><tbody>${insp.map((i) => `<tr><td>${esc(i.date)}</td><td>${esc(TYPES[i.type])}</td><td>${fmtNum(i.mileage)}</td><td>${Object.values(i.results).filter((r) => r.status === 'attention').length}</td></tr>`).join('')}</tbody></table>` : '<p>No inspections recorded.</p>'}
    <p class="small">Cost estimates are planning figures based on typical intervals and regional labor rates. Records are as entered by the owner.</p>`);
};
actions['report-fleet'] = () => {
  const trucks = store.get().trucks;
  const rows = trucks.map((t) => { const s = scheduleFor(t); const o = ownership(t, t.costs || {}); return { t, st: overallStatus(s), o, over: s.filter((x) => x.status === 'overdue').map((x) => x.item.name) }; });
  const total = rows.reduce((a, r) => a + r.o.total, 0);
  printDoc('Fleet summary', `
    <div class="stats"><div><span>Trucks</span><strong>${trucks.length}</strong></div><div><span>Monthly cost</span><strong>${fmtMoney(total)}</strong></div><div><span>Annual cost</span><strong>${fmtMoney(total * 12)}</strong></div><div><span>Need attention</span><strong>${rows.filter((r) => r.over.length).length}</strong></div></div>
    <table><thead><tr><th>Truck</th><th>VIN</th><th>Mileage</th><th>Status</th><th>Overdue</th><th>Monthly</th><th>Per mile</th></tr></thead><tbody>
    ${rows.map(({ t, st, o, over }) => `<tr><td>${esc(truckName(t))}</td><td class="mono">${esc(t.vin || '')}</td><td>${fmtNum(t.mileage)}</td><td>${esc(st.label)}</td><td>${esc(over.join(', '))}</td><td>${fmtMoney(o.total)}</td><td>${fmtMoney(o.perMile, 2)}</td></tr>`).join('')}</tbody></table>`);
};

export function printDoc(title, body) {
  const w = window.open('', '_blank');
  if (!w) { toast('Allow pop-ups to open the report.', 'warn'); return; }
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>
    body{font:13px/1.45 Inter,system-ui,sans-serif;color:#0e1726;margin:32px;max-width:900px}
    h1{font-size:22px;margin:0 0 4px}h2{font-size:15px;margin:22px 0 8px;border-bottom:2px solid #0e1726;padding-bottom:4px}
    table{width:100%;border-collapse:collapse;margin:6px 0}th,td{text-align:left;padding:5px 7px;border-bottom:1px solid #dfe4eb;vertical-align:top}
    th{background:#f4f6f9;font-weight:600}.kv th{width:16%}.mono{font-family:ui-monospace,Menlo,monospace}
    .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:14px 0}.stats div{border:1px solid #dfe4eb;border-radius:8px;padding:8px}
    .stats span{display:block;font-size:11px;color:#5b6676}.stats strong{font-size:16px}.attention{color:#b91c1c;font-weight:700}
    .small,small{font-size:11px;color:#5b6676}.head{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:12px}
    .sig{margin-top:24px}@media print{body{margin:12mm}}</style></head><body>
    <div class="head"><div><h1>${esc(title)}</h1><div class="small">Generated ${new Date().toLocaleString()}</div></div><strong>TruckWise</strong></div>
    ${body}<script>window.onload=()=>setTimeout(()=>window.print(),250)<\/script></body></html>`);
  w.document.close();
}
