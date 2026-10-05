// NUUKE sound effects for the homepage journey (rocket rumble, whooshes, warp).
// Pure Web Audio synthesis (noise buffers, filters, oscillators, a soft saturator and a
// generated room), no audio files. Everything shares the score's AudioContext and only
// sounds while the visitor has sound on (audio.isOn()); otherwise every call is a cheap no-op.
//
// Graph: voices → bus → high-pass 28 Hz → glue compressor → limiter → out → speakers
//                 ↘ room send → convolver ↗
// The bus sits under the score as background: limiter ceiling around -12 dBFS, typical
// effects 6 to 12 dB under the music, the flight bed far below that.

import { getContext, isOn, isStarting, onChange, duck } from './audio';

type Ctx = BaseAudioContext;
type Bus = {
  c: Ctx;
  in: GainNode; // dry input for voices
  room: GainNode; // reverb send
  out: GainNode; // master for the effects (mute on sound off / hidden tab)
  white: AudioBuffer;
  brown: AudioBuffer;
  curve: Float32Array<ArrayBuffer>;
};

/** Input trim (voices are written hot, then trimmed into the glue compressor). */
const TRIM = 0.22;
/**
 * Output level after the limiter. The browser compressor adds automatic makeup gain
 * (about +3.4 dB for the limiter settings below), so this puts the limiter ceiling near -12 dBFS.
 */
const LEVEL = 0.34;

let bus: Bus | null = null;
const last: Record<string, number> = {};

// ---------- setup ----------

function noise(c: Ctx, seconds: number, brown: boolean) {
  const len = Math.floor(c.sampleRate * seconds);
  const fade = Math.floor(c.sampleRate * 0.25);
  const buf = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    const tmp = new Float32Array(len + fade);
    let b = 0;
    for (let i = 0; i < tmp.length; i++) {
      const w = Math.random() * 2 - 1;
      if (brown) {
        b = (b + 0.02 * w) / 1.02;
        tmp[i] = b * 3.5;
      } else tmp[i] = w;
    }
    // crossfade the overhang into the head so the loop point is seamless
    for (let i = 0; i < len; i++) {
      d[i] = i < fade ? tmp[i] * (i / fade) + tmp[len + i] * (1 - i / fade) : tmp[i];
    }
  }
  return buf;
}

function roomImpulse(c: Ctx, seconds = 2.2) {
  const len = Math.floor(c.sampleRate * seconds);
  const buf = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let lp = 0;
    for (let i = 0; i < len; i++) {
      const x = i / len;
      const k = 0.55 - 0.45 * x; // the tail darkens as it decays
      lp += k * (Math.random() * 2 - 1 - lp);
      d[i] = lp * Math.pow(1 - x, 2.4) * (i < 400 ? i / 400 : 1);
    }
  }
  return buf;
}

function satCurve() {
  const n = 1024;
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    curve[i] = Math.tanh(2.2 * x) / Math.tanh(2.2);
  }
  return curve;
}

const live = () => isOn() && !document.hidden;

function setup(c: Ctx): Bus {
  const input = c.createGain();
  input.gain.value = TRIM;
  const hp = c.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 28;
  hp.Q.value = 0.6;
  const glue = c.createDynamicsCompressor();
  glue.threshold.value = -18;
  glue.knee.value = 8;
  glue.ratio.value = 3;
  glue.attack.value = 0.012;
  glue.release.value = 0.3;
  const limit = c.createDynamicsCompressor();
  limit.threshold.value = -6;
  limit.knee.value = 0;
  limit.ratio.value = 20;
  limit.attack.value = 0.001;
  limit.release.value = 0.12;
  const out = c.createGain();
  out.gain.value = live() ? LEVEL : 0;
  input.connect(hp).connect(glue).connect(limit).connect(out).connect(c.destination);

  const room = c.createGain();
  const verb = c.createConvolver();
  verb.buffer = roomImpulse(c);
  const ret = c.createGain();
  ret.gain.value = 0.55;
  room.connect(verb).connect(ret).connect(input);

  const b: Bus = {
    c,
    in: input,
    room,
    out,
    white: noise(c, 2, false),
    brown: noise(c, 4, true),
    curve: satCurve(),
  };
  document.addEventListener('visibilitychange', () => {
    b.out.gain.setTargetAtTime(live() ? LEVEL : 0, c.currentTime, document.hidden ? 0.05 : 0.3);
    if (!document.hidden) applyThrust(true);
  });
  return b;
}

