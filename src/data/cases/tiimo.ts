// Shared data for the Tiimo concept case study: palette, the sample day,
// self-drawing wireframes, ScreenStack layers, App Store screenshots,
// the release roadmap and release-note copy. All artwork is original NUUKE SVG.

/** Our working approximation of a calm, pastel Tiimo-style palette (no official values are published). */
export const TI = {
  canvas: '#F7F3FF',
  canvas2: '#EEE7FC',
  ink: '#1F1A33',
  ink2: '#4D4566',
  muted: '#625A7C',
  line: '#E2DAF3',
  purple: '#A98BFF',
  deep: '#5B3FD1',
  lilac: '#DCCFFF',
  pink: '#FFD3DF',
  peach: '#FFDCBF',
  butter: '#FFF0B0',
  mint: '#C9F1DD',
  sky: '#D2E7FF',
} as const;

export type Swatch = 'lilac' | 'pink' | 'peach' | 'butter' | 'mint' | 'sky';
export const SWATCHES: Swatch[] = ['lilac', 'pink', 'peach', 'butter', 'mint', 'sky'];

/** Colour-intensity levels for the sensory lab. Dark ink text stays on every level. */
export const INTENSITY: Record<'soft' | 'balanced' | 'vivid' | 'mono', Record<Swatch, string>> = {
  soft: { lilac: '#EEE8FF', pink: '#FFE8EE', peach: '#FFEEDF', butter: '#FFF8DA', mint: '#E4F8EE', sky: '#E7F2FF' },
  balanced: { lilac: '#DCCFFF', pink: '#FFD3DF', peach: '#FFDCBF', butter: '#FFF0B0', mint: '#C9F1DD', sky: '#D2E7FF' },
  vivid: { lilac: '#B9A2FF', pink: '#FF9DB8', peach: '#FFB27D', butter: '#FFDF5E', mint: '#86E0B4', sky: '#93C6FF' },
  mono: { lilac: '#E6E3EE', pink: '#DEDBE7', peach: '#ECEAF1', butter: '#E2DFEA', mint: '#E9E7EF', sky: '#DAD6E3' },
};

/** The sample day used in the opening, the hero and the sensory lab. Times in hours. */
export type DayTask = { raw: string; t: string; emoji: string; start: number; dur: number; c: Swatch };
export const DAY: DayTask[] = [
  { raw: 'meds!!', t: 'Breakfast & meds', emoji: '🥣', start: 8.5, dur: 0.5, c: 'peach' },
  { raw: 'email Sam', t: 'Reply to Sam', emoji: '✉️', start: 9.25, dur: 0.5, c: 'sky' },
  { raw: 'deck for Friday??', t: 'Focus: Friday deck', emoji: '💻', start: 10, dur: 1.5, c: 'lilac' },
  { raw: 'go outside', t: 'Walk in the sun', emoji: '🌿', start: 12, dur: 0.5, c: 'mint' },
  { raw: 'dentist?!', t: 'Call the dentist', emoji: '📞', start: 13, dur: 0.25, c: 'pink' },
  { raw: 'laundry', t: 'Laundry, one load', emoji: '🧺', start: 14, dur: 0.75, c: 'butter' },
  { raw: 'groceries', t: 'Groceries', emoji: '🛒', start: 16, dur: 0.75, c: 'mint' },
  { raw: 'call mum', t: 'Call Mum', emoji: '💛', start: 18, dur: 0.5, c: 'peach' },
  { raw: 'water plants', t: 'Water the plants', emoji: '🪴', start: 19, dur: 0.25, c: 'sky' },
];

export const fmtTime = (h: number) => {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
};

