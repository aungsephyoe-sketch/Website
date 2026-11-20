// TruckWise reference data.
//
// IMPORTANT: Service intervals and costs in this file are TYPICAL INDUSTRY
// VALUES used as a starting point. They are not OEM specifications. Every
// interval can be overridden per truck, and the UI always labels these
// numbers as estimates. Replace them with OEM / data-provider values when a
// licensed maintenance data source is connected (see docs/ARCHITECTURE.md).

export const DATA_VERSION = '2026-11';
export const DATA_SOURCE_NOTE =
  'TruckWise typical-interval library (v' + DATA_VERSION + '). Compiled from common OEM and engine-maker guidance; ' +
  'not a substitute for your owner’s manual. Verify intervals against your truck’s maintenance manual.';

/* ------------------------------------------------------------------ */
/* Weight classes                                                      */
/* ------------------------------------------------------------------ */
export const CLASSES = [
  { id: 1, min: 0, max: 6000, label: 'Class 1', range: '0–6,000 lbs', examples: 'Light commercial pickups' },
  { id: 2, min: 6001, max: 10000, label: 'Class 2', range: '6,001–10,000 lbs', examples: 'Ford F-150, Ram 1500, Silverado 1500' },
  { id: 3, min: 10001, max: 14000, label: 'Class 3', range: '10,001–14,000 lbs', examples: 'Ford F-350, Ram 3500, Silverado 3500' },
  { id: 4, min: 14001, max: 16000, label: 'Class 4', range: '14,001–16,000 lbs', examples: 'Ford F-450, utility trucks' },
  { id: 5, min: 16001, max: 19500, label: 'Class 5', range: '16,001–19,500 lbs', examples: 'Ford F-550, medium-duty work trucks' },
  { id: 6, min: 19501, max: 26000, label: 'Class 6', range: '19,501–26,000 lbs', examples: 'Freightliner M2, International MV' },
  { id: 7, min: 26001, max: 33000, label: 'Class 7', range: '26,001–33,000 lbs', examples: 'Heavy straight trucks, refuse trucks' },
  { id: 8, min: 33001, max: Infinity, label: 'Class 8', range: 'Over 33,000 lbs', examples: 'Semi-trucks, heavy tractors' },
];

/* ------------------------------------------------------------------ */
/* Configurations                                                      */
/* ------------------------------------------------------------------ */
export const CONFIG_GROUPS = [
  { id: 'light', label: 'Pickup & light commercial', items: [
    'Pickup truck', 'Chassis cab', 'Flatbed work truck', 'Service body truck', 'Utility truck', 'Stake bed truck', 'Box truck (light)'] },
  { id: 'medium', label: 'Medium-duty commercial', items: [
    'Box truck', 'Straight truck', 'Refrigerated delivery truck', 'Dump truck (medium)', 'Tow truck', 'Bucket truck',
    'Concrete mixer (medium)', 'Beverage delivery truck', 'Utility service truck', 'Garbage truck', 'Water truck',
    'Fuel delivery truck', 'Moving truck'] },
  { id: 'heavy', label: 'Heavy-duty commercial', items: [
    'Semi-truck / tractor', 'Day cab tractor', 'Sleeper cab tractor', 'Dry van', 'Refrigerated (reefer)', 'Flatbed',
    'Step deck', 'Lowboy', 'Tanker', 'Car hauler', 'Livestock', 'Logging', 'Dump truck (heavy)', 'Heavy haul',
    'Container', 'Curtain-side', 'Cement mixer', 'Roll-off', 'Refuse collection'] },
];

const TRACTOR_CONFIGS = ['Semi-truck / tractor', 'Day cab tractor', 'Sleeper cab tractor', 'Dry van', 'Refrigerated (reefer)',
  'Flatbed', 'Step deck', 'Lowboy', 'Tanker', 'Car hauler', 'Livestock', 'Logging', 'Heavy haul', 'Container', 'Curtain-side'];
const REEFER_CONFIGS = ['Refrigerated (reefer)', 'Refrigerated delivery truck'];
const SEVERE_CONFIGS = ['Dump truck (medium)', 'Dump truck (heavy)', 'Garbage truck', 'Refuse collection', 'Roll-off',
  'Concrete mixer (medium)', 'Cement mixer', 'Logging', 'Tow truck', 'Water truck'];
export const isTractor = (t) => (t.configs || []).some((c) => TRACTOR_CONFIGS.includes(c));
export const hasReefer = (t) => (t.configs || []).some((c) => REEFER_CONFIGS.includes(c));
export const isSevereConfig = (t) => (t.configs || []).some((c) => SEVERE_CONFIGS.includes(c));

export const FUEL_TYPES = ['Diesel', 'Gasoline', 'CNG', 'Propane', 'Hybrid', 'Electric'];
export const TRANSMISSIONS = ['Automatic', 'Automated manual (AMT)', 'Manual', 'Allison automatic', 'Unknown'];
export const DRIVETRAINS = ['4x2', '4x4', '6x2', '6x4', '8x4', 'Unknown'];

export const DUTY_CYCLES = [
  { id: 'highway', label: 'Long-haul / highway', desc: 'Mostly steady highway miles', factor: 1.0 },
  { id: 'regional', label: 'Regional / mixed', desc: 'Mix of highway and city', factor: 0.8 },
  { id: 'severe', label: 'Severe / vocational', desc: 'Stop-and-go, heavy loads, idling, off-road, towing', factor: 0.5 },
];

export const MILEAGE_PRESETS = [500, 1000, 2000, 3000, 5000, 8000, 10000];

/* ------------------------------------------------------------------ */
/* Maintenance profiles                                                */
/* ------------------------------------------------------------------ */
// Profile is chosen from class + fuel. Intervals below are per profile.
//   lg = light gasoline (class 1-3 gas)
//   ld = light diesel   (class 1-5 diesel pickups / chassis cabs)
//   lg5 = class 4-5 gas
//   md = medium diesel  (class 6-7, and class 4-5 non-pickup diesel)
//   hd = heavy diesel   (class 8)
// Blank fuel type: Class 6+ is assumed diesel, lighter trucks gasoline.
// (engine.js fuelKind uses the same rule.)
export const fuelOf = (t) => String(t.fuel || ((Number(t.class) || 8) >= 6 ? 'Diesel' : 'Gasoline'));

export function profileFor(truck) {
  const cls = Number(truck.class) || 8;
  const diesel = fuelOf(truck).toLowerCase().includes('diesel');
  if (cls >= 8) return 'hd';
  if (cls >= 6) return diesel ? 'md' : 'lg5';
  if (cls >= 4) return diesel ? 'ld' : 'lg5';
  return diesel ? 'ld' : 'lg';
}

export const PROFILE_LABELS = {
  lg: 'Light-duty gasoline', lg5: 'Medium-duty gasoline', ld: 'Light/medium-duty diesel', md: 'Medium-duty diesel', hd: 'Heavy-duty diesel',
};

// Base shop labor rate (USD/hr) before regional adjustment.
export const LABOR_RATE = { lg: 140, lg5: 150, ld: 155, md: 165, hd: 175 };

const isDiesel = (t) => fuelOf(t).toLowerCase().includes('diesel');
const isEV = (t) => fuelOf(t).toLowerCase() === 'electric';
const isGasLike = (t) => !isDiesel(t) && !isEV(t);
const notEV = (t) => !isEV(t);
const modernDiesel = (t) => isDiesel(t) && (Number(t.year) || 2020) >= 2007; // DPF era
const scrDiesel = (t) => isDiesel(t) && (Number(t.year) || 2020) >= 2010; // DEF/SCR era
const airBrakes = (t) => t.airBrakes === true || (t.airBrakes !== false && Number(t.class) >= 7);
const hydraulicBrakes = (t) => !airBrakes(t);
const fourWheel = (t) => /4x4|4wd|awd/i.test(t.drivetrain || '');
const manualTrans = (t) => /manual/i.test(t.transmission || '') && !/automated/i.test(t.transmission || '');
const heavyDiesel = (t) => isDiesel(t) && Number(t.class) >= 6;

// Category ids used for grouping and the health overview.
export const CATEGORIES = [
  { id: 'engine', label: 'Engine', icon: 'engine' },
  { id: 'drivetrain', label: 'Transmission & drivetrain', icon: 'gear' },
  { id: 'brakes', label: 'Brakes & suspension', icon: 'brake' },
  { id: 'tires', label: 'Tires & wheels', icon: 'tire' },
  { id: 'electrical', label: 'Electrical & cooling', icon: 'bolt' },
  { id: 'emissions', label: 'Emissions & aftertreatment', icon: 'leaf' },
  { id: 'commercial', label: 'Commercial equipment', icon: 'truck' },
];

