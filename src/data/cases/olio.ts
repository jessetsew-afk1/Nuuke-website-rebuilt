// Data for the Olio concept case study: exploded-layer SVGs, the two-sided
// service blueprint and the illustrative "speed" scenario. All artwork is original.

/* ---------------------------------------------------------------- palette */
// Our working approximation of Olio's 2023 warm palette (not official values).
export const OL = {
  purple: '#6E3BD9',
  lilac: '#EDE6FF',
  coral: '#FF6B5B',
  orange: '#FF9A3D',
  sun: '#FFD23F',
  oat: '#FFF8EE',
  ink: '#22163B',
  soft: '#6F6584',
};

/* ------------------------------------------------- ScreenStack layers (home feed) */
const V = 'viewBox="0 0 375 804" xmlns="http://www.w3.org/2000/svg"';
const F = 'font-family="Arial,Helvetica,sans-serif"';

export const olioLayers = [
  {
    label: 'Layout grid',
    desc: '4-column grid, 20pt margins and an 8pt rhythm. The thumb zone (bottom third) is reserved for Add and Request.',
    svg: `<svg ${V}><rect width="375" height="804" fill="${OL.oat}"/>
      <g fill="${OL.purple}" opacity=".08">${[0, 1, 2, 3].map((i) => `<rect x="${20 + i * 87.5}" y="0" width="73" height="804"/>`).join('')}</g>
      <g stroke="${OL.purple}" stroke-opacity=".12">${Array.from({ length: 101 }, (_, i) => `<line x1="0" x2="375" y1="${i * 8}" y2="${i * 8}"/>`).join('')}</g>
      <rect x="0" y="536" width="375" height="268" fill="${OL.coral}" opacity=".12"/>
      <rect x="0" y="0" width="375" height="54" fill="${OL.orange}" opacity=".18"/>
      <text x="20" y="40" fill="${OL.purple}" font-family="monospace" font-size="11">SAFE AREA 54pt</text>
      <text x="20" y="560" fill="${OL.coral}" font-family="monospace" font-size="11">THUMB ZONE · primary actions live here</text></svg>`,
  },
  {
    label: 'Wireframe',
    desc: 'Freshest first: one large “just added” card, then compact rows. Distance and age sit on every card.',
    svg: `<svg ${V}><g fill="none" stroke="#b9b0c9" stroke-width="2">
      <rect x="20" y="78" width="120" height="26" rx="6"/><rect x="255" y="76" width="100" height="30" rx="15"/>
      <rect x="20" y="124" width="60" height="32" rx="16"/><rect x="88" y="124" width="70" height="32" rx="16"/><rect x="166" y="124" width="92" height="32" rx="16"/><rect x="266" y="124" width="80" height="32" rx="16"/>
      <rect x="20" y="186" width="90" height="12" rx="4"/>
      <rect x="20" y="210" width="335" height="250" rx="22"/><rect x="20" y="210" width="335" height="150" rx="22"/>
      <rect x="20" y="478" width="335" height="88" rx="18"/><rect x="32" y="490" width="64" height="64" rx="12"/>
      <rect x="20" y="578" width="335" height="88" rx="18"/><rect x="32" y="590" width="64" height="64" rx="12"/>
      <rect x="0" y="716" width="375" height="88"/><circle cx="187.5" cy="738" r="30"/></g>
      <g stroke="#b9b0c9" stroke-width="1.5"><line x1="20" y1="210" x2="355" y2="360"/><line x1="355" y1="210" x2="20" y2="360"/></g></svg>`,
  },
  {
    label: 'Content',
    desc: 'Real copy with a clock: “2 min ago · 350 m”, a pickup window, and a single verb on the button.',
    svg: `<svg ${V}><g ${F} fill="${OL.ink}">
      <text x="20" y="98" font-size="24" font-weight="800">Nearby</text>
      <text x="268" y="96" font-size="12" fill="${OL.soft}">Within 1 km</text>
      <text x="36" y="145" font-size="12" font-weight="700">All</text><text x="104" y="145" font-size="12">Food</text><text x="180" y="145" font-size="12">Non-food</text><text x="282" y="145" font-size="12">Wanted</text>
      <text x="20" y="196" font-size="11" letter-spacing="1.5" fill="${OL.soft}">JUST ADDED</text>
      <text x="36" y="392" font-size="17" font-weight="800">Sourdough + 4 bagels</text>
      <text x="36" y="414" font-size="12" fill="${OL.soft}">350 m · added 2 min ago · today 6–8 pm</text>
      <text x="270" y="442" font-size="13" font-weight="700">Request</text>
      <text x="110" y="514" font-size="14" font-weight="700">Veg box, slightly wonky</text><text x="110" y="534" font-size="12" fill="${OL.soft}">600 m · 9 min ago</text>
      <text x="110" y="614" font-size="14" font-weight="700">Kids’ wellies, size 10</text><text x="110" y="634" font-size="12" fill="${OL.soft}">800 m · 21 min ago</text>
      <text x="36" y="784" font-size="10" fill="${OL.soft}">Home</text><text x="102" y="784" font-size="10" fill="${OL.soft}">Map</text><text x="250" y="784" font-size="10" fill="${OL.soft}">Hero</text><text x="318" y="784" font-size="10" fill="${OL.soft}">Me</text></g></svg>`,
  },
  {
    label: 'Colour & type',
    desc: 'Warm on oat: coral marks freshness, purple is reserved for the one action that matters (Add / Request).',
    svg: `<svg ${V}><defs><linearGradient id="g1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${OL.sun}"/><stop offset="1" stop-color="${OL.orange}"/></linearGradient>
      <linearGradient id="g2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffd0c4"/><stop offset="1" stop-color="${OL.coral}"/></linearGradient></defs>
      <rect x="20" y="124" width="60" height="32" rx="16" fill="${OL.purple}"/><rect x="88" y="124" width="70" height="32" rx="16" fill="#fff"/><rect x="166" y="124" width="92" height="32" rx="16" fill="#fff"/><rect x="266" y="124" width="80" height="32" rx="16" fill="#fff"/>
      <rect x="20" y="210" width="335" height="250" rx="22" fill="#fff"/><path d="M20 232 a22 22 0 0 1 22 -22 h291 a22 22 0 0 1 22 22 v128 h-335 z" fill="url(#g1)"/>
      <ellipse cx="187" cy="300" rx="90" ry="44" fill="#c9773a"/><ellipse cx="187" cy="290" rx="84" ry="36" fill="#e39a55"/>
      <g stroke="#b5622a" stroke-width="5" stroke-linecap="round"><line x1="140" y1="280" x2="160" y2="300"/><line x1="180" y1="276" x2="200" y2="298"/><line x1="220" y1="280" x2="238" y2="298"/></g>
      <rect x="250" y="424" width="92" height="28" rx="14" fill="${OL.purple}"/>
      <rect x="20" y="478" width="335" height="88" rx="18" fill="#fff"/><rect x="32" y="490" width="64" height="64" rx="12" fill="url(#g2)"/>
      <rect x="20" y="578" width="335" height="88" rx="18" fill="#fff"/><rect x="32" y="590" width="64" height="64" rx="12" fill="${OL.lilac}"/>
      <rect x="0" y="716" width="375" height="88" fill="#fff"/><circle cx="187.5" cy="738" r="30" fill="${OL.purple}"/>
      <path d="M187.5 724 v28 M173.5 738 h28" stroke="#fff" stroke-width="5" stroke-linecap="round"/></svg>`,
  },
  {
    label: 'Motion & states',
    desc: 'New listings pulse once, the age ticks up live, and a card flips to “Reserved” the moment a neighbour is chosen.',
    svg: `<svg ${V}><g fill="none" stroke="${OL.coral}" stroke-width="3"><circle cx="48" cy="236" r="10"/><circle cx="48" cy="236" r="20" stroke-opacity=".5"/><circle cx="48" cy="236" r="32" stroke-opacity=".2"/></g>
      <circle cx="48" cy="236" r="6" fill="${OL.coral}"/>
      <rect x="276" y="226" width="64" height="24" rx="12" fill="${OL.ink}"/><text x="308" y="243" text-anchor="middle" ${F} font-size="12" font-weight="700" fill="#fff">2:14</text>
      <rect x="250" y="590" width="92" height="26" rx="13" fill="${OL.sun}"/><text x="296" y="608" text-anchor="middle" ${F} font-size="11" font-weight="700" fill="${OL.ink}">Reserved</text>
      <circle cx="187.5" cy="738" r="40" fill="none" stroke="${OL.purple}" stroke-width="2" stroke-dasharray="4 5"/>
      <g font-family="monospace" font-size="11" fill="${OL.purple}"><text x="96" y="186">pulse ×1 · 900ms ease-out</text><line x1="94" y1="190" x2="60" y2="226" stroke="${OL.purple}"/>
      <text x="160" y="690">press · scale .92 · spring</text><text x="196" y="580">state swap · 240ms</text></g></svg>`,
  },
];

