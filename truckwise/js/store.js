// Local persistence. Everything stays in this browser (localStorage for data,
// IndexedDB for uploaded files). A cloud backend replaces this module later
// (see docs/ARCHITECTURE.md) without changing the rest of the app.

const KEY = 'truckwise.v1';
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
export { uid };

const DEFAULT = () => ({
  version: 1,
  trucks: [],
  activeId: null,
  shops: [],
  settings: { theme: 'auto', leadMiles: 500, browserNotifications: false, claudeKey: '', eiaKey: '', plan: 'free' },
  fuelLive: {},
  dismissed: [],
});

let state = load();
const listeners = new Set();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT();
    const s = JSON.parse(raw);
    return { ...DEFAULT(), ...s, settings: { ...DEFAULT().settings, ...(s.settings || {}) } };
  } catch { return DEFAULT(); }
}

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { console.warn('Could not save', e); }
  listeners.forEach((fn) => fn(state));
}

export const store = {
  get: () => state,
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  update(mutator) { mutator(state); save(); },
  activeTruck() { return state.trucks.find((t) => t.id === state.activeId) || state.trucks[0] || null; },
  truck(id) { return state.trucks.find((t) => t.id === id) || null; },
  setActive(id) { state.activeId = id; save(); },
  addTruck(t) {
    const truck = {
      id: uid(), createdAt: new Date().toISOString(), records: [], inspections: [], warranties: [], documents: [],
      mileageLog: t.mileage ? [{ date: new Date().toISOString().slice(0, 10), mileage: Number(t.mileage) }] : [],
      overrides: {}, postponed: {}, baseline: {}, costs: {}, dates: {}, configs: [], ...t,
    };
    state.trucks.push(truck); state.activeId = truck.id; save(); return truck;
  },
  updateTruck(id, patch) {
    const t = this.truck(id); if (!t) return;
    Object.assign(t, typeof patch === 'function' ? patch(t) || {} : patch); save();
  },
  removeTruck(id) {
    const t = this.truck(id);
    (t?.records || []).forEach((r) => (r.files || []).forEach((f) => files.remove(f.id)));
    (t?.documents || []).forEach((d) => files.remove(d.fileId));
    state.trucks = state.trucks.filter((x) => x.id !== id);
    if (state.activeId === id) state.activeId = state.trucks[0]?.id || null;
    save();
  },
  setMileage(id, mileage, date = new Date().toISOString().slice(0, 10)) {
    const t = this.truck(id); if (!t) return;
    t.mileage = Number(mileage);
    t.mileageLog = [...(t.mileageLog || []), { date, mileage: Number(mileage) }].slice(-200);
    save();
  },
  settings() { return state.settings; },
  setSetting(k, v) { state.settings[k] = v; save(); },
  exportJson() { return JSON.stringify({ ...state, settings: { ...state.settings, claudeKey: '', eiaKey: '' } }, null, 2); },
  importJson(text) {
    const s = JSON.parse(text);
    if (!Array.isArray(s.trucks)) throw new Error('Not a TruckWise backup file.');
    const key = state.settings.claudeKey; const eia = state.settings.eiaKey;
    state = { ...DEFAULT(), ...s, settings: { ...DEFAULT().settings, ...(s.settings || {}), claudeKey: key, eiaKey: eia } };
    save();
  },
  reset() { state = DEFAULT(); save(); },
};

/* ------------------------------------------------------------------ */
/* File storage (IndexedDB)                                            */
/* ------------------------------------------------------------------ */
const DB = 'truckwise-files';
function db() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore('files');
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function tx(mode, fn) {
  const d = await db();
  return new Promise((res, rej) => {
    const t = d.transaction('files', mode); const s = t.objectStore('files');
    const out = fn(s);
    t.oncomplete = () => res(out?.result ?? out);
    t.onerror = () => rej(t.error);
  });
}
export const files = {
  async put(file) {
    const id = uid();
    await tx('readwrite', (s) => s.put({ blob: file, name: file.name, type: file.type, size: file.size, added: Date.now() }, id));
    return { id, name: file.name, type: file.type, size: file.size };
  },
  async get(id) {
    const d = await db();
    return new Promise((res, rej) => {
      const r = d.transaction('files').objectStore('files').get(id);
      r.onsuccess = () => res(r.result || null); r.onerror = () => rej(r.error);
    });
  },
  async remove(id) { try { await tx('readwrite', (s) => s.delete(id)); } catch { /* ignore */ } },
  async url(id) { const f = await this.get(id); return f ? URL.createObjectURL(f.blob) : null; },
};