/** The bus when sound is on and the tab is visible, else null. */
function ready(): Bus | null {
  if (!live()) return null;
  const c = getContext();
  if (!c) return null;
  if (!bus || bus.c !== c) {
    for (const k in last) delete last[k];
    bed = null;
    applied = -1;
    riser = null;
    bus = setup(c);
  }
  return bus;
}

/**
 * Calls made in the same click that turns sound on arrive before the score has started
 * (enable() is async). Hold those briefly and play them, late by `late` seconds, once it is on.
 */
const queued: { run: (late: number) => void; at: number }[] = [];
function later(run: (late: number) => void) {
  if (isOn() || !isStarting() || document.hidden || queued.length > 4) return;
  queued.push({ run, at: performance.now() });
}

/** Rate limit per effect; returns false when `key` fired less than `gap` s ago. */
function gate(b: Bus, key: string, gap: number) {
  const t = b.c.currentTime;
  if (t - (last[key] ?? -1e9) < gap) return false;
  last[key] = t;
  return true;
}

// ---------- small builders ----------

function loop(b: Bus, buf: AudioBuffer, t: number, dur: number, rate = 1) {
  const s = b.c.createBufferSource();
  s.buffer = buf;
  s.loop = true;
  s.playbackRate.value = rate;
  s.start(t, Math.random() * (buf.duration - 0.5));
  s.stop(t + dur);
  return s;
}

function filter(b: Bus, type: BiquadFilterType, freq: number, q = 0.7) {
  const f = b.c.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  return f;
}

function gain(b: Bus, v = 0) {
  const g = b.c.createGain();
  g.gain.value = v;
  return g;
}

function osc(b: Bus, type: OscillatorType, freq: number, t: number, dur: number, detune = 0) {
  const o = b.c.createOscillator();
  o.type = type;
  o.frequency.value = freq;
  o.detune.value = detune;
  o.start(t);
  o.stop(t + dur);
  return o;
}

/** Soft saturator so sub tones grow harmonics small speakers can play. */
function shaper(b: Bus, drive: number) {
  const pre = gain(b, drive);
  const ws = b.c.createWaveShaper();
  ws.curve = b.curve;
  ws.oversample = '2x';
  pre.connect(ws);
  return { in: pre, out: ws };
}

/** Envelope: hold 0 until t, then go through [time offset, value] points (exponential where possible). */
function env(p: AudioParam, t: number, pts: [number, number][], linear = false) {
  p.setValueAtTime(pts[0][1], t + pts[0][0]);
  for (let i = 1; i < pts.length; i++) {
    const [dt, v] = pts[i];
    if (linear || v === 0 || pts[i - 1][1] === 0) p.linearRampToValueAtTime(v, t + dt);
    else p.exponentialRampToValueAtTime(v, t + dt);
  }
}

/** Random crackle: sharp amplitude pops on `p` between t0 and t1. */
function crackle(
  p: AudioParam,
  t0: number,
  t1: number,
  rate: (x: number) => number,
  amp: (x: number) => number,
  tau: number,
) {
  p.setValueAtTime(0, t0);
  let t = t0;
  for (let n = 0; n < 400; n++) {
    const x = (t - t0) / (t1 - t0);
    t += -Math.log(1 - Math.random()) / Math.max(0.5, rate(x));
    if (t >= t1) break;
    const a = amp((t - t0) / (t1 - t0)) * (0.3 + 0.7 * Math.random());
    p.setValueAtTime(a, t);
    p.setTargetAtTime(0, t + 0.0005, tau * (0.6 + 0.8 * Math.random()));
  }
}

