// Shared Three.js stage: renderer, camera, studio lighting, resize and
// an animation loop that only runs while the canvas is on screen.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export { THREE };

// ---------------------------------------------------------------- quality governor
// One governor for every stage on the page. It measures how long rendered frames really take
// (interval between consecutive rendered frames, capped at 60 fps) and steps through quality
// tiers: down quickly when frames are late, up slowly (with growing back-off) when there is
// headroom. Tier 0 is the full look; each scene reads the current tier through onQuality().

export type Quality = {
  /** 0 = full quality ... 4 = lightest */
  tier: number;
  /** Device pixel ratio cap for this tier. */
  maxPR: number;
  /** Bloom resolution scale relative to the scene's normal bloom size. */
  bloom: number;
  /** Particle budget multiplier, relative to what the scene uses at this device's ceiling. */
  particles: number;
  /** MSAA samples for HDR scene targets (scenes may use fewer). */
  samples: number;
  /** Optional finishing touches (heat haze, chromatic fringing, film grain). */
  extras: boolean;
};

const TIERS: Omit<Quality, 'tier'>[] = [
  { maxPR: 1.75, bloom: 1, particles: 1, samples: 4, extras: true },
  { maxPR: 1.5, bloom: 1, particles: 1, samples: 4, extras: true },
  { maxPR: 1.25, bloom: 0.5, particles: 0.8, samples: 2, extras: true },
  { maxPR: 1.0, bloom: 0.5, particles: 0.6, samples: 0, extras: false },
  { maxPR: 0.8, bloom: 0.25, particles: 0.45, samples: 0, extras: false },
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

function startTier(gl: WebGLRenderingContext | WebGL2RenderingContext, ceiling: number) {
  let name = '';
  try {
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    name = String(gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER) || '').toLowerCase();
  } catch {
    /* unknown GPU */
  }
  let t = 0;
  if (/swiftshader|llvmpipe|softpipe|software|basic render/.test(name)) t = 4;
  else if (/nvidia|geforce|quadro|radeon (rx|pro)|\brx \d|arc\(tm\)|intel\(r\) arc|apple m\d (pro|max|ultra)/.test(name)) t = 0;
  else if (/apple m\d|apple gpu/.test(name)) t = 1;
  else if (/iris|radeon|vega/.test(name)) t = 2;
  else if (/intel|mali-[gt][1-5]\d\b|mali-[t4]|adreno \(tm\) [2-5]\d\d|adreno [2-5]\d\d|powervr|videocore|mali-400/.test(name)) t = 3;
  else if (/mali|adreno/.test(name)) t = 2;
  else if (name) t = 1;
  else t = 2;
  const nav = navigator as Navigator & { deviceMemory?: number };
  if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) t++;
  if (nav.deviceMemory && nav.deviceMemory <= 4) t++;
  // Very large backbuffers (4K / 5K panels) cost more than the GPU name suggests.
  const pr = Math.min(window.devicePixelRatio || 1, 1.75);
  if (window.innerWidth * window.innerHeight * pr * pr > 2560 * 1440 * 1.6) t++;
  return Math.max(ceiling, Math.min(MAX_TIER, t));
}

type QualityListener = (q: Quality) => void;
const gov = {
  inited: false,
  tier: 0,
  ceiling: 0,
  pinned: false,
  listeners: new Set<QualityListener>(),
  // rolling window of rendered-frame intervals (ms)
  win: new Float32Array(60),
  n: 0,
  sinceChange: 0,
  goodFor: 0, // ms of consecutive "comfortable" windows
  upWait: 6000, // ms of headroom needed before trying a richer tier
  lastUpAt: -1e9,
  // Did the last step down actually help? (see govSample)
  dropMean: 0, // mean frame interval just before the last step down; 0 = nothing to check
  dropFrom: 0,
  holdUntil: -1e9, // no further steps down before this time
  holdMs: 20000,
  frameMs: 0, // smoothed main-thread ms per tick (diagnostics)
};

const quality = (): Quality => ({ tier: gov.tier, ...TIERS[gov.tier] });

function setTier(t: number) {
  t = Math.max(gov.ceiling, Math.min(MAX_TIER, t));
  if (t === gov.tier) return;
  gov.tier = t;
  gov.n = 0;
  gov.sinceChange = 0;
  gov.goodFor = 0;
  const q = quality();
  gov.listeners.forEach((f) => f(q));
}

function initGovernor(gl: WebGLRenderingContext | WebGL2RenderingContext) {
  if (gov.inited) return;
  gov.inited = true;
  gov.ceiling = isLiteDevice() ? 2 : 0;
  const forced = qsNum('q');
  if (forced !== null) {
    gov.pinned = true;
    gov.tier = Math.max(0, Math.min(MAX_TIER, Math.round(forced)));
  } else gov.tier = startTier(gl, gov.ceiling);
}