// interval: miles per profile (null = not applicable for that profile)
// months: time-based limit (whichever comes first)
// labor: hours [low, high]; parts: USD [low, high] per profile
// kind: 'service' (replace/perform) or 'inspect'
// req: 'required' (OEM-scheduled service) or 'recommended'
export const MAINTENANCE = [
  // ---------------- ENGINE ----------------
  { id: 'oil', cat: 'engine', name: 'Engine oil & filter change', kind: 'service', req: 'required', urgency: 'high', applies: notEV,
    interval: { lg: 7500, lg5: 7500, ld: 10000, md: 15000, hd: 40000 }, months: 12,
    parts: { lg: [45, 90], lg5: [60, 110], ld: [90, 160], md: [140, 260], hd: [220, 420] },
    labor: { lg: [0.5, 0.8], lg5: [0.6, 1], ld: [0.8, 1.2], md: [1, 1.5], hd: [1.2, 2] },
    partsList: ['Engine oil (correct spec/viscosity)', 'Oil filter', 'Drain plug gasket'],
    why: 'Oil lubricates and cools internal parts and carries away soot and metal. Old oil loses protection.',
    ignored: 'Accelerated bearing, cam and turbo wear; sludge; in the worst case engine failure.',
    note: 'Heavy-duty drain intervals vary widely (roughly 25,000–75,000 mi) by engine, oil spec and duty. Oil analysis can safely extend or shorten it.' },
  { id: 'fuelfilter', cat: 'engine', name: 'Fuel filter replacement', kind: 'service', req: 'required', urgency: 'high', applies: isDiesel,
    interval: { ld: 20000, md: 30000, hd: 50000 }, months: 24,
    parts: { ld: [60, 150], md: [70, 160], hd: [80, 200] },
    labor: { ld: [0.5, 1], md: [0.6, 1.2], hd: [0.8, 1.5] },
    partsList: ['Primary fuel filter / water separator', 'Secondary fuel filter'],
    why: 'Modern high-pressure injection systems are very sensitive to dirt and water in fuel.',
    ignored: 'Power loss, hard starting, and expensive injector or high-pressure pump damage.' },
  { id: 'airfilter', cat: 'engine', name: 'Engine air filter', kind: 'service', req: 'required', urgency: 'medium', applies: notEV,
    interval: { lg: 30000, lg5: 30000, ld: 30000, md: 50000, hd: 100000 }, months: 24,
    parts: { lg: [20, 50], lg5: [30, 70], ld: [40, 90], md: [70, 160], hd: [120, 300] },
    labor: { lg: [0.2, 0.3], lg5: [0.2, 0.4], ld: [0.3, 0.5], md: [0.3, 0.6], hd: [0.4, 0.8] },
    partsList: ['Air filter element', 'Safety element (if equipped)'],
    why: 'A clogged filter starves the engine of air and raises fuel use; a torn one lets dust in.',
    ignored: 'Lower power and MPG, more soot (DPF loading), and dust-related engine wear.',
    note: 'Many heavy trucks change the air filter based on the restriction indicator rather than miles.' },
  { id: 'coolant', cat: 'electrical', name: 'Coolant test & replacement', kind: 'service', req: 'required', urgency: 'medium', applies: notEV,
    interval: { lg: 150000, lg5: 150000, ld: 150000, md: 300000, hd: 600000 }, months: 60,
    parts: { lg: [50, 110], lg5: [60, 140], ld: [90, 200], md: [150, 350], hd: [250, 550] },
    labor: { lg: [1, 1.5], lg5: [1.2, 2], ld: [1.5, 2.5], md: [2, 3], hd: [2.5, 4] },
    partsList: ['Extended-life coolant (OEM spec)', 'Coolant filter (if equipped)', 'Test strips'],
    why: 'Coolant prevents overheating, freezing and internal corrosion/cavitation.',
    ignored: 'Overheating, liner pitting, water pump and radiator failures.',
    note: 'Test coolant condition (freeze point and additives) at every oil service.' },
  { id: 'belt', cat: 'engine', name: 'Serpentine belt & tensioner inspection', kind: 'inspect', req: 'recommended', urgency: 'medium', applies: notEV,
    interval: { lg: 30000, lg5: 30000, ld: 30000, md: 30000, hd: 50000 }, months: 12,
    parts: { lg: [0, 0], lg5: [0, 0], ld: [0, 0], md: [0, 0], hd: [0, 0] },
    labor: { lg: [0.2, 0.4], lg5: [0.2, 0.4], ld: [0.2, 0.4], md: [0.3, 0.5], hd: [0.3, 0.5] },
    partsList: ['Belt and tensioner if worn (typical $80–$400 installed)'],
    why: 'One belt often drives the alternator, water pump and A/C. Cracks and glazing come before failure.',
    ignored: 'A broken belt can stop the water pump and alternator — overheating and a dead battery on the road.' },
  { id: 'turbo', cat: 'engine', name: 'Turbocharger & charge air inspection', kind: 'inspect', req: 'recommended', urgency: 'medium', applies: isDiesel,
    interval: { ld: 60000, md: 75000, hd: 100000 }, months: 24,
    parts: { ld: [0, 0], md: [0, 0], hd: [0, 0] },
    labor: { ld: [0.5, 1], md: [0.5, 1], hd: [0.8, 1.5] },
    partsList: ['Inspection only; boots/clamps if leaking'],
    why: 'Leaking charge-air boots and worn turbo bearings show up first as oil seepage and boost loss.',
    ignored: 'Power loss, high exhaust temperatures and possible turbo failure.' },
  { id: 'valves', cat: 'engine', name: 'Valve lash (overhead) adjustment', kind: 'service', req: 'required', urgency: 'medium', applies: heavyDiesel,
    interval: { md: 150000, hd: 300000 }, months: null,
    parts: { md: [40, 100], hd: [60, 150] },
    labor: { md: [2, 3.5], hd: [3, 5] },
    partsList: ['Valve cover gasket(s)'],
    why: 'Valve clearance changes as parts wear; correct lash keeps power, economy and engine-brake performance.',
    ignored: 'Rough running, lower MPG, burnt valves or engine-brake problems.',
    note: 'Many engines need the first adjustment earlier than later ones. Check your engine maker’s schedule.' },
  { id: 'sparkplugs', cat: 'engine', name: 'Spark plugs', kind: 'service', req: 'required', urgency: 'medium', applies: isGasLike,
    interval: { lg: 100000, lg5: 100000 }, months: null,
    parts: { lg: [60, 160], lg5: [80, 200] }, labor: { lg: [1, 2.5], lg5: [1.5, 3] },
    partsList: ['Spark plugs (OEM spec)'],
    why: 'Worn plugs cause misfires, poor economy and catalytic converter damage.',
    ignored: 'Misfires, hard starts and possible catalytic converter damage.' },
  { id: 'diag', cat: 'engine', name: 'Engine diagnostic scan & fault code review', kind: 'inspect', req: 'recommended', urgency: 'low', applies: () => true,
    interval: { lg: 30000, lg5: 30000, ld: 30000, md: 50000, hd: 50000 }, months: 12,
    parts: { lg: [0, 0], lg5: [0, 0], ld: [0, 0], md: [0, 0], hd: [0, 0] },
    labor: { lg: [0.5, 1], lg5: [0.5, 1], ld: [0.5, 1], md: [0.75, 1], hd: [0.75, 1.25] },
    partsList: ['Diagnostic software scan'],
    why: 'Stored and inactive fault codes reveal problems before a warning light comes on.',
    ignored: 'Small sensor or aftertreatment faults can escalate into derates and tows.' },

  // ---------------- DRIVETRAIN ----------------
  { id: 'transfluid', cat: 'drivetrain', name: 'Transmission fluid & filter', kind: 'service', req: 'required', urgency: 'medium', applies: notEV,
    interval: { lg: 150000, lg5: 150000, ld: 150000, md: 150000, hd: 500000 }, months: 72,
    parts: { lg: [80, 200], lg5: [120, 260], ld: [150, 350], md: [200, 450], hd: [250, 600] },
    labor: { lg: [1, 2], lg5: [1.2, 2], ld: [1.5, 2.5], md: [1.5, 3], hd: [1.5, 3] },
    partsList: ['Transmission fluid (OEM spec)', 'Transmission filter(s)', 'Gasket'],
    why: 'Fluid cools and protects gears and clutches. Heat and heavy loads break it down.',
    ignored: 'Harsh or slipping shifts and expensive transmission rebuilds.',
    note: 'Severe service (towing, vocational) often halves this interval. Allison automatics follow their own schedule.' },
  { id: 'clutch', cat: 'drivetrain', name: 'Clutch inspection & adjustment', kind: 'inspect', req: 'recommended', urgency: 'medium', applies: manualTrans,
    interval: { lg: 50000, lg5: 50000, ld: 50000, md: 50000, hd: 75000 }, months: 12,
    parts: { lg: [0, 0], lg5: [0, 0], ld: [0, 0], md: [0, 0], hd: [0, 0] },
    labor: { lg: [0.5, 1], lg5: [0.5, 1], ld: [0.5, 1], md: [0.5, 1], hd: [0.5, 1.2] },
    partsList: ['Inspection / free-play adjustment'],
    why: 'Correct free-play prevents slipping and premature wear.',
    ignored: 'Slipping clutch, burnt flywheel and a costly clutch replacement.' },
  { id: 'diff', cat: 'drivetrain', name: 'Differential / axle fluid', kind: 'service', req: 'required', urgency: 'medium', applies: () => true,
    interval: { lg: 100000, lg5: 100000, ld: 100000, md: 250000, hd: 500000 }, months: 60,
    parts: { lg: [40, 100], lg5: [60, 140], ld: [70, 160], md: [150, 350], hd: [250, 600] },
    labor: { lg: [0.8, 1.2], lg5: [1, 1.5], ld: [1, 1.5], md: [1.5, 2.5], hd: [2, 3.5] },
    partsList: ['Gear oil (synthetic per spec)', 'Fill/drain plugs or gasket'],
    why: 'Gear oil protects the ring and pinion and bearings from heat and wear.',
    ignored: 'Whining, overheating and axle bearing or gear failure.',
    note: 'Heavy-duty intervals assume synthetic lube; petroleum gear oil is commonly changed far sooner.' },
  { id: 'transfercase', cat: 'drivetrain', name: 'Transfer case fluid', kind: 'service', req: 'required', urgency: 'low', applies: fourWheel,
    interval: { lg: 60000, lg5: 60000, ld: 60000, md: 100000, hd: 100000 }, months: 60,
    parts: { lg: [30, 80], lg5: [30, 80], ld: [40, 90], md: [60, 140], hd: [60, 140] },
    labor: { lg: [0.5, 1], lg5: [0.5, 1], ld: [0.5, 1], md: [0.8, 1.2], hd: [0.8, 1.2] },
    partsList: ['Transfer case fluid (OEM spec)'],
    why: 'Fresh fluid protects the chain/gears that send power to the front axle.',
    ignored: 'Noise, binding and transfer case failure.' },
  { id: 'driveline', cat: 'drivetrain', name: 'Driveshaft, U-joints & chassis lube', kind: 'inspect', req: 'recommended', urgency: 'medium', applies: () => true,
    interval: { lg: 15000, lg5: 15000, ld: 15000, md: 15000, hd: 25000 }, months: 6,
    parts: { lg: [0, 20], lg5: [0, 20], ld: [0, 30], md: [10, 40], hd: [15, 50] },
    labor: { lg: [0.3, 0.5], lg5: [0.3, 0.6], ld: [0.3, 0.6], md: [0.5, 1], hd: [0.8, 1.5] },
    partsList: ['Chassis grease'],
    why: 'Greasing U-joints, slip yokes and steering/suspension points prevents dry wear.',
    ignored: 'Vibration, U-joint failure and in extreme cases a dropped driveshaft.' },

  // ---------------- BRAKES & SUSPENSION ----------------
  { id: 'brakes', cat: 'brakes', name: 'Brake inspection (pads/shoes, rotors/drums)', kind: 'inspect', req: 'required', urgency: 'critical', applies: () => true,
    interval: { lg: 15000, lg5: 15000, ld: 15000, md: 20000, hd: 25000 }, months: 6,
    parts: { lg: [0, 0], lg5: [0, 0], ld: [0, 0], md: [0, 0], hd: [0, 0] },
    labor: { lg: [0.5, 1], lg5: [0.5, 1], ld: [0.6, 1], md: [0.8, 1.5], hd: [1, 2] },
    partsList: ['Inspection; pads/shoes if below spec'],
    why: 'Brakes are the most safety-critical wear item on any truck.',
    ignored: 'Longer stopping distances, rotor/drum damage, out-of-service violations and crashes.' },
  { id: 'brakereline', cat: 'brakes', name: 'Brake pads / shoes replacement (per axle)', kind: 'service', req: 'recommended', urgency: 'high', applies: () => true,
    interval: { lg: 50000, lg5: 50000, ld: 50000, md: 80000, hd: 250000 }, months: null,
    parts: { lg: [100, 300], lg5: [150, 350], ld: [150, 400], md: [250, 600], hd: [350, 900] },
    labor: { lg: [1.5, 2.5], lg5: [1.5, 3], ld: [2, 3], md: [2.5, 4], hd: [3, 5] },
    partsList: ['Pads or shoes', 'Hardware kit', 'Rotors/drums if out of spec'],
    why: 'Planned replacement based on typical wear so you can budget for it.',
    ignored: 'Metal-to-metal contact destroys rotors/drums and greatly raises the bill.',
    note: 'Actual brake life depends heavily on route, load and driving style. Inspection measurements take priority over this estimate.' },
  { id: 'airbrake', cat: 'brakes', name: 'Air brake system check (chambers, slack adjusters, leaks)', kind: 'inspect', req: 'required', urgency: 'critical', applies: airBrakes,
    interval: { md: 25000, hd: 25000, ld: 25000, lg5: 25000 }, months: 3,
    parts: { md: [0, 0], hd: [0, 0], ld: [0, 0], lg5: [0, 0] },
    labor: { md: [1, 1.5], hd: [1, 2], ld: [1, 1.5], lg5: [1, 1.5] },
    partsList: ['Inspection; chamber/slack adjuster parts if needed'],
    why: 'Out-of-adjustment brakes and air leaks are among the most common roadside out-of-service violations.',
    ignored: 'Reduced braking, out-of-service orders and fines.' },
  { id: 'airdryer', cat: 'brakes', name: 'Air dryer cartridge & compressor check', kind: 'service', req: 'required', urgency: 'medium', applies: airBrakes,
    interval: { md: 100000, hd: 150000, ld: 100000, lg5: 100000 }, months: 24,
    parts: { md: [80, 200], hd: [100, 250], ld: [80, 200], lg5: [80, 200] },
    labor: { md: [0.5, 1], hd: [0.5, 1], ld: [0.5, 1], lg5: [0.5, 1] },
    partsList: ['Air dryer cartridge (coalescing type if oil present)'],
    why: 'The dryer keeps water and oil out of the air system; the compressor builds the pressure.',
    ignored: 'Water and oil in air tanks, frozen lines in winter, and valve failures.' },
  { id: 'suspension', cat: 'brakes', name: 'Suspension, shocks & steering inspection', kind: 'inspect', req: 'recommended', urgency: 'high', applies: () => true,
    interval: { lg: 30000, lg5: 30000, ld: 30000, md: 30000, hd: 50000 }, months: 12,
    parts: { lg: [0, 0], lg5: [0, 0], ld: [0, 0], md: [0, 0], hd: [0, 0] },
    labor: { lg: [0.5, 1], lg5: [0.5, 1], ld: [0.5, 1], md: [0.8, 1.2], hd: [1, 1.5] },
    partsList: ['Inspection; shocks, bushings, kingpins, tie-rod ends if worn'],
    why: 'Worn steering and suspension parts affect handling, tire wear and safety.',
    ignored: 'Wandering, uneven tire wear, and loss of control in the worst case.' },
  { id: 'shocks', cat: 'brakes', name: 'Shock absorber replacement', kind: 'service', req: 'recommended', urgency: 'low', applies: () => true,
    interval: { lg: 75000, lg5: 75000, ld: 75000, md: 100000, hd: 150000 }, months: null,
    parts: { lg: [150, 400], lg5: [200, 500], ld: [200, 600], md: [250, 700], hd: [300, 800] },
    labor: { lg: [1, 2], lg5: [1, 2], ld: [1, 2], md: [1.5, 2.5], hd: [1.5, 3] },
    partsList: ['Shock absorbers (set)'],
    why: 'Worn shocks let tires bounce and cup, and reduce stability.',
    ignored: 'Cupped tires, poor ride and handling.' },
  { id: 'alignment', cat: 'brakes', name: 'Wheel alignment', kind: 'service', req: 'recommended', urgency: 'low', applies: () => true,
    interval: { lg: 50000, lg5: 50000, ld: 50000, md: 75000, hd: 100000 }, months: 24,
    parts: { lg: [0, 0], lg5: [0, 0], ld: [0, 0], md: [0, 0], hd: [0, 0] },
    labor: { lg: [1, 1.2], lg5: [1, 1.5], ld: [1, 1.5], md: [1.5, 2.5], hd: [2, 3.5] },
    partsList: ['Alignment service (all axles on heavy trucks)'],
    why: 'Misalignment wears tires quickly and costs fuel.',
    ignored: 'Rapid, uneven tire wear — often the single biggest tire cost driver.' },

  // ---------------- TIRES ----------------
  { id: 'tirerotate', cat: 'tires', name: 'Tire rotation & tread/pressure check', kind: 'service', req: 'recommended', urgency: 'medium', applies: (t) => Number(t.class) <= 5,
    interval: { lg: 7500, lg5: 10000, ld: 7500, md: 15000 }, months: 6,
    parts: { lg: [0, 0], lg5: [0, 0], ld: [0, 0], md: [0, 0] },
    labor: { lg: [0.5, 0.8], lg5: [0.6, 1], ld: [0.6, 1], md: [0.8, 1.2] },
    partsList: ['Rotation service'],
    why: 'Rotation evens out wear so the whole set lasts longer.',
    ignored: 'Uneven wear and replacing tires early.' },
  { id: 'tireinspect', cat: 'tires', name: 'Tire tread depth, pressure & condition inspection', kind: 'inspect', req: 'required', urgency: 'high', applies: (t) => Number(t.class) >= 6,
    interval: { lg5: 15000, md: 15000, hd: 15000 }, months: 3,
    parts: { lg5: [0, 0], md: [0, 0], hd: [0, 0] }, labor: { lg5: [0.3, 0.5], md: [0.3, 0.6], hd: [0.5, 1] },
    partsList: ['Tread gauge, pressure check'],
    why: 'Federal minimum tread is 4/32″ on steer tires and 2/32″ on other positions (49 CFR 393.75).',
    ignored: 'Blowouts, out-of-service violations and poor braking.' },
  { id: 'tirereplace', cat: 'tires', name: 'Tire replacement (budget estimate, full set)', kind: 'service', req: 'recommended', urgency: 'medium', applies: () => true,
    interval: { lg: 50000, lg5: 50000, ld: 50000, md: 80000, hd: 150000 }, months: 72,
    parts: { lg: [800, 1600], lg5: [1200, 2400], ld: [1400, 2800], md: [2400, 4800], hd: [5000, 9500] },
    labor: { lg: [1, 1.5], lg5: [1.5, 2], ld: [1.5, 2], md: [2, 3], hd: [3, 5] },
    partsList: ['Tires (all positions)', 'Valve stems', 'Mount & balance'],
    why: 'Tires are one of the largest operating costs; planning for them avoids surprises.',
    ignored: 'Worn tires raise blowout risk and fail inspections.',
    note: 'Heavy trucks rarely replace every tire at once — steer tires typically wear out first. Treat this as a budgeting figure.' },
  { id: 'wheelbearing', cat: 'tires', name: 'Wheel bearing & hub seal inspection', kind: 'inspect', req: 'recommended', urgency: 'high', applies: () => true,
    interval: { lg: 30000, lg5: 30000, ld: 30000, md: 50000, hd: 100000 }, months: 12,
    parts: { lg: [0, 0], lg5: [0, 0], ld: [0, 0], md: [0, 0], hd: [0, 0] },
    labor: { lg: [0.5, 1], lg5: [0.5, 1], ld: [0.5, 1], md: [1, 1.5], hd: [1, 2] },
    partsList: ['Inspection; hub oil top-off on oil-bath hubs'],
    why: 'Leaking hub seals and loose bearings can lead to wheel-end fires or a wheel separating.',
    ignored: 'Bearing failure, wheel-off events and hub fires.' },
  { id: 'lugtorque', cat: 'tires', name: 'Lug nut torque check', kind: 'inspect', req: 'recommended', urgency: 'high', applies: (t) => Number(t.class) >= 4,
    interval: { lg5: 10000, ld: 10000, md: 10000, hd: 25000 }, months: 6,
    parts: { lg5: [0, 0], ld: [0, 0], md: [0, 0], hd: [0, 0] }, labor: { lg5: [0.3, 0.5], ld: [0.3, 0.5], md: [0.3, 0.5], hd: [0.5, 1] },
    partsList: ['Torque check'],
    why: 'Re-torquing (especially after any tire work) prevents loose wheels.',
    ignored: 'Wheel separation — extremely dangerous.' },

  // ---------------- ELECTRICAL & COOLING ----------------
  { id: 'battery', cat: 'electrical', name: 'Battery, alternator & starter test', kind: 'inspect', req: 'recommended', urgency: 'medium', applies: notEV,
    interval: { lg: 30000, lg5: 30000, ld: 30000, md: 50000, hd: 50000 }, months: 12,
    parts: { lg: [0, 0], lg5: [0, 0], ld: [0, 0], md: [0, 0], hd: [0, 0] },
    labor: { lg: [0.3, 0.5], lg5: [0.3, 0.5], ld: [0.3, 0.5], md: [0.5, 0.8], hd: [0.5, 1] },
    partsList: ['Load test; clean terminals'],
    why: 'Weak batteries and charging issues are a top cause of no-starts and roadside calls.',
    ignored: 'No-starts, electrical faults and stranded trucks, especially in cold weather.' },
  { id: 'coolingsys', cat: 'electrical', name: 'Radiator, hoses & cooling system pressure test', kind: 'inspect', req: 'recommended', urgency: 'high', applies: notEV,
    interval: { lg: 30000, lg5: 30000, ld: 30000, md: 50000, hd: 75000 }, months: 12,
    parts: { lg: [0, 0], lg5: [0, 0], ld: [0, 0], md: [0, 0], hd: [0, 0] },
    labor: { lg: [0.5, 1], lg5: [0.5, 1], ld: [0.5, 1], md: [0.8, 1.2], hd: [1, 1.5] },
    partsList: ['Pressure test; hoses/clamps if needed'],
    why: 'Cooling system leaks start small. A pressure test finds them before an overheat.',
    ignored: 'Overheating and possible head gasket or engine damage.' },

  // ---------------- EMISSIONS ----------------
  { id: 'dpf', cat: 'emissions', name: 'DPF cleaning / service', kind: 'service', req: 'required', urgency: 'medium', applies: modernDiesel,
    interval: { ld: 150000, md: 200000, hd: 400000 }, months: null,
    parts: { ld: [100, 300], md: [300, 700], hd: [400, 900] },
    labor: { ld: [2, 4], md: [2.5, 4], hd: [3, 5] },
    partsList: ['DPF thermal/ash cleaning', 'Clamps and gaskets'],
    why: 'Ash that regeneration can’t burn off builds up in the diesel particulate filter.',
    ignored: 'Frequent regens, derates, high fuel use and possible DPF damage ($3,000+).',
    note: 'Cleaning intervals vary greatly with idle time and duty cycle. Frequent regens are a sign it’s due.' },
  { id: 'deffilter', cat: 'emissions', name: 'DEF filter replacement', kind: 'service', req: 'required', urgency: 'medium', applies: scrDiesel,
    interval: { ld: 120000, md: 150000, hd: 200000 }, months: 36,
    parts: { ld: [40, 120], md: [50, 140], hd: [60, 160] },
    labor: { ld: [0.5, 1], md: [0.5, 1], hd: [0.5, 1] },
    partsList: ['DEF pump/dosing filter'],
    why: 'A clogged DEF filter starves the SCR system, triggering faults and derates.',
    ignored: 'Check-engine lights, power derate, and possible DEF pump failure.' },
  { id: 'egr', cat: 'emissions', name: 'EGR valve & cooler inspection', kind: 'inspect', req: 'recommended', urgency: 'medium', applies: modernDiesel,
    interval: { ld: 100000, md: 150000, hd: 250000 }, months: null,
    parts: { ld: [0, 0], md: [0, 0], hd: [0, 0] },
    labor: { ld: [1, 2], md: [1, 2], hd: [1.5, 2.5] },
    partsList: ['Inspection / cleaning'],
    why: 'Soot buildup and cooler leaks are common EGR failure points.',
    ignored: 'Coolant loss, white smoke, derates and expensive cooler replacement.' },
  { id: 'doc', cat: 'emissions', name: 'DOC / aftertreatment system inspection', kind: 'inspect', req: 'recommended', urgency: 'low', applies: modernDiesel,
    interval: { ld: 100000, md: 150000, hd: 200000 }, months: 24,
    parts: { ld: [0, 0], md: [0, 0], hd: [0, 0] },
    labor: { ld: [0.5, 1], md: [0.5, 1], hd: [0.8, 1.5] },
    partsList: ['Sensor checks, regen history review, exhaust leak check'],
    why: 'NOx and temperature sensors and the DOC drive regeneration. Catching weak sensors avoids derates.',
    ignored: 'Failed regens, derates and unplanned downtime.' },
  { id: 'catconv', cat: 'emissions', name: 'Catalytic converter & O2 sensor check', kind: 'inspect', req: 'recommended', urgency: 'low', applies: isGasLike,
    interval: { lg: 60000, lg5: 60000 }, months: null,
    parts: { lg: [0, 0], lg5: [0, 0] }, labor: { lg: [0.5, 1], lg5: [0.5, 1] },
    partsList: ['Scan & visual inspection'],
    why: 'Exhaust leaks or failing oxygen sensors hurt fuel economy and can fail emissions tests.',
    ignored: 'Lower MPG, failed emissions inspection.' },

  // ---------------- COMMERCIAL ----------------
  { id: 'fifthwheel', cat: 'commercial', name: 'Fifth wheel inspection & lube', kind: 'service', req: 'required', urgency: 'high', applies: isTractor,
    interval: { hd: 25000, md: 25000 }, months: 3,
    parts: { hd: [10, 40], md: [10, 40] }, labor: { hd: [0.5, 1], md: [0.5, 1] },
    partsList: ['Fifth wheel grease', 'Inspection of jaws/lock'],
    why: 'The fifth wheel is the only connection between tractor and trailer.',
    ignored: 'Hard coupling, excess wear, and in the worst case a dropped trailer.' },
  { id: 'trailerconn', cat: 'commercial', name: 'Trailer connections (gladhands, air lines, 7-way)', kind: 'inspect', req: 'required', urgency: 'high', applies: isTractor,
    interval: { hd: 25000, md: 25000 }, months: 3,
    parts: { hd: [0, 60], md: [0, 60] }, labor: { hd: [0.3, 0.6], md: [0.3, 0.6] },
    partsList: ['Gladhand seals, pigtail if damaged'],
    why: 'Leaking gladhands and damaged pigtails cause brake and lighting failures on the trailer.',
    ignored: 'Trailer brake or lighting failure and roadside violations.' },
  { id: 'reefer', cat: 'commercial', name: 'Reefer unit service', kind: 'service', req: 'required', urgency: 'high', applies: hasReefer,
    interval: { lg: null, lg5: 40000, ld: 40000, md: 50000, hd: 75000 }, months: 6,
    parts: { lg5: [150, 350], ld: [150, 350], md: [200, 400], hd: [250, 500] },
    labor: { lg5: [2, 3], ld: [2, 3], md: [2, 3.5], hd: [2.5, 4] },
    partsList: ['Reefer engine oil & filters', 'Belts', 'Refrigeration check'],
    why: 'Reefer units run on their own engine hours. A failure can spoil an entire load.',
    ignored: 'Temperature excursions, rejected loads and claims.',
    note: 'Reefer units are normally serviced by engine hours (often 1,500–3,000 hrs). Months/miles here are a proxy.' },
  { id: 'annual', cat: 'commercial', name: 'Annual periodic inspection (49 CFR 396.17)', kind: 'inspect', req: 'required', urgency: 'critical',
    applies: (t) => Number(t.class) >= 3 || t.commercial === true,
    interval: { lg: null, lg5: null, ld: null, md: null, hd: null }, months: 12,
    parts: { lg: [0, 0], lg5: [0, 0], ld: [0, 0], md: [0, 0], hd: [0, 0] },
    labor: { lg: [1, 1.5], lg5: [1, 1.5], ld: [1, 1.5], md: [1.5, 2], hd: [1.5, 2.5] },
    partsList: ['Qualified inspector; keep the report in the vehicle file'],
    why: 'Commercial motor vehicles in interstate commerce (10,001+ lbs GVWR) must pass a periodic inspection at least every 12 months.',
    ignored: 'Out-of-service orders, fines and failed audits. Some states require additional inspections.' },
];

