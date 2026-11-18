// Network services: NHTSA VIN decoding + recalls (public, keyless, CORS-enabled)
// and the optional Claude-powered assistant.
import { mapVpic, normalizeVin } from './engine.js';

async function getJson(url, ms = 12000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } finally { clearTimeout(timer); }
}

// NHTSA vPIC: https://vpic.nhtsa.dot.gov/api/
export async function decodeVin(vin, modelYear) {
  const v = normalizeVin(vin);
  const yr = modelYear ? `&modelyear=${encodeURIComponent(modelYear)}` : '';
  const data = await getJson(`https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValuesExtended/${v}?format=json${yr}`);
  const row = data?.Results?.[0];
  if (!row) throw new Error('No data returned for this VIN.');
  const mapped = mapVpic(row);
  // vPIC error code "0" = clean decode. Others are warnings (e.g. check digit) or failures.
  const codes = String(row.ErrorCode || '').split(',').map((s) => s.trim());
  const failed = !mapped.make && !mapped.model;
  return { ...mapped, decodeOk: !failed, warnings: codes.includes('0') ? '' : mapped.errorText, source: 'NHTSA vPIC', decodedAt: new Date().toISOString() };
}

// NHTSA recalls by make/model/year. (VIN-specific open-recall status is only
// available from the manufacturer or nhtsa.gov/recalls.)
export async function fetchRecalls({ make, model, year }) {
  if (!make || !model || !year) throw new Error('Year, make and model are needed to check recalls.');
  const url = `https://api.nhtsa.gov/recalls/recallsByVehicle?make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}&modelYear=${encodeURIComponent(year)}`;
  const data = await getJson(url);
  return (data?.results || []).map((r) => ({
    NHTSACampaignNumber: r.NHTSACampaignNumber, component: r.Component, summary: r.Summary,
    consequence: r.Consequence, remedy: r.Remedy, date: r.ReportReceivedDate,
  }));
}

/* ------------------------------------------------------------------ */
/* Claude assistant (optional; uses the user's own API key)            */
/* ------------------------------------------------------------------ */
// In production this call moves behind the TruckWise backend so no key is
// ever held in the browser (docs/ARCHITECTURE.md). Until then the user can
// paste their own Anthropic API key, which is stored only in this browser.
let sdkPromise = null;
function loadSdk() {
  sdkPromise ||= import('https://cdn.jsdelivr.net/npm/@anthropic-ai/sdk@1.3.0/+esm')
    .catch(() => import('https://esm.sh/@anthropic-ai/sdk@1.3.0'));
  return sdkPromise;
}

export const ASSISTANT_SYSTEM = `You are the TruckWise truck assistant, helping commercial truck drivers, owner-operators and fleet managers understand maintenance, repairs and operating costs for their specific truck.

How to answer:
- Use the truck profile, mileage, maintenance schedule and service history provided in the context. Refer to the truck by year/make/model.
- Explain mechanical terms in plain language. Keep answers short and scannable: a direct answer first, then a few bullets.
- Give cost estimates as ranges and say they are estimates that vary by shop, region and parts.
- Present possible causes as possibilities, never as a confirmed diagnosis. Recommend a qualified diesel/truck technician when a hands-on diagnosis is needed.
- Service intervals in the context are typical values, not OEM specifications; when an interval matters, tell the driver to confirm it in the owner's or engine maintenance manual.
- Safety first: for anything involving brakes, steering, tires/wheel ends, overheating, fuel leaks, smoke or fire, or warning lights that indicate an engine shutdown, tell the driver clearly to stop safely when possible and get professional help before continuing.
- Never encourage using the app or reading long answers while driving.
- If you do not know something specific about this truck, say so and suggest how to find out.`;

export async function askClaude({ apiKey, context, history, userText, images = [], onText }) {
  const { default: Anthropic } = await loadSdk();
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  const content = [
    ...images.map((img) => ({ type: 'image', source: { type: 'base64', media_type: img.type, data: img.data } })),
    { type: 'text', text: userText },
  ];
  const messages = [
    ...history.map((m) => ({ role: m.role, content: m.text })),
    { role: 'user', content },
  ];
  const stream = client.beta.messages.stream({
    model: 'claude-opus-5-5',
    max_tokens: 16000,
    thinking: { type: 'adaptive' },
    output_config: { effort: 'low' },
    // Server-side fallback: if a request is declined by a safety classifier,
    // the API retries it on a suitable model automatically.
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system: [
      { type: 'text', text: ASSISTANT_SYSTEM },
      { type: 'text', text: 'Truck context (JSON):\n' + JSON.stringify(context) },
    ],
    messages,
  });
  stream.on('text', (t) => onText?.(t));
  const msg = await stream.finalMessage();
  if (msg.stop_reason === 'refusal') {
    throw new Error('The assistant could not answer that request. Try rephrasing it.');
  }
  return msg.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
}

export function claudeErrorMessage(e) {
  const s = e?.status;
  if (s === 401) return 'That API key was rejected. Check it in Settings.';
  if (s === 429) return 'Rate limit reached. Wait a moment and try again.';
  if (s >= 500) return 'The AI service is temporarily unavailable. Try again shortly.';
  if (e?.name === 'APIConnectionError' || /fetch|network/i.test(e?.message || '')) return 'Could not reach the AI service. Check your connection.';
  return e?.message || 'Something went wrong.';
}