/** Per-effect level (dB) into the bus, for the dry path and the room send. */
function voice(b: Bus, db: number) {
  const k = Math.pow(10, db / 20);
  const dry = gain(b, k);
  const room = gain(b, k);
  dry.connect(b.in);
  room.connect(b.room);
  return { in: dry, room };
}

const clamp = (v: number, a: number, z: number) => Math.min(z, Math.max(a, v));

// ---------- effects ----------

/** Ignition: engine catches and rumbles up over `seconds`; music ducks underneath. */
export function ignition(seconds = 2.2): void {
  const b = ready();
  if (!b) return later((late) => ignition(Math.max(0.6, (Number(seconds) || 2.2) - late)));
  if (!gate(b, 'ignition', 1.2)) return;
  const v = voice(b, -4);
  const D = clamp(Number(seconds) || 2.2, 0.6, 8);
  const t = b.c.currentTime + 0.02;
  const tail = 2.4;
  duck(-6, D + 0.6, 0.6, 1.8);

  // crackle and pops as the engine catches
  const cr = loop(b, b.white, t, D + 0.4);
  const crHp = filter(b, 'highpass', 1600, 0.5);
  const crBp = filter(b, 'peaking', 3200, 1);
  crBp.gain.value = 4;
  const crG = gain(b);
  crackle(crG.gain, t, t + D * 0.95, (x) => 5 + 45 * x, (x) => 0.1 * (0.4 + 0.6 * x) * (x > 0.8 ? (1 - x) * 5 : 1), 0.007);
  cr.connect(crHp).connect(crBp).connect(crG).connect(v.in);
  crG.connect(v.room);

  // low chuffs: the chamber coughing into life
  const ch = loop(b, b.white, t, D + 0.6);
  const chLp = filter(b, 'lowpass', 420, 0.9);
  const chG = gain(b);
  crackle(chG.gain, t, t + D * 0.85, (x) => 2 + 10 * x, (x) => 0.55 * (0.5 + 0.5 * x), 0.045);
  ch.connect(chLp).connect(chG).connect(v.in);

  // roar: brown noise through an opening low-pass
  const roar = loop(b, b.brown, t, D + tail + 0.1);
  const rLp = filter(b, 'lowpass', 90, 0.9);
  env(rLp.frequency, t, [[0, 90], [D, 560], [D + 0.5, 520], [D + tail, 160]]);
  const rG = gain(b);
  env(rG.gain, t, [[0, 0.0001], [D * 0.3, 0.05], [D, 0.62], [D + 0.5, 0.58], [D + tail, 0.0001]]);
  roar.connect(rLp).connect(rG).connect(v.in);
  rG.connect(v.room);

  // hiss on top of the roar, arriving late
  const hs = loop(b, b.white, t, D + tail);
  const hLp = filter(b, 'lowpass', 1400, 0.5);
  const hG = gain(b);
  env(hG.gain, t, [[0, 0.0001], [D * 0.5, 0.001], [D, 0.04], [D + 0.5, 0.035], [D + tail - 0.4, 0.0001]]);
  hs.connect(hLp).connect(hG).connect(v.in);

  // sub body: two detuned sines beating (~3 Hz throb), saturated for small speakers
  const s1 = osc(b, 'sine', 34, t, D + tail);
  const s2 = osc(b, 'sine', 37, t, D + tail);
  env(s1.frequency, t, [[0, 34], [D, 46]]);
  env(s2.frequency, t, [[0, 37], [D, 49.5]]);
  const sat = shaper(b, 1.6);
  const sLp = filter(b, 'lowpass', 260, 0.7);
  const sG = gain(b);
  env(sG.gain, t, [[0, 0.0001], [D * 0.25, 0.0001], [D, 0.34], [D + 0.5, 0.32], [D + tail, 0.0001]]);
  s1.connect(sat.in);
  s2.connect(sat.in);
  sat.out.connect(sLp).connect(sG).connect(v.in);
}