/* ------------------------------------------------------------------ */
/* Known-issue library (risk indicators, not predictions)             */
/* ------------------------------------------------------------------ */
// match: regex tested against "make model engineModel engineMfr displacement"
export const KNOWN_ISSUES = [
  { match: /power ?stroke.*6\.7|6\.7.*ford|ford.*6\.7/i, title: 'Ford 6.7L Power Stroke', items: [
    { issue: 'High-pressure fuel pump (CP4.2) failure', why: 'Pump is sensitive to fuel contamination and water; failure can spread metal debris through the fuel system.', signs: 'Hard start, sudden loss of power, fuel-pressure fault codes', prevent: 'Change fuel filters on time, drain the water separator, buy quality diesel', cost: [8000, 12000], window: [100000, 250000], type: 'failure' },
    { issue: 'EGR cooler and DPF/SCR sensor faults', why: 'Soot and heat cycling', signs: 'Check-engine light, coolant loss, frequent regens', prevent: 'Avoid excessive idling, keep up on DEF and coolant', cost: [600, 3500], window: [80000, 200000], type: 'failure' },
    { issue: 'Turbocharger wear (early models)', why: 'Bearing wear on 2011–2014 turbos', signs: 'Whistling, power loss, oil in intake', prevent: 'Warm up/cool down the engine, clean oil', cost: [2500, 5000], window: [100000, 200000], type: 'failure' }] },
  { match: /power ?stroke.*6\.0|6\.0.*ford/i, title: 'Ford 6.0L Power Stroke', items: [
    { issue: 'EGR & oil cooler failures', why: 'Clogged oil cooler starves the EGR cooler of coolant flow', signs: 'Coolant loss, white smoke, oil/coolant temp split > 15°F', prevent: 'Monitor oil vs coolant temperature; flush cooling system', cost: [2000, 4500], window: [80000, 200000], type: 'failure' },
    { issue: 'Head gasket / head bolt stretch', why: 'Torque-to-yield bolts and high cylinder pressure', signs: 'Pressurized coolant, overheating under load', prevent: 'Avoid aggressive tunes; address EGR cooler issues early', cost: [5000, 9000], window: [100000, 250000], type: 'failure' }] },
  { match: /cummins.*6\.7|6\.7.*cummins|ram.*(2500|3500|4500|5500).*diesel/i, title: 'Cummins 6.7L (Ram)', items: [
    { issue: 'EGR valve / cooler and DEF heater faults', why: 'Soot and heat; DEF heater elements fail with age', signs: 'Check-engine light, derate, DEF warning', prevent: 'Use fresh DEF, limit idling, run diagnostic scans', cost: [400, 2500], window: [80000, 200000], type: 'failure' },
    { issue: 'Variable-geometry turbo sticking', why: 'Soot buildup on vanes', signs: 'Lack of boost, exhaust brake weak, turbo fault codes', prevent: 'Regular highway runs at load; clean intake', cost: [1500, 4000], window: [100000, 250000], type: 'failure' }] },
  { match: /duramax|6\.6l?.*(chevrolet|gmc)|(chevrolet|gmc).*6\.6/i, title: 'GM Duramax 6.6L', items: [
    { issue: 'CP4 high-pressure fuel pump (LML 2011–2016)', why: 'Sensitive to water and poor lubricity fuel', signs: 'Sudden stall, no start, fuel-rail pressure codes', prevent: 'Water separator maintenance, quality fuel', cost: [7000, 11000], window: [100000, 250000], type: 'failure' },
    { issue: 'DEF system & NOx sensor faults', why: 'Sensor aging and DEF crystallization', signs: 'DEF warnings, speed-limit derate countdown', prevent: 'Keep DEF fresh and topped up; avoid long idle periods', cost: [400, 1800], window: [80000, 180000], type: 'failure' }] },
  { match: /x15|isx/i, title: 'Cummins X15 / ISX15', items: [
    { issue: 'EGR cooler and EGR valve issues', why: 'Thermal cycling and soot', signs: 'Coolant loss, white smoke, high intake temp codes', prevent: 'Coolant maintenance; reduce idle time', cost: [2500, 6000], window: [300000, 600000], type: 'failure' },
    { issue: 'Aftertreatment (DPF/SCR) sensor and doser faults', why: 'Heat and soot loading', signs: 'Frequent regens, derate, NOx codes', prevent: 'DPF cleaning on schedule, quality DEF', cost: [800, 4000], window: [200000, 500000], type: 'failure' },
    { issue: 'Overhead adjustment & injector wear', why: 'Normal high-mileage wear', signs: 'Rough idle, fuel economy drop, blow-by', prevent: 'Overhead set on schedule, clean fuel', cost: [3500, 9000], window: [500000, 800000], type: 'routine' }] },
  { match: /dd15|dd13|dd16|detroit/i, title: 'Detroit DD13 / DD15 / DD16', items: [
    { issue: 'EGR cooler and EGR valve wear', why: 'Thermal cycling', signs: 'Coolant loss, white smoke', prevent: 'ELC coolant maintenance; reduce idling', cost: [2500, 6000], window: [300000, 600000], type: 'failure' },
    { issue: 'One Box aftertreatment faults (DPF, doser, NOx sensors)', why: 'Soot and heat; sensor aging', signs: 'Regen frequency up, derate, DEF codes', prevent: 'Ash cleaning on schedule, fix exhaust leaks quickly', cost: [800, 5000], window: [200000, 500000], type: 'failure' },
    { issue: 'Water pump and turbo wear', why: 'High-mileage wear', signs: 'Coolant weep, boost loss, oil in charge air', prevent: 'Inspect at each PM', cost: [1200, 5000], window: [400000, 700000], type: 'routine' }] },
  { match: /mx-?13|mx-?11|paccar/i, title: 'PACCAR MX-13 / MX-11', items: [
    { issue: 'EGR system and aftertreatment sensor faults', why: 'Soot and heat', signs: 'Derate, coolant loss, NOx codes', prevent: 'Routine scans; DPF service on schedule', cost: [1000, 5000], window: [250000, 550000], type: 'failure' },
    { issue: 'Turbo actuator issues', why: 'Electronic actuator wear', signs: 'Boost faults, low power', prevent: 'Keep charge-air system sealed and clean', cost: [1500, 4500], window: [300000, 600000], type: 'failure' }] },
  { match: /d13|d11|mp8|mp7|volvo|mack/i, title: 'Volvo D13 / Mack MP8', items: [
    { issue: 'EGR and DPF/SCR system faults', why: 'Soot and heat; sensor aging', signs: 'Derates, frequent regens', prevent: 'Ash service on schedule, limit idle', cost: [1000, 5000], window: [250000, 550000], type: 'failure' },
    { issue: 'I-Shift / mDRIVE clutch and actuator wear', why: 'Normal wear, aggressive launches', signs: 'Slipping, missed shifts, clutch faults', prevent: 'Use correct launch gear; software updates', cost: [2500, 7000], window: [400000, 700000], type: 'routine' }] },
  { match: /maxxforce/i, title: 'Navistar MaxxForce', items: [
    { issue: 'EGR-only emissions system failures', why: 'Design relied heavily on EGR; known high failure rate', signs: 'Coolant loss, derates, heavy soot', prevent: 'Aggressive preventive maintenance; consider specialist shops', cost: [3000, 10000], window: [150000, 400000], type: 'failure' }] },
  { match: /a26|n13|international/i, title: 'International / Navistar', items: [
    { issue: 'Aftertreatment and EGR faults', why: 'Heat and soot', signs: 'Derate, regen issues', prevent: 'Scheduled DPF service, scans', cost: [1000, 4500], window: [250000, 500000], type: 'failure' }] },
  { match: /7\.3.*(gas|godzilla)|godzilla|6\.8.*ford|ford.*(6\.8|6\.2).*gas/i, title: 'Ford large gas V8 (6.2/6.8/7.3)', items: [
    { issue: 'Valvetrain / lifter wear (early 7.3L)', why: 'Reported lifter roller failures on some early units', signs: 'Ticking, misfire codes', prevent: 'Correct oil spec, on-time changes', cost: [2000, 6000], window: [50000, 150000], type: 'failure' },
    { issue: 'Exhaust manifold stud breakage', why: 'Heat cycling', signs: 'Ticking on cold start', prevent: 'Inspect at service', cost: [400, 1500], window: [80000, 180000], type: 'failure' }] },
];

