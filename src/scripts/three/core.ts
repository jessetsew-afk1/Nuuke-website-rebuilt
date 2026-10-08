// Shared Three.js stage: renderer, camera, studio lighting, resize and
// an animation loop that only runs while the canvas is on screen.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { glLostCount, noteGlLost } from '../gl-support';

export { THREE };

// ---------------------------------------------------------------- quality governor
// One governor for every stage on the page. It measures how long rendered frames really take
// (interval between consecutive rendered frames, capped at 60 fps) and steps through quality
// tiers. Down: fast (within about a second of sustained slow frames), and never undone just
// because a step showed no measurable gain (rAF intervals snap to 16.7 / 33.3 ms, so one step
// often looks like no gain; the next one does). Up: only after a long stretch of headroom, one
// tier at a time, and a probe that makes frames late is undone at once with a growing back-off.
// Tier 0 is the full look; each scene reads the current tier through onQuality().

export type Quality = {
  /** 0 = full quality ... 4 = lightest */
  tier: number;
  /** Device pixel ratio cap for this tier. */
  maxPR: number;
  /** Particle / instance budget multiplier. */
  particles: number;
  /** MSAA samples for HDR scene targets (scenes may use fewer). */
  samples: number;
  /** Optional finishing touches (heat haze, chromatic fringing, film grain). */
  extras: boolean;
};

const TIERS: Omit<Quality, 'tier'>[] = [
  { maxPR: 1.75, particles: 1, samples: 4, extras: true },
  { maxPR: 1.5, particles: 0.9, samples: 4, extras: true },
  { maxPR: 1.25, particles: 0.75, samples: 2, extras: true },
  { maxPR: 1.0, particles: 0.6, samples: 0, extras: false },
  { maxPR: 0.8, particles: 0.45, samples: 0, extras: false },
];
const MAX_TIER = TIERS.length - 1;
const FRAME_MS = 1000 / 60;
const qsFlag = (k: string) => new RegExp(`[?&]${k}(=|&|$)`).test(location.search);
const qsNum = (k: string) => {
  const m = new RegExp(`[?&]${k}=([\\d.]+)`).exec(location.search);
  return m ? parseFloat(m[1]) : null;
};

/** Phones and tablets: never heavier than the established mobile look. */
export const isLiteDevice = () => window.innerWidth < 760 || window.matchMedia('(pointer: coarse)').matches;

let gpuName = '';
/** Starting tier from the GPU name and the size of the backbuffer. */
export function tierHint(name: string, w: number, h: number, dpr: number, cores = 8, mem = 8) {
  const n = name.toLowerCase();
  let t: number;
  let discrete = false;
  if (/swiftshader|llvmpipe|softpipe|software|basic render/.test(n)) return MAX_TIER;
  if (/geforce (rtx|gtx)|nvidia rtx|quadro rtx|radeon rx|radeon pro|\brx \d{3,4}|arc\(tm\) a\d|intel\(r\) arc|apple m\d (pro|max|ultra)/.test(n)) {
    t = 0;
    discrete = true;
  } else if (/geforce|nvidia|quadro/.test(n)) t = 1; // older / entry discrete (MX, GT)
  else if (/adreno \(tm\) [7-9]\d\d|adreno [7-9]\d\d|mali-g7\d\d|mali-g[7-9]\d\b|immortalis/.test(n)) t = 2;
  else if (/mali|adreno|powervr|videocore/.test(n)) t = 3;
  else if (/intel.*(hd graphics|uhd graphics [56]\d\d)/.test(n)) t = 3; // older Intel integrated
  else t = 2; // Intel Iris / UHD, AMD Radeon Graphics / Vega, Apple M base, "Apple GPU", unknown
  if (cores <= 4) t++;
  if (mem <= 4) t++;
  // Fill rate: a high pixel ratio on a large window costs more than the GPU name suggests.
  const pr = Math.min(dpr || 1, 1.75);
  const px = w * h * pr * pr;
  if (px > (discrete ? 6.5e6 : 2.8e6)) t++;
  return Math.min(MAX_TIER, t);
}