/* ------------------------------------------------------------------ */
/* Wireframes that draw themselves                                     */
/* ------------------------------------------------------------------ */
// Each element is drawn three times: as a pencil sketch stroke, as a grey box,
// and in final colour. Coordinates are in a 300 × 620 phone viewBox.
export type WEl =
  | { k: 'rect'; x: number; y: number; w: number; h: number; r?: number; fill?: string; stroke?: string }
  | { k: 'circle'; x: number; y: number; r: number; fill?: string; stroke?: string; ring?: number }
  | { k: 'line'; x: number; y: number; x2: number; y2: number; color?: string; width?: number }
  | { k: 'text'; x: number; y: number; w: number; s?: number; text: string; weight?: number; color?: string }
  | { k: 'emoji'; x: number; y: number; s?: number; text: string };

export type WScreen = {
  id: string;
  name: string;
  els: WEl[];
  notes: { n: number; x: number; y: number; title: string; text: string }[];
};

const tl = (y: number, h: number, c: string, emoji: string, label: string, time: string, extra: WEl[] = []): WEl[] => [
  { k: 'text', x: 18, y: y + 16, w: 30, s: 10, text: time, color: TI.muted },
  { k: 'rect', x: 62, y, w: 220, h, r: 16, fill: c },
  { k: 'emoji', x: 84, y: y + h / 2 + 6, s: 17, text: emoji },
  { k: 'text', x: 112, y: y + h / 2 + 5, w: Math.min(150, label.length * 7.4), s: 13, text: label, weight: 700 },
  ...extra,
];

