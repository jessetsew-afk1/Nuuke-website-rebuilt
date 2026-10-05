// Copilot Money concept (NUUKE). Sample data, palette and the exploded-layer artwork.
// Every amount in this file is invented sample data for the concept, not real user data.

/** Working approximation of the brand palette (third-party sample, see sources). */
export const CM = {
  canvas: '#000814',
  surface: '#001533',
  surface2: '#0a2147',
  line: '#1b3157',
  income: '#00CC4B',
  spend: '#FF4433',
  blue: '#1C6CFF',
  blueText: '#5b93ff',
  pending: '#FECE4C',
  ink: '#F2F6FF',
  mute: '#a9b7d3',
};

/** Categorical palette for the data-viz lab (validated on the navy surface: CVD + contrast pass). */
export type LabCat = { id: string; name: string; emoji: string; amount: number; budget: number; trend: number[]; color: string };

export const labMonths = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'];
export const labIncome = 6200;
export const labCats: LabCat[] = [
  { id: 'rent', name: 'Rent', emoji: '🏠', amount: 1900, budget: 1900, trend: [1900, 1900, 1900, 1900, 1900, 1900], color: '#3987e5' },
  { id: 'groceries', name: 'Groceries', emoji: '🛒', amount: 640, budget: 600, trend: [590, 620, 600, 630, 610, 640], color: '#d95926' },
  { id: 'dining', name: 'Dining', emoji: '🍜', amount: 520, budget: 400, trend: [360, 380, 390, 410, 430, 520], color: '#199e70' },
  { id: 'shopping', name: 'Shopping', emoji: '🛍️', amount: 410, budget: 450, trend: [480, 610, 350, 560, 520, 410], color: '#c98500' },
  { id: 'transport', name: 'Transport', emoji: '🚇', amount: 290, budget: 300, trend: [280, 310, 300, 320, 300, 290], color: '#d55181' },
  { id: 'other', name: 'Other', emoji: '📦', amount: 710, budget: 750, trend: [640, 700, 660, 740, 690, 710], color: '#9085e9' },
];
export const labSpent = labCats.reduce((s, c) => s + c.amount, 0); // 4,470 (September)
export const labSaved = labIncome - labSpent; // 1,730

export const usd = (n: number) => '$' + Math.round(n).toLocaleString('en-US');

/** Data-viz lab: questions, chart types and our verdict for every pairing. */
export type ChartId = 'bar' | 'line' | 'donut' | 'tree' | 'flow';
export type Verdict = { v: 'win' | 'ok' | 'poor'; t: string };
export const chartTypes: { id: ChartId; label: string }[] = [
  { id: 'bar', label: 'Bar' },
  { id: 'line', label: 'Line' },
  { id: 'donut', label: 'Donut' },
  { id: 'tree', label: 'Treemap' },
  { id: 'flow', label: 'Flow' },
];
export const labQuestions: { id: string; q: string; win: ChartId; verdicts: Record<ChartId, Verdict> }[] = [
  {
    id: 'over',
    q: 'Which categories are over budget?',
    win: 'bar',
    verdicts: {
      bar: { v: 'win', t: 'Bars share one baseline, so length compares exactly, and a budget tick on each bar makes “over” a visible overhang. One glance, no legend needed.' },
      line: { v: 'poor', t: 'A line is about time. One month of budgets has no time axis, so the line just draws a zig-zag between unrelated categories.' },
      donut: { v: 'poor', t: 'Slices show share of the total, not distance from a budget. Dining being 12% of spend says nothing about being $120 over.' },
      tree: { v: 'ok', t: 'Shows which categories are big, but there is nowhere to draw a budget line inside a rectangle. You would need colour for “over”, which hides the amount.' },
      flow: { v: 'poor', t: 'Ribbon thickness is hard to compare against a target. Good for where money went, not for whether it went too far.' },
    },
  },
  {
    id: 'trend',
    q: 'Is anything creeping up?',
    win: 'line',
    verdicts: {
      bar: { v: 'ok', t: 'Grouped bars by month can show it, but six months × five categories is thirty bars on a phone. The trend gets lost in the forest.' },
      line: { v: 'win', t: 'Slope is the answer. Dining’s line climbs every month and jumps in September. We dim the others and label only the line that changed.' },
      donut: { v: 'poor', t: 'A donut is one moment in time. To see a trend you would need six donuts and a good memory.' },
      tree: { v: 'poor', t: 'Treemaps are snapshots. Rectangles growing between months are almost impossible to compare by eye.' },
      flow: { v: 'poor', t: 'A flow is a single period. It can’t show direction over time.' },
    },
  },
  {
    id: 'keep',
    q: 'How much of my pay am I keeping?',
    win: 'flow',
    verdicts: {
      bar: { v: 'ok', t: 'Income vs. spend bars answer it as two numbers, but lose the story of where the rest went.' },
      line: { v: 'poor', t: 'Income and spend lines over time work for a trend, not for this month’s split.' },
      donut: { v: 'ok', t: 'Saved can be one slice of income, but readers then have to add up the other slices to trust it.' },
      tree: { v: 'ok', t: 'Saved can be a tile, but the tiles don’t show that everything came out of one paycheck.' },
      flow: { v: 'win', t: 'One paycheck splits into ribbons, and the green ribbon that stays is what you kept. It reads like cash flow because it is cash flow.' },
    },
  },
  {
    id: 'share',
    q: 'How big a slice is rent?',
    win: 'donut',
    verdicts: {
      bar: { v: 'ok', t: 'Rent is clearly the longest bar, but “longest” isn’t “43% of everything”. You would have to read the axis and do maths.' },
      line: { v: 'poor', t: 'Rent is a flat line at the top. It tells you rent didn’t change, not how much of the month it eats.' },
      donut: { v: 'win', t: 'One dominant share is what donuts are good at. Rent’s arc fills almost half the ring and the centre says the total. We only label the slice that matters.' },
      tree: { v: 'ok', t: 'Also part-to-whole and it uses space well, but area is harder to read as a percentage than an arc.' },
      flow: { v: 'ok', t: 'The rent ribbon is visibly the thickest, but the percentage isn’t obvious without a label.' },
    },
  },
  {
    id: 'all',
    q: 'What is taking up the month, all at once?',
    win: 'tree',
    verdicts: {
      bar: { v: 'ok', t: 'Accurate, but with 20+ real categories the list scrolls off the phone and the small ones vanish.' },
      line: { v: 'poor', t: 'Twenty lines on one chart is spaghetti.' },
      donut: { v: 'poor', t: 'More than six slices and the small ones become slivers no one can tap.' },
      tree: { v: 'win', t: 'Every category gets a tappable rectangle sized by spend, packed into the whole screen. Big costs dominate, small ones still have a place.' },
      flow: { v: 'ok', t: 'Shows everything at once, but ribbons for many small categories become a tangle on a narrow screen.' },
    },
  },
];