function startTier(gl: WebGLRenderingContext | WebGL2RenderingContext, ceiling = 0) {
  try {
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    gpuName = String(gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER) || '');
  } catch {
    /* unknown GPU */
  }
  const nav = navigator as Navigator & { deviceMemory?: number };
  const t = tierHint(gpuName, window.innerWidth, window.innerHeight, window.devicePixelRatio, navigator.hardwareConcurrency || 8, nav.deviceMemory || 8);
  return Math.max(ceiling, t);
}

type QualityListener = (q: Quality) => void;
const WIN = 24; // frames per verdict (0.4 s at 60 fps, 0.8 s at 30 fps)
const gov = {
  inited: false,
  tier: 0,
  ceiling: 0, // richest tier this device may use
  pinned: false,
  listeners: new Set<QualityListener>(),
  win: new Float32Array(WIN), // rendered-frame intervals (ms)
  n: 0, // samples since the last tier change
  goodFor: 0, // ms of consecutive comfortable frames
  upWait: 8000, // ms of headroom needed before probing a richer tier
  baseCeiling: 0,
  readyAt: Infinity, // verdicts start a moment after the page has finished loading
  probeFrom: -1, // tier we stepped up from (a probe in progress), -1 = none
  probeUntil: 0,
  fails: [0, 0, 0, 0, 0], // failed probes INTO each tier
  bad: 0, // slow verdicts in a row
  frameMs: 0, // smoothed main-thread ms per tick (diagnostics)
  changes: 0,
};

const quality = (): Quality => ({ tier: gov.tier, ...TIERS[gov.tier] });

function setTier(t: number) {
  t = Math.max(gov.ceiling, Math.min(MAX_TIER, t));
  if (t === gov.tier) return;
  gov.tier = t;
  gov.n = 0;
  gov.goodFor = 0;
  gov.bad = 0;
  gov.changes++;
  const q = quality();
  gov.listeners.forEach((f) => f(q));
}

function initGovernor(gl: WebGLRenderingContext | WebGL2RenderingContext) {
  if (gov.inited) return;
  gov.inited = true;
  // After a graphics driver reset on this device, stay on the lighter tiers.
  gov.ceiling = gov.baseCeiling = isLiteDevice() || glLostCount() > 0 ? 2 : 0;
  // Page start-up (script evaluation, first compiles, fonts) says nothing about the steady frame
  // rate: no verdicts until a second after the load event.
  const loaded = () => (gov.readyAt = performance.now() + 1000);
  if (document.readyState === 'complete') loaded();
  else window.addEventListener('load', loaded, { once: true });
  const forced = qsNum('q');
  if (forced !== null) {
    gov.pinned = true;
    gov.tier = Math.max(0, Math.min(MAX_TIER, Math.round(forced)));
    startTier(gl); // still read the GPU name (diagnostics)
  } else gov.tier = startTier(gl, gov.ceiling);
}

/** Feed one rendered-frame interval (only between two consecutive rendered ticks). */
function govSample(ms: number, now: number) {
  if (gov.pinned || now < gov.readyAt) return;
  if (ms > 200) return; // a pause or a one-off stall, not a trend
  gov.win[gov.n % WIN] = Math.min(ms, 50);
  gov.n++;
  if (gov.n < WIN || gov.n % 8 !== 0) return;
  let sum = 0;
  let late = 0;
  for (let i = 0; i < WIN; i++) {
    sum += gov.win[i];
    // 28 ms, not 25: on a 75 Hz screen the 60 fps cap leaves one 26.7 ms gap in every four.
    if (gov.win[i] > 28) late++;
  }
  const mean = sum / WIN;
  if (gov.probeFrom >= 0) {
    // A probe of a richer tier is running: undo it at the first sign of trouble.
    if (mean > 18.2 || late > 2) {
      const into = gov.tier;
      gov.fails[into]++;
      gov.upWait = Math.min(120000, gov.upWait * 2);
      gov.probeFrom = -1;
      // Three failed probes into a tier: stay out of it for this visit.
      if (gov.fails[into] >= 3) gov.ceiling = Math.max(gov.ceiling, into + 1);
      setTier(into + 1);
      return;
    }
    if (now > gov.probeUntil) gov.probeFrom = -1; // it held: keep it
  }
  if (mean > 20 || late > WIN / 3) {
    // Slow frames (under ~50 fps) in two verdicts running (about a second): lighten, two tiers
    // at once when far behind. One bad verdict alone may be a passing hiccup.
    gov.bad++;
    gov.goodFor = 0;
    if (gov.bad >= 2 && gov.tier < MAX_TIER) setTier(gov.tier + (mean > 34 ? 2 : 1));
    return;
  }
  gov.bad = 0;
  if (mean < 17.2 && late === 0) gov.goodFor += 8 * FRAME_MS;
  else gov.goodFor = 0;
  if (gov.goodFor >= gov.upWait && gov.tier > gov.ceiling && gov.fails[gov.tier - 1] < 3) {
    gov.probeFrom = gov.tier;
    gov.probeUntil = now + 3000;
    setTier(gov.tier - 1);
  }
}

