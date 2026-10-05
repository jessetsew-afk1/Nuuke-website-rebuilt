// Data + geometry helpers for the Flighty concept case study.
// Airport coordinates are public geography; every flight, time and test number here is
// an illustrative scenario written by NUUKE, not Flighty data.

export const FL = {
  night: '#0b0b0f',
  panel: '#15151c',
  flap: '#1e1e27',
  sign: '#f5f5f0',
  mute: '#a3a3ad',
  ok: '#2ee58a',
  late: '#ffb020',
  cx: '#ff5a5a',
  sky: '#6cb4ff',
};

export type Airport = { code: string; city: string; lat: number; lon: number };
export const AIRPORTS: Record<string, Airport> = {
  ORD: { code: 'ORD', city: 'Chicago', lat: 41.98, lon: -87.9 },
  DEN: { code: 'DEN', city: 'Denver', lat: 39.86, lon: -104.67 },
  SFO: { code: 'SFO', city: 'San Francisco', lat: 37.62, lon: -122.38 },
  JFK: { code: 'JFK', city: 'New York', lat: 40.64, lon: -73.78 },
  SEA: { code: 'SEA', city: 'Seattle', lat: 47.45, lon: -122.31 },
  AUS: { code: 'AUS', city: 'Austin', lat: 30.19, lon: -97.67 },
  BOS: { code: 'BOS', city: 'Boston', lat: 42.36, lon: -71.01 },
  LAX: { code: 'LAX', city: 'Los Angeles', lat: 33.94, lon: -118.41 },
  MIA: { code: 'MIA', city: 'Miami', lat: 25.79, lon: -80.29 },
  LHR: { code: 'LHR', city: 'London', lat: 51.47, lon: -0.45 },
  CDG: { code: 'CDG', city: 'Paris', lat: 49.01, lon: 2.55 },
  NRT: { code: 'NRT', city: 'Tokyo', lat: 35.77, lon: 140.39 },
  HNL: { code: 'HNL', city: 'Honolulu', lat: 21.32, lon: -157.92 },
  MEX: { code: 'MEX', city: 'Mexico City', lat: 19.44, lon: -99.07 },
  YYZ: { code: 'YYZ', city: 'Toronto', lat: 43.68, lon: -79.63 },
};

/** A sample traveller's year (invented) used by the Passport globe and screen. */
export const YEAR_ROUTES: [string, string][] = [
  ['ORD', 'SFO'], ['SFO', 'SEA'], ['SEA', 'ORD'], ['ORD', 'JFK'], ['JFK', 'LHR'], ['LHR', 'CDG'],
  ['ORD', 'AUS'], ['AUS', 'DEN'], ['DEN', 'ORD'], ['ORD', 'MIA'], ['LAX', 'HNL'], ['SFO', 'NRT'], ['ORD', 'MEX'], ['BOS', 'ORD'],
];

// ---------- orthographic projection (build-time SVG globes) ----------
const D = Math.PI / 180;
type V3 = [number, number, number];
const toVec = (lat: number, lon: number): V3 => [Math.cos(lat * D) * Math.cos(lon * D), Math.cos(lat * D) * Math.sin(lon * D), Math.sin(lat * D)];

export type View = { lat0: number; lon0: number; cx: number; cy: number; r: number };

/** Project a (possibly lifted) unit vector. Returns screen x/y and whether it faces the viewer. */
function projVec(v: V3, view: View) {
  const { lat0, lon0, cx, cy, r } = view;
  // rotate so (lat0, lon0) faces the viewer: east = x, north = y, toward viewer = z
  const cl = Math.cos(lon0 * D), sl = Math.sin(lon0 * D), cp = Math.cos(lat0 * D), sp = Math.sin(lat0 * D);
  const e: V3 = [-sl, cl, 0];
  const n: V3 = [-sp * cl, -sp * sl, cp];
  const f: V3 = [cp * cl, cp * sl, sp];
  const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const x = dot(v, e), y = dot(v, n), z = dot(v, f);
  return { x: cx + r * x, y: cy - r * y, z };
}

export function project(lat: number, lon: number, view: View) {
  return projVec(toVec(lat, lon), view);
}

const f1 = (n: number) => Math.round(n * 10) / 10;