/** The moment the rocket leaves the pad: a roar that tails off as it climbs. */
export function liftoff(): void {
  const b = ready();
  if (!b) return later(() => liftoff());
  if (!gate(b, 'liftoff', 2)) return;
  const v = voice(b, -3);
  const t = b.c.currentTime + 0.02;
  const D = 4.8;
  duck(-4.5, 2.4, 0.3, 2.2);

  // main roar: swells, then the low-pass closes as it climbs away
  const roar = loop(b, b.brown, t, D + 0.1);
  const rLp = filter(b, 'lowpass', 600, 0.8);
  env(rLp.frequency, t, [[0, 600], [0.6, 1300], [1.4, 900], [D, 130]]);
  const rG = gain(b);
  env(rG.gain, t, [[0, 0.25], [0.45, 0.8], [1.1, 0.7], [D, 0.0001]]);
  roar.connect(rLp).connect(rG).connect(v.in);
  rG.connect(v.room);

  // air tearing: band-passed white that slides down
  const air = loop(b, b.white, t, D);
  const aBp = filter(b, 'bandpass', 2400, 0.6);
  env(aBp.frequency, t, [[0, 2400], [0.6, 2800], [D, 450]]);
  const aG = gain(b);
  env(aG.gain, t, [[0, 0.01], [0.5, 0.06], [1.2, 0.04], [3.4, 0.0001]]);
  air.connect(aBp).connect(aG).connect(v.in);
  aG.connect(v.room);

  // crackle thinning out
  const cr = loop(b, b.white, t, 3);
  const crHp = filter(b, 'highpass', 2000, 0.5);
  const crG = gain(b);
  crackle(crG.gain, t, t + 2.8, (x) => 40 * (1 - x) + 3, (x) => 0.07 * (1 - x), 0.006);
  cr.connect(crHp).connect(crG).connect(v.in);

  // sub kick of thrust, saturated
  const s1 = osc(b, 'sine', 52, t, 3.4);
  const s2 = osc(b, 'sine', 55, t, 3.4);
  env(s1.frequency, t, [[0, 52], [2.6, 30]]);
  env(s2.frequency, t, [[0, 55], [2.6, 32]]);
  const sat = shaper(b, 1.8);
  const sG = gain(b);
  env(sG.gain, t, [[0, 0.0001], [0.15, 0.36], [0.8, 0.28], [3.3, 0.0001]]);
  s1.connect(sat.in);
  s2.connect(sat.in);
  sat.out.connect(filter(b, 'lowpass', 240, 0.7)).connect(sG).connect(v.in);
}

// ---------- continuous flight bed ----------

type Bed = {
  srcs: AudioScheduledSourceNode[];
  lp: BiquadFilterNode;
  g: GainNode; // main level
  flutter: GainNode; // depth of the slow level movement
};
let bed: Bed | null = null;
let thrust = 0; // last requested 0..1
let applied = -1; // last value pushed to the graph
let zeroAt = 0; // context time the bed went to 0

const BED_LEVEL = 0.125;

function makeBed(b: Bus): Bed {
  const c = b.c;
  const t = c.currentTime;
  const n = c.createBufferSource();
  n.buffer = b.brown;
  n.loop = true;
  n.start(t, Math.random() * 3);
  const hp = filter(b, 'highpass', 40, 0.6);
  const lp = filter(b, 'lowpass', 160, 0.8);
  const g = gain(b, 0);
  // gentle movement: a slow wander of the filter and the level
  const m1 = c.createOscillator();
  m1.frequency.value = 0.11;
  const m1d = gain(b, 35);
  m1.connect(m1d).connect(lp.frequency);
  const m2 = c.createOscillator();
  m2.frequency.value = 0.29;
  const flutter = gain(b, 0);
  m2.connect(flutter).connect(g.gain);
  m1.start(t);
  m2.start(t);
  n.connect(hp).connect(lp).connect(g).connect(b.in);
  return { srcs: [n, m1, m2], lp, g, flutter };
}

