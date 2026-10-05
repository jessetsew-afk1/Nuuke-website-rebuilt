// Data and code-drawn artwork for the Gentler Streak concept case study.
// Colours are NUUKE's working approximation (third-party teardown), not official brand values.

export const GS = {
  coral: '#FF7A45',
  coralDeep: '#E2551F',
  night: '#2E1B4E',
  plum: '#4A2F78',
  lilac: '#B9A6E8',
  sun: '#F4C430',
  mint: '#7ED957',
  leaf: '#2F7D32',
  sky: '#8DB4E6',
  cream: '#FFF4EC',
  peach: '#FFE3D3',
  ink: '#2B1208',
  ink2: '#6B4A3A',
};

/* ------------------------------------------------------------------ */
/* Activity Path geometry: a soft band (the "safe zone") and daily dots */
/* ------------------------------------------------------------------ */

/** Sample day values: 0 = middle of the path, ±1 = on the edge, beyond = outside. */
export const tenDays = [0.2, 0.5, 1.35, 0.4, -0.3, -1.25, 0.05, 0.3, 0.55, 0.15];
export const thirtyDays = [
  0.1, 0.4, 0.8, 1.3, 0.6, -0.2, -0.6, 0.1, 0.3, 1.5, 0.7, 0.2, -0.4, -1.2, -0.3, 0.2, 0.4, 0.6, 0.1, -0.1, 0.3, 0.5, 1.1, 0.4, 0.0, -0.5, 0.2, 0.3, 0.5, 0.15,
];

export type Band = { top: string; bottom: string; fill: string; dots: { x: number; y: number; v: number }[]; mid: string };

/**
 * Build the band between x0..x1 around a gently waving centre line.
 * `values` place one dot per day: inside the band when |v| <= 1.
 */
export function band(x0: number, x1: number, cy: number, half: number, values: number[], wave = 10, seed = 0): Band {
  const N = 48;
  const centre = (t: number) => cy + Math.sin(t * Math.PI * 1.6 + seed) * wave + Math.sin(t * Math.PI * 3.1 + seed * 2) * wave * 0.35;
  const width = (t: number) => half * (0.82 + 0.18 * Math.cos(t * Math.PI * 2.2 + seed));
  const xs = (t: number) => x0 + (x1 - x0) * t;
  const top: [number, number][] = [];
  const bot: [number, number][] = [];
  const mid: [number, number][] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    top.push([xs(t), centre(t) - width(t)]);
    bot.push([xs(t), centre(t) + width(t)]);
    mid.push([xs(t), centre(t)]);
  }
  const line = (pts: [number, number][]) => smooth(pts);
  const fill = `${line(top)} ${smooth([...bot].reverse(), true)} Z`;
  const dots = values.map((v, i) => {
    const t = values.length === 1 ? 0.5 : i / (values.length - 1);
    return { x: xs(t), y: centre(t) - v * width(t), v };
  });
  return { top: line(top), bottom: line(bot), fill, dots, mid: line(mid) };
}

