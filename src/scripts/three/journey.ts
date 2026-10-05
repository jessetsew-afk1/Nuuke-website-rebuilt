// Homepage flight: one continuous WebGL scene. The rocket waits on a detailed launch pad
// at dusk, ignites (shake, sparks, smoke flooding the pad), lifts off, punches through a
// cloud layer into space and settles beside the hero. It then follows the visitor through
// the page: sections mark waypoints with data-fx / data-fy / data-fs / data-fo (x, y in
// -1..1 of the viewport, scale, opacity; data-m* override on phones). The film section flies
// the camera up to the porthole, a warp jump precedes the finale and the finale lands the
// rocket in the "n" of the logo.
import { createStage, THREE } from './core';
import { makeRocket } from './rocket';
import * as sfx from '../sfx';
import { makeEnv } from './fx/env';
import { makeDome, makeStars, makeDust } from './fx/sky';
import { Smoke, Sparks } from './fx/particles';
import { makePost } from './fx/post';
import { makePad, ROCKET_BASE, DECK, type Pad } from './fx/pad';

export type FinaleTarget = { x: number; y: number; h: number; tilt: number };
export type PortholeFrame = { x: number; y: number; r: number; open: number; visible: boolean; facing: number; near: number };

export type Journey = {
  launch: () => Promise<void>;
  /** Hurry the launch sequence along (any scroll / key / click during it). */
  skip: () => void;
  skipLaunch: () => void;
  setLoad: (p: number) => void;
  /** 0..1 progress through the finale; target = cutout rect in CSS px + tilt in radians. */
  setFinale: (p: number, target: FinaleTarget | null) => void;
  /** 0..1 progress through the film section (0 or 1 = not in it). */
  setFilm: (p: number) => void;
  /** Called every frame while the film section is active with the projected porthole. */
  onPorthole: (fn: (f: PortholeFrame) => void) => void;
  /** Warp jump; `onDrop` fires on drop-out. */
  warp: (onDrop: () => void) => void;
  resetWarp: () => void;
};

const Y_SPACE = 56; // altitude of the flight rig (just above the cloud tops)
const CLOUD_LO = 38;
const CLOUD_HI = 46;
const IGNITION = 2.6; // seconds from click to lift-off
const ROCKET_H = 3.6; // model height in units (nose to fin feet)

const smooth = (t: number) => t * t * (3 - 2 * t);
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const sstep = (a: number, b: number, v: number) => smooth(clamp01((v - a) / (b - a)));
const damp = (k: number, dt: number) => 1 - Math.exp(-k * dt);