function dropBed() {
  if (!bed) return;
  const old = bed;
  bed = null;
  applied = -1;
  const t = old.g.context.currentTime;
  old.g.gain.cancelScheduledValues(t);
  old.g.gain.setTargetAtTime(0, t, 0.15);
  old.flutter.gain.setTargetAtTime(0, t, 0.15);
  setTimeout(() => {
    old.srcs.forEach((s) => s.stop());
    old.g.disconnect();
  }, 1200);
}

function applyThrust(force = false) {
  const b = ready();
  if (!b) return;
  const v = thrust;
  if (!force && Math.abs(v - applied) < 0.01 && !(v === 0 && applied !== 0)) {
    // idle: release the bed a moment after it reached silence
    if (v === 0 && bed && b.c.currentTime - zeroAt > 2) dropBed();
    return;
  }
  if (v === 0 && !bed) return;
  if (!bed) bed = makeBed(b);
  const t = b.c.currentTime;
  const lvl = BED_LEVEL * v;
  bed.g.gain.setTargetAtTime(lvl, t, 0.35);
  bed.flutter.gain.setTargetAtTime(lvl * 0.18, t, 0.35);
  bed.lp.frequency.setTargetAtTime(140 + 300 * v, t, 0.4);
  if (v === 0 && applied !== 0) zeroAt = t;
  applied = v;
}

/** Continuous engine bed while flying, 0 = idle/silent, 1 = full thrust. Safe to call every frame. */
export function setThrust(v: number): void {
  thrust = v > 0 ? (v < 1 ? v : 1) : 0; // also maps NaN to 0
  if (!isOn()) return;
  applyThrust();
}

onChange((on) => {
  const held = queued.splice(0);
  if (on) {
    const b = ready();
    if (b) b.out.gain.setTargetAtTime(LEVEL, b.c.currentTime, 0.3);
    applyThrust(true);
    const now = performance.now();
    for (const q of held) {
      const late = (now - q.at) / 1000;
      if (late < 2.5) q.run(late);
    }
  } else if (bus) {
    bus.out.gain.setTargetAtTime(0, bus.c.currentTime, 0.2);
    dropBed();
  }
});

// ---------- transitions ----------

/** Soft air whoosh between sections, strength 0..1. */
export function whoosh(strength = 0.5): void {
  const b = ready();
  if (!b || !gate(b, 'whoosh', 0.5)) return;
  const v = voice(b, 6);
  const s = clamp(Number(strength) || 0, 0, 1);
  const t = b.c.currentTime + 0.01;
  const D = 0.8 + 0.7 * s;
  const peak = D * 0.45;
  const dir = Math.random() < 0.5 ? -1 : 1;

  const n = loop(b, b.white, t, D + 0.05);
  const bp = filter(b, 'bandpass', 320, 1.1);
  env(bp.frequency, t, [[0, 320], [peak, 800 + 1400 * s], [D, 380]]);
  const pan = b.c.createStereoPanner();
  env(pan.pan, t, [[0, -0.65 * dir], [D, 0.65 * dir]], true);
  const g = gain(b);
  env(g.gain, t, [[0, 0], [peak, 0.06 + 0.12 * s], [D, 0]], true);
  n.connect(bp).connect(g).connect(pan).connect(v.in);
  pan.connect(v.room);

  // a little body underneath
  const body = loop(b, b.brown, t, D + 0.05);
  const lp = filter(b, 'lowpass', 300, 0.7);
  const g2 = gain(b);
  env(g2.gain, t, [[0, 0], [peak, 0.08 + 0.12 * s], [D, 0]], true);
  body.connect(lp).connect(g2).connect(v.in);
}