/** Graticule path (meridians + parallels), front hemisphere only. */
export function graticule(view: View, step = 20) {
  const segs: string[] = [];
  const line = (pts: { x: number; y: number; z: number }[]) => {
    let d = '';
    let pen = false;
    for (const p of pts) {
      if (p.z > 0.02) {
        d += `${pen ? 'L' : 'M'}${f1(p.x)} ${f1(p.y)}`;
        pen = true;
      } else pen = false;
    }
    if (d) segs.push(d);
  };
  for (let lon = -180; lon < 180; lon += step) line(Array.from({ length: 61 }, (_, i) => project(-90 + i * 3, lon, view)));
  for (let lat = -80; lat <= 80; lat += step) line(Array.from({ length: 121 }, (_, i) => project(lat, -180 + i * 3, view)));
  return segs.join('');
}

/** Great-circle arc that lifts off the surface (height h at the midpoint). */
export function arcPath(a: Airport, b: Airport, view: View, h = 0.18, n = 48) {
  const A = toVec(a.lat, a.lon);
  const B = toVec(b.lat, b.lon);
  const om = Math.acos(Math.min(1, A[0] * B[0] + A[1] * B[1] + A[2] * B[2]));
  let d = '';
  let pen = false;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const s1 = Math.sin((1 - t) * om) / Math.sin(om);
    const s2 = Math.sin(t * om) / Math.sin(om);
    const lift = 1 + h * Math.sin(Math.PI * t) * Math.min(1, om * 1.6);
    const v: V3 = [(A[0] * s1 + B[0] * s2) * lift, (A[1] * s1 + B[1] * s2) * lift, (A[2] * s1 + B[2] * s2) * lift];
    const p = projVec(v, view);
    // hidden when behind the globe's disc
    const vis = p.z > 0 || Math.hypot(p.x - view.cx, p.y - view.cy) > view.r;
    if (vis) d += `${pen ? 'L' : 'M'}${f1(p.x)} ${f1(p.y)}`;
    pen = vis;
  }
  return d;
}

// ---------- 3D wireframe layers (flight card) ----------
const V = 'viewBox="0 0 375 804" xmlns="http://www.w3.org/2000/svg"';
const SYS = "-apple-system,'SF Pro Display',system-ui,Inter,Arial";