/** Feed one rendered-frame interval (only between two consecutive rendered ticks). */
function govSample(ms: number, now: number) {
  if (gov.pinned) return;
  if (ms > 250) return; // a pause or a one-off stall, not a trend
  gov.win[gov.n % gov.win.length] = Math.min(ms, 50);
  gov.n++;
  gov.sinceChange++;
  if (gov.n < gov.win.length || gov.n % 30 !== 0) return;
  let sum = 0;
  let late = 0;
  for (let i = 0; i < gov.win.length; i++) {
    sum += gov.win[i];
    // 28 ms, not 25: on a 75 Hz screen the 60 fps cap leaves one 26.7 ms gap in every four.
    if (gov.win[i] > 28) late++;
  }
  const mean = sum / gov.win.length;
  if (gov.dropMean) {
    // First full window after a step down. If it bought (almost) nothing, the frame rate is
    // limited by something other than our rendering (a 30 fps battery saver, a busy machine,
    // a throttled tab): go back to the richer tier and stop stepping down for a while instead
    // of sliding to the lightest look for no gain.
    const before = gov.dropMean;
    gov.dropMean = 0;
    if (mean > before * 0.93) {
      gov.holdUntil = now + gov.holdMs;
      gov.holdMs = Math.min(300000, gov.holdMs * 3);
      setTier(gov.dropFrom);
      return;
    }
  }
  if (mean > 20.5 && gov.sinceChange >= 45 && now >= gov.holdUntil && gov.tier < MAX_TIER) {
    // Under ~50 fps on average: lighten. If we only just stepped up, back off for longer.
    if (now - gov.lastUpAt < 8000) gov.upWait = Math.min(120000, gov.upWait * 2);
    gov.dropMean = mean;
    gov.dropFrom = gov.tier;
    setTier(gov.tier + 1);
    return;
  }
  if (mean < 17.6 && late <= 2) gov.goodFor += 30 * FRAME_MS;
  else gov.goodFor = 0;
  if (gov.goodFor >= gov.upWait && gov.tier > gov.ceiling) {
    gov.lastUpAt = now;
    setTier(gov.tier - 1);
  }
}

/** Current quality and a subscription to changes (called immediately with the current value). */
export function onQuality(fn: QualityListener) {
  gov.listeners.add(fn);
  fn(quality());
  return () => gov.listeners.delete(fn);
}
export const getQuality = quality;

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
type DebugStage = { name: string; renders: number; ticks: number; fps: number; info: () => unknown };
const debugStages: DebugStage[] = [];
// ?perf&step: frames advance only when a test calls __nuukeStep(n) (deterministic captures).
const stepMode = debug && qsFlag('step');
const stepHooks: ((ts: number) => void)[] = [];
let stepTs = 0;
if (debug)
  Object.assign(window, {
    __nuukeGL: { gov, quality, stages: debugStages, setTier },
    __nuukeStep: (n = 1) => {
      for (let i = 0; i < n; i++) {
        stepTs += FRAME_MS;
        stepHooks.forEach((h) => h(stepTs));
      }
    },
  });

export function createStage(canvas: HTMLCanvasElement, opts: { fov?: number; z?: number; env?: boolean; alpha?: boolean } = {}): Stage {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: opts.alpha ?? true, powerPreference: 'high-performance' });
  // No GPU (software rasteriser) or the visitor prefers less motion → static frames only.
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches || isSoftwareGL(renderer.getContext());
  initGovernor(renderer.getContext());
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
  let draw = () => renderer.render(scene, camera);
  const render = () => draw();
  let fps = 60;
  let lastRender = -1e9;
  let lastTick = -1; // rAF timestamp of the last tick that ran
  let acc = 0;
  let renderedPrev = false;
  let prevRenderTs = 0;
  const dbg: DebugStage = { name: canvas.className || canvas.id || 'canvas', renders: 0, ticks: 0, fps: 60, info: () => ({ ...renderer.info.memory, calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, pr: renderer.getPixelRatio(), size: [canvas.width, canvas.height] }) };
  if (debug) debugStages.push(dbg);

  const tick = (ts: number) => {
    raf = 0;
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
      render();
      dirty = false;
      lastRender = now;
      dbg.renders++;
      if (renderedPrev && fps >= 60) govSample(ts - prevRenderTs, now);
      prevRenderTs = ts;
      renderedPrev = true;
    } else renderedPrev = false;
    dbg.ticks++;
    dbg.fps = fps;
    gov.frameMs += (performance.now() - t0 - gov.frameMs) * 0.05;
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
    if (!raf && !stepMode) raf = requestAnimationFrame(tick);
  };
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