/** Net worth sample series (12 months) used by the opening and the prototype. */
export const netWorth = [100, 103, 101, 106, 109, 108, 113, 117, 116, 121, 125, 129];

/** Spatial sketch: account balances by month, in $k (sample). Negative = debt. */
export const spatialMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const spatialAccounts = [
  { id: 'checking', name: 'Checking', color: '#1C6CFF', k: [6, 7, 5, 8, 6, 7, 9, 6, 7, 8, 7, 8] },
  { id: 'savings', name: 'Savings', color: '#00CC4B', k: [12, 13, 14, 15, 16, 17, 18, 19, 20, 22, 23, 24] },
  { id: 'brokerage', name: 'Brokerage', color: '#9085e9', k: [30, 31, 29, 33, 34, 36, 35, 38, 40, 39, 42, 44] },
  { id: 'crypto', name: 'Crypto', color: '#FECE4C', k: [4, 5, 3, 4, 6, 5, 4, 6, 7, 5, 6, 6] },
  { id: 'home', name: 'Home equity', color: '#199e70', k: [60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71] },
  { id: 'card', name: 'Credit card', color: '#FF4433', k: [-6, -4, -9, -5, -6, -3, -5, -8, -5, -3, -5, -3] },
];
/** $k per coin in the spatial sketch. */
export const COIN_K = 3;

// ---------- Exploded layers of the dashboard (ScreenStack) ----------
const V = 'viewBox="0 0 375 804" xmlns="http://www.w3.org/2000/svg"';
const pace = 'M 24 470 C 70 455, 95 440, 130 420 S 200 380, 240 352 S 300 330, 330 300';
const paceLast = 'M 24 470 C 80 462, 120 440, 160 430 S 240 400, 280 380 S 320 366, 352 350';