export const flightyLayers = [
  {
    label: 'Layout grid',
    desc: 'A 4-column grid with 20pt margins, an 8pt rhythm, and safe areas for the Dynamic Island and the home indicator.',
    svg: `<svg ${V}><rect width="375" height="804" fill="#0b0b0f"/>
      <g fill="#ffb020" opacity=".1">${[0, 1, 2, 3].map((i) => `<rect x="${20 + i * 87.5}" y="0" width="73" height="804"/>`).join('')}</g>
      <g stroke="#ffb020" stroke-opacity=".16">${Array.from({ length: 100 }, (_, i) => `<line x1="0" x2="375" y1="${i * 8}" y2="${i * 8}"/>`).join('')}</g>
      <rect x="0" y="0" width="375" height="54" fill="#ff5a5a" opacity=".2"/><rect x="0" y="770" width="375" height="34" fill="#ff5a5a" opacity=".2"/>
      <text x="20" y="40" fill="#ff8f8f" font-family="monospace" font-size="11">SAFE AREA 54pt</text></svg>`,
  },
  {
    label: 'Wireframe',
    desc: 'The departure-board hierarchy in grey boxes: route, then times, then one status line, then gate. Everything else waits below the fold.',
    svg: `<svg ${V}><g fill="none" stroke="#d6d6dc" stroke-width="2">
      <rect x="20" y="70" width="150" height="16" rx="4"/>
      <rect x="20" y="104" width="120" height="58" rx="6"/><rect x="235" y="104" width="120" height="58" rx="6"/>
      <rect x="20" y="176" width="90" height="34" rx="6"/><rect x="265" y="176" width="90" height="34" rx="6"/>
      <rect x="20" y="232" width="335" height="56" rx="16"/>
      <rect x="20" y="306" width="335" height="140" rx="18"/>
      <rect x="20" y="464" width="160" height="88" rx="16"/><rect x="195" y="464" width="160" height="88" rx="16"/>
      <rect x="20" y="570" width="335" height="56" rx="16"/><rect x="20" y="638" width="335" height="56" rx="16"/></g>
      <g stroke="#d6d6dc" stroke-width="1.5"><line x1="20" y1="306" x2="355" y2="446"/><line x1="355" y1="306" x2="20" y2="446"/></g></svg>`,
  },
  {
    label: 'Content & data',
    desc: 'Real data in real lengths. Codes are biggest, times second. The status line answers “why?” in plain words, and nothing reads like a percentage.',
    svg: `<svg ${V}><g font-family="${SYS}" fill="#f5f5f0">
      <text x="20" y="84" font-size="13" letter-spacing="2" fill="#a3a3ad">FL 214 · WED 8 OCT</text>
      <text x="20" y="150" font-size="54" font-weight="800">ORD</text><text x="235" y="150" font-size="54" font-weight="800">SFO</text>
      <text x="20" y="200" font-size="22" font-weight="700">14:53</text><text x="282" y="200" font-size="22" font-weight="700">17:26</text>
      <text x="40" y="266" font-size="15" font-weight="700">Delayed 48 min</text><text x="40" y="282" font-size="12" fill="#a3a3ad">Your plane is late in Denver · Why?</text>
      <text x="36" y="500" font-size="12" fill="#a3a3ad">GATE</text><text x="36" y="534" font-size="30" font-weight="800">C4</text>
      <text x="211" y="500" font-size="12" fill="#a3a3ad">TERMINAL</text><text x="211" y="534" font-size="30" font-weight="800">1</text>
      <text x="40" y="604" font-size="15" font-weight="600">Live timeline</text><text x="40" y="672" font-size="15" font-weight="600">Where’s my plane?</text></g></svg>`,
  },
  {
    label: 'Colour & status',
    desc: 'Near-black like a board at night. Colour is only ever status: green on time, amber delayed, red cancelled, always paired with a word.',
    svg: `<svg ${V}><rect x="20" y="232" width="335" height="56" rx="16" fill="#ffb020"/>
      <rect x="20" y="306" width="335" height="140" rx="18" fill="#15151c"/>
      <path d="M50 420 Q 187 300 325 420" fill="none" stroke="#2a2a35" stroke-width="6" stroke-linecap="round"/>
      <path d="M50 420 Q 120 352 170 340" fill="none" stroke="#ffb020" stroke-width="6" stroke-linecap="round"/>
      <circle cx="170" cy="340" r="9" fill="#f5f5f0"/>
      <rect x="20" y="464" width="160" height="88" rx="16" fill="#15151c"/><rect x="195" y="464" width="160" height="88" rx="16" fill="#15151c"/>
      <rect x="20" y="570" width="335" height="56" rx="16" fill="#15151c"/><rect x="20" y="638" width="335" height="56" rx="16" fill="#15151c"/>
      <circle cx="44" cy="598" r="5" fill="#2ee58a"/><circle cx="44" cy="666" r="5" fill="#6cb4ff"/></svg>`,
  },
  {
    label: 'Motion & states',
    desc: 'Changed values flip like split-flap tiles, so you notice what moved. Old times and gates stay visible, struck through, for one glance.',
    svg: `<svg ${V}><g font-family="monospace" font-size="11" fill="#ffb020">
      <rect x="18" y="172" width="96" height="42" rx="6" fill="none" stroke="#ffb020" stroke-dasharray="4 4"/>
      <text x="124" y="190">flip · 90ms per tile</text><text x="124" y="206">stagger 30ms</text>
      <rect x="30" y="510" width="40" height="30" rx="4" fill="none" stroke="#ffb020" stroke-dasharray="4 4"/>
      <line x1="34" y1="520" x2="70" y2="520" stroke="#ff5a5a" stroke-width="3"/>
      <text x="80" y="520">B12 → C4 · strike stays 10 min</text>
      <circle cx="170" cy="340" r="18" fill="none" stroke="#ffb020" stroke-dasharray="3 4"/>
      <text x="196" y="336">plane eases along arc</text><text x="196" y="352">once a minute</text></g></svg>`,
  },
];

