// Built-in (offline) truck assistant. Answers common questions directly from
// the truck's data. When the user connects Claude in Settings, open-ended
// questions go to Claude instead (see api.js); this module also builds the
// context Claude receives.
import {
  scheduleFor, forecast, knownIssues, checkupsFor, costFor, fmtMoney, fmtNum, fmtRange,
  monthlyFuelCost, defaultMpg, monthlyMiles, compareQuote, STATUS, riskLevel,
} from './engine.js';
import { MAINTENANCE, regionForZip, profileFor, PROFILE_LABELS, CHECKUPS } from './data.js';

const SAFETY = '**Safety first:** if you notice this while driving, pull over somewhere safe as soon as you can. Do not keep driving with a brake, steering, tire or overheating problem — call a qualified technician or roadside service.';

export function truckName(t) { return t.nickname || [t.year, t.make, t.model].filter(Boolean).join(' ') || 'your truck'; }

export function buildContext(truck) {
  const sched = scheduleFor(truck);
  const fc = forecast(truck, 12);
  return {
    truck: {
      name: truckName(truck), vin: truck.vin, year: truck.year, make: truck.make, model: truck.model, trim: truck.trim,
      class: truck.class, gvwr: truck.gvwrText || truck.gvwrLbs, configurations: truck.configs, fuel: truck.fuel,
      engine: truck.engine, transmission: truck.transmission, drivetrain: truck.drivetrain, brakes: truck.airBrakes ? 'air' : 'hydraulic/unknown',
      mileage: truck.mileage, monthlyMiles: monthlyMiles(truck), zip: truck.zip, region: regionForZip(truck.zip).label,
      dutyCycle: truck.duty, maintenanceProfile: PROFILE_LABELS[profileFor(truck)],
    },
    schedule: sched.map((s) => ({
      item: s.item.name, status: STATUS[s.status].label, intervalMiles: s.interval, intervalMonths: s.months,
      lastDoneMiles: s.last?.mileage, lastDoneDate: s.last?.date, dueMiles: s.dueMiles, estCostUSD: s.cost.total,
    })),
    recentRecords: (truck.records || []).slice().sort((a, b) => (b.mileage || 0) - (a.mileage || 0)).slice(0, 15)
      .map((r) => ({ date: r.date, mileage: r.mileage, type: r.title, total: r.total, shop: r.shop, notes: r.notes })),
    forecast12mo: { totalUSD: fc.total.map(Math.round), monthlyReserveUSD: fc.monthlyReserve },
    knownRiskAreas: knownIssues(truck).specific.flatMap((k) => k.items.map((i) => i.issue)),
    notes: 'Intervals are typical values from the TruckWise library, not OEM specifications. Costs are regional estimates.',
  };
}

const findItem = (q) => {
  const pairs = [
    [/oil/, 'oil'], [/fuel filter/, 'fuelfilter'], [/air filter/, 'airfilter'], [/coolant|antifreeze/, 'coolant'],
    [/trans(mission)? (fluid|service)/, 'transfluid'], [/diff|axle (fluid|oil)|gear oil/, 'diff'], [/brake (pad|shoe|job|reline)|pads|shoes/, 'brakereline'],
    [/brake/, 'brakes'], [/tire|tyre/, 'tirereplace'], [/align/, 'alignment'], [/dpf|particulate/, 'dpf'], [/def filter/, 'deffilter'],
    [/egr/, 'egr'], [/valve|overhead/, 'valves'], [/spark/, 'sparkplugs'], [/belt/, 'belt'], [/shock/, 'shocks'], [/battery|alternator|starter/, 'battery'],
    [/fifth wheel/, 'fifthwheel'], [/air dryer/, 'airdryer'], [/reefer/, 'reefer'], [/annual|dot inspection/, 'annual'], [/rotat/, 'tirerotate'],
  ];
  for (const [re, id] of pairs) if (re.test(q)) return MAINTENANCE.find((m) => m.id === id);
  return null;
};

const parseNumber = (q) => {
  const m = q.replace(/,/g, '').match(/(\d+(?:\.\d+)?)\s*(k\b|,000)?/);
  if (!m) return null;
  return Number(m[1]) * (m[2] ? 1000 : 1);
};