/* ------------------------------------------------ Two-sided service blueprint */
export type Beat = { title: string; mood: number; doing: string; insight: string; opportunity: string };
export type Lane = { id: 'giver' | 'olio' | 'collector'; name: string; who: string; beats: Beat[] };

// 3 beats before the handover, 3 after. The middle column is the shared doorstep moment.
export const timeCols = ['0 min', '+1 min', '+5 min', 'Handover', '+1 h', 'Next day', 'Next week'];

export const blueprint: Lane[] = [
  {
    id: 'giver',
    name: 'Giver',
    who: 'Declutter Diane',
    beats: [
      { title: 'Spots surplus', mood: -1, doing: 'Finds a loaf and bagels she won’t finish before they go stale.', insight: 'The bin is one step away. Giving it away has to feel almost as easy.', opportunity: 'A home-screen widget and a “Give” shortcut that opens straight into the camera.' },
      { title: 'Snaps & lists', mood: 0, doing: 'Takes a photo, writes a title, a description, a category, pickup times.', insight: 'Typing is where listings die. Every field is a chance to give up.', opportunity: 'AI-ify drafts the title and description from the photo; we pre-fill a sensible pickup window.' },
      { title: 'Fields requests', mood: -1.4, doing: 'Five messages arrive within minutes. She has to pick one and reply to all.', insight: 'Success creates a new problem: who gets it, and how to say no politely.', opportunity: 'Requests stack in one sheet with a suggested pick (closest, earliest time). Others get an automatic, kind “it’s gone”.' },
      { title: 'Marks collected', mood: 1.2, doing: 'Taps “Collected” once the bag has gone.', insight: 'The moment of relief is short. It needs to close the loop in one tap.', opportunity: 'One-tap close with optional thumbs-up for the collector.' },
      { title: 'Sees impact', mood: 1.8, doing: 'Gets a small summary: one more thing kept out of the bin.', insight: 'Hope beats guilt. Olio’s own rebrand language is “urgent optimism”.', opportunity: 'Warm, specific impact copy, never a lecture.' },
      { title: 'Lists again', mood: 1.5, doing: 'Next time, she lists in seconds because the defaults remember her.', insight: 'Habit forms when the second listing is faster than the first.', opportunity: 'Remember her usual pickup times and her doorstep instructions.' },
    ],
  },
  {
    id: 'olio',
    name: 'Olio (backstage)',
    who: 'App & systems',
    beats: [
      { title: 'Ready to capture', mood: 0, doing: 'Keeps the Add button one tap away, everywhere.', insight: 'The purple Add button is the brand’s most important pixel.', opportunity: 'Fixed centre position in the tab bar, reachable by thumb.' },
      { title: 'Drafts with AI-ify', mood: 0, doing: 'Reads the photo, proposes title, description and category.', insight: 'The giver should only have to check, not write.', opportunity: 'Show the draft as editable chips, not a filled form.' },
      { title: 'Alerts in waves', mood: 0, doing: 'Notifies the closest neighbours first, then widens the circle if nobody bites.', insight: 'Broadcasting to everyone causes alert fatigue and a stampede of requests.', opportunity: 'Our proposed “fair waves”: 300 m → 600 m → 1 km, paused the moment it’s reserved.' },
      { title: 'Reminds & re-lists', mood: 0, doing: 'Sends a pickup reminder; if it’s a no-show, offers the next requester.', insight: 'No-shows are the biggest trust breaker on both sides.', opportunity: 'Auto-offer to the runner-up after a grace period.' },
      { title: 'Counts impact', mood: 0, doing: 'Adds the item to both people’s impact totals.', insight: 'Impact is shared: giver and collector both did something good.', opportunity: 'Show impact on both profiles, with badges as gentle rewards.' },
      { title: 'Learns patterns', mood: 0, doing: 'Learns when this street is most active.', insight: 'Timing is local: the right moment to list differs by neighbourhood.', opportunity: 'Suggest “best time to list near you” to givers.' },
    ],
  },
  {
    id: 'collector',
    name: 'Collector',
    who: 'Saver Sam',
    beats: [
      { title: 'Not yet aware', mood: 0, doing: 'On the bus home, thinking about dinner.', insight: 'Sam doesn’t browse all day. The alert is the front door.', opportunity: 'Only alert for things he can realistically reach.' },
      { title: 'Gets alerted', mood: 1, doing: 'Sees “Sourdough + bagels · 400 m · 3 min ago”.', insight: 'Distance and age are the two numbers that decide everything.', opportunity: 'Put distance and age in the notification itself.' },
      { title: 'Requests & chats', mood: 0.4, doing: 'Requests, then waits, unsure if he’ll get it.', insight: 'Uncertainty is the pain, not the wait.', opportunity: 'Quick replies (“I can come at 6pm”) and a visible “Reserved for you” state.' },
      { title: 'Eats it', mood: 1.6, doing: 'Has fresh bread with dinner. Budget stretched a bit further.', insight: 'The win is real, but invisible to the giver.', opportunity: 'A one-tap “thank you” the giver actually sees.' },
      { title: 'Rates giver', mood: 1, doing: 'Leaves a quick rating.', insight: 'Ratings build the trust that makes doorstep handovers feel safe.', opportunity: 'Rate the handover, not the person: “on time”, “as described”.' },
      { title: 'Sets alerts', mood: 1.4, doing: 'Turns on alerts for bread and veg within 600 m.', insight: 'Tuned alerts are less noisy and more useful.', opportunity: 'Offer alert tuning right after a good pickup.' },
    ],
  },
];

