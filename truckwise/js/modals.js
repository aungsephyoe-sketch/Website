// Shared modals: add/edit maintenance record, update mileage, postpone.
import { store, files, uid } from './store.js';
import { applicableItems, intervalFor, scheduleFor, fmtNum, fmtMoney } from './engine.js';
import { actions, submits, openModal, closeModal, toast, esc, formData, num, field, input, rerender, icon, confirmBox } from './ui.js';
import { truckName } from './assistant.js';

const today = () => new Date().toISOString().slice(0, 10);

export function openRecordModal(truckId, { items = [], recordId = null, kind = 'service' } = {}) {
  const t = store.truck(truckId); if (!t) return;
  const rec = recordId ? t.records.find((r) => r.id === recordId) : null;
  const sel = new Set(rec?.items || items);
  const all = applicableItems(t);
  const shops = store.get().shops;
  const r = rec || {};
  openModal(`
    <h2>${rec ? 'Edit maintenance record' : kind === 'inspect' ? 'Record an inspection' : 'Add maintenance record'}</h2>
    <p class="muted">${esc(truckName(t))} · currently ${fmtNum(t.mileage)} mi. Include work done before you used TruckWise to keep the history complete.</p>
    <form data-submit="save-record" class="form-grid" data-truck="${t.id}" data-record="${rec?.id || ''}" data-kind="${esc(r.kind || kind)}">
      ${field('Date of service', input('date', rec ? r.date : today(), rec && !r.date ? 'type="date"' : 'type="date" required'), rec && !r.date ? 'Unknown date — leave blank if not known' : '')}
      ${field('Mileage at service', input('mileage', r.mileage ?? t.mileage, 'type="number" inputmode="numeric" min="0" required'))}
      <fieldset class="span-2 field"><legend class="field-label">What was done?</legend>
        <div class="check-grid">${all.map((it) => `<label class="check"><input type="checkbox" name="items[]" value="${it.id}" ${sel.has(it.id) ? 'checked' : ''}><span>${esc(it.name)}</span></label>`).join('')}</div>
      </fieldset>
      ${field('Description / other work', input('title', r.title || '', 'placeholder="e.g. Replaced front brake pads"'), 'Optional when items are checked above.')}
      ${field('Repair shop', input('shop', r.shop || '', 'list="shop-list" placeholder="Shop name or “Self”"') + `<datalist id="shop-list">${shops.map((s) => `<option value="${esc(s.name)}">`).join('')}</datalist>`)}
      ${field('Parts replaced', input('parts', r.parts || '', 'placeholder="Part names / numbers"'), '', )}
      ${field('Parts cost ($)', input('partsCost', r.partsCost ?? '', 'type="number" step="0.01" min="0" inputmode="decimal"'))}
      ${field('Labor cost ($)', input('laborCost', r.laborCost ?? '', 'type="number" step="0.01" min="0" inputmode="decimal"'))}
      ${field('Total cost ($)', input('total', r.total ?? '', 'type="number" step="0.01" min="0" inputmode="decimal" placeholder="Auto: parts + labor"'))}
      ${field('Warranty on this work', input('warranty', r.warranty || '', 'placeholder="e.g. 12 months / 100,000 mi"'))}
      ${field('Next recommended service (mi)', input('nextMiles', r.nextMiles ?? '', 'type="number" min="0" placeholder="Leave blank to auto-calculate"'), '<span data-next-hint></span>')}
      <label class="field span-2"><span class="field-label">Notes</span><textarea name="notes" rows="2">${esc(r.notes || '')}</textarea></label>
      <label class="field span-2"><span class="field-label">Invoices, receipts, photos, reports</span>
        <input type="file" name="files" multiple accept="image/*,application/pdf,.doc,.docx,.txt">
        ${(r.files || []).length ? `<span class="field-hint">${r.files.length} file(s) already attached</span>` : ''}</label>
      <div class="modal-actions span-2">
        ${rec ? `<button type="button" class="btn btn-ghost danger-text" data-action="delete-record" data-truck="${t.id}" data-record="${rec.id}">${icon('trash', 18)} Delete</button>` : ''}
        <span class="grow"></span>
        <button type="button" class="btn btn-ghost" data-action="close-modal">Cancel</button>
        <button class="btn btn-primary" type="submit">Save record</button>
      </div>
    </form>`, {
    wide: true,
    onMount(m) {
      const form = m.querySelector('form');
      const hint = m.querySelector('[data-next-hint]');
      const update = () => {
        const d = formData(form);
        const ids = d.items || [];
        const miles = num(d.mileage) || 0;
        const ivs = ids.map((id) => intervalFor(all.find((a) => a.id === id), t)).filter(Boolean);
        hint.textContent = ivs.length ? `Auto: ${fmtNum(miles + Math.min(...ivs))} mi based on your schedule` : '';
        const totalEl = form.elements.total;
        if (!totalEl.dataset.touched) {
          const sum = (num(d.partsCost) || 0) + (num(d.laborCost) || 0);
          totalEl.placeholder = sum ? fmtMoney(sum, 2) + ' (auto)' : 'Auto: parts + labor';
        }
      };
      form.elements.total.addEventListener('input', (e) => { e.target.dataset.touched = '1'; });
      form.addEventListener('input', update); update();
    },
  });
}