// Generic wear items shown for every truck (by profile).
export const GENERIC_RISKS = [
  { issue: 'Brake system wear', why: 'Every stop wears friction material; heavy loads and hills accelerate it.', signs: 'Grinding, pulling, longer stops, low air pressure warnings', prevent: 'Inspect on schedule; keep adjusters set; avoid riding the brakes', costKey: 'brakereline', type: 'routine' },
  { issue: 'Cooling system failure', why: 'Hoses, water pumps and radiators age with heat cycles.', signs: 'Rising temperature, coolant smell, puddles, low coolant warnings', prevent: 'Pressure test yearly; coolant test at each oil change', cost: [500, 2500], window: [150000, 400000], type: 'failure' },
  { issue: 'Suspension component wear', why: 'Bushings, shocks, air bags and spring hangers wear with miles and road conditions.', signs: 'Uneven tire wear, wandering, leaning, air bag leaks', prevent: 'Regular inspection and lubrication', cost: [400, 2500], window: [150000, 400000], type: 'routine' },
  { issue: 'Turbocharger wear', diesel: true, why: 'Turbos spin very fast and depend on clean oil and cool-downs.', signs: 'Whistle/whine, smoke, power loss, oil in intake piping', prevent: 'Clean oil, warm-up and cool-down periods', cost: [2500, 6000], window: [300000, 700000], type: 'failure' },
  { issue: 'Fuel injector wear', diesel: true, why: 'Injectors wear with fuel contamination and age.', signs: 'Rough idle, smoke, poor MPG, misfire', prevent: 'On-time fuel filter changes, quality fuel', cost: [2500, 8000], window: [300000, 700000], type: 'failure' },
  { issue: 'DPF / aftertreatment repairs', diesel: true, modern: true, why: 'Soot and ash loading, sensor failures.', signs: 'Frequent regens, derates, DEF/emissions warnings', prevent: 'Limit idling, DPF service on schedule, fix leaks fast', cost: [800, 5000], window: [200000, 500000], type: 'failure' },
  { issue: 'Transmission problems', why: 'Heat and heavy loads break down fluid and clutches.', signs: 'Slipping, harsh or delayed shifts, warning lights', prevent: 'Fluid service on schedule; avoid overheating', cost: [2500, 9000], window: [250000, 700000], type: 'failure' },
];

