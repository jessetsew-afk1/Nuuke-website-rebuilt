// NUUKE score engine.
// One track per page (public/audio/score.mp3 or ambient.mp3, normalised to about -18 LUFS) played through Web Audio:
//   deck A/B (for crossfades) → low-pass filter → dry + reverb → master → duck → out.
// Scroll drives "intensity": the filter opens, the room tightens and the level rises,
// so the strings sit softly behind the page at the top and come forward as you go deeper.
// It stays background music: never louder than ~0.37 and never filtered below ~1.8 kHz.
// Sound effects (sfx.ts) share the same AudioContext (`getContext()`) and can dip the
// score underneath them with `duck()`.
// Browsers only allow sound after a tap/click/key, so `enable()` must run inside one.

// The homepage journey (body[data-score="custom"]) plays the orchestral score;
// every other page plays a calmer ambient track. Each keeps its own playback position.
const TRACKS = {
  // Violins, 2:26: strings are in by 16 s, fade-out starts at 136 s, strongest passage 96 to 102 s.
  score: { src: '/audio/score.mp3', loopIn: 16, loopOut: 134, climax: 92 },
  // Ambient, 2:33: full texture from 24 s, breakdown at 120 s, fade-out from 146 s.
  ambient: { src: '/audio/ambient.mp3', loopIn: 24, loopOut: 144, climax: 24 },
};
const TRACK = typeof document !== 'undefined' && document.body?.dataset.score === 'custom' ? TRACKS.score : TRACKS.ambient;
const SRC = TRACK.src;
const LOOP_IN = TRACK.loopIn;
const LOOP_OUT = TRACK.loopOut;
const CLIMAX = TRACK.climax;
const KEY_PREF = 'nuuke:sound';
const KEY_TIME = TRACK === TRACKS.score ? 'nuuke:sound-t' : 'nuuke:sound-t-ambient';

type Deck = { el: HTMLAudioElement; gain: GainNode };

let ctx: AudioContext | null = null;
let decks: Deck[] = [];
let live = 0;
let filter: BiquadFilterNode;
let dry: GainNode;
let wet: GainNode;
let master: GainNode;
let ducker: GainNode;
let duckLevel = 1;
let duckEnd = 0;
let intensity = 0.15;
let enabled = false;
let starting = false;
let fading = false;
const listeners = new Set<(on: boolean) => void>();

const store = {
  get(k: string, s: Storage = localStorage) {
    try {
      return s.getItem(k);
    } catch {
      return null;
    }
  },
  set(k: string, v: string, s: Storage = localStorage) {
    try {
      s.setItem(k, v);
    } catch {}
  },
};

/** Did the visitor choose sound earlier (this browser)? */
export const prefersSound = () => store.get(KEY_PREF) === 'on';
export const isOn = () => enabled;
/** True while enable() is waiting for the context and the first play() to start. */
export const isStarting = () => starting;
export const onChange = (fn: (on: boolean) => void) => (listeners.add(fn), () => listeners.delete(fn));
const emit = () => listeners.forEach((f) => f(enabled));

function impulse(c: AudioContext, seconds = 3.2, decay = 2.6) {
  const len = Math.floor(c.sampleRate * seconds);
  const buf = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  return buf;
}

function build() {
  ctx = new AudioContext();
  filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.Q.value = 0.6;
  dry = ctx.createGain();
  wet = ctx.createGain();
  master = ctx.createGain();
  master.gain.value = 0;
  const verb = ctx.createConvolver();
  verb.buffer = impulse(ctx);
  filter.connect(dry).connect(master);
  filter.connect(verb).connect(wet).connect(master);
  ducker = ctx.createGain();
  master.connect(ducker).connect(ctx.destination);
  decks = [0, 1].map(() => {
    const el = new Audio();
    el.src = SRC;
    el.preload = 'auto';
    el.crossOrigin = 'anonymous';
    const gain = ctx!.createGain();
    gain.gain.value = 0;
    ctx!.createMediaElementSource(el).connect(gain).connect(filter);
    el.addEventListener('timeupdate', () => {
      if (decks[live]?.el === el && el.currentTime > LOOP_OUT && !fading) jumpTo(LOOP_IN, 3);
    });
    return { el, gain };
  });
  apply(true);
  document.addEventListener('visibilitychange', () => {
    if (!enabled || !ctx) return;
    const t = ctx.currentTime;
    master.gain.setTargetAtTime(document.hidden ? 0 : level(), t, 0.25);
    if (document.hidden) setTimeout(() => document.hidden && decks[live].el.pause(), 900);
    else decks[live].el.play().catch(() => {});
  });
  setInterval(() => enabled && store.set(KEY_TIME, String(decks[live].el.currentTime), sessionStorage), 1000);
}

// Background level: about 3 dB under the first cut of the score (0.22..0.52).
const level = () => 0.2 + 0.24 * Math.pow(intensity, 0.8);