// ---------------------------------------------------------------- background work
// One-off heavy work (texture bakes, shader priming, texture uploads) never runs in big
// blocks. It asks for a slot with bgSlot() and gets one at most once per frame, right after a
// frame has been submitted, and only when recent frames were on time and the visitor is not
// scrolling and no heavy moment (the launch) is playing. Each slot comes with a pixel budget
// for GPU work that adapts to the frame after it: halved when that frame came late, grown
// slowly while frames stay on time. Frames made late by background work are not counted by
// the governor, so start-up work can never push the page down a tier.
// When nothing is on time (a GPU that cannot reach 60 fps yet), work still trickles on at the
// smallest budget a few times a second; urgent mode (the content is about to be needed)
// grants a slot every frame regardless.

type BgWaiter = { prio: number; seq: number; resolve: (px: number) => void };
const BG_MIN = 16384;
// Hard ceiling per unit. Frame timing only shows GPU cost a frame or two later, so a budget
// grown on timing alone can hand an old GPU a draw long enough for Windows to reset the driver
// (seen as flicker, then a hang). 256k pixels is the strip size that has always been safe.
const BG_MAX = 1 << 18;
const bg = {
  waiters: [] as BgWaiter[],
  seq: 0,
  budget: 65536,
  cap: BG_MAX, // budget ceiling learned from late frames
  check: false, // the next rendered frame shows how the last unit went
  lastGrant: -1e9,
  lastTs: -1, // rAF timestamp of the last grant (one per frame)
  lastScroll: -1e9,
  busyUntil: 0,
  urgent: 0,
  onTime: 0, // rendered frames on time in a row
  lastTick: -1e9,
  done: 0,
  timer: 0,
};
if (typeof window !== 'undefined') {
  const mark = () => (bg.lastScroll = performance.now());
  ['scroll', 'wheel', 'touchmove'].forEach((e) => window.addEventListener(e, mark, { passive: true }));
}

/** Wait for a good moment for one unit of background work; resolves with a pixel budget. */
export function bgSlot(prio = 1): Promise<number> {
  return new Promise((resolve) => {
    bg.waiters.push({ prio, seq: bg.seq++, resolve });
    if (!bg.timer) bg.timer = window.setInterval(bgFallback, 100);
  });
}
/** Heavy foreground moment (e.g. the launch): no background work for `ms`, unless urgent. */
export function bgBusy(ms: number) {
  bg.busyUntil = Math.max(bg.busyUntil, performance.now() + ms);
}
/** Count of urgent requesters: while > 0 a unit runs every frame. */
export function bgUrgent(on: boolean) {
  bg.urgent = Math.max(0, bg.urgent + (on ? 1 : -1));
}
const bgPending = () => bg.waiters.length;