/* ------------------------------------------------------------------ */
/* Inspection guide by mileage (what to look out for)                  */
/* ------------------------------------------------------------------ */
export const CHECKUPS = [
  { id: 'cooling', title: 'Cooling system', minMiles: 0, cost: [0.5, 1.2],
    inspect: ['Coolant level (engine cold)', 'Leaks around radiator, water pump and hoses', 'Radiator fins and condition', 'Soft, swollen or cracked hoses', 'Coolant condition / test strips'],
    signs: ['Engine temperature rising', 'Coolant disappearing', 'White exhaust smoke', 'Coolant puddles under the truck', 'Temperature gauge fluctuating'],
    ignored: 'Overheating can warp heads and blow gaskets — one of the most expensive engine failures.',
    where: 'Front of the engine: radiator behind the grille, hoses connecting the radiator to the engine, coolant reservoir on the side of the engine bay.' },
  { id: 'brakes', title: 'Brakes', minMiles: 0, cost: [0.5, 1.5],
    inspect: ['Pad/lining thickness', 'Rotor or drum scoring and cracks', 'Air leaks (air brakes) or fluid leaks (hydraulic)', 'Slack adjuster stroke (air brakes)', 'Hoses and chambers'],
    signs: ['Grinding or squealing', 'Pulling to one side', 'Low air warnings or slow air build-up', 'Soft or long pedal', 'Longer stopping distance'],
    ignored: 'Brake failure is a direct crash risk and a top roadside out-of-service violation.',
    where: 'Behind each wheel. Air brake chambers are the round canisters at each wheel end.' },
  { id: 'tires', title: 'Tires & wheel ends', minMiles: 0, cost: [0.3, 0.8],
    inspect: ['Tread depth (4/32″ steer, 2/32″ others for CMVs)', 'Pressure (cold)', 'Sidewall cuts and bulges', 'Hub oil level and seals', 'Loose or rust-streaked lug nuts'],
    signs: ['Uneven or cupped wear', 'Vibration at speed', 'Rust streaks from lug nuts', 'Oil on the inside of the wheel'],
    ignored: 'Blowouts, wheel-end fires and wheel separation.', where: 'Every wheel position, including inner duals.' },
  { id: 'electrical', title: 'Battery & charging', minMiles: 50000, cost: [0.3, 0.6],
    inspect: ['Battery terminals for corrosion', 'Load test', 'Alternator output', 'Cable routing and chafing'],
    signs: ['Slow cranking', 'Dim lights', 'Battery warning light', 'Electrical gremlins'],
    ignored: 'No-starts and roadside service calls, especially in winter.', where: 'Battery box (step box on heavy trucks) and alternator on the front of the engine.' },
  { id: 'driveline', title: 'Driveline & U-joints', minMiles: 100000, cost: [0.3, 0.8],
    inspect: ['U-joint play', 'Slip yoke wear', 'Carrier bearing', 'Grease points'],
    signs: ['Clunk when shifting into gear', 'Vibration at speed', 'Rust dust around U-joint caps'],
    ignored: 'A failed U-joint can drop the driveshaft.', where: 'Under the truck between the transmission and rear axles.' },
  { id: 'suspension', title: 'Suspension & steering', minMiles: 100000, cost: [0.5, 1.2],
    inspect: ['Kingpin play', 'Tie-rod ends', 'Shocks for leaks', 'Air bags for cracks/leaks', 'Spring hangers and U-bolts'],
    signs: ['Wandering', 'Loose steering', 'Uneven tire wear', 'Leaning or bouncing'],
    ignored: 'Loss of control and rapid tire wear.', where: 'Front axle steering components and each suspension corner.' },
  { id: 'turbo', title: 'Turbo & charge-air system', minMiles: 150000, diesel: true, cost: [0.5, 1],
    inspect: ['Charge-air cooler and boots for oil/leaks', 'Turbo shaft play', 'Exhaust leaks at manifold'],
    signs: ['Whistle or siren sound', 'Power loss', 'Black or blue smoke', 'Oil in intake piping'],
    ignored: 'Turbo failure can send debris into the engine.', where: 'On the exhaust side of the engine; large piping to the charge-air cooler in front of the radiator.' },
  { id: 'aftertreatment', title: 'Aftertreatment (DPF / SCR / DEF)', minMiles: 150000, diesel: true, cost: [0.5, 1.5],
    inspect: ['Regen frequency and history', 'DEF quality and crystals around doser', 'Exhaust leaks upstream of sensors', 'NOx and temperature sensor codes'],
    signs: ['Regens more often than usual', 'DEF warnings', 'Derate countdowns', 'Soot at exhaust joints'],
    ignored: 'Engine derates, tows and expensive DPF/SCR replacements.', where: 'Exhaust system after the turbo — usually a large canister under the cab or behind the steps.' },
  { id: 'major', title: 'High-mileage engine health', minMiles: 300000, cost: [1, 2.5],
    inspect: ['Oil analysis (fuel, coolant, wear metals)', 'Blow-by', 'Oil consumption trend', 'Valve lash'],
    signs: ['Rising oil consumption', 'Crankcase blow-by', 'Loss of power', 'Coolant in oil'],
    ignored: 'Early warning signs of an overhaul are missed until failure.', where: 'Oil sample from the oil pan; blow-by at the crankcase breather.' },
];