/** Push the current intensity into the audio graph. */
function apply(now = false) {
  if (!ctx) return;
  const t = ctx.currentTime;
  const k = now ? 0.01 : 0.35;
  const cutoff = 1800 * Math.pow(10, intensity); // ~1.8 kHz (soft, still clear) → ~18 kHz (in the room)
  filter.frequency.setTargetAtTime(cutoff, t, k);
  dry.gain.setTargetAtTime(0.75 + 0.25 * intensity, t, k);
  wet.gain.setTargetAtTime(0.35 - 0.2 * intensity, t, k);
  if (enabled && !document.hidden) master.gain.setTargetAtTime(level(), t, now ? 0.6 : k);
}

/** 0 = distant, 1 = full orchestra. Safe to call every frame. */
export function setIntensity(v: number) {
  const next = Math.min(1, Math.max(0, v));
  if (Math.abs(next - intensity) < 0.004) return;
  intensity = next;
  apply();
}

/** The shared AudioContext (null until the visitor first turns sound on). */
export const getContext = (): AudioContext | null => ctx;

/**
 * Dip the score by `db` (negative) for `hold` seconds, then let it back up smoothly.
 * Overlapping ducks merge: the deepest level and the latest end win.
 */
export function duck(db = -6, hold = 1, attack = 0.4, release = 1.2) {
  if (!ctx || !enabled) return;
  const t = ctx.currentTime;
  const g = Math.pow(10, Math.min(0, db) / 20);
  const active = t < duckEnd;
  const lvl = active ? Math.min(g, duckLevel) : g;
  const end = Math.max(t + attack + hold, active ? duckEnd : 0);
  if (active && lvl === duckLevel && end === duckEnd) return;
  const p = ducker.gain;
  p.cancelScheduledValues(t);
  p.setValueAtTime(p.value, t);
  p.setTargetAtTime(lvl, t, Math.max(0.01, attack / 3));
  p.setTargetAtTime(1, end, Math.max(0.05, release / 3));
  duckLevel = lvl;
  duckEnd = end;
}

/** Crossfade to another point in the score (e.g. the climax for a finale). */
export function jumpTo(seconds: number, fade = 2.5) {
  if (!ctx || !enabled) return;
  const from = decks[live];
  const to = decks[1 - live];
  fading = true;
  to.el.currentTime = seconds;
  to.el.play().catch(() => {});
  const t = ctx.currentTime;
  to.gain.gain.cancelScheduledValues(t);
  to.gain.gain.setValueAtTime(0, t);
  to.gain.gain.linearRampToValueAtTime(1, t + fade);
  from.gain.gain.cancelScheduledValues(t);
  from.gain.gain.setValueAtTime(from.gain.gain.value, t);
  from.gain.gain.linearRampToValueAtTime(0, t + fade);
  live = 1 - live;
  setTimeout(() => {
    from.el.pause();
    fading = false;
  }, fade * 1000 + 50);
}

/** Cue the big ending unless we're already in it. */
export function cueClimax() {
  if (!enabled) return;
  const now = decks[live].el.currentTime;
  if (now < CLIMAX - 4 || now > LOOP_OUT - 6) jumpTo(CLIMAX, 2.8);
}

/** Start the score. Call from a click/tap/key handler. */
export async function enable(from?: number) {
  starting = true;
  try {
    await boot(from);
  } finally {
    starting = false;
  }
}

async function boot(from?: number) {
  if (!ctx) build();
  await ctx!.resume();
  const start = from ?? Number(store.get(KEY_TIME, sessionStorage) || 0);
  const d = decks[live];
  d.el.currentTime = Math.max(0, start || 0);
  d.gain.gain.setValueAtTime(1, ctx!.currentTime);
  try {
    await d.el.play();
  } catch {
    return;
  }
  enabled = true;
  store.set(KEY_PREF, 'on');
  apply(true);
  emit();
}

export function disable() {
  store.set(KEY_PREF, 'off');
  if (!ctx || !enabled) {
    enabled = false;
    emit();
    return;
  }
  enabled = false;
  master.gain.setTargetAtTime(0, ctx.currentTime, 0.3);
  setTimeout(() => !enabled && decks.forEach((d) => d.el.pause()), 1400);
  emit();
}

export const toggle = () => (enabled ? disable() : enable());

/**
 * On pages after the first: if the visitor chose sound, pick the score back up
 * (where they left it) on their first tap/click/key on this page.
 */
export function resumeOnFirstGesture() {
  if (!prefersSound() || enabled) return;
  const go = () => {
    off();
    if (!enabled && prefersSound()) enable();
  };
  const evs = ['pointerdown', 'keydown'] as const;
  const off = () => evs.forEach((e) => window.removeEventListener(e, go, true));
  evs.forEach((e) => window.addEventListener(e, go, { capture: true, passive: true }));
}

/** Map page scroll depth to intensity (base..peak). */
export function followScroll(base = 0.2, peak = 0.85) {
  const update = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const p = max > 0 ? window.scrollY / max : 0;
    setIntensity(base + (peak - base) * p);
  };
  window.addEventListener('scroll', update, { passive: true });
  update();
}
