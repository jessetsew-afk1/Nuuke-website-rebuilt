// Fellow (Stagg EKG) concept film: the 10-shot storyboard, sound beats and
// original line-art frames. Shot order and actions follow research/brands.md §4.

export type Track = 'camera' | 'kettle' | 'lid' | 'lcd' | 'light' | 'fx' | 'colour' | 'type';

export type Shot = {
  title: string;
  dur: number; // seconds in the animatic
  caption: string; // on-stage caption during the animatic
  camera: string; // lens / move note
  action: string;
  sound: string;
  keys: Partial<Record<Track, number[]>>; // keyframes, as 0..1 of the shot
};

export const shots: Shot[] = [
  {
    title: 'Rim-light reveal',
    dur: 5,
    caption: 'Black void. A single rim light traces the gooseneck. “Everyday Magic.”',
    camera: '85 mm, slow push-in on the profile',
    action: 'Light sweeps left to right along the spout; the title fades up.',
    sound: 'Low sub swell, room tone, one breath of air',
    keys: { camera: [0, 1], light: [0, 0.6, 1], type: [0.35, 0.8] },
  },
  {
    title: 'Macro on steel',
    dur: 5,
    caption: 'Macro on brushed 304 steel. The lid lifts; water fills from inside.',
    camera: '100 mm macro, crane down over the lid',
    action: 'Lid lifts on a soft spring; the water line rises inside the body.',
    sound: 'Steel shimmer, a soft lid “tock”, pour into an empty vessel',
    keys: { camera: [0, 1], lid: [0.1, 0.45], fx: [0.3, 1] },
  },
  {
    title: 'Landing + LCD wakes',
    dur: 5,
    caption: 'The kettle lands on its base. The LCD wakes: SET 205°F, NOW 68°F.',
    camera: '50 mm, low front, settles on the base corner',
    action: 'Kettle drops the last few centimetres and seats; the display flickers on.',
    sound: 'Muted landing thud, electronic wake blip',
    keys: { camera: [0, 1], kettle: [0, 0.45], lcd: [0.5, 0.65] },
  },
  {
    title: 'Knob turn',
    dur: 4,
    caption: 'One dial for power and temperature. SET sweeps the 135–212°F range and clicks home at 205.',
    camera: '100 mm macro on the dial, slight orbit',
    action: 'Dial turns; the set temperature spins down and back, degree by degree.',
    sound: 'Dry detent clicks, one per degree, pitched to the number',
    keys: { camera: [0, 1], kettle: [0.1, 0.9], lcd: [0.1, 0.5, 0.9] },
  },
  {
    title: 'Cutaway glow',
    dur: 5,
    caption: 'X-ray cutaway: the element glows, convection rises, NOW climbs to 205 (time-lapsed).',
    camera: '35 mm, half orbit around the body',
    action: 'Body turns translucent; heat colour rises with the reading.',
    sound: 'Rising hiss and micro-bubbles, a tone that tracks temperature',
    keys: { camera: [0, 1], fx: [0, 0.25, 1], lcd: [0.2, 1], light: [0.25] },
  },
  {
    title: 'HOLD ring',
    dur: 5,
    caption: 'HOLD switches on. A 60-minute ring draws around the base.',
    camera: '35 mm, top-down three-quarter, slow drift',
    action: 'Rear Hold switch flicks; a light ring sweeps a full circle.',
    sound: 'Crisp switch flick, warm sustained hum',
    keys: { camera: [0, 1], fx: [0.2, 0.95], lcd: [0.2] },
  },
  {
    title: 'Balance',
    dur: 5,
    caption: 'Centre of mass sits over the handle side, so the kettle tilts without nose-diving.',
    camera: '85 mm, locked-off side profile',
    action: 'Kettle lifts and rocks forward; the marker stays over the base.',
    sound: 'Low whoosh on the tilt, nothing rattles',
    keys: { camera: [0, 1], kettle: [0, 0.2, 0.55, 0.9], fx: [0.15] },
  },
  {
    title: 'Slow pour',
    dur: 6,
    caption: 'Slow-motion pour: a thin, unbroken stream into the cone, then the bloom.',
    camera: '100 mm, low and close on the stream',
    action: 'Kettle tilts into a pour; the coffee bed blooms.',
    sound: 'Thin trickle (no splash), soft fizz of the bloom',
    keys: { camera: [0, 1], kettle: [0, 0.3], fx: [0.3, 0.45, 1] },
  },
  {
    title: 'Colourway carousel',
    dur: 6,
    caption: 'Matte Black → Matte White → Polished Copper → Stone Blue with Walnut.',
    camera: '50 mm, locked; the product turns',
    action: 'Four 1.5-second hero turns, cut on the beat.',
    sound: 'Four whooshes on the music beat',
    keys: { camera: [0], kettle: [0, 0.25, 0.5, 0.75], colour: [0, 0.25, 0.5, 0.75] },
  },
  {
    title: 'End card',
    dur: 4,
    caption: 'Stagg EKG. Concept – not commissioned by Fellow.',
    camera: '50 mm, pull back to hero wide',
    action: 'Lights settle; the end card fades up.',
    sound: 'Single warm two-note chime, music out',
    keys: { camera: [0, 1], light: [0.3], type: [0.35] },
  },
];

