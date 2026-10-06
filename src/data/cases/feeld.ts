// Feeld concept (NUUKE). Working palette, identity vocabulary, glossary, sample people
// and the exploded-layer artwork for the 3D wireframe.
// People, names and bios in this file are invented sample content for the concept.
// Colours are our working approximation of the 2023 "Aura" identity, not official values.

export const FD = {
  ink: '#0E0B12',
  ink2: '#17121D',
  ink3: '#221A2B',
  line: '#33283F',
  bone: '#F5F0EA',
  mute: '#B8AEC4',
  lilac: '#C7B6FF',
  coral: '#FF9E7A',
  rose: '#FF6FB5',
  violet: '#7B4DFF',
  ember: '#FF5A3C',
  peach: '#FFC9A3',
  mint: '#9FE3C0',
};

/** Heat-map stops for the aura field (intensity 0..1 → colour). Shared by canvas, shader and CSS. */
export const AURA_STOPS: [number, [number, number, number]][] = [
  [0, [14, 11, 18]],
  [0.16, [40, 16, 70]],
  [0.32, [104, 52, 214]],
  [0.5, [232, 92, 176]],
  [0.66, [255, 102, 78]],
  [0.82, [255, 178, 128]],
  [1, [255, 243, 230]],
];

/** CSS gradient for small aura moments (avatars, chips, buttons). */
export const auraCss = (a = 135) => `linear-gradient(${a}deg, #7B4DFF 0%, #E85CB0 45%, #FF664E 75%, #FFB280 100%)`;

/** Each sample person gets their own aura: three colours and a focal point. */
export type AuraSeed = { a: string; b: string; c: string; x: number; y: number };
export const AURAS: Record<string, AuraSeed> = {
  rae: { a: '#7B4DFF', b: '#FF6FB5', c: '#FFC9A3', x: 38, y: 34 },
  sam: { a: '#FF5A3C', b: '#FF9E7A', c: '#C7B6FF', x: 62, y: 40 },
  maya: { a: '#B04DD8', b: '#FF8A6B', c: '#FFC9A3', x: 44, y: 30 },
  jo: { a: '#9FE3C0', b: '#7B4DFF', c: '#FF9E7A', x: 30, y: 60 },
  theo: { a: '#FFB280', b: '#7B4DFF', c: '#FF6FB5', x: 66, y: 28 },
  ash: { a: '#C7B6FF', b: '#FF5A3C', c: '#FFC9A3', x: 50, y: 70 },
  noor: { a: '#FF6FB5', b: '#9FE3C0', c: '#7B4DFF', x: 28, y: 36 },
};
export const auraBg = (s: AuraSeed) =>
  `radial-gradient(60% 60% at ${s.x}% ${s.y}%, ${s.c} 0%, transparent 70%), radial-gradient(80% 70% at ${100 - s.x}% ${100 - s.y}%, ${s.b} 0%, transparent 75%), ${s.a}`;

// ---------------------------------------------------------------- identity vocabulary
// Terms are a subset of public identity language; definitions are NUUKE's plain-English wording.
export type Term = { t: string; d: string };
export const GENDERS: Term[] = [
  { t: 'Woman', d: 'Someone who identifies as a woman, trans or cis.' },
  { t: 'Man', d: 'Someone who identifies as a man, trans or cis.' },
  { t: 'Non-binary', d: 'A gender outside the either/or of man and woman.' },
  { t: 'Genderfluid', d: 'A gender that moves and changes over time.' },
  { t: 'Agender', d: 'Not having a gender, or not feeling one applies.' },
  { t: 'Trans woman', d: 'A woman who was assigned male at birth.' },
  { t: 'Trans man', d: 'A man who was assigned female at birth.' },
  { t: 'Genderqueer', d: 'A gender that sits outside or between conventional categories.' },
  { t: 'Questioning', d: 'Still working it out, and that is a complete answer.' },
];
export const SEXUALITIES: Term[] = [
  { t: 'Straight', d: 'Attracted to people of a different gender.' },
  { t: 'Heteroflexible', d: 'Mostly straight, and open to more. The fastest-growing sexuality on Feeld in 2025.' },
  { t: 'Bisexual', d: 'Attracted to more than one gender.' },
  { t: 'Pansexual', d: 'Attraction that isn’t decided by gender.' },
  { t: 'Queer', d: 'An umbrella word many people use for identities outside the straight and cis norm.' },
  { t: 'Gay', d: 'Attracted to people of the same gender.' },
  { t: 'Lesbian', d: 'A woman or non-binary person attracted to women.' },
  { t: 'Asexual', d: 'Little or no sexual attraction. Romance and closeness can still matter a lot.' },
  { t: 'Demisexual', d: 'Attraction that only grows after an emotional bond.' },
  { t: 'Curious', d: 'Open to finding out. No label needed yet.' },
];
export const STYLES: Term[] = [
  { t: 'Monogamous', d: 'One partner at a time, by agreement.' },
  { t: 'Ethically non-monogamous', d: 'More than one relationship, with everyone’s knowledge and consent.' },
  { t: 'Polyamorous', d: 'More than one loving relationship at once, openly.' },
  { t: 'Open relationship', d: 'A committed couple who agree to see other people.' },
  { t: 'Relationship anarchy', d: 'No default rules or rankings: each relationship is shaped by the people in it.' },
  { t: 'Exploring', d: 'Not decided. Finding out what fits.' },
];
// Clean sample wording for what someone is looking for (Feeld lists 50+ desires; these are ours).
export const LOOKING: Term[] = [
  { t: 'Conversation first', d: 'Talk before anything else.' },
  { t: 'Dates', d: 'Meeting up and seeing where it goes.' },
  { t: 'Slow burn', d: 'No rush. Trust first.' },
  { t: 'Something long-term', d: 'Looking for a partner to build with.' },
  { t: 'Something casual', d: 'Light, honest and low pressure.' },
  { t: 'Exploring as a couple', d: 'Meeting people together, with a partner.' },
  { t: 'New friends', d: 'Company, community and people who get it.' },
  { t: 'Not sure yet', d: 'Curious. That’s the point.' },
];
// Relationship descriptors for linked profiles (a clean subset of the 20+ Feeld lists).
export const RELS = ['Partner', 'Nesting partner', 'Married', 'Engaged', 'Dating', 'Friend', 'Metamour', 'Queerplatonic partner'];