export const handover = {
  title: 'The doorstep handover',
  doing: 'Sam knocks (or collects from the porch). Diane hands over the bag. Twenty seconds between two strangers.',
  insight: 'This is the moment of truth for trust. If it feels awkward or unsafe, neither comes back.',
  opportunity: 'Address revealed only after reserving, clear etiquette (“contactless porch pickup OK”), and a pickup window both agreed in chat.',
};

/* --------------------------------------------- Illustrative speed scenario */
// Minutes after the photo is taken. NOT Olio data: our design rules, played out.
export type SimEvent = { t: number; clock: string; title: string; text: string; who: 'giver' | 'olio' | 'collector' | 'both' };
export const simEvents: SimEvent[] = [
  { t: 0, clock: '17:30', who: 'giver', title: 'Photo taken', text: 'Diane snaps the loaf and bagels from the Add button.' },
  { t: 0.5, clock: '17:30', who: 'olio', title: 'AI-ify drafts it', text: 'Title, description and “Food” category filled from the photo.' },
  { t: 1, clock: '17:31', who: 'giver', title: 'Live', text: 'She keeps the suggested window, today 6–8 pm, and publishes.' },
  { t: 1.2, clock: '17:31', who: 'olio', title: 'Wave 1 · 300 m', text: 'The closest neighbours are alerted first.' },
  { t: 3, clock: '17:33', who: 'olio', title: 'Wave 2 · 600 m', text: 'No request yet, so the circle widens. Sam, about 400 m away, is in it.' },
  { t: 4.5, clock: '17:34', who: 'collector', title: 'Request', text: 'Sam taps “I can come at 6pm”.' },
  { t: 6, clock: '17:36', who: 'giver', title: 'Reserved', text: 'Diane accepts. Waves stop: the 1 km wave never goes out.' },
  { t: 7, clock: '17:37', who: 'olio', title: 'Address shared', text: 'Only Sam sees the exact pickup spot.' },
  { t: 28, clock: '17:58', who: 'collector', title: 'On the way', text: 'A reminder nudges Sam; he heads out on foot.' },
  { t: 34, clock: '18:04', who: 'both', title: 'Handover', text: 'Porch pickup. Diane taps “Collected”.' },
];
export const SIM_END = 36;