/* ------------------------------------------------------------------ */
/* DVIR / inspection checklist                                         */
/* ------------------------------------------------------------------ */
export const INSPECTION_CATEGORIES = [
  { id: 'brakes', label: 'Brakes', items: ['Service brakes', 'Parking brake', 'Air pressure build-up & governor', 'Air leaks (applied & released)', 'Brake chambers, hoses & slack adjusters'] },
  { id: 'tires', label: 'Tires & wheels', items: ['Tread depth', 'Inflation', 'Sidewalls, cuts & bulges', 'Lug nuts', 'Hub seals / oil level', 'Rims for cracks'] },
  { id: 'steering', label: 'Steering', items: ['Steering wheel free play', 'Steering box & lines', 'Tie rods & drag link'] },
  { id: 'suspension', label: 'Suspension', items: ['Springs & leaves', 'Air bags', 'U-bolts & hangers', 'Shocks'] },
  { id: 'lights', label: 'Lights & reflectors', items: ['Headlights (high/low)', 'Turn signals & 4-way flashers', 'Brake lights', 'Clearance & marker lights', 'Reflective tape / reflectors'] },
  { id: 'glass', label: 'Windshield & mirrors', items: ['Windshield cracks', 'Mirrors adjusted & intact'] },
  { id: 'wipers', label: 'Wipers', items: ['Wiper blades & operation', 'Washer fluid'] },
  { id: 'horn', label: 'Horn', items: ['Horn operates'] },
  { id: 'coupling', label: 'Coupling devices', items: ['Fifth wheel locked & secure', 'Kingpin & apron', 'Safety chains (if applicable)'], tractorOnly: true },
  { id: 'airlines', label: 'Air lines', items: ['Gladhands & seals', 'Lines secured, no chafing'], airOnly: true },
  { id: 'exhaust', label: 'Exhaust system', items: ['Leaks & loose mounts', 'Aftertreatment warnings'] },
  { id: 'fuel', label: 'Fuel system', items: ['Fuel tank & cap secure', 'Fuel leaks', 'DEF level (if equipped)'] },
  { id: 'emergency', label: 'Emergency equipment', items: ['Fire extinguisher charged', 'Warning triangles (3)', 'Spare fuses (if required)'] },
  { id: 'trailer', label: 'Trailer connections', items: ['7-way electrical plug', 'Trailer lights', 'Landing gear raised'], tractorOnly: true },
  { id: 'fluids', label: 'Engine compartment', items: ['Oil level', 'Coolant level', 'Belts & hoses', 'Visible leaks'] },
];