/** Breaking through the cloud layer after lift-off. */
export function cloudPunch(): void {
  const b = ready();
  if (!b || !gate(b, 'cloud', 1)) return;
  const v = voice(b, 7.5);
  const t = b.c.currentTime + 0.01;
  const D = 1.9;

  // muffled airy burst: opens fast, closes slowly, like passing through wet air
  const air = loop(b, b.white, t, D);
  const lp = filter(b, 'lowpass', 500, 0.6);
  env(lp.frequency, t, [[0, 500], [0.12, 2600], [D, 300]]);
  const g = gain(b);
  env(g.gain, t, [[0, 0], [0.08, 0.1], [0.3, 0.06], [D, 0.0001]]);
  air.connect(lp).connect(g).connect(v.in);
  g.connect(v.room);

  const body = loop(b, b.brown, t, D);
  const blp = filter(b, 'lowpass', 280, 0.7);
  const bg = gain(b);
  env(bg.gain, t, [[0, 0], [0.06, 0.45], [D * 0.7, 0.0001]]);
  body.connect(blp).connect(bg).connect(v.in);

  // soft thoomp
  const o = osc(b, 'sine', 82, t, 0.7);
  env(o.frequency, t, [[0, 82], [0.35, 40]]);
  const sat = shaper(b, 1.2);
  const og = gain(b);
  env(og.gain, t, [[0, 0], [0.01, 0.22], [0.6, 0.0001]]);
  o.connect(sat.in);
  sat.out.connect(og).connect(v.in);
}

/** Warp riser output and when it ends, so warpDrop() can cut it. */
let riser: { g: GainNode; srcs: AudioScheduledSourceNode[]; end: number } | null = null;

/** Warp jump before the finale: riser, then a deep boom on `drop()`. */
export function warp(): void {
  const b = ready();
  if (!b || !gate(b, 'warp', 1)) return;
  const v = voice(b, 3);
  const t = b.c.currentTime + 0.01;
  const D = 1.25;
  const end = t + D + 0.35;
  duck(-4, D, 0.8, 1.4);
  const out = gain(b, 1);
  out.connect(v.in);
  out.connect(v.room);
  const srcs: AudioScheduledSourceNode[] = [];

  // tonal sweep: detuned saws through a resonant low-pass that opens
  const lp = filter(b, 'lowpass', 300, 5);
  env(lp.frequency, t, [[0, 300], [D, 5200]]);
  const tg = gain(b);
  env(tg.gain, t, [[0, 0.0015], [D, 0.05], [D + 0.3, 0.0001]]);
  for (const cents of [-11, 0, 11]) {
    const o = osc(b, 'sawtooth', 110, t, D + 0.35, cents);
    env(o.frequency, t, [[0, 110], [D, 880]]);
    o.connect(lp);
    srcs.push(o);
  }
  lp.connect(tg).connect(out);

  // shimmer: high noise with a tremolo that speeds up
  const n = loop(b, b.white, t, D + 0.35);
  const bp = filter(b, 'bandpass', 3500, 2.5);
  env(bp.frequency, t, [[0, 3500], [D, 9500]]);
  const trem = gain(b, 0.5);
  const lfo = osc(b, 'sine', 9, t, D + 0.35);
  env(lfo.frequency, t, [[0, 9], [D, 26]]);
  const lfoD = gain(b, 0.5);
  lfo.connect(lfoD).connect(trem.gain);
  const sg = gain(b);
  env(sg.gain, t, [[0, 0.002], [D, 0.11], [D + 0.3, 0.0001]]);
  n.connect(bp).connect(trem).connect(sg).connect(out);
  srcs.push(n, lfo);

  // sub swell under it
  const s = osc(b, 'sine', 38, t, D + 0.35);
  env(s.frequency, t, [[0, 38], [D, 58]]);
  const sat = shaper(b, 1.4);
  const ssg = gain(b);
  env(ssg.gain, t, [[0, 0.0001], [D, 0.2], [D + 0.3, 0.0001]]);
  s.connect(sat.in);
  sat.out.connect(ssg).connect(out);
  srcs.push(s);

  riser = { g: out, srcs, end };
}

