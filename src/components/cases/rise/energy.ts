// A smooth, illustrative 24-hour energy curve (06:00 → 22:00) shared by the
// RISE opening and hero. Values are 0..1 and purely illustrative: they sketch the
// shape Rise describes (grogginess, morning peak, afternoon dip, evening peak,
// Melatonin Window), not anyone's real data.
export const DAY_START = 6;
export const DAY_END = 22;
export const VB_W = 1000;
export const VB_H = 300;

const PTS: [number, number][] = [
  [4.5, 0.16],
  [6, 0.2],
  [7, 0.25],
  [8.2, 0.46],
  [9.2, 0.7],
  [10.38, 0.88],
  [11.6, 0.79],
  [13.1, 0.57],
  [14.8, 0.38],
  [16.3, 0.54],
  [18, 0.72],
  [19.2, 0.66],
  [20.4, 0.45],
  [21.3, 0.29],
  [22, 0.2],
  [23.5, 0.12],
];

/** Monotone-ish cubic Hermite through PTS (C1 smooth). */
export function energyAt(h: number): number {
  let i = 1;
  while (i < PTS.length - 2 && h > PTS[i + 1][0]) i++;
  const [x0, y0] = PTS[i - 1];
  const [x1, y1] = PTS[i];
  const [x2, y2] = PTS[i + 1];
  const [x3, y3] = PTS[i + 2];
  const dx = x2 - x1;
  const m1 = ((y2 - y0) / (x2 - x0)) * dx;
  const m2 = ((y3 - y1) / (x3 - x1)) * dx;
  const t = Math.max(0, Math.min(1, (h - x1) / dx));
  const t2 = t * t;
  const t3 = t2 * t;
  return (2 * t3 - 3 * t2 + 1) * y1 + (t3 - 2 * t2 + t) * m1 + (-2 * t3 + 3 * t2) * y2 + (t3 - t2) * m2;
}

export const xAt = (h: number) => ((h - DAY_START) / (DAY_END - DAY_START)) * VB_W;
export const yAt = (v: number) => VB_H - 18 - v * 262;

export function curveD(step = 0.08): string {
  let d = '';
  for (let h = DAY_START; h <= DAY_END + 1e-6; h += step) {
    d += `${d ? 'L' : 'M'}${xAt(h).toFixed(1)} ${yAt(energyAt(h)).toFixed(1)}`;
  }
  return d;
}

export function areaD(step = 0.08): string {
  return `${curveD(step)}L${VB_W} ${VB_H}L0 ${VB_H}Z`;
}

export const fmt = (h: number) => {
  const total = Math.round(h * 60);
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
};