submits['save-record'] = async (form) => {
  const t = store.truck(form.dataset.truck); if (!t) return;
  const d = formData(form);
  const ids = d.items || [];
  if (!ids.length && !d.title) { toast('Check at least one item or add a description.', 'warn'); return; }
  const fileList = [...(form.elements.files?.files || [])];
  const saved = [];
  for (const f of fileList) {
    if (f.size > 25 * 1024 * 1024) { toast(`${f.name} is larger than 25 MB and was skipped.`, 'warn'); continue; }
    try { saved.push(await files.put(f)); } catch { toast(`Could not store ${f.name}.`, 'warn'); }
  }
  const all = applicableItems(t);
  const partsCost = num(d.partsCost); const laborCost = num(d.laborCost);
  const total = num(d.total) ?? ((partsCost || laborCost) ? (partsCost || 0) + (laborCost || 0) : null);
  const titles = ids.map((id) => all.find((a) => a.id === id)?.name).filter(Boolean);
  const rec = {
    date: d.date, mileage: num(d.mileage), items: ids, title: d.title || titles.join(', '), shop: d.shop, parts: d.parts,
    partsCost, laborCost, total, warranty: d.warranty, nextMiles: num(d.nextMiles), notes: d.notes, kind: form.dataset.kind || 'service',
  };
  store.updateTruck(t.id, (tr) => {
    const existing = form.dataset.record ? tr.records.find((r) => r.id === form.dataset.record) : null;
    if (existing) Object.assign(existing, rec, { files: [...(existing.files || []), ...saved] });
    else tr.records.push({ id: uid(), created: new Date().toISOString(), ...rec, files: saved });
    // Completing an item clears any postponement.
    ids.forEach((id) => { if (tr.postponed) delete tr.postponed[id]; });
    // Per-record "next service" overrides the computed due mileage.
    if (rec.nextMiles && ids.length === 1 && rec.mileage && rec.nextMiles > rec.mileage) {
      tr.postponed ||= {}; tr.postponed[ids[0]] = { miles: rec.nextMiles - rec.mileage - intervalFor(all.find((a) => a.id === ids[0]), tr) };
    }
    if (rec.mileage > (Number(tr.mileage) || 0)) {
      tr.mileage = rec.mileage;
      tr.mileageLog = [...(tr.mileageLog || []), { date: rec.date, mileage: rec.mileage }];
    }
  });
  closeModal(); toast('Maintenance record saved. Schedule updated.'); rerender();
};

actions['delete-record'] = async (el) => {
  if (!(await confirmBox('This maintenance record and its attachments will be deleted.'))) return;
  const t = store.truck(el.dataset.truck);
  const rec = t?.records.find((r) => r.id === el.dataset.record);
  (rec?.files || []).forEach((f) => files.remove(f.id));
  store.updateTruck(t.id, (tr) => { tr.records = tr.records.filter((r) => r.id !== el.dataset.record); });
  toast('Record deleted.'); rerender();
};

