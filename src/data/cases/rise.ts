// SVG artwork for the RISE exploded-layer 3D view (one screen, five design layers).
const V = 'viewBox="0 0 375 804" xmlns="http://www.w3.org/2000/svg"';
const curve = 'M 20 520 C 60 520, 70 380, 120 360 S 175 470, 205 470 S 260 330, 300 350 S 340 450, 355 470';

export const riseLayers = [
  {
    label: 'Layout grid',
    desc: '4-column grid, 20pt margins, 8pt rhythm and safe areas for the island and home indicator.',
    svg: `<svg ${V}><rect width="375" height="804" fill="#100e24"/>
      <g fill="#7b61ff" opacity=".12">${[0, 1, 2, 3].map((i) => `<rect x="${20 + i * 87.5}" y="0" width="73" height="804"/>`).join('')}</g>
      <g stroke="#7b61ff" stroke-opacity=".18">${Array.from({ length: 100 }, (_, i) => `<line x1="0" x2="375" y1="${i * 8}" y2="${i * 8}"/>`).join('')}</g>
      <rect x="0" y="0" width="375" height="54" fill="#ff2e88" opacity=".18"/><rect x="0" y="770" width="375" height="34" fill="#ff2e88" opacity=".18"/>
      <text x="20" y="40" fill="#ff7ab0" font-family="monospace" font-size="11">SAFE AREA 54pt</text></svg>`,
  },
  {
    label: 'Wireframe',
    desc: 'Grey-box hierarchy: one hero number, the 24-hour curve, then the next three actions.',
    svg: `<svg ${V}><g fill="none" stroke="#cfcbe8" stroke-width="2">
      <rect x="20" y="70" width="140" height="18" rx="4"/><rect x="20" y="100" width="230" height="44" rx="6"/>
      <rect x="20" y="320" width="335" height="200" rx="18"/><rect x="20" y="545" width="335" height="64" rx="16"/>
      <rect x="20" y="620" width="160" height="64" rx="16"/><rect x="195" y="620" width="160" height="64" rx="16"/>
      <rect x="20" y="712" width="335" height="56" rx="18"/></g>
      <g stroke="#cfcbe8" stroke-width="1.5"><line x1="20" y1="320" x2="355" y2="520"/><line x1="355" y1="320" x2="20" y2="520"/></g></svg>`,
  },
  {
    label: 'Content & data',
    desc: 'Real copy and live data: energy now, peak countdown, sleep debt, the caffeine cut-off.',
    svg: `<svg ${V}><g font-family="Inter,Arial" fill="#fff">
      <text x="20" y="84" font-size="13" letter-spacing="2" fill="#b9b3e8">ENERGY · TUESDAY</text>
      <text x="20" y="136" font-size="40" font-weight="800">Peak in 42m</text>
      <text x="20" y="168" font-size="15" fill="#b9b3e8">Sleep debt 3h 20m · below 5h target</text>
      <path d="${curve}" fill="none" stroke="#fff" stroke-width="3" stroke-dasharray="6 6"/>
      <text x="40" y="575" font-size="15" font-weight="700">Caffeine cut-off</text><text x="40" y="597" font-size="13" fill="#b9b3e8">2:15 pm · 3h 05m from now</text>
      <text x="36" y="650" font-size="13" font-weight="700">Melatonin</text><text x="36" y="670" font-size="12" fill="#b9b3e8">10:05 pm</text>
      <text x="211" y="650" font-size="13" font-weight="700">Afternoon dip</text><text x="211" y="670" font-size="12" fill="#b9b3e8">2:30 pm</text></g></svg>`,
  },
  {
    label: 'Colour & type',
    desc: 'Night-sky indigo base, warm peach for energy peaks, violet for dips. Montserrat numbers.',
    svg: `<svg ${V}><defs><linearGradient id="c" x1="0" x2="1"><stop offset="0" stop-color="#7b61ff"/><stop offset=".35" stop-color="#ffb27a"/><stop offset=".55" stop-color="#7b61ff"/><stop offset=".8" stop-color="#ffb27a"/><stop offset="1" stop-color="#7b61ff"/></linearGradient>
      <linearGradient id="f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffb27a" stop-opacity=".35"/><stop offset="1" stop-color="#ffb27a" stop-opacity="0"/></linearGradient></defs>
      <rect x="20" y="320" width="335" height="200" rx="18" fill="#1d1940"/>
      <path d="${curve} L 355 520 L 20 520 Z" fill="url(#f)"/><path d="${curve}" fill="none" stroke="url(#c)" stroke-width="7" stroke-linecap="round"/>
      <rect x="20" y="545" width="335" height="64" rx="16" fill="#241f50"/><rect x="20" y="620" width="160" height="64" rx="16" fill="#241f50"/><rect x="195" y="620" width="160" height="64" rx="16" fill="#241f50"/>
      <rect x="20" y="712" width="335" height="56" rx="18" fill="#7b61ff"/></svg>`,
  },
  {
    label: 'Motion & states',
    desc: 'The “now” marker breathes, peaks glow, and the curve redraws when last night’s sleep syncs.',
    svg: `<svg ${V}><circle cx="120" cy="360" r="26" fill="#ffb27a" opacity=".25"/><circle cx="120" cy="360" r="12" fill="#fff"/>
      <g fill="none" stroke="#ffb27a" stroke-width="2" stroke-dasharray="4 5"><circle cx="120" cy="360" r="40"/></g>
      <g font-family="monospace" font-size="11" fill="#ffb27a"><text x="150" y="300">breathe · 2.4s ease-in-out</text><line x1="148" y1="304" x2="128" y2="348" stroke="#ffb27a"/>
      <text x="200" y="560">spring 0.6 / 280</text></g></svg>`,
  },
];