function bgGrant(now: number, ts: number, px: number) {
  let k = 0;
  for (let i = 1; i < bg.waiters.length; i++) {
    const a = bg.waiters[i];
    const b = bg.waiters[k];
    if (a.prio < b.prio || (a.prio === b.prio && a.seq < b.seq)) k = i;
  }
  const w = bg.waiters.splice(k, 1)[0];
  bg.lastGrant = now;
  bg.lastTs = ts;
  bg.check = true;
  bg.done++;
  w.resolve(px);
  if (!bg.waiters.length) {
    window.clearInterval(bg.timer);
    bg.timer = 0;
    // Queue drained: look again for a richer tier soon, but keep the record of tiers that
    // already failed so the page does not keep switching quality (each switch rebuilds targets).
    window.setTimeout(() => {
      if (bg.waiters.length) return;
      gov.upWait = Math.min(gov.upWait, 8000);
    }, 500);
  }
}

/** Called by every stage tick after its frame was submitted. */
function bgPump(now: number, ts: number) {
  bg.lastTick = now;
  if (!bg.waiters.length || ts === bg.lastTs) return;
  if (bg.urgent) return bgGrant(now, ts, Math.min(BG_MAX, Math.max(bg.budget, 65536)));
  const calm = now - bg.lastScroll > 700 && now > bg.busyUntil;
  if (calm && bg.onTime >= 3) return bgGrant(now, ts, bg.budget);
  // Trickle: keep going slowly even when frames are never on time.
  if (calm && now - bg.lastGrant > 350) bgGrant(now, ts, BG_MIN);
}
/** No stage has ticked for a second (nothing on screen draws): grant from a timer instead. */
function bgFallback() {
  const now = performance.now();
  if (now - bg.lastTick < 1000 || !bg.waiters.length) return;
  if (bg.urgent || (now - bg.lastScroll > 700 && now > bg.busyUntil && now - bg.lastGrant > 60)) bgGrant(now, -1 - now, bg.budget);
}
/** A rendered-frame interval: adapt the budget. Returns true when the frame was made late by background work. */
function bgFrame(ms: number) {
  const late = ms > 21;
  bg.onTime = late ? 0 : bg.onTime + 1;
  if (!bg.check) return false;
  bg.check = false;
  if (late) {
    // Remember roughly where it starts to hurt, so the budget does not keep probing past it.
    bg.cap = Math.max(BG_MIN, bg.budget * 0.7);
    bg.budget = Math.max(BG_MIN, bg.budget * 0.5);
  } else {
    bg.budget = Math.min(bg.cap, bg.budget * 1.2);
    bg.cap = Math.min(BG_MAX, bg.cap * 1.02);
  }
  return late;
}

/** Current quality and a subscription to changes (called immediately with the current value). */
export function onQuality(fn: QualityListener) {
  gov.listeners.add(fn);
  fn(quality());
  return () => gov.listeners.delete(fn);
}
export const getQuality = quality;

// ---------------------------------------------------------------- shader compilation

/**
 * renderer.compileAsync with a time limit: where KHR_parallel_shader_compile is missing the
 * readiness poll can stall, and the shaders then simply link on first use.
 */
export function compileSoon(renderer: THREE.WebGLRenderer, scene: THREE.Object3D, camera: THREE.Camera, ms = 2000) {
  return Promise.race([renderer.compileAsync(scene, camera).then(() => undefined), new Promise<void>((r) => setTimeout(r, ms))]).catch(() => undefined);
}

// ---------------------------------------------------------------- environment

/**
 * The studio reflection map (RoomEnvironment through PMREM), with its shaders compiled
 * without blocking first, so building it does not stall the page.
 */
export async function buildRoomEnv(renderer: THREE.WebGLRenderer) {
  const room = new RoomEnvironment();
  const cam = new THREE.PerspectiveCamera(90, 1, 0.1, 100);
  const tmp = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType });
  const prev = renderer.getRenderTarget();
  renderer.setRenderTarget(tmp); // PMREM draws the room into a target
  const pending = compileSoon(renderer, room, cam);
  renderer.setRenderTarget(prev);
  await pending;
  tmp.dispose();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const tex = pmrem.fromScene(room, 0.04).texture;
  pmrem.dispose();
  room.dispose();
  return tex;
}

// ---------------------------------------------------------------- stage

