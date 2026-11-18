import { store } from '../store.js';
import { localAnswer, buildContext, SUGGESTIONS, truckName } from '../assistant.js';
import { askClaude, claudeErrorMessage } from '../api.js';
import { actions, submits, rerender, esc, md, icon, $, toast, readFileAsBase64, formData } from '../ui.js';

let pendingImages = [];
let busy = false;

const FALLBACK = (name) => `I can answer these from ${name}’s data right now:\n- What maintenance is coming up\n- What a specific service costs (oil change, brakes, DPF, tires…)\n- What to inspect at a given mileage\n- Fuel use for a distance\n- Whether a repair quote is reasonable\n- Known issues with your engine\n- How much to save each month\n\nFor other questions and photo analysis, connect Claude in **Settings → AI assistant**.`;

export function assistantView({ truck, mount }) {
  const connected = !!store.settings().claudeKey;
  const chat = truck.chat || [];
  mount(() => { const log = $('#chat-log'); if (log) log.scrollTop = log.scrollHeight; });
  return `<div class="page-head"><div><h1>Truck Assistant</h1><div class="muted">Knows your ${esc(truckName(truck))}, its mileage and service history.</div></div>
      <span class="pill ${connected ? 'pill-green' : 'pill-gray'}">${icon(connected ? 'sparkle' : 'chat', 14)} ${connected ? 'Claude connected' : 'Built-in answers'}</span></div>
    <div class="notice notice-yellow small">${icon('alert', 16)} <span>Answers are guidance, not a confirmed diagnosis. For brakes, steering, tires, overheating or smoke: stop safely and get professional help. Don’t use the app while driving.</span></div>
    <section class="chat card">
      <div class="chat-log" id="chat-log" aria-live="polite">
        ${chat.length ? chat.map(bubble).join('') : `<div class="chat-empty"><div class="empty-icon">${icon('chat', 30)}</div><h3>Ask about your truck</h3><p class="muted">Try one of these:</p></div>`}
      </div>
      <div class="suggest">${SUGGESTIONS.map((s) => `<button class="chip-btn" data-action="ask" data-q="${esc(s)}">${esc(s)}</button>`).join('')}</div>
      <form class="chat-input" data-submit="ask" data-truck="${truck.id}">
        <label class="icon-btn ${connected ? '' : 'disabled'}" title="${connected ? 'Attach a photo (warning light, part, invoice)' : 'Photo analysis needs Claude (Settings)'}">
          ${icon('camera')}<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" data-chat-image hidden ${connected ? '' : 'disabled'} multiple></label>
        <div class="grow chat-field"><div class="chat-thumbs" id="chat-thumbs"></div>
          <textarea name="q" rows="1" placeholder="Ask about maintenance, costs, symptoms…" aria-label="Your question" required></textarea></div>
        <button class="btn btn-primary" aria-label="Send" ${busy ? 'disabled' : ''}>${icon('send', 18)}</button>
      </form>
      ${chat.length ? '<button class="link small clear-chat" data-action="clear-chat">Clear conversation</button>' : ''}
    </section>`;
}

function bubble(m) {
  return `<div class="msg msg-${m.role}">${m.role === 'assistant' ? `<div class="msg-ic">${icon('sparkle', 16)}</div>` : ''}<div class="msg-body">${m.images ? `<div class="muted small">${icon('camera', 14)} ${m.images} photo(s)</div>` : ''}${md(m.text)}${m.source === 'builtin' ? '<div class="msg-src">Built-in answer from your truck data</div>' : ''}</div></div>`;
}

actions['ask'] = (el) => {
  const form = document.querySelector('.chat-input');
  form.elements.q.value = el.dataset.q;
  form.requestSubmit();
};
actions['clear-chat'] = () => { const t = store.activeTruck(); store.updateTruck(t.id, { chat: [] }); rerender(); };

document.addEventListener('change', async (e) => {
  if (!e.target.matches('[data-chat-image]')) return;
  for (const f of [...e.target.files].slice(0, 4)) {
    if (f.size > 5 * 1024 * 1024) { toast(`${f.name} is over 5 MB.`, 'warn'); continue; }
    pendingImages.push({ type: f.type, data: await readFileAsBase64(f), name: f.name, url: URL.createObjectURL(f) });
  }
  e.target.value = '';
  const th = $('#chat-thumbs');
  if (th) th.innerHTML = pendingImages.map((i) => `<img src="${i.url}" alt="${esc(i.name)}">`).join('');
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey && e.target.matches('.chat-input textarea')) { e.preventDefault(); e.target.form.requestSubmit(); }
});

submits['ask'] = async (form) => {
  if (busy) return;
  const t = store.truck(form.dataset.truck);
  const q = formData(form).q;
  if (!q) return;
  const key = store.settings().claudeKey;
  const images = pendingImages; pendingImages = [];
  const history = (t.chat || []).slice(-12);
  const push = (m) => store.updateTruck(t.id, (tr) => { tr.chat = [...(tr.chat || []), m].slice(-40); });
  push({ role: 'user', text: q, images: images.length || undefined });

  const log = $('#chat-log');
  const append = (html) => { log.querySelector('.chat-empty')?.remove(); log.insertAdjacentHTML('beforeend', html); log.scrollTop = log.scrollHeight; };
  append(bubble({ role: 'user', text: q, images: images.length || undefined }));
  form.reset(); $('#chat-thumbs').innerHTML = '';

  // Built-in answers handle common, data-driven questions instantly (and offline).
  const local = images.length ? null : localAnswer(t, q);
  if (local && (!key || isDataQuestion(q))) {
    push({ role: 'assistant', text: local, source: 'builtin' });
    append(bubble({ role: 'assistant', text: local, source: 'builtin' }));
    return;
  }
  if (!key) {
    const text = FALLBACK(truckName(t));
    push({ role: 'assistant', text, source: 'builtin' });
    append(bubble({ role: 'assistant', text, source: 'builtin' }));
    return;
  }

  busy = true;
  append(`<div class="msg msg-assistant" id="streaming"><div class="msg-ic">${icon('sparkle', 16)}</div><div class="msg-body"><span class="typing"><i></i><i></i><i></i></span></div></div>`);
  const target = $('#streaming .msg-body');
  let acc = '';
  try {
    const text = await askClaude({
      apiKey: key, context: buildContext(t), history: history.map((m) => ({ role: m.role, text: m.text })), userText: q, images,
      onText: (chunk) => { acc += chunk; target.innerHTML = md(acc); log.scrollTop = log.scrollHeight; },
    });
    push({ role: 'assistant', text });
    target.innerHTML = md(text);
  } catch (err) {
    const msg = claudeErrorMessage(err);
    const fallback = local || '';
    target.innerHTML = `<p class="status-text-red">${esc(msg)}</p>${fallback ? md(fallback) : ''}`;
    if (fallback) push({ role: 'assistant', text: fallback, source: 'builtin' });
  } finally {
    busy = false;
    $('#streaming')?.removeAttribute('id');
  }
};

// Questions that are fully answered by the truck's own numbers.
function isDataQuestion(q) {
  return /coming up|upcoming|next (service|maintenance)|how much (will|does|is|diesel|fuel)|save|reserve|budget/i.test(q) && !/why|should i|what if|explain/i.test(q);
}