// Words for the opening marquee.
export const MARQUEE = ['Curious', 'Non-binary', 'Heteroflexible', 'Polyamorous', 'Pansexual', 'Nesting partner', 'Genderfluid', 'Queer', 'Monogamous', 'Asexual', 'Metamour', 'Exploring', 'Bisexual', 'Queerplatonic', 'Agender', 'Open', 'Demisexual', 'Questioning'];

// ---------------------------------------------------------------- 3D wireframe layers (profile screen)
const V = 'viewBox="0 0 375 804" xmlns="http://www.w3.org/2000/svg"';
const F = 'font-family="Inter,Helvetica,Arial,sans-serif"';
const auraDefs = `<defs>
  <radialGradient id="fdl-a" cx="38%" cy="34%" r="70%"><stop offset="0" stop-color="#FFC9A3"/><stop offset=".45" stop-color="#FF6FB5"/><stop offset="1" stop-color="#7B4DFF"/></radialGradient>
  <linearGradient id="fdl-b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7B4DFF"/><stop offset=".5" stop-color="#E85CB0"/><stop offset="1" stop-color="#FF664E"/></linearGradient>
  <filter id="fdl-blur"><feGaussianBlur stdDeviation="10"/></filter>
</defs>`;

export const feeldLayers = [
  {
    label: 'Layout grid',
    desc: '4-column grid, 20pt margins and an 8pt rhythm. The profile is three stacked layers: public, chosen, mutual.',
    svg: `<svg ${V}><rect width="375" height="804" fill="#0E0B12"/>
      <g fill="#C7B6FF" opacity=".1">${[0, 1, 2, 3].map((i) => `<rect x="${20 + i * 87.5}" y="0" width="73" height="804"/>`).join('')}</g>
      <g stroke="#C7B6FF" stroke-opacity=".16">${Array.from({ length: 101 }, (_, i) => `<line x1="0" x2="375" y1="${i * 8}" y2="${i * 8}"/>`).join('')}</g>
      <rect x="0" y="0" width="375" height="54" fill="#FF5A3C" opacity=".2"/><rect x="0" y="718" width="375" height="86" fill="#FF5A3C" opacity=".2"/>
      <g ${F} font-size="11" fill="#FFB8A3"><text x="20" y="40">SAFE AREA 54pt</text><text x="20" y="742">ACTIONS 86pt</text>
      <text x="250" y="330">PUBLIC</text><text x="250" y="520">CHOSEN</text><text x="250" y="640">MUTUAL</text></g></svg>`,
  },
  {
    label: 'Wireframe',
    desc: 'Hierarchy first: one portrait, identity in their words, then the layers that open with consent, each labelled with who can see it.',
    svg: `<svg ${V}><g fill="none" stroke="#D9CFE6" stroke-width="2">
      <rect x="20" y="64" width="335" height="250" rx="26"/><line x1="20" y1="64" x2="355" y2="314"/><line x1="355" y1="64" x2="20" y2="314"/>
      <rect x="20" y="330" width="150" height="20" rx="6"/><rect x="20" y="360" width="80" height="26" rx="13"/><rect x="108" y="360" width="100" height="26" rx="13"/><rect x="216" y="360" width="90" height="26" rx="13"/>
      <rect x="20" y="400" width="335" height="70" rx="16"/>
      <rect x="20" y="484" width="335" height="84" rx="16" stroke-dasharray="6 5"/>
      <rect x="20" y="582" width="104" height="104" rx="16" stroke-dasharray="6 5"/><rect x="135" y="582" width="104" height="104" rx="16" stroke-dasharray="6 5"/><rect x="250" y="582" width="104" height="104" rx="16" stroke-dasharray="6 5"/>
      <circle cx="120" cy="752" r="26"/><circle cx="188" cy="752" r="32"/><circle cx="256" cy="752" r="26"/></g></svg>`,
  },
  {
    label: 'Content & language',
    desc: 'Real copy in the member’s own words. Identity chips are plural, never a binary. Every hidden layer says why it is hidden.',
    svg: `<svg ${V}><g ${F} fill="#F5F0EA">
      <text x="20" y="346" font-size="22" font-weight="800">Sam, 34</text>
      <text x="28" y="378" font-size="12">Non-binary</text><text x="116" y="378" font-size="12">Pansexual</text><text x="224" y="378" font-size="12">Polyamorous</text>
      <text x="34" y="426" font-size="13">Ceramics on Sundays, terrible at karaoke,</text><text x="34" y="446" font-size="13">great at listening.</text>
      <text x="34" y="510" font-size="11" fill="#B8AEC4" letter-spacing="1.5">HIDDEN BIO</text><text x="34" y="534" font-size="13">Opens when you like or Ping Sam.</text>
      <text x="34" y="604" font-size="11" fill="#B8AEC4" letter-spacing="1.5">PRIVATE PHOTOS</text>
      <text x="34" y="662" font-size="12">Only for connections</text></g></svg>`,
  },
  {
    label: 'Colour & aura',
    desc: 'Ink and bone carry the UI. The aura gradient is reserved for emotive moments: the portrait, a like, a mutual connection.',
    svg: `<svg ${V}>${auraDefs}
      <rect x="20" y="64" width="335" height="250" rx="26" fill="url(#fdl-a)"/>
      <rect x="20" y="360" width="80" height="26" rx="13" fill="#221A2B"/><rect x="108" y="360" width="100" height="26" rx="13" fill="#221A2B"/><rect x="216" y="360" width="90" height="26" rx="13" fill="#221A2B"/>
      <rect x="20" y="400" width="335" height="70" rx="16" fill="#17121D"/>
      <rect x="20" y="484" width="335" height="84" rx="16" fill="#17121D" stroke="#7B4DFF" stroke-width="1.5"/>
      <g filter="url(#fdl-blur)"><rect x="20" y="582" width="104" height="104" rx="16" fill="#FF6FB5"/><rect x="135" y="582" width="104" height="104" rx="16" fill="#7B4DFF"/><rect x="250" y="582" width="104" height="104" rx="16" fill="#FF9E7A"/></g>
      <circle cx="120" cy="752" r="26" fill="#221A2B"/><circle cx="188" cy="752" r="32" fill="url(#fdl-b)"/><circle cx="256" cy="752" r="26" fill="#221A2B"/></svg>`,
  },
  {
    label: 'Consent & motion',
    desc: 'Locks lift only on a mutual yes. The reveal breathes in over 5.5 s, the like button beats once, and nothing ever moves on its own twice.',
    svg: `<svg ${V}><g fill="none" stroke="#FF9E7A" stroke-width="2" stroke-dasharray="5 4">
      <rect x="20" y="484" width="335" height="84" rx="16"/><rect x="20" y="582" width="334" height="104" rx="16"/></g>
      <g ${F} font-size="11" fill="#FF9E7A"><text x="150" y="500">unlock · on mutual like</text><text x="150" y="702">blur 24px → 0 · breath 5.5 s</text>
      <text x="214" y="736">heartbeat · once</text></g>
      <circle cx="188" cy="752" r="44" fill="none" stroke="#FF6FB5" stroke-width="2"/><circle cx="188" cy="752" r="56" fill="none" stroke="#FF6FB5" stroke-opacity=".4" stroke-width="2"/>
      <g fill="#F5F0EA"><rect x="176" y="514" width="22" height="18" rx="4"/><path d="M180 514 v-6 a7 7 0 0 1 14 0 v6" fill="none" stroke="#F5F0EA" stroke-width="2.5"/></g></svg>`,
  },
];