// ---------- Live Activity / Dynamic Island bench ----------
export type LiveState = {
  id: string;
  label: string;
  tone: 'ok' | 'late' | 'cx' | 'sky';
  ring: number; // 0..1 flight progress
  lead: string; // compact leading text
  trail: string; // compact trailing text
  headline: string;
  sub: string;
  dep: string;
  depOld?: string;
  arr: string;
  arrOld?: string;
  gate: string;
  gateOld?: string;
  action?: string;
  rule: string;
  why: string;
};

export const LIVE_STATES: LiveState[] = [
  {
    id: 'boarding', label: 'Boarding', tone: 'ok', ring: 0, lead: 'C4', trail: 'Boarding',
    headline: 'Boarding · Gate C4', sub: 'Doors close 14:38', dep: '14:53', arr: '17:26', gate: 'C4',
    rule: 'Gate first, time second.',
    why: 'At the airport, the two things a board prints biggest are where to go and when. The compact island keeps only those two.',
  },
  {
    id: 'taxi', label: 'Taxiing', tone: 'ok', ring: 0.03, lead: 'Taxi', trail: '~12m',
    headline: 'Taxiing out', sub: 'Takeoff in about 12 min', dep: '15:04', arr: '17:31', gate: 'C4',
    rule: 'Countdowns, not clocks.',
    why: 'On the ground, the useful number is how long until something happens. “~12m to takeoff” beats “15:04”.',
  },
  {
    id: 'air', label: 'In the air', tone: 'sky', ring: 0.42, lead: '✈', trail: '2h 01m',
    headline: 'In the air · 2h 01m left', sub: 'Over Nebraska · on schedule to land 17:26', dep: '15:09', arr: '17:26', gate: '54B',
    rule: 'One ring = the whole flight.',
    why: 'The ring is a flight clock: full circle is gate to gate. Time remaining sits beside it, because nobody counts in percentages.',
  },
  {
    id: 'landed', label: 'Landed', tone: 'ok', ring: 1, lead: 'SFO', trail: 'Belt 3',
    headline: 'Landed · Gate 54B', sub: 'Bags on belt 3 · about 14 min', dep: '15:09', arr: '17:21', gate: '54B',
    rule: 'Answer the next question.',
    why: 'Once you land, “when” is over. The next questions are where you’re parked and where your bag comes out.',
  },
  {
    id: 'delayed', label: 'Delayed', tone: 'late', ring: 0, lead: '14:53', trail: '+48m',
    headline: 'Delayed 48 min', sub: 'Your plane is late out of Denver', dep: '14:53', depOld: '14:05', arr: '17:26', arrOld: '16:38', gate: 'C4', gateOld: 'B12',
    rule: 'New time first. Old time struck, not erased.',
    why: 'Boards keep the scheduled time and print the new one beside it. You see what changed without reading a sentence.',
  },
  {
    id: 'cancelled', label: 'Cancelled', tone: 'cx', ring: 0, lead: 'FL 214', trail: 'Rebook',
    headline: 'Cancelled', sub: '2 seats left on FL 238 at 16:10', dep: '—', depOld: '14:05', arr: '—', arrOld: '16:38', gate: '—', action: 'See rebooking options',
    rule: 'Calm red, then the next step.',
    why: 'Red says “stop” once. The rest of the card is the way forward, so bad news reads as a plan, not a panic.',
  },
];

// ---------- Usability test replay (scripted, illustrative) ----------
export type Tap = { t: number; x: number; y: number; kind?: 'tap' | 'miss' | 'ok' | 'swipe'; note?: string; show?: '' | 'details' | 'menu' | 'share' | 'sheet' };
export type Variant = { taps: Tap[]; dur: number; success: string; median: string; misses: number };
export type ReplayTask = { id: string; label: string; finding: string; change: string; before: Variant; after: Variant };