actions['add-record'] = (el) => openRecordModal(el.dataset.truck || store.activeTruck()?.id, { items: el.dataset.items ? el.dataset.items.split(',') : [], kind: el.dataset.kind });
actions['edit-record'] = (el) => openRecordModal(el.dataset.truck, { recordId: el.dataset.record });

export function openMileageModal(truckId) {
  const t = store.truck(truckId); if (!t) return;
  openModal(`<h2>Update mileage</h2><p class="muted">${esc(truckName(t))} · last reading ${fmtNum(t.mileage)} mi</p>
    <form data-submit="save-mileage" data-truck="${t.id}" class="stack">
      ${field('Current odometer', input('mileage', '', `type="number" inputmode="numeric" min="0" required placeholder="${esc(t.mileage)}" class="input-xl"`))}
      ${field('Date', input('date', today(), 'type="date"'))}
      <div class="modal-actions"><button type="button" class="btn btn-ghost" data-action="close-modal">Cancel</button><button class="btn btn-primary">Update</button></div>
    </form>`);
}
submits['save-mileage'] = async (form) => {
  const t = store.truck(form.dataset.truck);
  const d = formData(form); const m = num(d.mileage);
  if (m == null || m < 0) return;
  if (m < Number(t.mileage) && !(await confirmBox(`${fmtNum(m)} is lower than the last reading (${fmtNum(t.mileage)}). Save anyway as a correction?`, 'Save correction'))) return;
  const before = scheduleFor(t).filter((s) => ['soon', 'overdue'].includes(s.status)).length;
  store.setMileage(t.id, m, d.date);
  const after = scheduleFor(store.truck(t.id)).filter((s) => ['soon', 'overdue'].includes(s.status)).length;
  closeModal();
  toast(after > before ? `Mileage updated. ${after - before} more item(s) now need attention.` : 'Mileage updated. Schedule re-evaluated.');
  rerender();
};
actions['update-mileage'] = (el) => openMileageModal(el.dataset.truck || store.activeTruck()?.id);

export function openPostponeModal(truckId, itemId) {
  const t = store.truck(truckId);
  const it = applicableItems(t).find((i) => i.id === itemId);
  openModal(`<h2>Postpone “${esc(it.name)}”</h2>
    <p class="muted">Push the reminder back. ${it.urgency === 'critical' ? '<strong>This is a safety-critical item — only postpone if it was recently checked.</strong>' : ''}</p>
    <form data-submit="save-postpone" data-truck="${t.id}" data-item="${it.id}" class="stack">
      ${field('Postpone by (miles)', input('miles', '', 'type="number" min="0" step="500" placeholder="e.g. 2000"'))}
      ${field('Postpone by (days)', input('days', '', 'type="number" min="0" placeholder="e.g. 30"'))}
      <div class="modal-actions"><button type="button" class="btn btn-ghost" data-action="close-modal">Cancel</button><button class="btn btn-primary">Postpone</button></div>
    </form>`);
}
submits['save-postpone'] = (form) => {
  const d = formData(form);
  store.updateTruck(form.dataset.truck, (tr) => {
    tr.postponed ||= {};
    const p = tr.postponed[form.dataset.item] || {};
    tr.postponed[form.dataset.item] = { miles: (p.miles || 0) + (num(d.miles) || 0), days: (p.days || 0) + (num(d.days) || 0) };
  });
  closeModal(); toast('Postponed.'); rerender();
};
actions['postpone'] = (el) => openPostponeModal(el.dataset.truck, el.dataset.item);

actions['mark-inspected'] = (el) => {
  const t = store.truck(el.dataset.truck);
  store.updateTruck(t.id, (tr) => {
    tr.records.push({ id: uid(), date: today(), mileage: Number(tr.mileage), items: [el.dataset.item], kind: 'inspect',
      title: 'Inspected — OK', total: 0, created: new Date().toISOString() });
    if (tr.postponed) delete tr.postponed[el.dataset.item];
  });
  toast('Marked as inspected at current mileage.'); rerender();
};

actions['open-file'] = async (el) => {
  const url = await files.url(el.dataset.file);
  if (!url) { toast('File not found in this browser.', 'warn'); return; }
  window.open(url, '_blank', 'noopener');
};