export const WIRE_SCREENS: WScreen[] = [
  {
    id: 'today',
    name: 'Today',
    els: [
      { k: 'text', x: 20, y: 62, w: 70, s: 11, text: 'TUESDAY 14', color: TI.muted, weight: 600 },
      { k: 'text', x: 20, y: 92, w: 120, s: 26, text: 'Today', weight: 800 },
      { k: 'circle', x: 266, y: 82, r: 16, fill: TI.purple },
      ...[0, 1, 2, 3, 4, 5, 6].map((i): WEl => ({ k: 'rect', x: 20 + i * 38, y: 112, w: 32, h: 44, r: 12, fill: i === 1 ? TI.ink : '#FFFFFF', stroke: TI.line })),
      ...tl(178, 54, TI.peach, '🥣', 'Breakfast & meds', '08:30'),
      ...tl(242, 92, TI.lilac, '💻', 'Focus: Friday deck', '10:00'),
      { k: 'line', x: 12, y: 286, x2: 288, y2: 286, color: TI.deep, width: 2.5 },
      { k: 'circle', x: 58, y: 286, r: 5, fill: TI.deep },
      ...tl(344, 50, TI.mint, '🌿', 'Walk in the sun', '12:00'),
      ...tl(404, 44, TI.pink, '📞', 'Call the dentist', '13:00'),
      ...tl(458, 60, TI.butter, '🧺', 'Laundry', '14:00'),
      { k: 'circle', x: 258, y: 548, r: 24, fill: TI.purple },
      { k: 'text', x: 251, y: 556, w: 14, s: 24, text: '+', weight: 600 },
      { k: 'rect', x: 0, y: 580, w: 300, h: 40, r: 0, fill: '#FFFFFF', stroke: TI.line },
    ],
    notes: [
      { n: 1, x: 66, y: 16, title: 'One direction', text: 'The day reads top to bottom, one column. No grid of hours to decode.' },
      { n: 2, x: 28, y: 52, title: 'Emoji first', text: 'You recognise a task by its picture before you read it, which helps dyslexic readers.' },
      { n: 3, x: 4, y: 46, title: 'A moving “now”', text: 'The now line glides down. Nothing flashes or turns red when you run late.' },
      { n: 4, x: 86, y: 88, title: 'Dump from anywhere', text: 'The + opens brain dump on every screen, so a thought never has to wait.' },
    ],
  },
  {
    id: 'plan',
    name: 'Brain dump',
    els: [
      { k: 'text', x: 20, y: 70, w: 120, s: 24, text: 'Brain dump', weight: 800 },
      { k: 'text', x: 20, y: 94, w: 200, s: 12, text: 'Type or talk. We’ll sort it out.', color: TI.muted },
      { k: 'rect', x: 20, y: 110, w: 260, h: 120, r: 18, fill: '#FFFFFF', stroke: TI.line },
      { k: 'text', x: 36, y: 140, w: 120, s: 13, text: 'clean kitchen', weight: 600 },
      { k: 'text', x: 36, y: 164, w: 90, s: 13, text: 'email Sam' },
      { k: 'text', x: 36, y: 188, w: 110, s: 13, text: 'dentist?!' },
      { k: 'circle', x: 256, y: 206, r: 14, fill: TI.lilac },
      { k: 'rect', x: 20, y: 248, w: 260, h: 230, r: 20, fill: TI.lilac },
      { k: 'text', x: 36, y: 276, w: 150, s: 13, text: '✨ Clean kitchen, 4 steps', weight: 800 },
      ...[
        ['Clear the counter', '5 min'],
        ['Dishes in the dishwasher', '10 min'],
        ['Wipe surfaces', '5 min'],
        ['Take the bin out', '2 min'],
      ].flatMap(([s, m], i): WEl[] => [
        { k: 'rect', x: 32, y: 292 + i * 42, w: 236, h: 34, r: 12, fill: '#FFFFFF' },
        { k: 'text', x: 46, y: 314 + i * 42, w: 130, s: 12, text: s },
        { k: 'rect', x: 214, y: 299 + i * 42, w: 46, h: 20, r: 10, fill: TI.butter },
        { k: 'text', x: 220, y: 313 + i * 42, w: 34, s: 10, text: m, weight: 700 },
      ]),
      { k: 'text', x: 36, y: 466, w: 50, s: 12, text: '↺ Undo', weight: 700, color: TI.deep },
      { k: 'rect', x: 20, y: 500, w: 260, h: 52, r: 18, fill: TI.purple },
      { k: 'text', x: 92, y: 532, w: 120, s: 15, text: 'Add to today', weight: 800 },
    ],
    notes: [
      { n: 1, x: 50, y: 24, title: 'No form to fill', text: 'Brain dump is a single box. Type, paste or speak; structure comes later.' },
      { n: 2, x: 86, y: 44, title: 'AI suggests, you decide', text: 'The co-planner proposes steps. Each one is editable, and nothing is added until you say so.' },
      { n: 3, x: 80, y: 52, title: 'Estimates, not deadlines', text: 'Times are soft chips. Tap one to change it; nothing turns into a countdown yet.' },
      { n: 4, x: 20, y: 76, title: 'Undo, always', text: 'If the breakdown feels like too much, one tap puts the original task back.' },
    ],
  },
  {
    id: 'focus',
    name: 'Focus timer',
    els: [
      { k: 'text', x: 20, y: 66, w: 60, s: 11, text: 'NOW', color: TI.muted, weight: 700 },
      { k: 'text', x: 20, y: 94, w: 180, s: 22, text: '💻 Friday deck', weight: 800 },
      { k: 'circle', x: 150, y: 230, r: 100, fill: '#FFFFFF', stroke: TI.line },
      { k: 'circle', x: 150, y: 230, r: 84, fill: TI.lilac, ring: 0.62 },
      { k: 'text', x: 112, y: 238, w: 76, s: 26, text: '15:30', weight: 800 },
      { k: 'text', x: 124, y: 258, w: 52, s: 11, text: 'of 25 min', color: TI.muted },
      ...['Outline 5 slides', 'Find the chart', 'Write the ask'].flatMap((s, i): WEl[] => [
        { k: 'circle', x: 36, y: 372 + i * 40, r: 9, fill: i === 0 ? TI.mint : '#FFFFFF', stroke: TI.line },
        { k: 'text', x: 56, y: 377 + i * 40, w: 130, s: 13, text: s, weight: i === 1 ? 700 : 400 },
      ]),
      { k: 'rect', x: 20, y: 500, w: 120, h: 52, r: 18, fill: '#FFFFFF', stroke: TI.line },
      { k: 'text', x: 50, y: 532, w: 60, s: 14, text: '+5 min', weight: 700 },
      { k: 'rect', x: 156, y: 500, w: 124, h: 52, r: 18, fill: TI.purple },
      { k: 'text', x: 196, y: 532, w: 44, s: 14, text: 'Done', weight: 800 },
    ],
    notes: [
      { n: 1, x: 50, y: 22, title: 'Time you can see', text: 'The disc drains as time passes. For time blindness, the shape matters more than the numbers.' },
      { n: 2, x: 28, y: 63, title: 'Tiny next step', text: 'Only the current sub-step is bold. The rest wait quietly below.' },
      { n: 3, x: 26, y: 85, title: 'Extend without guilt', text: '“+5 min” is the same size as “Done”. Running over is normal, not a failure.' },
      { n: 4, x: 84, y: 30, title: 'Off the phone too', text: 'The same disc becomes a Live Activity, so the timer keeps going on the lock screen.' },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* ScreenStack layers: the Today screen, taken apart                   */
/* ------------------------------------------------------------------ */
const V = 'viewBox="0 0 375 804" xmlns="http://www.w3.org/2000/svg"';
const blocks = [
  { y: 230, h: 70, c: TI.peach, e: '🥣', t: 'Breakfast & meds', s: '08:30 · 30 min' },
  { y: 312, h: 120, c: TI.lilac, e: '💻', t: 'Focus: Friday deck', s: '10:00 · 1 h 30' },
  { y: 444, h: 66, c: TI.mint, e: '🌿', t: 'Walk in the sun', s: '12:00 · 30 min' },
  { y: 522, h: 58, c: TI.pink, e: '📞', t: 'Call the dentist', s: '13:00 · 15 min' },
  { y: 592, h: 78, c: TI.butter, e: '🧺', t: 'Laundry, one load', s: '14:00 · 45 min' },
];
export const tiimoLayers = [
  {
    label: 'Layout & safe areas',
    desc: 'One 64pt time gutter, one content column, 12pt rhythm. Safe areas for the island, the + button and the tab bar.',
    svg: `<svg ${V}><rect width="375" height="804" fill="#F7F3FF"/>
      <rect x="0" y="0" width="64" height="804" fill="#A98BFF" opacity=".14"/>
      <rect x="76" y="0" width="279" height="804" fill="#A98BFF" opacity=".08"/>
      <g stroke="#A98BFF" stroke-opacity=".22">${Array.from({ length: 67 }, (_, i) => `<line x1="0" x2="375" y1="${i * 12}" y2="${i * 12}"/>`).join('')}</g>
      <rect x="0" y="0" width="375" height="54" fill="#FF8FB1" opacity=".22"/><rect x="0" y="720" width="375" height="84" fill="#FF8FB1" opacity=".22"/>
      <text x="20" y="40" fill="#8a3a5a" font-family="monospace" font-size="11">SAFE AREA 54pt</text>
      <text x="8" y="140" fill="#5B3FD1" font-family="monospace" font-size="10">TIME 64</text>
      <text x="84" y="140" fill="#5B3FD1" font-family="monospace" font-size="10">CONTENT 279 · 12pt rhythm</text></svg>`,
  },
  {
    label: 'Wireframe',
    desc: 'Grey boxes first: date strip, then blocks whose height follows their duration, then a single + button.',
    svg: `<svg ${V}><g fill="none" stroke="#8d86a6" stroke-width="2">
      <rect x="20" y="70" width="90" height="14" rx="4"/><rect x="20" y="94" width="140" height="30" rx="6"/><circle cx="335" cy="104" r="20"/>
      ${[0, 1, 2, 3, 4, 5, 6].map((i) => `<rect x="${20 + i * 48}" y="146" width="40" height="56" rx="14"/>`).join('')}
      ${blocks.map((b) => `<rect x="76" y="${b.y}" width="279" height="${b.h}" rx="18"/><rect x="20" y="${b.y + 10}" width="40" height="12" rx="4"/>`).join('')}
      <circle cx="320" cy="700" r="30"/></g></svg>`,
  },
  {
    label: 'Content',
    desc: 'Real tasks, real times. Labels stay under 20 characters so they never wrap to a second line.',
    svg: `<svg ${V}><g font-family="Inter,Arial,sans-serif" fill="#1F1A33">
      <text x="20" y="82" font-size="12" letter-spacing="2" fill="#625A7C">TUESDAY 14</text>
      <text x="20" y="122" font-size="34" font-weight="800">Today</text>
      ${blocks.map((b) => `<text x="20" y="${b.y + 22}" font-size="12" fill="#625A7C">${b.s.split(' · ')[0]}</text><text x="128" y="${b.y + b.h / 2 - 2}" font-size="16" font-weight="700">${b.t}</text><text x="128" y="${b.y + b.h / 2 + 18}" font-size="12" fill="#4D4566">${b.s}</text><text x="92" y="${b.y + b.h / 2 + 8}" font-size="22">${b.e}</text>`).join('')}</g></svg>`,
  },
  {
    label: 'Colour & type',
    desc: 'Each task keeps its own pastel. Ink text on every pastel stays above 7:1, whatever intensity you pick.',
    svg: `<svg ${V}>${blocks.map((b) => `<rect x="76" y="${b.y}" width="279" height="${b.h}" rx="18" fill="${b.c}"/>`).join('')}
      ${[0, 1, 2, 3, 4, 5, 6].map((i) => `<rect x="${20 + i * 48}" y="146" width="40" height="56" rx="14" fill="${i === 1 ? '#1F1A33' : '#FFFFFF'}"/>`).join('')}
      <circle cx="335" cy="104" r="20" fill="#A98BFF"/><circle cx="320" cy="700" r="30" fill="#A98BFF"/>
      <path d="M320 686v28M306 700h28" stroke="#1F1A33" stroke-width="4" stroke-linecap="round"/></svg>`,
  },
  {
    label: 'Now line & motion',
    desc: 'The now line glides 1pt a minute. The current block gets a soft glow and a draining disc. Reduce Motion turns both into still states.',
    svg: `<svg ${V}><rect x="76" y="312" width="279" height="120" rx="18" fill="none" stroke="#5B3FD1" stroke-width="3" stroke-dasharray="6 6"/>
      <line x1="14" x2="361" y1="372" y2="372" stroke="#5B3FD1" stroke-width="3"/><circle cx="70" cy="372" r="7" fill="#5B3FD1"/>
      <circle cx="318" cy="350" r="18" fill="#FFFFFF"/><path d="M318 350 L318 332 A18 18 0 1 1 300.9 355.6 Z" fill="#A98BFF"/>
      <g font-family="monospace" font-size="11" fill="#5B3FD1"><text x="150" y="458">now line · 1pt / min · linear</text><text x="190" y="300">disc · drains · 25 min</text></g></svg>`,
  },
];

/* ------------------------------------------------------------------ */
/* Road to launch                                                      */
/* ------------------------------------------------------------------ */
export const SHOTS = [
  { h: 'See your whole day', s: 'Colour blocks, one gentle timeline', c: TI.lilac, kind: 'today' },
  { h: 'Big task? Small steps.', s: 'The co-planner breaks it down', c: TI.peach, kind: 'plan' },
  { h: 'Time you can watch', s: 'A focus disc that drains', c: TI.mint, kind: 'focus' },
  { h: 'Made for your senses', s: 'Fonts, colour and motion, your way', c: TI.sky, kind: 'sense' },
  { h: 'Check in, kindly', s: 'Mood check-ins with no streak guilt', c: TI.pink, kind: 'mood' },
] as const;

export type Release = {
  v: string;
  name: string;
  when: string;
  at: number; // 0..100 position on the roadmap
  ships: string[];
  gate: string[];
  watch: string;
  notes: { gentle: string[]; corporate: string[]; hype: string[] };
};

export const RELEASES: Release[] = [
  {
    v: 'Beta',
    name: 'TestFlight circle',
    when: 'Weeks 1–4',
    at: 0,
    ships: ['Today timeline and brain dump', 'Focus disc on the current task', 'Sensory settings, first pass'],
    gate: ['200 testers across ADHD, autistic and dyslexic communities', 'Weekly diary study', 'VoiceOver and Dynamic Type pass'],
    watch: 'Do testers plan tomorrow without help?',
    notes: {
      gentle: ['Thanks for testing with us. This build has the new timeline and a focus disc.', 'Tell us what felt heavy. There are no wrong answers.'],
      corporate: ['Beta build 0.9 includes timeline functionality and timer features.', 'Please submit feedback via the designated channel.'],
      hype: ['🚀🚀 HUGE beta drop!!! Timeline is INSANE now.', 'Crush your day like never before 💪🔥'],
    },
  },
  {
    v: '1.0',
    name: 'Launch',
    when: 'Week 6',
    at: 38,
    ships: ['Visual day timeline', 'AI co-planner with undo', 'Focus disc and Live Activity', 'Dyslexia-friendly font and motion settings'],
    gate: ['App Review and privacy labels', 'Accessibility audit sign-off', 'Screenshots in 6 sizes, 4 languages'],
    watch: 'Day-2 return: do people come back to see their day?',
    notes: {
      gentle: ['Your day now has a shape. Tasks sit on one calm timeline, each with its own colour.', 'Big tasks can be broken into small steps, and you can undo any suggestion.', 'Prefer less motion or a different font? It’s all in Settings → Senses.'],
      corporate: ['Version 1.0 introduces a redesigned timeline interface.', 'AI-powered task decomposition is now available.', 'Accessibility options have been expanded.'],
      hype: ['The planner that FINALLY gets you 🔥', 'AI that destroys procrastination!!!', 'No more excuses. Productivity unlocked 💯'],
    },
  },
  {
    v: '1.1',
    name: 'Gentler',
    when: 'Week 10',
    at: 63,
    ships: ['Softer “running late” states', '+5 min extend from the Live Activity', 'Mood check-in after focus sessions'],
    gate: ['A/B test on late-state copy', 'Crash-free sessions above 99.8%', 'Notification volume review'],
    watch: 'Fewer timers abandoned mid-way.',
    notes: {
      gentle: ['Running late? The timeline now shifts with you instead of turning red.', 'You can add five minutes right from your lock screen.', 'After a focus session, there’s an optional check-in. Skip it any time.'],
      corporate: ['Improved handling of overdue tasks.', 'Timer extension now supported in Live Activities.', 'Post-session mood logging added.'],
      hype: ['Never be late again!!! ⏰', 'Lock screen superpowers unlocked 🔓', 'Track your mood like a PRO 📈'],
    },
  },
  {
    v: '2.0',
    name: 'Together',
    when: 'Week 16',
    at: 100,
    ships: ['Shared routines for households', 'Apple Watch disc and haptic nudges', 'Routine templates: morning and wind-down'],
    gate: ['Family-sharing privacy review', 'watchOS performance budget', 'Localised routines in 4 markets'],
    watch: 'Shared routines kept 4 weeks later.',
    notes: {
      gentle: ['Plan together. Share a routine with the people you live with, up to five of you.', 'Your wrist can now feel the timer with a soft tap, if you want it.', 'New morning and wind-down templates, ready to make your own.'],
      corporate: ['Multi-user routine sharing is now available.', 'watchOS companion application released.', 'Routine template library added.'],
      hype: ['THE BIGGEST UPDATE EVER 🤯', 'Your whole family, finally organised!!', 'Watch app is 🔥🔥🔥 go go go'],
    },
  },
];

/** Words our tone-of-voice linter flags in release notes, and why. */
export const TONE_FLAGS: { re: string; why: string }[] = [
  { re: 'crush|destroy|destroys|superpowers?', why: 'Combat words add pressure.' },
  { re: 'no more excuses|never be late', why: 'Implies the reader is the problem.' },
  { re: 'productivity|pro\\b', why: 'We talk about days, not output.' },
  { re: 'functionality|decomposition|designated|interface', why: 'Jargon. Say what changed for the person.' },
  { re: '!!+', why: 'Shouting. One calm sentence is enough.' },
];