export type Stage = {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  pointer: THREE.Vector2; // smoothed, -1..1
  onFrame: (fn: (t: number, dt: number) => void) => void;
  render: () => void;
  /** Swap how a frame is drawn, e.g. to run an EffectComposer (bloom) instead of a plain render. */
  setRender: (fn: () => void) => void;
  /**
   * How often to draw: 60 (default) renders every tick, lower values render less often while the
   * frame callbacks keep running, 0 holds the last frame. Call it from a frame callback.
   */
  setFps: (fps: number) => void;
  /** Draw on the next tick even if the fps policy would skip it. */
  invalidate: () => void;
  dispose: () => void;
  reduced: boolean;
};

const debug = qsFlag('perf');
type DebugStage = {
  name: string;
  renders: number;
  ticks: number;
  fps: number;
  js: number; // smoothed JS ms per tick (frame callbacks + issuing the draw)
  iv: Float32Array; // recent rendered-frame intervals (ms)
  ivN: number;
  calls: number;
  tris: number;
  info: () => Record<string, unknown>;
};
const debugStages: DebugStage[] = [];
// ?perf&step: frames advance only when a test calls __nuukeStep(n) (deterministic captures).
const stepMode = debug && qsFlag('step');
const stepHooks: ((ts: number) => void)[] = [];
let stepTs = 0;
if (debug)
  Object.assign(window, {
    __nuukeGL: { gov, quality, stages: debugStages, setTier, gpu: () => gpuName, bg: () => ({ pending: bgPending(), budget: bg.budget, done: bg.done }) },
    __nuukeStep: (n = 1) => {
      for (let i = 0; i < n; i++) {
        stepTs += FRAME_MS;
        stepHooks.forEach((h) => h(stepTs));
      }
    },
  });

// ?perf: a small diagnostics panel (top-left, above everything) for screenshots from real devices.
let overlayOn = false;
function startOverlay() {
  if (!debug || overlayOn || qsFlag('nooverlay')) return;
  overlayOn = true;
  const box = document.createElement('div');
  box.setAttribute('aria-hidden', 'true');
  box.style.cssText =
    'position:fixed;left:6px;top:6px;z-index:2147483647;pointer-events:none;max-width:min(360px,calc(100vw - 12px));padding:6px 8px;border-radius:6px;background:rgba(0,0,0,.78);color:#d8ffd8;font:10.5px/1.35 ui-monospace,Menlo,Consolas,monospace;white-space:pre-wrap;word-break:break-word';
  document.body.appendChild(box);
  let longTasks = 0;
  let longMax = 0;
  try {
    new PerformanceObserver((l) =>
      l.getEntries().forEach((e) => {
        longTasks++;
        longMax = Math.max(longMax, e.duration);
      }),
    ).observe({ type: 'longtask', buffered: true });
  } catch {
    /* not supported */
  }
  // Display rate as the browser delivers it (all rAF ticks).
  let rafN = 0;
  const raf = () => {
    rafN++;
    requestAnimationFrame(raf);
  };
  requestAnimationFrame(raf);
  const prev = new Map<DebugStage, number>();
  let last = performance.now();
  let rafPrev = 0;
  const sorted: number[] = [];
  setInterval(() => {
    const now = performance.now();
    const secs = (now - last) / 1000;
    last = now;
    const rows: string[] = [];
    let main: DebugStage | null = null;
    let mainFps = -1;
    for (const st of debugStages) {
      const fps = (st.renders - (prev.get(st) ?? st.renders)) / secs;
      prev.set(st, st.renders);
      if (fps > mainFps) {
        mainFps = fps;
        main = st;
      }
      if (fps > 0.05) {
        const i = st.info() as { size: number[] };
        rows.push(`  ${st.name.split(' ')[0]}: ${fps.toFixed(0)} fps  ${i.size[0]}x${i.size[1]}  ${st.calls} calls ${(st.tris / 1000).toFixed(0)}k tri  js ${st.js.toFixed(1)}ms`);
      }
    }
    let avg = 0;
    let p95 = 0;
    if (main) {
      const n = Math.min(main.ivN, main.iv.length);
      sorted.length = 0;
      for (let i = 0; i < n; i++) sorted.push(main.iv[i]);
      sorted.sort((a, b) => a - b);
      avg = n ? sorted.reduce((a, b) => a + b, 0) / n : 0;
      p95 = n ? sorted[Math.min(n - 1, Math.floor(n * 0.95))] : 0;
    }
    const rafFps = (rafN - rafPrev) / secs;
    rafPrev = rafN;
    const q = quality();
    box.textContent =
      `fps ${Math.max(0, mainFps).toFixed(0)} (display ${rafFps.toFixed(0)})  frame avg ${avg.toFixed(1)} p95 ${p95.toFixed(1)} ms\n` +
      `tier ${q.tier}${gov.pinned ? ' (pinned)' : ''}  maxPR ${q.maxPR}  dpr ${window.devicePixelRatio}  view ${window.innerWidth}x${window.innerHeight}\n` +
      `long tasks ${longTasks}${longTasks ? ` (max ${longMax.toFixed(0)} ms)` : ''}  tier changes ${gov.changes}  background ${bgPending() ? `${bgPending()} waiting` : 'idle'} (${bg.done} done)\n` +
      `gpu ${gpuName || '?'}\n` +
      (rows.length ? `rendering:\n${rows.join('\n')}` : 'rendering: none');
  }, 500);
}