export function initJourney(canvas: HTMLCanvasElement, opts: { pad?: boolean; shake?: HTMLElement[] } = {}): Journey {
  const lite = window.innerWidth < 760 || window.matchMedia('(pointer: coarse)').matches;
  const stage = createStage(canvas, { fov: 35, z: 12, env: false, alpha: false });
  const { scene, camera, renderer, onFrame } = stage;
  if (lite) renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
  renderer.setClearColor(0x000000, 1);
  const isSmall = () => window.innerWidth < 760;
  const qs = new URLSearchParams(location.search);
  const dtCap = parseFloat(qs.get('hjdt') || '') || 0.05;
  const withPad = opts.pad !== false;
  const shakeEls = [canvas, ...(opts.shake ?? [])];

  // ---------- Environment, lights, backdrop ----------
  const envDusk = withPad ? makeEnv(renderer, 'dusk') : null;
  const envSpace = makeEnv(renderer, 'space');
  scene.environment = envDusk ?? envSpace;

  const hemi = new THREE.HemisphereLight(0x8aa0d8, 0x2a1c18, 0.35);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffa060, 2.6);
  scene.add(sun, sun.target);
  const fill = new THREE.DirectionalLight(0xdfe6ff, 1.3);
  scene.add(fill, fill.target);
  const pink = new THREE.PointLight(0xff2e88, 0, 16, 1.6);
  scene.add(pink);
  const burnLight = new THREE.PointLight(0xff8a30, 0, 30, 1.4);
  scene.add(burnLight);

  const SUN_DUSK = new THREE.Vector3(-0.5, -0.012, -1).normalize();
  const SUN_SPACE = new THREE.Vector3(0.62, 0.32, -1).normalize();
  const sunDir = SUN_DUSK.clone();

  const dome = makeDome();
  scene.add(dome.mesh);
  const stars = makeStars(lite ? 1100 : 2600);
  scene.add(stars.mesh);
  const dust = makeDust(lite ? 46 : 110);
  scene.add(dust.mesh);

  // ---------- Rocket ----------
  const rocket = makeRocket({ lite });
  rocket.group.rotation.order = 'ZXY';
  scene.add(rocket.group);
  rocket.group.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) o.castShadow = true;
  });

  // ---------- Particles ----------
  const smoke = new Smoke(lite ? 420 : 1100, lite); // trail, vents, column
  const ground = new Smoke(lite ? 380 : 1150, lite); // pad flood
  const clouds = new Smoke(lite ? 80 : 190, lite);
  const sparks = new Sparks(lite ? 220 : 600);
  scene.add(smoke.mesh, ground.mesh, sparks.mesh);
  ground.groundY = 0.05;
  smoke.groundY = DECK;
  sparks.groundY = DECK + 0.02;

  // ---------- Pad ----------
  let pad: Pad | null = null;
  if (withPad) {
    pad = makePad(lite);
    scene.add(pad.group);
    if (!lite) {
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFShadowMap;
      fill.castShadow = true;
      fill.shadow.mapSize.set(1024, 1024);
      const sc = fill.shadow.camera;
      sc.left = -6;
      sc.right = 6;
      sc.top = 9;
      sc.bottom = -3;
      sc.near = 1;
      sc.far = 40;
      fill.shadow.bias = -0.0008;
      fill.shadow.normalBias = 0.02;
    }
    scene.add(clouds.mesh);
    // A broken cloud deck the rocket will punch through (thicker around the climb path)
    const cu = clouds.mat.uniforms;
    cu.uSunCol.value.setRGB(1.25, 0.74, 0.5);
    cu.uAmbTop.value.setRGB(0.36, 0.42, 0.66);
    cu.uAmbBot.value.setRGB(0.12, 0.13, 0.22);
    cu.uContrast.value = 3.8;
    cu.uBack.value = 0.35;
    cu.uCrisp.value = 0.3;
    const nC = clouds.N;
    for (let i = 0; i < nC; i++) {
      const near = i < nC * 0.35;
      const a = Math.random() * Math.PI * 2;
      const d = near ? Math.random() * 8 : 5 + Math.pow(Math.random(), 0.8) * 42;
      const p = near ? new THREE.Vector3(Math.cos(a) * d * 0.8, 0, 9 + Math.sin(a) * d * 0.6) : new THREE.Vector3(Math.cos(a) * d, 0, Math.sin(a) * d - 8);
      p.y = CLOUD_LO + Math.random() * (CLOUD_HI - CLOUD_LO);
      clouds.emit({ pos: p, vel: new THREE.Vector3(), spread: 0, jitter: 0, size: near ? 7 + Math.random() * 5 : 11 + Math.random() * 12, tone: 0.92, alpha: 0.92, static: true, drag: 0.6, buoy: 0 });
    }
  }

  // ---------- Post ----------
  const post = makePost(renderer, scene, camera, lite);
  stage.setRender(post.render);
  const du = post.distort.uniforms;
  const fu = post.finish.uniforms;

  // ---------- Input: pointer + gyro parallax ----------
  const gyro = new THREE.Vector2();
  let gyroBase: { b: number; g: number } | null = null;
  window.addEventListener(
    'deviceorientation',
    (e) => {
      if (e.beta == null || e.gamma == null) return;
      if (!gyroBase) gyroBase = { b: e.beta, g: e.gamma };
      gyroBase.b += (e.beta - gyroBase.b) * 0.004; // slowly re-centre
      gyroBase.g += (e.gamma - gyroBase.g) * 0.004;
      gyro.set(clamp01((e.gamma - gyroBase.g) / 50 + 0.5) * 2 - 1, clamp01((e.beta - gyroBase.b) / 50 + 0.5) * 2 - 1);
    },
    { passive: true },
  );
  const look = new THREE.Vector2();

  // ---------- Geometry helpers ----------
  const FLY_DIST = 12;
  const O = new THREE.Vector3(0, Y_SPACE, 0);
  const view = () => {
    const h = Math.tan(THREE.MathUtils.degToRad(35 / 2)) * FLY_DIST;
    return { h, w: h * camera.aspect };
  };
  const ndc = new THREE.Vector3();
  const screenToPlane = (px: number, py: number, out: THREE.Vector3) => {
    ndc.set((px / window.innerWidth) * 2 - 1, -(py / window.innerHeight) * 2 + 1, 0.5).unproject(camera);
    ndc.sub(camera.position).normalize();
    const t = (O.z - camera.position.z) / ndc.z;
    return out.copy(camera.position).addScaledVector(ndc, t);
  };
  const pxPerUnit = () => window.innerHeight / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * Math.abs(camera.position.z - O.z));
  const project = (p: THREE.Vector3, out: THREE.Vector2) => {
    ndc.copy(p).project(camera);
    out.set((ndc.x * 0.5 + 0.5) * window.innerWidth, (-ndc.y * 0.5 + 0.5) * window.innerHeight);
    return ndc.z < 1;
  };

  // ---------- Waypoints (sections hold a pose while they fill the viewport) ----------
  type Way = { el: HTMLElement; x: number; y: number; s: number; o: number };
  let ways: Way[] = [];
  const readWays = () => {
    const m = isSmall();
    const num = (el: HTMLElement, k: string, d: string) => parseFloat((m && el.dataset['m' + k]) || el.dataset[k] || d);
    ways = [...document.querySelectorAll<HTMLElement>('[data-fx]')].map((el) => ({ el, x: num(el, 'fx', '0'), y: num(el, 'fy', '0'), s: num(el, 'fs', '1'), o: num(el, 'fo', '1') }));
  };
  readWays();
  window.addEventListener('resize', readWays);
  let wayIndex = -1;
  const waypoint = () => {
    const vh = window.innerHeight;
    const mid = vh * 0.5;
    const pad = vh * 0.3;
    const zones = ways.map((w) => {
      const r = w.el.getBoundingClientRect();
      const p = Math.min(pad, r.height / 2);
      return [r.top + p, r.bottom - p];
    });
    let a = 0;
    let b = 0;
    let t = 0;
    if (!zones.length) return { x: 0, y: 0, s: 1, o: 1, i: 0 };
    if (mid <= zones[0][0]) a = b = 0;
    else {
      a = b = zones.length - 1;
      for (let i = 0; i < zones.length; i++) {
        if (mid >= zones[i][0] && mid <= zones[i][1]) {
          a = b = i;
          break;
        }
        if (i < zones.length - 1 && mid > zones[i][1] && mid < zones[i + 1][0]) {
          a = i;
          b = i + 1;
          t = smooth((mid - zones[i][1]) / (zones[i + 1][0] - zones[i][1]));
          break;
        }
      }
    }
    const A = ways[a];
    const B = ways[b];
    const l = (p: number, q: number) => p + (q - p) * t;
    return { x: l(A.x, B.x), y: l(A.y, B.y), s: l(A.s, B.s), o: l(A.o, B.o), i: t < 0.5 ? a : b };
  };

  // ---------- State ----------
  type Mode = 'pad' | 'launch' | 'arrive' | 'fly';
  let mode: Mode = withPad ? 'pad' : 'arrive';
  let load = 0;
  let seq = 0; // launch sequence clock
  let timeScale = 1;
  let launchResolve: (() => void) | null = null;
  let liftedOff = false;
  let punched = false;
  let cut = false;
  let arriveT = 0;
  let finale = 0;
  let finaleTarget: FinaleTarget | null = null;
  let film = 0;
  let portholeFn: ((f: PortholeFrame) => void) | null = null;
  let warpT = -1;
  let warpDropped = false;
  let warpDrop: (() => void) | null = null;
  let missionT0 = performance.now() / 1000 + (withPad ? 1e9 : 0);

  const cur = new THREE.Vector3(0, Y_SPACE - 8, 0);
  const prev = cur.clone();
  const vel = new THREE.Vector3();
  let curScale = 1;
  let curOpacity = 1;
  let facing = 0;
  let spin = 0;
  let rotZ = 0;
  let lastScroll = window.scrollY;
  let sv = 0;
  let shakeAmp = 0;
  let flash = 0;
  let alt = withPad ? 0 : 1; // 0 = dusk at the pad, 1 = space
  let starFlow = 0; // extra star motion (launch / arrival)
  const starOffset = new THREE.Vector3();
  const dustOffset = new THREE.Vector3();
  const camPos = new THREE.Vector3();
  const camLook = new THREE.Vector3();
  const tmp = new THREE.Vector3();
  const tmp2 = new THREE.Vector3();
  const tmp3 = new THREE.Vector3();
  const v2 = new THREE.Vector2();
  const v2b = new THREE.Vector2();
  const down = new THREE.Vector3(0, -1, 0);
  let emitAcc: Record<string, number> = {};
  const rate = (key: string, perSec: number, dt: number) => {
    emitAcc[key] = (emitAcc[key] ?? 0) + perSec * dt;
    const n = Math.floor(emitAcc[key]);
    emitAcc[key] -= n;
    return n;
  };
  let hudAcc = 0;
  let lastThrust = 0;
  let landed = false;

  // Pad camera framing depends on the screen shape.
  const padCam = (out: THREE.Vector3, lookOut: THREE.Vector3) => {
    const k = clamp01((camera.aspect - 0.5) / 1.1);
    out.set(THREE.MathUtils.lerp(-0.85, -0.35, k), THREE.MathUtils.lerp(1.7, 1.35, k), THREE.MathUtils.lerp(16.5, 10.8, k));
    lookOut.set(THREE.MathUtils.lerp(-0.8, -0.55, k), THREE.MathUtils.lerp(3.15, 2.95, k), 0);
  };
  const flyCam = (out: THREE.Vector3, lookOut: THREE.Vector3, par: number) => {
    out.set(O.x + look.x * 0.9 * par, O.y + look.y * 0.55 * par, O.z + FLY_DIST);
    lookOut.set(O.x + look.x * 0.25 * par, O.y + look.y * 0.15 * par, O.z);
  };
  padCam(camPos, camLook);
  if (!withPad) flyCam(camPos, camLook, 0);

  const setPhaseLook = (space: boolean) => {
    scene.environment = space || !envDusk ? envSpace : envDusk;
    if (space) {
      hemi.color.set(0x7d86c8);
      hemi.groundColor.set(0x1a0d18);
      hemi.intensity = 0.28;
      sun.color.set(0xfff0dd);
      sun.intensity = 1.9;
      fill.color.set(0x8fa8ff);
      fill.intensity = 1.5;
      fill.castShadow = false;
      pink.intensity = 9;
      renderer.shadowMap.enabled = false;
      const su = smoke.mat.uniforms;
      su.uBack.value = 0.15;
      su.uSunCol.value.setRGB(0.55, 0.5, 0.52);
      su.uAmbTop.value.setRGB(0.2, 0.18, 0.28);
      su.uAmbBot.value.setRGB(0.07, 0.05, 0.09);
    }
  };
  setPhaseLook(!withPad);

  const disposePad = () => {
    if (!pad) return;
    scene.remove(pad.group);
    pad.dispose();
    pad = null;
    scene.remove(ground.mesh, clouds.mesh);
    ground.dispose();
    clouds.dispose();
    envDusk?.dispose();
  };

  // ---------- Frame ----------
  let lastNow = performance.now();
  onFrame((t) => {
    const now = performance.now();
    const realDt = Math.min((now - lastNow) / 1000, dtCap);
    lastNow = now;
    const dt = realDt * (mode === 'launch' ? timeScale : 1);
    const { h, w } = view();
    const k = isSmall() ? 0.62 : 1;
    let thrust = 0;
    let boost = 0;
    let opacity = 1;
    let shakeTarget = 0;
    let parallax = 1;
    let hudStage: string | null = null;

    // Scroll speed, normalised to "px per 60 fps frame" so thresholds read naturally.
    const sy = window.scrollY;
    const dScroll = sy - lastScroll;
    sv += (dScroll / Math.max(realDt, 1e-3) / 60 - sv) * damp(12, realDt);
    lastScroll = sy;
    look.lerp(v2.set(stage.pointer.x + gyro.x, stage.pointer.y - gyro.y), damp(3, realDt));

    prev.copy(cur);
    // ===== PAD / LAUNCH =====
    if (mode === 'pad' || mode === 'launch') {
      if (mode === 'launch') seq += dt;
      const s = mode === 'launch' ? seq : 0;
      const tl = Math.max(0, s - IGNITION);
      hudStage = 'Launch';
      if (mode === 'launch' && !liftedOff && s >= IGNITION) {
        liftedOff = true;
        missionT0 = now / 1000 - tl;
        sfx.liftoff();
      }
      if (liftedOff) hudStage = 'Ascent';
      // Thrust: igniter flicker, then a roaring build-up
      if (mode === 'launch') {
        thrust = s < 0.35 ? 0.15 + Math.random() * 0.2 : Math.min(1.55, 0.3 + Math.pow(clamp01((s - 0.35) / (IGNITION - 0.35)), 1.4) * 1.25);
        if (liftedOff) thrust = 1.55;
        boost = liftedOff ? 0.35 : 0.1;
      } else thrust = 0;
      const ry = ROCKET_BASE + 0.45 * tl * tl + 1.3 * tl * tl * tl;
      cur.set(0, ry, 0);
      curScale = 1;
      // Camera: fixed tripod at the pad that tilts up, then a chase climb
      padCam(tmp, tmp2);
      const tilt = sstep(0.0, 1.4, tl);
      const climb = Math.max(0, ry - 6) * 0.92;
      camPos.set(tmp.x * (1 - tilt * 0.6), tmp.y + climb, tmp.z + Math.min(3.5, Math.max(0, ry - 3) * 0.12));
      camLook.set(tmp2.x * (1 - tilt), THREE.MathUtils.lerp(tmp2.y, ry + 0.4, tilt), 0);
      if (mode === 'pad') {
        // slow idle drift
        camPos.x += Math.sin(t * 0.13) * 0.25 + look.x * 0.35;
        camPos.y += Math.sin(t * 0.17) * 0.08 + look.y * 0.15;
      }
      // Shake builds through ignition, peaks at lift-off, rumbles on through the climb
      if (mode === 'launch') shakeTarget = liftedOff ? Math.max(0.25, 1 - tl * 0.22) : 0.12 + 0.88 * Math.pow(clamp01(s / IGNITION), 1.6);
      alt = sstep(4, 50, camPos.y);
      if (pad) {
        pad.update(t, { swing: mode === 'launch' ? clamp01(s / 1.6) : 0, clamps: clamp01((s - IGNITION + 0.25) / 0.4), alarm: mode === 'launch' ? 1 : 0, burn: clamp01(thrust / 1.2) * (1 - sstep(2, 8, tl)) });
      }
      // ----- particles on the pad -----
      rocket.group.updateMatrixWorld();
      const noz = rocket.group.localToWorld(tmp.copy(rocket.nozzle));
      if (load > 0.3 && !liftedOff && pad) {
        for (let n = rate('vent', 7, dt); n > 0; n--) {
          const v = pad.vents[Math.floor(Math.random() * pad.vents.length)];
          smoke.emit({ pos: v, vel: tmp2.set((Math.random() - 0.6) * 0.5, -0.12, 0.2), spread: 0.15, size: 0.22, grow: 5, life: 3.2, tone: 1, alpha: 0.28, drag: 1.4, buoy: -0.05 });
        }
      }
      if (mode === 'launch') {
        if (s < 0.9) sparks.emit(noz, tmp2.set(0, -3, 0), rate('ign', lite ? 160 : 420, dt), 7, 1.1);
        if (thrust > 0.5) sparks.emit(noz, tmp2.set(0, -6, 0), rate('emb', (lite ? 30 : 80) * thrust, dt), 9, 0.9);
        const burn = clamp01((s - 0.35) / (IGNITION - 0.35));
        if (pad && tl < 4) {
          const fade = 1 - sstep(1.5, 4, tl);
          for (const tr of pad.trench) {
            for (let n = rate('tr' + tr.d.x, (lite ? 22 : 62) * burn * fade, dt); n > 0; n--)
              ground.emit({ pos: tr.p, vel: tmp2.copy(tr.d).multiplyScalar(6 + Math.random() * 5).add(tmp.set(0, 0.5 + Math.random() * 1.5, (Math.random() - 0.5) * 3.5)), spread: 1.4, jitter: 0.4, size: 1.2, grow: 8, life: 6.5, heat: 0.3, tone: 0.5, alpha: 0.82, drag: 0.5, buoy: 0.5 });
          }
          // Billows rolling out from the base across the deck
          for (let n = rate('ring', (lite ? 16 : 44) * Math.max(0, burn - 0.12) * fade, dt); n > 0; n--) {
            const a = Math.random() * Math.PI * 2;
            const up = Math.random() < 0.35;
            ground.emit({ pos: tmp.set(Math.cos(a) * 1.1, DECK + 0.3, Math.sin(a) * 1.1), vel: tmp2.set(Math.cos(a) * (up ? 2 : 5.5), up ? 2.2 : 0.5, Math.sin(a) * (up ? 2 : 5.5)), spread: 1.2, jitter: 0.4, size: 1.1, grow: up ? 5 : 6.5, life: 6, heat: 0.15, tone: 0.55, alpha: 0.7, drag: 0.6, buoy: up ? 0.45 : 0.3 });
          }
        }
        // Exhaust column + trail
        const colRate = liftedOff ? (lite ? 26 : 60) : (lite ? 12 : 26) * burn;
        for (let n = rate('col', colRate, dt); n > 0; n--)
          smoke.emit({ pos: noz, vel: tmp2.set(0, liftedOff ? -6 - Math.random() * 4 : -5, 0), spread: 1.6, jitter: 0.25, size: liftedOff ? 0.7 : 0.5, grow: 6, life: liftedOff ? 7 : 3, heat: 0.8, tone: 0.62, alpha: 0.5, drag: 0.9, buoy: 0.05 });
        burnLight.position.set(noz.x, Math.max(DECK + 0.6, noz.y - 1.2), noz.z + 0.6);
        burnLight.intensity = thrust * 26 * (1 - sstep(6, 20, cur.y)) * (0.85 + Math.random() * 0.3);
      }

      // ----- the cloud punch -----
      if (pad && liftedOff) {
        if (!punched && cur.y > CLOUD_LO - 1) {
          punched = true;
          sfx.cloudPunch();
          for (let n = 0; n < (lite ? 16 : 34); n++) {
            const a = (n / (lite ? 16 : 34)) * Math.PI * 2;
            smoke.emit({ pos: tmp.set(Math.cos(a) * 0.6, cur.y + 0.6, Math.sin(a) * 0.6), vel: tmp2.set(Math.cos(a) * 7, -1.5, Math.sin(a) * 7), spread: 1, size: 0.6, grow: 5, life: 1.4, tone: 1, alpha: 0.7, drag: 2.2, buoy: 0 });
          }
        }
        if (punched) clouds.repel(cur, 9, 60 * dt * 60 * 0.016, 7);
        clouds.update(dt);
        // Whiteout while the camera passes through the deck
        const inCloud = sstep(CLOUD_LO - 3, CLOUD_LO + 1, camPos.y) * (1 - sstep(CLOUD_HI - 1, CLOUD_HI + 6, camPos.y));
        flash = Math.max(flash, inCloud * 0.85);
        if (!cut && camPos.y > CLOUD_LO + 3) {
          // Cut to the flight rig under cover of the whiteout.
          cut = true;
          mode = 'arrive';
          arriveT = 0;
          flash = 1;
          setPhaseLook(true);
          smoke.clear();
          sparks.update(10);
          flyCam(camPos, camLook, 0);
          cur.set(O.x - w * 0.15, O.y - h - 3.2, 0);
          prev.copy(cur);
          starFlow = 1;
          if (pad) pad.group.visible = false;
          ground.mesh.visible = false;
          // The cloud deck becomes a sea far below, rushing away
          clouds.shift(0, 0, -20);
          setTimeout(() => {
            launchResolve?.();
            launchResolve = null;
          }, 250 / timeScale);
        }
      }
    }

    // ===== FLIGHT =====
    if (mode === 'arrive' || mode === 'fly') {
      arriveT += realDt;
      const wp = waypoint();
      if (mode === 'fly' && wp.i !== wayIndex && wayIndex !== -1) sfx.whoosh(clamp01(0.3 + Math.abs(sv) / 45));
      wayIndex = wp.i;
      const target = tmp.set(O.x + wp.x * w * 0.92, O.y + wp.y * h * 0.85, O.z);
      let scale = k * wp.s;
      opacity = wp.o;
      const speed = Math.abs(sv);
      thrust = 0.45 + Math.min(1.1, speed / 26);
      boost = Math.min(0.6, speed / 80);
      if (mode === 'arrive') {
        thrust = Math.max(thrust, 1.4 - arriveT * 0.35);
        hudStage = arriveT < 1.6 && withPad ? 'Ascent' : null;
      }
      // Nose up when scrolling down, nose down when scrolling back up; lean into turns.
      if (sv < -2.5) facing += (1 - facing) * damp(4, realDt);
      else if (sv > 2.5) facing += (0 - facing) * damp(4, realDt);
      let tz = facing * Math.PI - Math.atan2(vel.x * 0.06, 1.2 + speed * 0.04) * (facing > 0.5 ? -1 : 1);
      let spinTarget = 0.5 + Math.sin(spin) * 0.55 - vel.x * 0.04;
      let ease = mode === 'arrive' ? 1.6 + Math.min(2.6, arriveT * 1.8) : 4.2;

      // Porthole film: hold the pose with the window facing us
      const filmOn = film > 0 && film < 1;
      const fA = filmOn ? sstep(0, 0.3, film) * (1 - sstep(0.88, 1, film)) : 0;
      if (fA > 0) {
        tz *= 1 - fA;
        spinTarget = spinTarget * (1 - fA);
        thrust = THREE.MathUtils.lerp(thrust, 0.3, fA);
        const openK = sstep(0.3, 0.45, film) * (1 - sstep(0.82, 0.92, film));
        opacity *= 1 - openK;
        parallax = 1 - fA;
      }

      // Finale: fly into the cutout of the "n"
      if (finale > 0 && finaleTarget) {
        const f = smooth(Math.min(1, finale / 0.75));
        screenToPlane(finaleTarget.x, finaleTarget.y, tmp2);
        const targetScale = finaleTarget.h / (ROCKET_H * pxPerUnit());
        target.lerp(tmp2, f);
        scale = scale + (targetScale - scale) * f;
        tz = tz + (finaleTarget.tilt - tz) * f;
        spinTarget = spinTarget + (0.5 - spinTarget) * Math.min(1, finale / 0.4);
        opacity = finale < 0.78 ? opacity : Math.max(0, 1 - (finale - 0.78) / 0.12);
        thrust = thrust * (1 - f * 0.6);
        ease = 12;
        parallax = Math.min(parallax, 1 - sstep(0, 0.3, finale));
      }
      cur.lerp(target, damp(ease, realDt));
      if (mode === 'arrive' && arriveT > 0.6 && cur.distanceTo(target) < 0.2) mode = 'fly';
      curScale += (scale - curScale) * damp(7, realDt);
      rotZ += (tz - rotZ) * damp(6, realDt);
      spin += realDt * (0.35 + speed * 0.012);
      rocket.group.rotation.y += (spinTarget - rocket.group.rotation.y) * damp(fA > 0 || finale > 0.4 ? 6 : 3, realDt);

      // Camera rig
      flyCam(tmp2, camLook, parallax);
      if (mode === 'arrive') camPos.lerp(tmp2, damp(3, realDt));
      else camPos.copy(tmp2);
      camPos.x += Math.sin(t * 0.21) * 0.06 * parallax;
      camPos.y += Math.sin(t * 0.17 + 1) * 0.05 * parallax;

      // Film: fly up to the porthole
      if (fA > 0) {
        rocket.group.position.copy(cur);
        rocket.group.scale.setScalar(curScale);
        rocket.group.rotation.set(0, rocket.group.rotation.y, rotZ, 'ZXY');
        rocket.group.updateMatrixWorld();
        const pw = rocket.porthole.getWorldPosition(tmp2);
        const rWorld = rocket.portholeRadius * curScale;
        const want = Math.min(window.innerWidth, window.innerHeight) * (isSmall() ? 0.26 : 0.17);
        const dist = (rWorld * window.innerHeight) / (2 * Math.tan(THREE.MathUtils.degToRad(35 / 2)) * want);
        const push = 1 - 0.35 * sstep(0.3, 0.5, film) * (1 - sstep(0.82, 0.92, film));
        const fe = smooth(fA);
        camPos.lerp(tmp.set(pw.x, pw.y, pw.z + dist * push), fe);
        camLook.lerp(pw, fe);
      }

      // Trails: density and heat follow the speed of the scroll
      rocket.group.updateMatrixWorld();
      if (curOpacity > 0.3 && fA < 0.5) {
        const noz = rocket.group.localToWorld(tmp.copy(rocket.nozzle));
        const back = tmp2.set(0, -1, 0).applyQuaternion(rocket.group.quaternion);
        const n = rate('trail', 14 + speed * 4.5 + (mode === 'arrive' ? 40 : 0), realDt);
        for (let i = 0; i < n; i++) smoke.emit({ pos: noz, vel: back.clone().multiplyScalar(2.2 + speed * 0.05), spread: 0.35, jitter: 0.06, size: 0.3 * curScale, grow: 5.5, life: 1.8 + Math.min(1.6, speed / 30), heat: 0.45, tone: 0.62, alpha: 0.34, drag: 1.1, buoy: 0.05 });
        if (speed > 18) sparks.emit(noz, back.multiplyScalar(5), rate('emb2', speed * 0.6, realDt), 2, 0.6);
      }
      // Scrolling down = climbing: the world (trail, embers, dust) streams past downward
      const drift = -(dScroll / window.innerHeight) * 2 * h;
      smoke.shift(0, drift);
      sparks.shift(0, drift);
      dustOffset.y += drift * 1.6;
      alt += (1 - alt) * damp(2, realDt);
    }

    // ===== Warp =====
    let fovTarget = 35;
    let warpK = 0;
    if (warpT >= 0) {
      warpT += realDt;
      const charge = sstep(0, 1.2, warpT);
      if (!warpDropped) {
        warpK = charge;
        fovTarget = 35 + 42 * Math.pow(charge, 1.6);
        shakeTarget = Math.max(shakeTarget, charge * 0.45);
        thrust = Math.max(thrust, 1.2 + charge * 0.4);
        boost = Math.max(boost, charge * 1.4);
        if (warpT >= 1.25) {
          warpDropped = true;
          flash = 1;
          sfx.warpDrop();
          warpDrop?.();
          warpDrop = null;
        }
      } else {
        const after = warpT - 1.25;
        warpK = Math.max(0, 1 - after * 4);
        fovTarget = 35 - 6 * Math.sin(Math.min(1, after * 2.5) * Math.PI) * (1 - after);
      }
    }
    camera.fov += (fovTarget - camera.fov) * (warpDropped && warpT < 1.6 ? damp(18, realDt) : damp(6, realDt));
    camera.updateProjectionMatrix();

    // ===== Apply rocket transform =====
    vel.subVectors(cur, prev).divideScalar(Math.max(realDt, 1e-3));
    curOpacity += (opacity - curOpacity) * damp(7, realDt);
    rocket.group.position.copy(cur);
    // engine vibration
    const vib = thrust * 0.006 * curScale + shakeAmp * 0.02;
    rocket.group.position.x += (Math.random() - 0.5) * vib;
    rocket.group.position.y += (Math.random() - 0.5) * vib;
    rocket.group.scale.setScalar(curScale);
    if (mode === 'pad' || mode === 'launch') rocket.group.rotation.set(0, 0.35, 0);
    else rocket.group.rotation.z = rotZ;
    rocket.update(t, thrust, boost);
    rocket.setOpacity(curOpacity);
    lastThrust = thrust;
    sfx.setThrust(clamp01((thrust / 1.6) * curOpacity));

    // ===== Camera + shake =====
    shakeAmp += (shakeTarget - shakeAmp) * damp(shakeTarget > shakeAmp ? 10 : 3, realDt);
    camera.position.copy(camPos);
    camera.lookAt(camLook);
    if (shakeAmp > 0.004) {
      const sx = Math.sin(t * 47.3) * 0.6 + Math.sin(t * 91.7 + 1.3) * 0.4 + (Math.random() - 0.5) * 0.5;
      const sy2 = Math.sin(t * 53.1 + 2.1) * 0.6 + Math.sin(t * 77.9) * 0.4 + (Math.random() - 0.5) * 0.5;
      camera.translateX(sx * shakeAmp * 0.12);
      camera.translateY(sy2 * shakeAmp * 0.12);
      camera.rotateZ(Math.sin(t * 29.0) * shakeAmp * 0.012);
      const px = sx * shakeAmp * 14;
      const py = sy2 * shakeAmp * 11;
      for (const el of shakeEls) el.style.transform = `translate3d(${px.toFixed(1)}px, ${py.toFixed(1)}px, 0) scale(${(1 + shakeAmp * 0.05).toFixed(3)})`;
    } else if (shakeEls[0].style.transform) for (const el of shakeEls) el.style.transform = '';
    camera.updateMatrixWorld();

    // ===== Backdrop =====
    sunDir.lerpVectors(SUN_DUSK, SUN_SPACE, sstep(0.5, 1, alt));
    sun.position.copy(camLook).addScaledVector(sunDir, 20);
    sun.target.position.copy(camLook);
    if (mode === 'pad' || mode === 'launch') {
      fill.position.set(4, 9, 10);
      fill.target.position.set(0, 2, 0);
      sun.position.set(-10, 4, -18);
      sun.target.position.set(0, 2, 0);
    } else {
      sun.position.copy(cur).add(tmp.set(-6, 7, 6));
      sun.target.position.copy(cur);
      fill.position.copy(cur).add(tmp.set(6, 2, -5));
      fill.target.position.copy(cur);
      pink.position.copy(cur).add(tmp.set(2.5, -2, 3.5));
    }
    const du2 = dome.mat.uniforms;
    du2.uAlt.value = alt;
    du2.uSunDir.value.copy(sunDir);
    du2.uTime.value = t;
    dome.mesh.position.copy(camera.position);
    const space = sstep(0.55, 0.95, alt);
    starFlow *= Math.exp(-realDt * 1.4);
    const su = stars.mat.uniforms;
    const warpSpeed = warpK * warpK * 900;
    tmp.set(0, -((sv * 60) / window.innerHeight) * 2 * view().h * 0.7 - starFlow * 40, warpSpeed);
    starOffset.addScaledVector(tmp, realDt);
    su.uOffset.value.copy(starOffset);
    su.uVel.value.copy(tmp);
    su.uStreak.value = 0.05 - warpK * 0.035;
    su.uBoost.value = warpK * 4;
    du2.uSunBoost.value = 1 - warpK;
    su.uAlpha.value = space;
    su.uTime.value = t;
    su.uPx.value = 1.5 * renderer.getPixelRatio();
    su.uRes.value.set(window.innerWidth * renderer.getPixelRatio(), window.innerHeight * renderer.getPixelRatio());
    sparks.mat.uniforms.uRes.value.copy(su.uRes.value);
    sparks.mat.uniforms.uWidth.value = 1.6 * renderer.getPixelRatio();
    const dmu = dust.mat.uniforms;
    dustOffset.x += realDt * 0.05;
    dustOffset.z += realDt * (0.15 + warpK * 40);
    dmu.uOffset.value.copy(dustOffset);
    dmu.uCenter.value.set(O.x, O.y, O.z + 5.5);
    dmu.uAlpha.value = (mode === 'fly' || mode === 'arrive' ? 1 : 0) * (lite ? 0.8 : 1);
    dmu.uTime.value = t;

    // ===== Particles =====
    const flamePos = rocket.group.localToWorld(tmp.copy(rocket.nozzle));
    for (const sys of [smoke, ground]) {
      sys.mat.uniforms.uFlamePos.value.copy(flamePos);
      sys.mat.uniforms.uFlamePow.value = thrust * curOpacity * (mode === 'launch' ? 1.1 : 0.32);
    }
    tmp2.copy(sunDir).transformDirection(camera.matrixWorldInverse);
    v2.set(tmp2.x, tmp2.y).normalize();
    for (const sys of [smoke, ground, clouds]) sys.mat.uniforms.uSunView.value.copy(v2);
    smoke.update(dt, mode === 'pad' ? 0.05 : 0);
    if (pad) ground.update(dt, 0.04);
    sparks.update(dt, mode === 'fly' || mode === 'arrive' ? -1.5 : -7);
    if (pad && !punched) clouds.update(dt);
    if (cut && pad) {
      // rushing away below as the flight rig climbs
      clouds.shift(0, -realDt * (6 + starFlow * 26), 0);
      clouds.mat.uniforms.uOpacity.value = 1 - sstep(0.3, 2.5, arriveT);
      if (arriveT > 3) disposePad();
    }

    // ===== Post =====
    flash *= Math.exp(-realDt * (cut && arriveT < 0.5 ? 2.5 : 5));
    const hazeOn = project(flamePos, v2);
    const tail = rocket.group.localToWorld(tmp2.copy(rocket.nozzle).add(down.clone().multiplyScalar(1.6 + thrust)));
    project(tail, v2b);
    const pr = renderer.getPixelRatio();
    du.uTime.value = t;
    du.uHazeO.value.set(v2.x / window.innerWidth, 1 - v2.y / window.innerHeight);
    const dx = v2b.x - v2.x;
    const dy = -(v2b.y - v2.y);
    const dl = Math.hypot(dx, dy) || 1;
    du.uHazeDir.value.set(dx / dl, dy / dl);
    du.uHazeLen.value = dl * pr * 1.4;
    du.uHazeW.value = Math.max(6, curScale * pxPerUnit() * 0.32) * pr;
    du.uHaze.value = hazeOn ? Math.min(1.2, thrust) * curOpacity * (mode === 'launch' ? 1.5 : 0.8) * pr : 0;
    du.uWarp.value = warpK;
    du.uAberr.value = shakeAmp * 0.012 + warpK * 0.05;
    // Lens flare from the sun
    tmp.copy(camera.position).addScaledVector(sunDir, 50);
    const sunOn = project(tmp, v2);
    const sx = v2.x / window.innerWidth;
    const syy = 1 - v2.y / window.innerHeight;
    const edge = sunOn ? sstep(-0.15, 0.05, Math.min(sx, syy, 1 - sx, 1 - syy)) : 0;
    fu.uSun.value.set(sx, syy);
    fu.uSunVis.value = edge * (space * 0.85 + (1 - space) * 0.1) * (1 - warpK);
    fu.uFlash.value = Math.min(1, flash);
    fu.uFlashCol.value.setRGB(0.92, 0.95, 1.0);
    fu.uTime.value = t;
    fu.uVignette.value = 0.5 + warpK * 0.4;
    du2.uFlash.value = 0;
    post.bloom.strength = (mode === 'pad' || mode === 'launch' ? 0.55 : 0.48) + warpK * 0.6;

    // ===== HUD telemetry =====
    hudAcc += realDt;
    if (hudAcc > 0.1) {
      hudAcc = 0;
      let altKm = 0;
      let velKms = 0;
      if (mode === 'pad' || mode === 'launch') {
        altKm = Math.max(0, cur.y - ROCKET_BASE) * 0.26;
        velKms = vel.y * 0.022;
      } else {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        altKm = 100 + (max > 0 ? sy / max : 0) * 380;
        if (mode === 'arrive' && withPad) altKm = THREE.MathUtils.lerp(12, altKm, sstep(0, 2.2, arriveT));
        velKms = 7.6 + Math.min(4, Math.abs(sv) * 0.06) + lastThrust * 0.15 + warpK * warpK * 290000;
      }
      const show = mode !== 'pad' && curOpacity > -1;
      window.dispatchEvent(new CustomEvent('nuuke:hud', { detail: { show, stage: hudStage, alt: altKm, vel: velKms, t: now / 1000 - missionT0 } }));
    }

    // ===== Porthole film callback =====
    if (portholeFn) {
      const on = film > 0 && film < 1;
      if (on) {
        const pw = rocket.porthole.getWorldPosition(tmp);
        const vis = project(pw, v2);
        tmp2.setFromMatrixColumn(camera.matrixWorld, 0).multiplyScalar(rocket.portholeRadius * curScale).add(pw);
        project(tmp2, v2b);
        const open = sstep(0.3, 0.45, film) * (1 - sstep(0.82, 0.92, film));
        const normal = tmp2.set(0, 0, 1).transformDirection(rocket.porthole.matrixWorld);
        const toCam = tmp3.copy(camera.position).sub(pw).normalize();
        portholeFn({ x: v2.x, y: v2.y, r: Math.hypot(v2b.x - v2.x, v2b.y - v2.y), open, visible: vis && (curOpacity > 0.02 || open > 0.5), facing: normal.dot(toCam), near: sstep(0.12, 0.26, film) * (1 - sstep(0.9, 0.98, film)) });
      } else portholeFn({ x: 0, y: 0, r: 0, open: 0, visible: false, facing: 0, near: 0 });
    }
  });

  if (qs.has('hjdebug')) (window as unknown as { __hj: unknown }).__hj = () => ({ mode, film, curOpacity, finale, warpT, seq, fov: camera.fov, cam: camera.position.toArray(), rocket: cur.toArray(), scale: curScale });

  return {
    setLoad: (p) => (load = p),
    launch: () =>
      new Promise((res) => {
        if (mode !== 'pad') return res();
        launchResolve = res;
        mode = 'launch';
        seq = 0;
        sfx.ignition(IGNITION);
        missionT0 = performance.now() / 1000 + IGNITION;
      }),
    skip: () => {
      if (mode === 'launch') timeScale = 3.2;
    },
    skipLaunch: () => {
      disposePad();
      mode = 'arrive';
      arriveT = 0;
      setPhaseLook(true);
      alt = 1;
      const { h } = view();
      cur.set(O.x, O.y - h - 3, 0);
      flyCam(camPos, camLook, 0);
      missionT0 = performance.now() / 1000 - 30;
    },
    setFinale: (p, target) => {
      finale = p;
      finaleTarget = target;
      if (p > 0.8 && !landed && finaleTarget) {
        landed = true;
        sfx.land();
      } else if (p < 0.5) landed = false;
    },
    setFilm: (p) => (film = p),
    onPorthole: (fn) => (portholeFn = fn),
    warp: (onDrop) => {
      if (warpT >= 0) return;
      warpT = 0;
      warpDropped = false;
      warpDrop = onDrop;
      sfx.warp();
    },
    resetWarp: () => {
      warpT = -1;
      warpDropped = false;
      warpDrop = null;
    },
  };
}