export const COMPLIANCE_REFERENCES = [
  { label: 'Driver vehicle inspection reports (49 CFR 396.11)', url: 'https://www.ecfr.gov/current/title-49/subtitle-B/chapter-III/subchapter-B/part-396/section-396.11' },
  { label: 'Pre-trip inspection requirement (49 CFR 396.13)', url: 'https://www.ecfr.gov/current/title-49/subtitle-B/chapter-III/subchapter-B/part-396/section-396.13' },
  { label: 'Periodic (annual) inspection (49 CFR 396.17)', url: 'https://www.ecfr.gov/current/title-49/subtitle-B/chapter-III/subchapter-B/part-396/section-396.17' },
  { label: 'Minimum periodic inspection standards (Appendix G to Subchapter B)', url: 'https://www.ecfr.gov/current/title-49/subtitle-B/chapter-III/subchapter-B/appendix-Appendix%20G%20to%20Subchapter%20B%20of%20Chapter%20III' },
  { label: 'FMCSA inspection, repair & maintenance overview', url: 'https://www.fmcsa.dot.gov/regulations/title49/part/396' },
];

/* ------------------------------------------------------------------ */
/* Regional data (ZIP -> state -> region)                              */
/* ------------------------------------------------------------------ */
// [firstZip3, lastZip3, state]
const ZIP3 = [
  [5, 5, 'NY'], [6, 9, 'PR'], [10, 27, 'MA'], [28, 29, 'RI'], [30, 38, 'NH'], [39, 49, 'ME'], [50, 54, 'VT'], [55, 55, 'MA'], [56, 59, 'VT'],
  [60, 69, 'CT'], [70, 89, 'NJ'], [100, 149, 'NY'], [150, 196, 'PA'], [197, 199, 'DE'], [200, 205, 'DC'], [206, 219, 'MD'],
  [220, 246, 'VA'], [247, 268, 'WV'], [270, 289, 'NC'], [290, 299, 'SC'], [300, 319, 'GA'], [320, 349, 'FL'], [350, 369, 'AL'],
  [370, 385, 'TN'], [386, 397, 'MS'], [398, 399, 'GA'], [400, 427, 'KY'], [430, 459, 'OH'], [460, 479, 'IN'], [480, 499, 'MI'],
  [500, 528, 'IA'], [530, 549, 'WI'], [550, 567, 'MN'], [569, 569, 'DC'], [570, 577, 'SD'], [580, 588, 'ND'], [590, 599, 'MT'],
  [600, 629, 'IL'], [630, 658, 'MO'], [660, 679, 'KS'], [680, 693, 'NE'], [700, 714, 'LA'], [716, 729, 'AR'], [730, 732, 'OK'],
  [733, 733, 'TX'], [734, 749, 'OK'], [750, 799, 'TX'], [800, 816, 'CO'], [820, 831, 'WY'], [832, 838, 'ID'], [840, 847, 'UT'],
  [850, 865, 'AZ'], [870, 884, 'NM'], [885, 885, 'TX'], [889, 898, 'NV'], [900, 961, 'CA'], [967, 968, 'HI'], [970, 979, 'OR'],
  [980, 994, 'WA'], [995, 999, 'AK'],
];

