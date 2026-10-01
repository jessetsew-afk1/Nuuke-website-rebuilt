// Heirloom concept case study: the eight scroll beats of the limestone-loop explainer.
// Facts come only from research/brands.md (section 3). Storyboard art is original line work.

export type Beat = {
  key: string;
  kicker: string;
  title: string;
  /** Long caption used in the desktop explainer. */
  text: string;
  /** Short caption used in the mobile explainer. */
  short: string;
  formula?: string;
  /** Storyboard notes: camera and motion direction. */
  shot: string;
  /** Storyboard thumbnail (viewBox 0 0 200 125). */
  svg: string;
};

const L = '#f2efe8';
const K = '#e2783a';
const A = '#a9c1d9';
const G = '#8c8a85';
const BG = '#1e1e1c';
const frame = (inner: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 125" fill="none" stroke-linecap="round" stroke-linejoin="round"><rect width="200" height="125" fill="${BG}"/><path d="M0 104 H200" stroke="${G}" stroke-opacity=".5"/>${inner}</svg>`;

export const beats: Beat[] = [
  {
    key: 'rock',
    kicker: 'Feedstock',
    title: 'Limestone, CaCO₃',
    text: 'It starts with one of the most abundant, cheapest rocks there is. Left alone in nature, limestone absorbs CO₂ from the air over <em>years</em>.',
    short: 'Abundant, cheap rock. In nature it absorbs CO₂ over years.',
    formula: 'CaCO₃',
    shot: 'Open close on the rock pile. Slow push-in, soft key light, faceted mineral surfaces.',
    svg: frame(
      `<g stroke="${L}" stroke-width="2" fill="${L}" fill-opacity=".12"><path d="M40 104 L52 78 L78 70 L96 86 L92 104Z"/><path d="M88 104 L100 84 L124 80 L136 104Z"/><path d="M128 104 L140 90 L160 92 L166 104Z"/><path d="M62 104 L70 92 L84 94 L86 104Z"/></g><path d="M150 40 l-18 10" stroke="${K}" stroke-width="2"/><path d="M128 48 l4 2 -1 -5" stroke="${K}" stroke-width="2"/><text x="14" y="24" fill="${G}" font-family="Inter,sans-serif" font-size="11">CaCO₃</text>`,
    ),
  },
  {
    key: 'kiln',
    kicker: 'Calcination',
    title: 'Heat it to about 900 °C',
    text: 'The rock goes into an <strong>electric kiln</strong>, powered by renewable electricity, and is heated to about 900 °C.',
    short: 'An electric kiln on renewable power heats the rock to ~900 °C.',
    shot: 'Track to the kiln cut-away. The interior ramps from cold to glowing orange; heat shimmer rises.',
    svg: frame(
      `<rect x="78" y="34" width="44" height="70" rx="4" stroke="${L}" stroke-width="2"/><rect x="86" y="44" width="28" height="56" rx="3" fill="${K}" fill-opacity=".85"/><g stroke="${K}" stroke-width="1.6" stroke-opacity=".8"><path d="M88 28 q4 -6 0 -12 q-4 -6 0 -12"/><path d="M100 28 q4 -6 0 -12 q-4 -6 0 -12"/><path d="M112 28 q4 -6 0 -12 q-4 -6 0 -12"/></g><text x="134" y="60" fill="${K}" font-family="Inter,sans-serif" font-size="12">900 °C</text>`,
    ),
  },
  {
    key: 'split',
    kicker: 'The split',
    title: 'Rock in, two things out',
    text: 'Heat splits CaCO₃ into white <strong>calcium oxide</strong> powder and a <strong>pure stream of CO₂</strong>. A cement kiln vents that CO₂. Here it is captured.',
    short: 'CaCO₃ splits into white CaO powder and a pure CO₂ stream that is captured.',
    formula: 'CaCO₃ → CaO + CO₂',
    shot: 'Crane up. Particles stream from the kiln top along a glass pipe to the capture tank; powder piles at the base.',
    svg: frame(
      `<rect x="40" y="46" width="34" height="58" rx="4" stroke="${L}" stroke-width="2"/><rect x="47" y="56" width="20" height="44" fill="${K}" fill-opacity=".7"/><path d="M57 44 C 70 14, 120 12, 150 40" stroke="${A}" stroke-width="2" stroke-dasharray="2 5"/><rect x="138" y="44" width="30" height="60" rx="14" stroke="${L}" stroke-width="2"/><path d="M76 104 q12 -16 26 0Z" fill="${L}"/><text x="140" y="34" fill="${A}" font-family="Inter,sans-serif" font-size="11">CO₂</text><text x="80" y="120" fill="${G}" font-family="Inter,sans-serif" font-size="9">CaO</text>`,
    ),
  },
  {
    key: 'store',
    kicker: 'Permanent storage',
    title: 'Locked away for good',
    text: 'The CO₂ goes from the tank to permanent storage. In Tracy it is mineralised into <strong>concrete</strong> with CarbonCure. The planned Louisiana plants call for <strong>geologic storage</strong> underground.',
    short: 'Tank → permanent storage: concrete in Tracy; geologic storage planned for Louisiana.',
    shot: 'Fly to the edge of the diorama. The cut-away ground shows rock strata filling with stored CO₂; the concrete block mineralises.',
    svg: frame(
      `<rect x="0" y="104" width="200" height="21" fill="${G}" fill-opacity=".25"/><path d="M0 114 H200" stroke="${G}" stroke-opacity=".6"/><rect x="40" y="44" width="28" height="60" rx="13" stroke="${L}" stroke-width="2"/><path d="M54 104 V118 H120" stroke="${L}" stroke-width="2"/><g fill="${A}"><circle cx="128" cy="118" r="2"/><circle cx="138" cy="116" r="2"/><circle cx="148" cy="119" r="2"/><circle cx="158" cy="117" r="2"/><circle cx="168" cy="119" r="2"/></g><rect x="120" y="70" width="40" height="34" stroke="${L}" stroke-width="2"/><g fill="${A}"><circle cx="130" cy="80" r="1.6"/><circle cx="146" cy="88" r="1.6"/><circle cx="136" cy="96" r="1.6"/><circle cx="152" cy="78" r="1.6"/></g>`,
    ),
  },
  {
    key: 'hydrate',
    kicker: 'Hydration',
    title: 'Add water',
    text: 'The calcium oxide is hydrated into <strong>calcium hydroxide</strong>, a white powder that is “thirsty” for CO₂.',
    short: 'Water turns CaO into calcium hydroxide, a powder “thirsty” for CO₂.',
    formula: 'CaO + H₂O → Ca(OH)₂',
    shot: 'Low angle on the hydrator. Droplets fall in a loop; the powder brightens and swells.',
    svg: frame(
      `<path d="M70 70 H130 L124 104 H76Z" stroke="${L}" stroke-width="2"/><path d="M74 80 H126" stroke="${L}" stroke-opacity=".6"/><path d="M100 18 V30" stroke="${L}" stroke-width="3"/><g fill="${A}"><path d="M96 40 q4 -8 8 0 a4 4 0 0 1 -8 0Z"/><path d="M86 54 q4 -8 8 0 a4 4 0 0 1 -8 0Z"/><path d="M106 58 q4 -8 8 0 a4 4 0 0 1 -8 0Z"/></g><text x="140" y="92" fill="${G}" font-family="Inter,sans-serif" font-size="10">Ca(OH)₂</text>`,
    ),
  },
  {
    key: 'trays',
    kicker: 'Spread & stack',
    title: 'Spread thin, stacked tall',
    text: 'The powder is spread thin on hundreds of flat trays, racked about <strong>40 ft (12 m)</strong> high and open to the air.',
    short: 'Powder is spread on hundreds of trays, racked ~40 ft (12 m) high.',
    shot: 'Wide, low hero angle. Trays rise level by level into the rack; a person stands at the base for scale.',
    svg: frame(
      `<g stroke="${L}" stroke-width="2"><path d="M70 104 V14 M130 104 V14"/></g><g stroke="${L}" stroke-opacity=".7">${Array.from({ length: 10 }, (_, i) => `<path d="M70 ${98 - i * 9} H130"/>`).join('')}</g><path d="M150 104 V14" stroke="${K}" stroke-width="1.5"/><path d="M146 18 l4 -4 4 4 M146 100 l4 4 4 -4" stroke="${K}" stroke-width="1.5"/><text x="158" y="62" fill="${K}" font-family="Inter,sans-serif" font-size="11">40 ft</text><circle cx="54" cy="90" r="3" stroke="${G}"/><path d="M54 94 V104" stroke="${G}"/>`,
    ),
  },
  {
    key: 'air',
    kicker: 'Carbonation',
    title: 'Three days of breathing',
    text: 'Air flows through the stacks. The powder soaks up CO₂ like a sponge and turns back into limestone in about <strong>3 days</strong>, instead of months or years.',
    short: 'Air flows through; the powder turns back into limestone in about 3 days.',
    formula: 'Ca(OH)₂ + CO₂ → CaCO₃ + H₂O',
    shot: 'Side-on time-lapse. Blue air particles enter left and thin out as they pass the trays; light cycles three times.',
    svg: frame(
      `<g stroke="${L}" stroke-width="2"><path d="M80 104 V14 M120 104 V14"/></g><g stroke="${L}" stroke-opacity=".6">${Array.from({ length: 9 }, (_, i) => `<path d="M80 ${96 - i * 10} H120"/>`).join('')}</g><g stroke="${A}" stroke-width="2" stroke-dasharray="3 5"><path d="M14 40 H74"/><path d="M14 60 H74"/><path d="M14 80 H74"/></g><g stroke="${A}" stroke-opacity=".35" stroke-dasharray="3 7"><path d="M126 50 H186"/><path d="M126 76 H186"/></g><text x="132" y="24" fill="${G}" font-family="Inter,sans-serif" font-size="10">Day 1 · 2 · 3</text>`,
    ),
  },
  {
    key: 'loop',
    kicker: 'The loop',
    title: 'Back to the kiln, again and again',
    text: 'Robots move along the stacks while software models where each tray is in its cycle. Finished trays return to the kiln, and the same material is reused, cycle after cycle.',
    short: 'Robots return finished trays to the kiln. Same material, cycle after cycle.',
    shot: 'Follow the robot arm lifting a tray, then a long pull-back to an overhead of the whole loop, glowing.',
    svg: frame(
      `<circle cx="100" cy="62" r="38" stroke="${K}" stroke-width="2" stroke-dasharray="6 5"/><path d="M134 46 l4 -8 4 9" stroke="${K}" stroke-width="2"/><g fill="${L}"><rect x="94" y="18" width="12" height="12" rx="2"/><rect x="132" y="66" width="12" height="12" rx="2"/><rect x="94" y="94" width="12" height="12" rx="2"/><rect x="56" y="66" width="12" height="12" rx="2"/></g><path d="M160 104 V88 L172 76 L186 82" stroke="${L}" stroke-width="2"/>`,
    ),
  },
];