export const copilotLayers = [
  {
    label: 'Layout grid',
    desc: '4-column grid, 20pt margins and an 8pt rhythm. Safe areas for the Dynamic Island and the tab bar.',
    svg: `<svg ${V}><rect width="375" height="804" fill="#000814"/>
      <g fill="#1C6CFF" opacity=".13">${[0, 1, 2, 3].map((i) => `<rect x="${20 + i * 87.5}" y="0" width="73" height="804"/>`).join('')}</g>
      <g stroke="#1C6CFF" stroke-opacity=".2">${Array.from({ length: 101 }, (_, i) => `<line x1="0" x2="375" y1="${i * 8}" y2="${i * 8}"/>`).join('')}</g>
      <rect x="0" y="0" width="375" height="54" fill="#FF4433" opacity=".2"/><rect x="0" y="718" width="375" height="86" fill="#FF4433" opacity=".2"/>
      <text x="20" y="40" fill="#ff8a7a" font-family="monospace" font-size="11">SAFE AREA 54pt</text>
      <text x="20" y="740" fill="#ff8a7a" font-family="monospace" font-size="11">TAB BAR 86pt</text></svg>`,
  },
  {
    label: 'Wireframe',
    desc: 'Hierarchy first: the month’s one number, a pace chart, then “what changed” before any list of transactions.',
    svg: `<svg ${V}><g fill="none" stroke="#c8d3ea" stroke-width="2">
      <rect x="20" y="70" width="110" height="14" rx="4"/><rect x="20" y="96" width="200" height="44" rx="6"/><rect x="20" y="150" width="160" height="12" rx="4"/>
      <rect x="20" y="186" width="335" height="190" rx="20"/>
      <rect x="20" y="396" width="335" height="190" rx="20"/>
      <rect x="36" y="420" width="303" height="40" rx="10"/><rect x="36" y="472" width="303" height="40" rx="10"/><rect x="36" y="524" width="303" height="40" rx="10"/>
      <rect x="20" y="606" width="100" height="40" rx="20"/><rect x="128" y="606" width="100" height="40" rx="20"/><rect x="236" y="606" width="100" height="40" rx="20"/>
      <rect x="0" y="718" width="375" height="86"/></g>
      <g stroke="#c8d3ea" stroke-width="1.5"><line x1="20" y1="186" x2="355" y2="376"/><line x1="355" y1="186" x2="20" y2="376"/></g></svg>`,
  },
  {
    label: 'Content & data',
    desc: 'Real copy and sample data: spent so far, the budget, and three plain-English changes since last month.',
    svg: `<svg ${V}><g font-family="Inter,Arial" fill="#F2F6FF">
      <text x="20" y="82" font-size="13" letter-spacing="2" fill="#a9b7d3">OCTOBER · SPENT SO FAR</text>
      <text x="20" y="134" font-size="44" font-weight="800">$3,182</text>
      <text x="20" y="162" font-size="14" fill="#a9b7d3">of $4,600 budget · 13 days left</text>
      <path d="${pace}" transform="translate(0 -110)" fill="none" stroke="#F2F6FF" stroke-width="3" stroke-dasharray="6 6"/>
      <text x="36" y="420" font-size="13" letter-spacing="2" fill="#a9b7d3">WHAT CHANGED</text>
      <text x="48" y="446" font-size="15" font-weight="700">Dining is up $90 vs. Sep</text>
      <text x="48" y="498" font-size="15" font-weight="700">New subscription · $15.99</text>
      <text x="48" y="550" font-size="15" font-weight="700">Savings grew $410</text>
      <text x="36" y="631" font-size="13">To review · 4</text></g></svg>`,
  },
  {
    label: 'Colour & charts',
    desc: 'Navy canvas, green for money in, red-orange for money out, blue for the line that matters. Category colours carry identity.',
    svg: `<svg ${V}><defs><linearGradient id="cmf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1C6CFF" stop-opacity=".35"/><stop offset="1" stop-color="#1C6CFF" stop-opacity="0"/></linearGradient></defs>
      <rect x="20" y="186" width="335" height="190" rx="20" fill="#001533"/>
      <path d="${paceLast}" transform="translate(0 -110)" fill="none" stroke="#3b5079" stroke-width="3" stroke-dasharray="2 6" stroke-linecap="round"/>
      <path d="${pace} L 330 476 L 24 476 Z" transform="translate(0 -110)" fill="url(#cmf)"/>
      <path d="${pace}" transform="translate(0 -110)" fill="none" stroke="#1C6CFF" stroke-width="4" stroke-linecap="round"/>
      <rect x="20" y="396" width="335" height="190" rx="20" fill="#001533"/>
      <rect x="36" y="420" width="303" height="40" rx="10" fill="#0a2147"/><circle cx="58" cy="440" r="8" fill="#FF4433"/>
      <rect x="36" y="472" width="303" height="40" rx="10" fill="#0a2147"/><circle cx="58" cy="492" r="8" fill="#FECE4C"/>
      <rect x="36" y="524" width="303" height="40" rx="10" fill="#0a2147"/><circle cx="58" cy="544" r="8" fill="#00CC4B"/>
      <rect x="20" y="606" width="100" height="40" rx="20" fill="#3987e5"/><rect x="128" y="606" width="100" height="40" rx="20" fill="#199e70"/><rect x="236" y="606" width="100" height="40" rx="20" fill="#d95926"/>
      <rect x="0" y="718" width="375" height="86" fill="#000a1c"/></svg>`,
  },
  {
    label: 'Motion & states',
    desc: 'The pace line draws in when data syncs, the “now” dot breathes, and a change card nudges once, never twice.',
    svg: `<svg ${V}><circle cx="330" cy="190" r="22" fill="#1C6CFF" opacity=".3"/><circle cx="330" cy="190" r="9" fill="#F2F6FF"/>
      <g fill="none" stroke="#5b93ff" stroke-width="2" stroke-dasharray="4 5"><circle cx="330" cy="190" r="36"/></g>
      <g font-family="monospace" font-size="11" fill="#5b93ff"><text x="170" y="236">draw-in · 900ms ease-out</text><line x1="250" y1="226" x2="318" y2="200" stroke="#5b93ff"/>
      <text x="150" y="414">nudge once · spring 0.5 / 300</text></g>
      <rect x="36" y="420" width="303" height="40" rx="10" fill="none" stroke="#FF4433" stroke-width="2" stroke-dasharray="5 4"/></svg>`,
  },
];