export const totalDuration = shots.reduce((a, s) => a + s.dur, 0);
export const shotStarts = shots.reduce<number[]>((acc, _s, i) => (acc.push(i ? acc[i - 1] + shots[i - 1].dur : 0), acc), []);

export const trackLabels: Record<Track, string> = {
  camera: 'Camera',
  kettle: 'Kettle',
  lid: 'Lid',
  lcd: 'LCD / temp',
  light: 'Lights',
  fx: 'FX',
  colour: 'Colourway',
  type: 'Type',
};

// ---------- Storyboard line-art (original, code-drawn) ----------
const INK = '#e9e2d6';
const DIM = '#6d655b';
const WARM = '#e0a066';

type KOpts = { x: number; y: number; s?: number; fill?: string; stroke?: string; tilt?: number; lid?: number; rim?: boolean; dash?: boolean; grip?: string };
/** A side-view Stagg-style kettle drawn around the base's bottom centre. */
export function kettle(o: KOpts) {
  const s = o.s ?? 1;
  const f = o.fill ?? '#1b1a19';
  const st = o.stroke ?? INK;
  const dash = o.dash ? ' stroke-dasharray="4 3"' : '';
  const lid = o.lid ?? 0;
  const body = `<g transform="rotate(${o.tilt ?? 0} 0 -14)">
    <path d="M-44 -30 C-70 -30 -80 -50 -84 -70 S-95 -96 -114 -96" fill="none" stroke="${st}" stroke-width="5.5" stroke-linecap="round"${dash}/>
    <path d="M44 -82 H70 Q80 -82 80 -72 V-38 Q80 -28 68 -28 H44" fill="none" stroke="${st}" stroke-width="4"${dash}/>
    <path d="M80 -70 V-40" stroke="${o.grip ?? st}" stroke-width="9" stroke-linecap="round"/>
    <rect x="-46" y="-90" width="92" height="76" rx="9" fill="${f}" stroke="${st}" stroke-width="2"${dash}/>
    <g transform="translate(0 ${-lid})"><rect x="-42" y="-96" width="84" height="7" rx="3" fill="${f}" stroke="${st}" stroke-width="2"/><rect x="-7" y="-104" width="14" height="8" rx="3" fill="${st}"/></g>
    ${o.rim ? `<path d="M-114 -96 C-95 -96 -84 -70 -80 -50 C-76 -34 -60 -30 -46 -30 M-46 -86 V-18" fill="none" stroke="${WARM}" stroke-width="2" stroke-linecap="round"/>` : ''}
  </g>`;
  return `<g transform="translate(${o.x} ${o.y}) scale(${s})">${body}</g>`;
}
export function base(x: number, y: number, s = 1, lcd = false) {
  return `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-60" y="-14" width="120" height="14" rx="3" fill="#121110" stroke="${DIM}" stroke-width="1.5"/>${
    lcd ? `<rect x="-44" y="-11" width="26" height="8" rx="1.5" fill="${WARM}"/>` : ''
  }<circle cx="34" cy="-7" r="4.5" fill="none" stroke="${DIM}" stroke-width="1.5"/></g>`;
}
function frame(n: number, raw: string, note: string) {
  // Unique ids so ten inline SVGs can share one page.
  const body = raw.replace(/#ah\b/g, `#ah${n}`).replace(/id="ah"/g, `id="ah${n}"`).replace(/#glow\b/g, `#glow${n}`).replace(/id="glow"/g, `id="glow${n}"`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180" role="img" aria-label="Storyboard frame ${n}">
<rect width="320" height="180" fill="#0e0d0c"/>
${body}
<text x="10" y="17" font-family="Inter, system-ui, sans-serif" font-size="9" font-weight="600" fill="${WARM}" letter-spacing="1">S${String(n).padStart(2, '0')}</text>
<text x="310" y="17" text-anchor="end" font-family="Inter, system-ui, sans-serif" font-size="8" fill="${DIM}">${note}</text>
<rect x="0.5" y="0.5" width="319" height="179" fill="none" stroke="#2a2723"/>
</svg>`;
}
const arrow = (d: string, c = DIM) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="1.5" stroke-dasharray="3 3" marker-end="url(#ah)"/>`;
const defs = `<defs><marker id="ah" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L8 4L0 8z" fill="${DIM}"/></marker><radialGradient id="glow"><stop offset="0" stop-color="#ff8a3c" stop-opacity=".9"/><stop offset="1" stop-color="#ff8a3c" stop-opacity="0"/></radialGradient></defs>`;

export const storyFrames: string[] = [
  frame(1, `${defs}${kettle({ x: 175, y: 150, fill: '#0e0d0c', stroke: '#2a2723', rim: true })}<text x="160" y="40" text-anchor="middle" font-family="Montserrat, sans-serif" font-weight="800" font-size="13" fill="${INK}">Everyday Magic.</text>${arrow('M60 160 L100 160')}`, 'push in'),
  frame(
    2,
    `${defs}<g opacity=".5">${Array.from({ length: 22 }, (_, i) => `<line x1="20" x2="300" y1="${92 + i * 4}" y2="${92 + i * 4}" stroke="#3a3632" stroke-width="1"/>`).join('')}</g>
<rect x="20" y="88" width="280" height="92" fill="none" stroke="${INK}" stroke-width="2"/><rect x="40" y="96" width="240" height="80" fill="#6f9dbd" opacity=".35"/><path d="M40 112 Q100 104 160 112 T280 112" stroke="#9fc6e0" stroke-width="2" fill="none"/>
<g transform="rotate(-8 160 60)"><rect x="30" y="50" width="260" height="14" rx="6" fill="#1b1a19" stroke="${INK}" stroke-width="2"/><rect x="140" y="34" width="40" height="18" rx="6" fill="${INK}"/></g>${arrow('M300 40 L300 80')}`,
    'crane down',
  ),
  frame(3, `${defs}${base(160, 160, 1.5, true)}${kettle({ x: 160, y: 128, s: 1.1 })}<path d="M100 40 v10 M160 32 v10 M220 40 v10" stroke="${DIM}" stroke-width="1.5"/><text x="96" y="176" font-family="Inter, sans-serif" font-size="7" fill="${WARM}">205 / 68</text>`, 'land + wake'),
  frame(
    4,
    `${defs}<circle cx="160" cy="95" r="52" fill="#141312" stroke="${INK}" stroke-width="2"/><rect x="157" y="48" width="6" height="18" rx="2" fill="${WARM}"/>${Array.from({ length: 36 }, (_, i) => {
      const a = (i / 36) * Math.PI * 2;
      return `<line x1="${160 + Math.cos(a) * 60}" y1="${95 + Math.sin(a) * 60}" x2="${160 + Math.cos(a) * 66}" y2="${95 + Math.sin(a) * 66}" stroke="${DIM}" stroke-width="1.5"/>`;
    }).join('')}<path d="M232 60 A80 80 0 0 1 232 130" fill="none" stroke="${WARM}" stroke-width="2" marker-end="url(#ah)"/><text x="40" y="80" font-family="Inter, sans-serif" font-size="16" font-weight="700" fill="${INK}">205</text><text x="40" y="100" font-family="Inter, sans-serif" font-size="10" fill="${DIM}">135 … 212</text>`,
    'macro, dial',
  ),
  frame(5, `${defs}${base(160, 160, 1.2)}<ellipse cx="160" cy="133" rx="46" ry="12" fill="url(#glow)"/>${kettle({ x: 160, y: 143, s: 1.2, fill: 'none', dash: true })}<path d="M140 128 C130 100 150 90 140 64 M180 128 C190 100 170 90 180 64" fill="none" stroke="${WARM}" stroke-width="1.5" marker-end="url(#ah)"/><text x="250" y="60" font-family="Inter, sans-serif" font-size="14" font-weight="700" fill="${WARM}">68→205</text>`, 'x-ray, orbit'),
  frame(6, `${defs}<circle cx="160" cy="92" r="56" fill="none" stroke="#2a2723" stroke-width="6"/><path d="M160 36 A56 56 0 1 1 104 92" fill="none" stroke="${WARM}" stroke-width="6" stroke-linecap="round"/><circle cx="160" cy="92" r="38" fill="#1b1a19" stroke="${INK}" stroke-width="2"/><circle cx="160" cy="92" r="7" fill="${INK}"/><text x="160" y="165" text-anchor="middle" font-family="Inter, sans-serif" font-size="11" font-weight="600" fill="${INK}" letter-spacing="2">HOLD 60:00</text>`, 'top-down'),
  frame(7, `${defs}${base(170, 166, 1.2)}${kettle({ x: 170, y: 132, s: 1.15, tilt: -16 })}<line x1="190" y1="70" x2="190" y2="150" stroke="${WARM}" stroke-width="1.5" stroke-dasharray="3 3"/><circle cx="190" cy="78" r="6" fill="${WARM}"/><circle cx="190" cy="78" r="11" fill="none" stroke="${WARM}" stroke-width="1"/><path d="M60 120 A30 30 0 0 1 80 96" stroke="${DIM}" fill="none" marker-end="url(#ah)"/>`, 'side, locked'),
  frame(8, `${defs}${kettle({ x: 200, y: 108, s: 0.95, tilt: -26 })}<line x1="91" y1="66" x2="91" y2="130" stroke="#bfe0f5" stroke-width="1.5"/><path d="M68 128 L114 128 L102 150 L80 150 Z" fill="#e9e2d6" opacity=".9"/><ellipse cx="91" cy="130" rx="18" ry="3" fill="#5a3b22"/><rect x="72" y="150" width="38" height="24" rx="3" fill="#2a2723"/>`, 'low, slow-mo'),
  frame(
    9,
    `${defs}${['#1c1c1c', '#edebe6', '#b87333', '#7e93a3'].map((c, i) => kettle({ x: 52 + i * 72, y: 132, s: 0.5, fill: c, stroke: i === 1 ? '#bdb6aa' : INK, grip: i === 3 ? '#5c4033' : undefined })).join('')}${arrow('M40 158 L280 158')}`,
    'turns on beat',
  ),
  frame(10, `${defs}<text x="160" y="88" text-anchor="middle" font-family="Montserrat, sans-serif" font-weight="900" font-size="22" fill="${INK}">Stagg EKG</text><text x="160" y="110" text-anchor="middle" font-family="Inter, sans-serif" font-size="9" fill="${DIM}">Concept – not commissioned by Fellow</text><line x1="120" x2="200" y1="124" y2="124" stroke="${WARM}" stroke-width="1.5"/>`, 'end card'),
];

// ---------- Sound beats (one per shot) ----------
export type SoundKind = 'swell' | 'tock' | 'blip' | 'detents' | 'hiss' | 'switch' | 'whoosh' | 'trickle' | 'beats' | 'chime';
export const soundBeats: { kind: SoundKind; label: string; level: number }[] = [
  { kind: 'swell', label: 'Sub swell', level: 0.25 },
  { kind: 'tock', label: 'Lid tock', level: 0.4 },
  { kind: 'blip', label: 'Wake blip', level: 0.45 },
  { kind: 'detents', label: 'Detents', level: 0.55 },
  { kind: 'hiss', label: 'Rising hiss', level: 0.7 },
  { kind: 'switch', label: 'Switch + hum', level: 0.5 },
  { kind: 'whoosh', label: 'Tilt whoosh', level: 0.45 },
  { kind: 'trickle', label: 'Trickle', level: 0.35 },
  { kind: 'beats', label: 'Four whooshes', level: 0.85 },
  { kind: 'chime', label: 'Chime', level: 0.6 },
];