export function warpDrop(): void {
  const b = ready();
  if (!b || !gate(b, 'drop', 1)) return;
  const v = voice(b, -2);
  const t = b.c.currentTime + 0.01;
  if (riser && riser.end > t) {
    riser.g.gain.setTargetAtTime(0, t, 0.025);
    riser.srcs.forEach((s) => s.stop(t + 0.25));
  }
  riser = null;
  duck(-6, 0.5, 0.03, 2.4);

  // deep boom: a sine falling from 68 to 26 Hz, saturated so laptops hear its harmonics
  const o = osc(b, 'sine', 68, t, 2.8);
  env(o.frequency, t, [[0, 68], [1.2, 26]]);
  const sat = shaper(b, 2.2);
  const lp = filter(b, 'lowpass', 200, 0.7);
  const g = gain(b);
  env(g.gain, t, [[0, 0], [0.008, 0.5], [0.35, 0.32], [2.7, 0.0001]]);
  o.connect(sat.in);
  sat.out.connect(lp).connect(g).connect(v.in);
  g.connect(v.room);

  // impact body
  const n = loop(b, b.brown, t, 1.4);
  const nlp = filter(b, 'lowpass', 420, 0.8);
  env(nlp.frequency, t, [[0, 420], [1.2, 110]]);
  const ng = gain(b);
  env(ng.gain, t, [[0, 0], [0.01, 0.6], [1.3, 0.0001]]);
  n.connect(nlp).connect(ng).connect(v.in);
  ng.connect(v.room);

  // the crack of air at the front
  const a = loop(b, b.white, t, 0.5);
  const alp = filter(b, 'lowpass', 2400, 0.6);
  const ag = gain(b);
  env(ag.gain, t, [[0, 0], [0.004, 0.06], [0.4, 0.0001]]);
  a.connect(alp).connect(ag).connect(v.in);
  ag.connect(v.room);
}

/** The rocket settles into the logo: low thump and shimmer. */
export function land(): void {
  const b = ready();
  if (!b || !gate(b, 'land', 1.5)) return;
  const v = voice(b, 6);
  const t = b.c.currentTime + 0.01;

  // soft low thump
  const o = osc(b, 'sine', 96, t, 1);
  env(o.frequency, t, [[0, 96], [0.25, 48]]);
  const sat = shaper(b, 1.1);
  const g = gain(b);
  env(g.gain, t, [[0, 0], [0.012, 0.26], [0.9, 0.0001]]);
  o.connect(sat.in);
  sat.out.connect(g).connect(v.in);

  const puff = loop(b, b.brown, t, 0.8);
  const plp = filter(b, 'lowpass', 360, 0.7);
  const pg = gain(b);
  env(pg.gain, t, [[0, 0], [0.02, 0.3], [0.7, 0.0001]]);
  puff.connect(plp).connect(pg).connect(v.in);

  // gentle high shimmer: airy noise band plus a scatter of tiny glints (unpitched enough
  // to sit with any chord in the score)
  const n = loop(b, b.white, t, 2.8);
  const bp = filter(b, 'bandpass', 7200, 1.6);
  const ng = gain(b);
  env(ng.gain, t, [[0, 0], [0.3, 0.035], [2.7, 0]], true);
  n.connect(bp).connect(ng).connect(v.in);
  ng.connect(v.room);

  const glints = gain(b, 1);
  glints.connect(v.in);
  glints.connect(v.room);
  for (let i = 0; i < 12; i++) {
    const at = t + 0.08 + Math.pow(Math.random(), 1.6) * 1.6;
    const p = osc(b, 'sine', 3200 + Math.random() * 4800, at, 0.4);
    const pan = b.c.createStereoPanner();
    pan.pan.value = Math.random() * 1.6 - 0.8;
    const pgn = gain(b);
    env(pgn.gain, at, [[0, 0], [0.003, 0.012 + Math.random() * 0.012], [0.35, 0.00001]]);
    p.connect(pgn).connect(pan).connect(glints);
  }
}