/** Catmull-Rom → cubic Bézier through points. `cont` continues an open path (no M). */
export function smooth(pts: [number, number][], cont = false) {
  let d = cont ? `L ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}` : `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}

/** Day dot colour: inside the path = leaf, above = coral (doing a lot), below = plum (taking it easy). */
export const dotColor = (v: number) => (v > 1 ? GS.coralDeep : v < -1 ? GS.plum : GS.leaf);

/* ------------------------------------------------------------------ */
/* 3D wireframe layers (ScreenStack) — the Today screen, 375 × 804      */
/* ------------------------------------------------------------------ */
const V = 'viewBox="0 0 375 804" xmlns="http://www.w3.org/2000/svg"';
const B = band(40, 335, 440, 34, tenDays, 9, 0.6);
const F = 'font-family="Inter,Arial,sans-serif"';

export const gentlerLayers = [
  {
    label: 'Layout grid',
    desc: '4 columns, 20pt margins, an 8pt rhythm and safe areas. Every card spans the full grid so it scales with Dynamic Type.',
    svg: `<svg ${V}><rect width="375" height="804" fill="${GS.cream}"/>
      <g fill="${GS.coral}" opacity=".1">${[0, 1, 2, 3].map((i) => `<rect x="${20 + i * 87.5}" y="0" width="73" height="804"/>`).join('')}</g>
      <g stroke="${GS.coral}" stroke-opacity=".16">${Array.from({ length: 101 }, (_, i) => `<line x1="0" x2="375" y1="${i * 8}" y2="${i * 8}"/>`).join('')}</g>
      <rect x="0" y="0" width="375" height="54" fill="${GS.plum}" opacity=".16"/><rect x="0" y="770" width="375" height="34" fill="${GS.plum}" opacity=".16"/>
      <text x="20" y="40" fill="${GS.plum}" font-family="monospace" font-size="11">SAFE AREA 54pt</text></svg>`,
  },
  {
    label: 'Wireframe',
    desc: 'One question per card, in reading order: how am I, where am I on my path, what should I do, what did I do.',
    svg: `<svg ${V}><g fill="none" stroke="#8a6a5a" stroke-width="2">
      <rect x="20" y="70" width="120" height="14" rx="4"/><rect x="20" y="96" width="150" height="34" rx="6"/>
      <rect x="20" y="150" width="335" height="140" rx="24"/><circle cx="72" cy="220" r="34"/>
      <rect x="20" y="306" width="335" height="226" rx="24"/>
      <rect x="20" y="548" width="335" height="76" rx="22"/><rect x="20" y="636" width="335" height="64" rx="20"/>
      <rect x="0" y="724" width="375" height="80"/></g>
      <g stroke="#8a6a5a" stroke-width="1.5"><line x1="40" y1="370" x2="335" y2="510"/><line x1="335" y1="370" x2="40" y2="510"/></g></svg>`,
  },
  {
    label: 'Content & data',
    desc: 'Plain-language copy first. “You’re steady” beats a score; the path shows ten days, with today ringed.',
    svg: `<svg ${V}><g ${F} fill="${GS.ink}">
      <text x="20" y="82" font-size="12" letter-spacing="2" fill="${GS.ink2}">TUESDAY · 6 OCT</text>
      <text x="20" y="126" font-size="34" font-weight="800">Today</text>
      <text x="124" y="196" font-size="12" letter-spacing="1.5" fill="${GS.ink2}">READINESS</text>
      <text x="124" y="224" font-size="22" font-weight="800">You’re steady.</text>
      <text x="124" y="248" font-size="13" fill="${GS.ink2}">Short sleep, so keep it easy.</text>
      <text x="40" y="342" font-size="12" letter-spacing="1.5" fill="${GS.ink2}">ACTIVITY PATH · 10 DAYS</text>
      <path d="${B.top}" fill="none" stroke="${GS.ink}" stroke-width="1.5" stroke-dasharray="5 5"/><path d="${B.bottom}" fill="none" stroke="${GS.ink}" stroke-width="1.5" stroke-dasharray="5 5"/>
      ${B.dots.map((d) => `<circle cx="${d.x.toFixed(1)}" cy="${d.y.toFixed(1)}" r="6" fill="none" stroke="${GS.ink}" stroke-width="2"/>`).join('')}
      <text x="40" y="578" font-size="12" letter-spacing="1.5">GO GENTLER</text>
      <text x="40" y="602" font-size="16" font-weight="800">A 20-min walk is perfect today</text>
      <text x="40" y="664" font-size="15" font-weight="700">Easy walk · 32 min</text><text x="40" y="684" font-size="13" fill="${GS.ink2}">Yesterday · inside your path</text></g></svg>`,
  },
  {
    label: 'Colour & type',
    desc: 'Warm cream base, Yorhart-orange for “today”, leaf green for the path. Heavy geometric numbers, sentence-case body.',
    svg: `<svg ${V}><defs><radialGradient id="o" cx="40%" cy="35%"><stop offset="0" stop-color="#FFC9A8"/><stop offset=".6" stop-color="${GS.coral}"/><stop offset="1" stop-color="${GS.coralDeep}"/></radialGradient></defs>
      <rect x="20" y="150" width="335" height="140" rx="24" fill="${GS.peach}"/><circle cx="72" cy="220" r="34" fill="url(#o)"/>
      <rect x="20" y="306" width="335" height="226" rx="24" fill="#fff"/>
      <path d="${B.fill}" fill="${GS.mint}" opacity=".45"/>
      ${B.dots.map((d, i) => `<circle cx="${d.x.toFixed(1)}" cy="${d.y.toFixed(1)}" r="${i === 9 ? 8 : 6}" fill="${dotColor(d.v)}"/>`).join('')}
      <rect x="20" y="548" width="335" height="76" rx="22" fill="${GS.coral}"/>
      <rect x="20" y="636" width="335" height="64" rx="20" fill="#fff"/>
      <rect x="0" y="724" width="375" height="80" fill="#fff"/><rect x="0" y="724" width="375" height="1" fill="#f0d9c9"/>
      ${[0, 1, 2, 3].map((i) => `<rect x="${40 + i * 88}" y="742" width="30" height="22" rx="8" fill="${i === 0 ? GS.coral : '#ead6c8'}"/>`).join('')}</svg>`,
  },
  {
    label: 'Motion & feedback',
    desc: 'The readiness orb breathes at a calm 5.5 s, today’s dot pulses once, and the band draws in left to right. All of it stops with Reduce Motion.',
    svg: `<svg ${V}><g fill="none" stroke="${GS.coral}" stroke-width="2" stroke-dasharray="4 5"><circle cx="72" cy="220" r="46"/><circle cx="72" cy="220" r="56" opacity=".5"/></g>
      <g ${F} font-size="11" fill="${GS.coralDeep}"><text x="150" y="168">breathe · 5.5 s · sine in-out</text>
      <text x="196" y="372">draw-in · 600 ms</text><text x="214" y="530">pulse once · then rest</text></g>
      <circle cx="${B.dots[9].x.toFixed(1)}" cy="${B.dots[9].y.toFixed(1)}" r="16" fill="none" stroke="${GS.coral}" stroke-width="2"/>
      <path d="M 60 470 L 320 470" stroke="${GS.coral}" stroke-width="2" marker-end="url(#a)"/>
      <defs><marker id="a" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="${GS.coral}"/></marker></defs></svg>`,
  },
];

/* ------------------------------------------------------------------ */
/* Card sort                                                           */
/* ------------------------------------------------------------------ */
export type Tab = 'today' | 'workouts' | 'trends' | 'you';
export const tabs: { id: Tab; label: string; hint: string }[] = [
  { id: 'today', label: 'Today', hint: 'How am I, and what should I do?' },
  { id: 'workouts', label: 'Workouts', hint: 'What did I do, and how hard was it?' },
  { id: 'trends', label: 'Trends', hint: 'How am I doing over weeks and months?' },
  { id: 'you', label: 'You', hint: 'Data, permissions and preferences.' },
];
export const cards: { id: string; label: string; ours: Tab; why: string }[] = [
  { id: 'readiness', label: 'Readiness check-in', ours: 'today', why: 'It answers the first question of the day, so it opens the app.' },
  { id: 'path', label: 'Activity Path', ours: 'today', why: 'The signature view. Today’s dot only makes sense next to today’s suggestion.' },
  { id: 'gentler', label: 'Go Gentler suggestion', ours: 'today', why: 'An action, not a record. It sits directly under the path it comes from.' },
  { id: 'insights', label: 'Insights (short reads)', ours: 'today', why: 'The most debated card. We surface one read in context on Today rather than giving articles a whole tab.' },
  { id: 'history', label: 'Workout history', ours: 'workouts', why: 'Records of what you did, newest first.' },
  { id: 'zones', label: 'Heart-rate zones', ours: 'workouts', why: 'Zones are read per workout. A Trends view links back here instead of repeating them.' },
  { id: 'effect', label: 'Effect on your path', ours: 'workouts', why: 'It belongs to the workout summary: this walk moved you here.' },
  { id: 'sleep', label: 'Sleep & consistency', ours: 'trends', why: 'Sleep reads best as a pattern over nights, not as a single score.' },
  { id: 'cycle', label: 'Cycle view', ours: 'trends', why: 'Often sorted under You. We put it in Trends because it explains changes in readiness over weeks.' },
  { id: 'recap', label: 'Monthly recap', ours: 'trends', why: 'Progress over comparison: a calm look back, shareable from here.' },
  { id: 'health', label: 'Health permissions', ours: 'you', why: 'Set once, revisited rarely. It sits with the other data controls.' },
  { id: 'nudges', label: 'Gentle nudges', ours: 'you', why: 'Notification tone and timing are a preference, not a daily task.' },
  { id: 'units', label: 'Units & language', ours: 'you', why: 'Classic settings. Out of the way, easy to find.' },
];