export function localAnswer(truck, raw) {
  const q = raw.toLowerCase();
  const name = truckName(truck);
  const sched = scheduleFor(truck);
  const diesel = /diesel/i.test(truck.fuel || '');
  const region = regionForZip(truck.zip);

  // Safety-critical symptoms first.
  if (/overheat|temp(erature)? (high|rising|gauge)|running hot|boil/.test(q)) {
    return `${SAFETY}\n\n**Overheating on ${name} — common causes (not a diagnosis):**\n- Low coolant from a leak (hoses, radiator, water pump, EGR cooler on diesels)\n- Failed thermostat or fan clutch\n- Plugged radiator or charge-air cooler (debris between cores)\n- Broken or slipping serpentine belt\n- Head gasket problems (bubbles in coolant, white smoke)\n\n**What to do:** stop and let the engine idle briefly if the fan is working, then shut down. **Never open a hot radiator cap.** Once cool, check the coolant level and look for leaks. If coolant is low or the temperature climbs again, have it towed or inspected rather than driving on.\n\nA cooling system pressure test typically costs ${fmtRange(costFor(MAINTENANCE.find((m) => m.id === 'coolingsys'), truck).total)} in your area.`;
  }
  if (/(brake|stopping).*(fade|soft|spongy|grind|pull|fail|low air|air pressure)|low air|air (leak|pressure)/.test(q)) {
    return `${SAFETY}\n\n**Brake symptoms can have several causes:**\n- Grinding: linings worn to metal — stop driving and have it inspected\n- Pulling: stuck caliper/chamber, contaminated linings, or out-of-adjustment brakes\n- Low air / slow build-up (air brakes): leaks, governor or compressor issues, failing air dryer\n- Soft pedal (hydraulic): air in lines, fluid leak, or worn master cylinder\n\nThe low air warning on air-brake trucks must activate at or above 60 psi. If it comes on, stop safely; spring brakes may apply on their own as pressure drops.\n\nA brake inspection typically runs ${fmtRange(costFor(MAINTENANCE.find((m) => m.id === 'brakes'), truck).total)}.`;
  }
  if (/steering|wander|shimmy|death wobble/.test(q)) {
    return `${SAFETY}\n\nLoose or wandering steering is usually caused by worn tie-rod ends, kingpins, drag link, steering gear, or alignment. A shimmy can also be a tire or wheel balance issue. Have the front end inspected before your next long trip.`;
  }
  if (/(tire|tyre).*(bulge|blow|flat|vibrat|cut)|blowout/.test(q)) {
    return `${SAFETY}\n\nA bulge, cut through the cords, or tread separation means the tire is unsafe — replace it before driving. For vibration, check for a lost wheel weight, uneven wear, or loose lug nuts (rust streaks are a warning sign).`;
  }
  if (/warning light|dash(board)? light|check engine|light (came|is) on|stop engine|derate/.test(q)) {
    return `**Dashboard warning lights — general guide (check your owner’s manual for exact meanings):**\n- **Red STOP ENGINE / engine protection** — pull over safely and shut down; the engine may shut itself down.\n- **Amber check engine** — a fault is stored. Get it scanned soon; driving is usually OK short term.\n- **DPF / regen light (diesel)** — the filter needs to regenerate. Drive at highway speed or do a parked regen.\n- **High exhaust temperature (HEST)** — normal during a regen; keep away from flammable material.\n- **DEF light / derate countdown** — fill DEF or fix the SCR fault before speed is limited.\n- **Low air / ABS / brake** — safety-related; see a technician.\n- **Coolant temperature / oil pressure** — stop safely and shut down to avoid engine damage.\n\nYou can upload a photo of the light in the assistant when Claude is connected in Settings for a more specific explanation. A diagnostic scan typically costs ${fmtRange(costFor(MAINTENANCE.find((m) => m.id === 'diag'), truck).total)}.`;
  }

  // Fuel use for N miles
  if (/(diesel|fuel|gas(oline)?|gallons).*(use|burn|cost|need)|how much (diesel|fuel|gas)/.test(q)) {
    const miles = parseNumber(q) || monthlyMiles(truck);
    const mpg = Number(truck.costs?.mpg) || defaultMpg(truck);
    const price = Number(truck.costs?.fuelPrice) || (diesel ? region.diesel : region.gas);
    const cost = monthlyFuelCost(miles, mpg, price);
    return `Driving **${fmtNum(miles)} miles** at **${mpg} MPG** uses about **${fmtNum(miles / mpg)} gallons**.\n\nAt ${fmtMoney(price, 2)}/gal that’s about **${fmtMoney(cost)}**.\n\nFormula: miles ÷ MPG × price per gallon. ${truck.costs?.fuelPrice ? '' : `The price is a reference value for the ${region.label} region — set your real pump price on the Costs page.`}`;
  }

  // Quote check
  if (/reasonable|fair|quote|estimate|ripped|charge[sd]?/.test(q) && /\$?\d/.test(q)) {
    const item = findItem(q);
    const amount = Number((q.replace(/,/g, '').match(/\$?\s*(\d{2,6}(?:\.\d+)?)/) || [])[1]);
    if (item && amount) {
      const c = costFor(item, truck);
      const v = compareQuote(amount, c.total);
      return `For **${item.name}** on ${name}, TruckWise estimates **${fmtRange(c.total)}** in your area (parts ${fmtRange(c.parts)}, labor ~${c.hours[0]}–${c.hours[1]} hrs at ~${fmtMoney(c.rate)}/hr).\n\nYour quote of **${fmtMoney(amount)}**: ${v.label}\n\nAsk the shop for a written breakdown of parts, labor hours and shop fees.`;
    }
  }

  // Cost of a specific service
  if (/how much|cost|price/.test(q)) {
    const item = findItem(q);
    if (item) {
      const s = sched.find((x) => x.item.id === item.id);
      const c = costFor(item, truck);
      return `**${item.name}** on ${name} is estimated at **${fmtRange(c.total)}**.\n- Parts: ${fmtRange(c.parts)}\n- Labor: ${c.hours[0]}–${c.hours[1]} hrs × ~${fmtMoney(c.rate)}/hr (${region.label} estimate)\n- Parts usually needed: ${item.partsList.join(', ')}\n${s ? `\nNext due: ${s.dueMiles ? fmtNum(s.dueMiles) + ' mi' : s.noHistory ? 'unknown — add your last service record' : '—'}.` : ''}\n\nEstimates vary by shop and parts brand.`;
    }
  }

  if (/save|reserve|budget|set aside/.test(q)) {
    const fc = forecast(truck, 12);
    return `Based on ${name}’s schedule and about ${fmtNum(fc.monthlyMiles)} miles a month, scheduled maintenance over the next 12 months is estimated at **${fmtRange(fc.total)}**.\n\nA monthly maintenance savings target of **${fmtRange(fc.monthlyReserve)}** covers it. Many owner-operators add 20–30% on top for unplanned repairs.`;
  }

  if (/common (issue|problem)|known (issue|problem)|reliab|what (usually|tends to) (break|fail)/.test(q)) {
    const k = knownIssues(truck);
    if (k.specific.length) {
      return k.specific.map((s) => `**${s.title}** — known risk areas (not predictions):\n` + s.items.map((i) => `- **${i.issue}** (${riskLevel(i.window, truck.mileage).label}): ${i.signs}. Prevention: ${i.prevent}. Typical repair ${fmtRange(i.cost)}.`).join('\n')).join('\n\n');
    }
    return `I don’t have engine-specific data for ${name} yet. Common wear areas for this class of truck:\n` + k.generic.map((g) => `- **${g.issue}**: watch for ${g.signs.toLowerCase()}.`).join('\n') + `\n\nAdding the exact engine model on the truck profile improves this.`;
  }

  if (/inspect|check(up)?|look (for|out)/.test(q)) {
    const miles = parseNumber(q) || Number(truck.mileage);
    const list = CHECKUPS.filter((c) => (!c.diesel || diesel) && miles >= c.minMiles * (Number(truck.class) >= 7 ? 1 : 0.5));
    return `**Recommended checks at ${fmtNum(miles)} miles:**\n` + list.map((c) => `- **${c.title}:** ${c.inspect.slice(0, 3).join(', ')}`).join('\n') + `\n\nSee the full guide (with warning signs) under Maintenance → Checkups.`;
  }

  if (/part/.test(q)) {
    const next = sched.find((s) => s.status !== 'unknown' && s.status !== 'ok') || sched.find((s) => s.item.kind === 'service');
    if (next) return `Your next scheduled service is **${next.item.name}**. Parts usually needed:\n` + next.item.partsList.map((p) => `- ${p}`).join('\n') + `\n\nConfirm part numbers with your dealer or parts store using your VIN${truck.vin ? ` (${truck.vin})` : ''}.`;
  }

  if (/coming up|upcoming|next (service|maintenance)|due|what (do|does) (i|my truck) need|overdue/.test(q)) {
    const top = sched.filter((s) => s.status !== 'ok').slice(0, 6);
    if (!top.length) return `${name} is up to date on everything with a recorded history. Nice work.`;
    const unknown = top.filter((s) => s.status === 'unknown').length;
    return `**What’s coming up for ${name} (${fmtNum(truck.mileage)} mi):**\n` + top.map((s) => `- **${s.item.name}** — ${STATUS[s.status].label}${s.dueMiles ? `, due at ${fmtNum(s.dueMiles)} mi` : ''} · est. ${fmtRange(s.cost.total)}`).join('\n') +
      (unknown ? `\n\n${unknown} item(s) show “No record” — add the last time they were done so TruckWise can calculate exact due mileage.` : '');
  }

  return null;
}

export const SUGGESTIONS = [
  'What maintenance is coming up on my truck?',
  'How much will my next oil change cost?',
  'What should I inspect at 500,000 miles?',
  'How much diesel will I use driving 2,000 miles?',
  'What are the common issues with my engine?',
  'How much should I save monthly for maintenance?',
  'Is $650 reasonable for a brake inspection?',
  'What parts do I need for my next service?',
  'Why is my engine overheating?',
  'What does this dashboard warning light mean?',
];