// The browser lost the WebGL context (a GPU driver reset, e.g. Windows TDR). Lost contexts come
// back with every texture empty, so instead of drawing a broken scene the page reloads once,
// remembering it: the next load uses lighter quality, a second reset the static version.
let glLost = false;
function onGlLost() {
  if (glLost) return;
  glLost = true;
  const reload = () => {
    noteGlLost();
    location.reload();
  };
  // A hidden tab may lose its context to free memory (phones): no penalty, reload when seen.
  if (!document.hidden) return reload();
  const onShow = () => {
    if (document.hidden) return;
    document.removeEventListener('visibilitychange', onShow);
    location.reload();
  };
  document.addEventListener('visibilitychange', onShow);
}

export function createStage(canvas: HTMLCanvasElement, opts: { fov?: number; z?: number; env?: boolean; alpha?: boolean } = {}): Stage {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: opts.alpha ?? true, powerPreference: 'high-performance' });
  // No GPU (software rasteriser) or the visitor prefers less motion → static frames only.
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches || isSoftwareGL(renderer.getContext());
  initGovernor(renderer.getContext());
  // Shader error checks read the program log right after linking, which makes the main thread
  // wait for every link; only on request (?glcheck).
  renderer.debug.checkShaderErrors = qsFlag('glcheck');
  const applyPR = (q: Quality) => Math.min(window.devicePixelRatio || 1, q.maxPR);
  renderer.setPixelRatio(applyPR(quality()));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(opts.fov ?? 35, 1, 0.1, 100);
  camera.position.set(0, 0, opts.z ?? 10);

  if (opts.env !== false) {
    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    scene.environment = pmrem.fromScene(room, 0.04).texture;
    pmrem.dispose();
    room.dispose();
  }

  let dirty = true;
  const resize = () => {
    const w = canvas.clientWidth || canvas.parentElement?.clientWidth || 1;
    const h = canvas.clientHeight || canvas.parentElement?.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    dirty = true; // resizing clears the drawing buffer
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  const offQuality = onQuality((q) => {
    const pr = applyPR(q);
    if (pr !== renderer.getPixelRatio()) {
      renderer.setPixelRatio(pr);
      resize();
    }
  });

  const pointer = new THREE.Vector2();
  const target = new THREE.Vector2();
  const onMove = (e: PointerEvent) => {
    target.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
  };
  window.addEventListener('pointermove', onMove, { passive: true });

  const frames: ((t: number, dt: number) => void)[] = [];
  const timer = new THREE.Timer();
  const fixedDt = debug ? qsNum('fixeddt') : null; // ?perf&fixeddt=ms: advance a fixed number of ms per tick (frame captures)
  let fixedT = 0;
  let visible = true;
  let raf = 0;
  let lost = false; // the WebGL context is gone (see onGlLost)
  let draw = () => renderer.render(scene, camera);
  const render = () => draw();
  let fps = 60;
  let lastRender = -1e9;
  let lastTick = -1; // rAF timestamp of the last tick that ran
  let acc = 0;
  let renderedPrev = false;
  let prevRenderTs = 0;
  const dbg: DebugStage = {
    name: canvas.className || canvas.id || 'canvas',
    renders: 0,
    ticks: 0,
    fps: 60,
    js: 0,
    iv: new Float32Array(120),
    ivN: 0,
    calls: 0,
    tris: 0,
    info: () => ({ ...renderer.info.memory, calls: dbg.calls, triangles: dbg.tris, pr: renderer.getPixelRatio(), size: [canvas.width, canvas.height] }),
  };
  if (debug) {
    debugStages.push(dbg);
    // Count every pass of a frame (post-processing included), not just the last one.
    renderer.info.autoReset = false;
    if (document.body) startOverlay();
    else window.addEventListener('DOMContentLoaded', startOverlay, { once: true });
  }

  const tick = (ts: number) => {
    raf = 0;
    if (lost) return;
    if (!visible || document.hidden) {
      lastTick = -1;
      renderedPrev = false;
      return;
    }
    const again = !reduced || performance.now() < activeUntil;
    // Never run faster than 60 fps: on 90/120/144 Hz screens skip ticks, carrying the remainder
    // so the average rate stays at 60.
    if (lastTick >= 0 && !reduced) {
      acc += ts - lastTick;
      lastTick = ts;
      if (acc < FRAME_MS - 1.5) {
        raf = requestAnimationFrame(tick);
        return;
      }
      acc = acc > FRAME_MS * 2 ? 0 : acc - FRAME_MS;
    } else {
      lastTick = ts;
      acc = 0;
    }
    const t0 = performance.now();
    timer.update();
    let dt = Math.min(timer.getDelta(), 0.05);
    let t = timer.getElapsed();
    if (fixedDt) {
      dt = fixedDt / 1000;
      fixedT += dt;
      t = fixedT;
    }
    pointer.lerp(target, 1 - Math.exp(-3.7 * dt));
    for (const f of frames) f(t, dt);
    const now = performance.now();
    const due = fps >= 60 || (fps > 0 && now - lastRender >= 1000 / fps - 4);
    if (due || dirty) {
      if (debug) renderer.info.reset();
      render();
      dirty = false;
      lastRender = now;
      dbg.renders++;
      if (debug) {
        dbg.calls = renderer.info.render.calls;
        dbg.tris = renderer.info.render.triangles;
        if (renderedPrev) dbg.iv[dbg.ivN++ % dbg.iv.length] = ts - prevRenderTs;
      }
      if (renderedPrev) {
        const iv = ts - prevRenderTs;
        const oneOff = bgFrame(iv);
        if (fps >= 60 && !oneOff) govSample(iv, now);
      }
      prevRenderTs = ts;
      renderedPrev = true;
    } else renderedPrev = false;
    dbg.ticks++;
    dbg.fps = fps;
    const jsMs = performance.now() - t0;
    gov.frameMs += (jsMs - gov.frameMs) * 0.05;
    dbg.js += (jsMs - dbg.js) * 0.1;
    bgPump(performance.now(), ts);
    if (again && !stepMode) raf = requestAnimationFrame(tick);
  };
  if (stepMode) stepHooks.push((ts) => tick(ts));
  // In static mode, still animate for a few seconds after the visitor interacts.
  let activeUntil = 0;
  if (reduced) {
    const wake = () => {
      activeUntil = performance.now() + 4000;
      start();
    };
    ['pointerdown', 'keydown', 'click'].forEach((ev) => window.addEventListener(ev, wake, { passive: true }));
  }
  const start = () => {
    if (!raf && !stepMode && !lost) raf = requestAnimationFrame(tick);
  };
  const onLost = () => {
    lost = true;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    canvas.style.visibility = 'hidden';
    onGlLost();
  };
  canvas.addEventListener('webglcontextlost', onLost);
  const io = new IntersectionObserver((entries) => {
    visible = entries[0]?.isIntersecting ?? true;
    if (visible) {
      timer.update();
      dirty = true;
      start();
    }
  });
  io.observe(canvas);
  const onVis = () => {
    if (document.hidden) return;
    dirty = true;
    start();
  };
  document.addEventListener('visibilitychange', onVis);
  if (reduced) {
    let last = 0;
    window.addEventListener(
      'scroll',
      () => {
        const now = performance.now();
        if (now - last > 220) {
          last = now;
          start();
        }
      },
      { passive: true },
    );
  }

  return {
    renderer,
    scene,
    camera,
    pointer,
    reduced,
    onFrame: (fn) => {
      frames.push(fn);
      start();
    },
    render,
    setRender: (fn) => {
      draw = fn;
    },
    setFps: (f) => {
      fps = f;
    },
    invalidate: () => {
      dirty = true;
    },
    dispose: () => {
      io.disconnect();
      ro.disconnect();
      offQuality();
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      frames.length = 0;
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('webglcontextlost', onLost);
      renderer.dispose();
      renderer.forceContextLoss(); // free the context itself, not just its resources
    },
  };
}