export function stateFromZip(zip) {
  const z = String(zip || '').trim();
  if (!/^\d{5}$/.test(z)) return null;
  const n = parseInt(z.slice(0, 3), 10);
  for (const [a, b, s] of ZIP3) if (n >= a && n <= b) return s;
  return null;
}

const REGION_OF = {
  CT: 'NE', ME: 'NE', MA: 'NE', NH: 'NE', RI: 'NE', VT: 'NE',
  DE: 'CA_', DC: 'CA_', MD: 'CA_', NJ: 'CA_', NY: 'CA_', PA: 'CA_',
  FL: 'LA_', GA: 'LA_', NC: 'LA_', SC: 'LA_', VA: 'LA_', WV: 'LA_', PR: 'LA_',
  IL: 'MW', IN: 'MW', IA: 'MW', KS: 'MW', KY: 'MW', MI: 'MW', MN: 'MW', MO: 'MW', NE: 'MW', ND: 'MW', SD: 'MW', OH: 'MW', OK: 'MW', TN: 'MW', WI: 'MW',
  AL: 'GC', AR: 'GC', LA: 'GC', MS: 'GC', NM: 'GC', TX: 'GC',
  CO: 'RM', ID: 'RM', MT: 'RM', UT: 'RM', WY: 'RM',
  AK: 'WC', AZ: 'WC', HI: 'WC', NV: 'WC', OR: 'WC', WA: 'WC',
  CA: 'CAL',
};

// Reference fuel prices per region (USD/gal). These are ILLUSTRATIVE reference
// values set when this data version was compiled, NOT live prices. The UI always
// asks the user to confirm their local pump price. Live prices require a keyed
// data provider via the backend (see docs/ARCHITECTURE.md).
export const REGIONS = {
  NE: { label: 'New England', diesel: 4.05, gas: 3.15, labor: 1.15 },
  CA_: { label: 'Central Atlantic', diesel: 3.95, gas: 3.2, labor: 1.12 },
  LA_: { label: 'Lower Atlantic', diesel: 3.7, gas: 3.0, labor: 0.95 },
  MW: { label: 'Midwest', diesel: 3.65, gas: 2.95, labor: 0.95 },
  GC: { label: 'Gulf Coast', diesel: 3.45, gas: 2.75, labor: 0.92 },
  RM: { label: 'Rocky Mountain', diesel: 3.7, gas: 3.05, labor: 1.0 },
  WC: { label: 'West Coast (excl. CA)', diesel: 4.05, gas: 3.65, labor: 1.1 },
  CAL: { label: 'California', diesel: 5.1, gas: 4.6, labor: 1.25 },
  US: { label: 'U.S. average', diesel: 3.75, gas: 3.1, labor: 1.0 },
};
export const FUEL_REFERENCE_DATE = '2026-11-01';

// State average retail prices (USD/gal): [diesel, regular gasoline].
// REFERENCE VALUES compiled for this data version, not live quotes. The app
// prefers, in order: the user's own pump price, live EIA weekly prices for the
// truck's region (when an EIA key is set), then these state averages.
export const STATE_FUEL = {
  AL: [3.55, 2.85], AK: [4.40, 3.70], AZ: [3.95, 3.25], AR: [3.45, 2.80], CA: [5.20, 4.65], CO: [3.70, 3.00],
  CT: [4.05, 3.15], DE: [3.75, 3.05], DC: [4.00, 3.30], FL: [3.75, 3.05], GA: [3.60, 2.95], HI: [5.40, 4.50],
  ID: [3.85, 3.30], IL: [3.85, 3.30], IN: [3.80, 3.05], IA: [3.55, 2.90], KS: [3.45, 2.85], KY: [3.65, 2.95],
  LA: [3.50, 2.80], ME: [4.00, 3.10], MD: [3.90, 3.10], MA: [4.10, 3.10], MI: [3.80, 3.10], MN: [3.65, 3.00],
  MS: [3.45, 2.75], MO: [3.45, 2.85], MT: [3.75, 3.20], NE: [3.50, 2.95], NV: [4.20, 3.80], NH: [3.95, 3.05],
  NJ: [3.85, 3.05], NM: [3.70, 3.00], NY: [4.15, 3.20], NC: [3.70, 2.95], ND: [3.60, 3.00], OH: [3.80, 3.00],
  OK: [3.40, 2.75], OR: [4.30, 3.90], PA: [4.15, 3.20], RI: [4.05, 3.10], SC: [3.60, 2.90], SD: [3.55, 3.05],
  TN: [3.55, 2.85], TX: [3.45, 2.75], UT: [3.80, 3.25], VT: [4.05, 3.20], VA: [3.75, 3.00], WA: [4.65, 4.20],
  WV: [3.85, 3.05], WI: [3.65, 2.95], WY: [3.65, 3.10], PR: [3.60, 3.00],
};

// Other fuels: national reference prices.
export const OTHER_FUEL = {
  cng: { price: 3.10, unit: 'GGE', label: 'CNG' },
  propane: { price: 3.00, unit: 'gal', label: 'Propane' },
  electric: { price: 0.17, unit: 'kWh', label: 'Electricity' },
};

// EIA weekly retail price areas (duoarea codes) for each region.
export const EIA_AREA = { NE: 'R1X', CA_: 'R1Y', LA_: 'R1Z', MW: 'R20', GC: 'R30', RM: 'R40', WC: 'R5XCA', CAL: 'SCA', US: 'NUS' };

export function regionForZip(zip) {
  const st = stateFromZip(zip);
  const key = (st && REGION_OF[st]) || 'US';
  return { state: st, key, ...REGIONS[key] };
}

/* ------------------------------------------------------------------ */
/* Federal registration / compliance hints by weight                   */
/* ------------------------------------------------------------------ */
export function complianceFor(truck) {
  const gvwr = Number(truck.gvwrLbs) || CLASSES.find((c) => c.id === Number(truck.class))?.min || 0;
  const out = [];
  if (gvwr >= 10001) out.push({ name: 'USDOT number', detail: 'Required for vehicles over 10,000 lbs GVWR used in interstate commerce (and in many states for intrastate).', url: 'https://www.fmcsa.dot.gov/registration/do-i-need-usdot-number' });
  if (gvwr >= 10001) out.push({ name: 'Annual periodic inspection', detail: 'At least every 12 months for CMVs in interstate commerce (49 CFR 396.17).', url: COMPLIANCE_REFERENCES[2].url });
  if (gvwr >= 10001) out.push({ name: 'Unified Carrier Registration (UCR)', detail: 'Annual fee for interstate carriers; amount depends on fleet size.', url: 'https://plan.ucr.gov/' });
  if (gvwr >= 26001) out.push({ name: 'CDL', detail: 'A commercial driver’s license is required at 26,001+ lbs GVWR (and for some other vehicle types).', url: 'https://www.fmcsa.dot.gov/registration/commercial-drivers-license' });
  if (gvwr >= 26001) out.push({ name: 'IRP apportioned plates & IFTA', detail: 'For qualified interstate vehicles over 26,000 lbs or with 3+ axles. Registered through your base state.', url: 'https://www.iftach.org/' });
  if (gvwr >= 33001 || Number(truck.class) === 8) out.push({ name: 'Heavy Vehicle Use Tax (IRS Form 2290)', detail: 'Annual federal tax when taxable gross weight is 55,000 lbs or more (up to $550/yr).', url: 'https://www.irs.gov/forms-pubs/about-form-2290' });
  out.push({ name: 'State registration & inspections', detail: 'Fees and safety/emissions inspection rules vary by state. Check your state DMV.', url: 'https://www.usa.gov/motor-vehicle-services' });
  return out;
}

/* ------------------------------------------------------------------ */
/* Plans                                                               */
/* ------------------------------------------------------------------ */
export const PLANS = [
  { id: 'free', name: 'Free', price: '$0', features: ['One registered truck', 'VIN identification', 'Basic maintenance schedule', 'Manual mileage updates', 'Maintenance history', 'Basic fuel calculator'] },
  { id: 'pro', name: 'Pro', price: '$9.99/mo', features: ['Advanced maintenance forecasting', 'Repair cost estimates', 'Full ownership calculator', 'AI truck assistant', 'Maintenance reminders', 'Unlimited records', 'Document storage'] },
  { id: 'fleet', name: 'Fleet', price: 'from $29.99/mo', features: ['Multiple trucks', 'Fleet dashboard', 'Fleet expense reports', 'Employee access & roles', 'Centralized maintenance', 'Advanced cost reports'] },
];