export const REPLAY_TASKS: ReplayTask[] = [
  {
    id: 'why',
    label: 'Find out why your flight is late',
    finding: 'Testers tapped the amber status chip, expecting the reason. It did nothing, so they went hunting through tabs.',
    change: 'The status line became the button: “Delayed 48 min · Why? ›” opens the explanation in one tap.',
    before: {
      dur: 24,
      success: '3 of 5',
      median: '24 s',
      misses: 4,
      taps: [
        { t: 2.2, x: 0.3, y: 0.31, kind: 'miss', note: '“Delayed… but why?” Taps the chip.' },
        { t: 4.1, x: 0.32, y: 0.31, kind: 'miss', note: 'Taps it again. Nothing.' },
        { t: 7.5, x: 0.5, y: 0.62, kind: 'swipe', note: 'Scrolls down the card, looking.' },
        { t: 11.8, x: 0.78, y: 0.5, kind: 'miss', note: 'Tries the aircraft tile.' },
        { t: 16.4, x: 0.5, y: 0.93, kind: 'tap', note: 'Opens the Details tab.', show: 'details' },
        { t: 21.5, x: 0.46, y: 0.58, kind: 'ok', note: 'Finds “late inbound aircraft”.' },
      ],
    },
    after: {
      dur: 7,
      success: '5 of 5',
      median: '5 s',
      misses: 0,
      taps: [
        { t: 1.6, x: 0.5, y: 0.34, kind: 'tap', note: 'Reads “Why? ›” on the status line.', show: 'sheet' },
        { t: 4.6, x: 0.5, y: 0.66, kind: 'ok', note: '“Oh, the plane’s still in Denver.”' },
      ],
    },
  },
  {
    id: 'gate',
    label: 'Which gate do you go to now?',
    finding: 'The gate had changed, but the new gate looked identical to the old one. Two testers walked (on paper) to B12.',
    change: 'Gate changes now take the top slot, old gate struck through, new gate in signage amber, with walk time.',
    before: {
      dur: 19,
      success: '3 of 5',
      median: '15 s',
      misses: 3,
      taps: [
        { t: 2.0, x: 0.5, y: 0.2, kind: 'miss', note: 'Scans the route header.' },
        { t: 5.6, x: 0.28, y: 0.53, kind: 'tap', note: '“B… no wait, is that old?”' },
        { t: 9.4, x: 0.5, y: 0.74, kind: 'miss', note: 'Opens notifications to check.' },
        { t: 13.0, x: 0.5, y: 0.66, kind: 'swipe', note: 'Scrolls the timeline.' },
        { t: 16.8, x: 0.28, y: 0.53, kind: 'ok', note: '“C4. I think.”' },
      ],
    },
    after: {
      dur: 5,
      success: '5 of 5',
      median: '2 s',
      misses: 0,
      taps: [{ t: 1.4, x: 0.5, y: 0.25, kind: 'ok', note: 'Glance: “C4, nine minutes.”' }],
    },
  },
  {
    id: 'plane',
    label: 'Is your plane here yet?',
    finding: 'Nobody connected “late inbound aircraft” to “Where’s my plane”. It lived three levels deep behind a ••• menu.',
    change: 'The inbound plane now appears inside the delay card, with its position and a link to its 25-hour day.',
    before: {
      dur: 28,
      success: '2 of 5',
      median: '28 s',
      misses: 5,
      taps: [
        { t: 2.4, x: 0.5, y: 0.31, kind: 'miss', note: 'Taps the status chip.' },
        { t: 6.0, x: 0.78, y: 0.53, kind: 'miss', note: '“Aircraft” tile, shows the model only.' },
        { t: 10.2, x: 0.5, y: 0.66, kind: 'swipe', note: 'Scrolls all the way down.' },
        { t: 14.6, x: 0.9, y: 0.09, kind: 'tap', note: 'Finds the ••• menu.', show: 'menu' },
        { t: 18.8, x: 0.5, y: 0.82, kind: 'miss', note: 'Opens “Share flight” by mistake.', show: 'share' },
        { t: 23.0, x: 0.9, y: 0.09, kind: 'tap', note: 'Closes it, back to •••.', show: 'menu' },
        { t: 26.2, x: 0.5, y: 0.75, kind: 'ok', note: '“Inbound aircraft”, finally.' },
      ],
    },
    after: {
      dur: 7,
      success: '5 of 5',
      median: '6 s',
      misses: 0,
      taps: [
        { t: 1.8, x: 0.5, y: 0.34, kind: 'tap', note: 'Opens “Why?”.', show: 'sheet' },
        { t: 4.9, x: 0.5, y: 0.66, kind: 'ok', note: '“In Denver, leaves 12:03.” Taps through.' },
      ],
    },
  },
];