/** True when WebGL is running on a software rasteriser (no usable GPU). */
export function isSoftwareGL(gl: WebGLRenderingContext | WebGL2RenderingContext) {
  if (/[?&]gl=force\b/.test(location.search)) return false;
  try {
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const name = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '';
    return /swiftshader|llvmpipe|softpipe|software|basic render/i.test(name);
  } catch {
    return false;
  }
}

/** A modern phone: rounded aluminium body, glass front, a screen that takes any texture. */
export function makePhone(screen: THREE.Texture | null, opts: { color?: number; w?: number; h?: number } = {}) {
  const w = opts.w ?? 1.5;
  const h = opts.h ?? 3.1;
  const d = 0.16;
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new RoundedBoxGeometry(w, h, d, 6, 0.2),
    new THREE.MeshPhysicalMaterial({ color: opts.color ?? 0x1b1b20, metalness: 0.9, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.2 }),
  );
  group.add(body);
  const screenMat = new THREE.MeshBasicMaterial({ color: 0xffffff, map: screen ?? null, toneMapped: false });
  const scr = new THREE.Mesh(new RoundedPlane(w - 0.1, h - 0.1, 0.16), screenMat);
  scr.position.z = d / 2 + 0.002;
  group.add(scr);
  const glass = new THREE.Mesh(
    new RoundedPlane(w - 0.04, h - 0.04, 0.18),
    new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.08, roughness: 0.05, metalness: 0, clearcoat: 1 }),
  );
  glass.position.z = d / 2 + 0.006;
  group.add(glass);
  const island = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.22, 4, 12), new THREE.MeshBasicMaterial({ color: 0x000000 }));
  island.rotation.z = Math.PI / 2;
  island.position.set(0, h / 2 - 0.16, d / 2 + 0.004);
  group.add(island);
  return { group, screen: scr, screenMat };
}

/** Flat rectangle with rounded corners and correct 0..1 UVs. */
export class RoundedPlane extends THREE.ShapeGeometry {
  constructor(w: number, h: number, r: number) {
    const s = new THREE.Shape();
    const x = -w / 2;
    const y = -h / 2;
    s.moveTo(x + r, y);
    s.lineTo(x + w - r, y);
    s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r);
    s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h);
    s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r);
    s.quadraticCurveTo(x, y, x + r, y);
    super(s, 12);
    const pos = this.attributes.position;
    const uv = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) {
      uv[i * 2] = (pos.getX(i) - x) / w;
      uv[i * 2 + 1] = (pos.getY(i) - y) / h;
    }
    this.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  }
}

/** Draw an SVG string into a texture (used for wireframes and UI screens). */
export function svgTexture(svg: string, width = 750, height = 1550): Promise<THREE.CanvasTexture> {
  return new Promise((resolve) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    img.onload = () => {
      ctx.drawImage(img, 0, 0, width, height);
      tex.needsUpdate = true;
      resolve(tex);
    };
    img.onerror = () => resolve(tex);
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  });
}
