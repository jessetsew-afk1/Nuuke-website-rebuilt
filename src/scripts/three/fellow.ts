// Fellow Stagg EKG concept: a procedural kettle in a dark studio.
// One stage drives the whole case study: pipeline stages (blockout → final),
// colourways, 3-point light toggles, drag-to-orbit and a live 10-shot animatic.
import { createStage, THREE } from './core';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export type PipelineStage = 'blockout' | 'wireframe' | 'clay' | 'materials' | 'lighting' | 'final';
export type Colourway = 'black' | 'white' | 'copper' | 'blue';
export type LightName = 'key' | 'fill' | 'rim';
export type DockName = 'story' | 'lookdev' | 'lighting' | 'animatic';
export type TimeInfo = { t: number; shot: number; local: number; playing: boolean; active: boolean };

export type FellowOptions = {
  shots: { dur: number }[];
  stage: PipelineStage;
  colour: Colourway;
  lights: Record<LightName, boolean>;
  accent: string;
  onTime: (info: TimeInfo) => void;
};

export type FellowApi = {
  setStage: (s: PipelineStage) => void;
  setColour: (c: Colourway) => void;
  setLight: (n: LightName, on: boolean) => void;
  setDock: (d: DockName) => void;
  play: (from?: number) => void;
  pause: () => void;
  seek: (t: number) => void;
  showShot: (i: number) => void;
  snapshots: () => { clay: string; final: string } | null;
  triangles: { blockout: number; detail: number };
  duration: number;
  time: () => number;
  playing: () => boolean;
};

type Look = 'block' | 'wire' | 'clay' | 'pbr';
type Part = 'shell' | 'knob' | 'grip' | 'base' | 'dial' | 'notch' | 'lcd';

const STAGES: Record<PipelineStage, { look: Look; env: number; key: number; fill: number; rim: number; glow: number; gizmo: number; final: number }> = {
  blockout: { look: 'block', env: 0.75, key: 1, fill: 1, rim: 0.5, glow: 0.12, gizmo: 0, final: 0 },
  wireframe: { look: 'wire', env: 0.75, key: 1, fill: 1, rim: 0.5, glow: 0.1, gizmo: 0, final: 0 },
  clay: { look: 'clay', env: 0.45, key: 1, fill: 1, rim: 1, glow: 0.2, gizmo: 0, final: 0 },
  materials: { look: 'pbr', env: 1.5, key: 0.08, fill: 0.08, rim: 0.12, glow: 0.12, gizmo: 0, final: 0 },
  lighting: { look: 'pbr', env: 0.28, key: 1.1, fill: 1, rim: 1.2, glow: 0.3, gizmo: 1, final: 0 },
  final: { look: 'pbr', env: 0.42, key: 1, fill: 0.85, rim: 1.25, glow: 0.6, gizmo: 0, final: 1 },
};

const COLOURS: Record<Colourway, { body: number; metal: number; rough: number; coat: number; base: number; wood: number }> = {
  black: { body: 0x1c1c1c, metal: 0.25, rough: 0.5, coat: 0.15, base: 0x151515, wood: 0 },
  white: { body: 0xedebe6, metal: 0, rough: 0.55, coat: 0.1, base: 0xe4e1db, wood: 0 },
  copper: { body: 0xb87333, metal: 1, rough: 0.2, coat: 0.3, base: 0x151515, wood: 0 },
  blue: { body: 0x7e93a3, metal: 0.1, rough: 0.5, coat: 0.15, base: 0x6e8292, wood: 1 },
};
const CAROUSEL: Colourway[] = ['black', 'white', 'copper', 'blue'];

type Pose = {
  lift: number; tilt: number; spin: number; lid: number; water: number; xray: number; element: number; convect: number;
  hold: number; dial: number; setT: number; nowT: number; lcdOn: number; lcdHold: number; com: number; pour: number;
  bloom: number; dripper: number; steam: number; base: number;
  key: number; fill: number; rim: number; env: number; glow: number; gizmo: number; rimSweep: number;
};
const REST: Pose = {
  lift: 0, tilt: 0, spin: 0, lid: 0, water: 0, xray: 0, element: 0, convect: 0, hold: 0, dial: 0, setT: 205, nowT: 205, lcdOn: 1, lcdHold: 0,
  com: 0, pour: 0, bloom: 0, dripper: 0, steam: 0, base: 1, key: 1, fill: 1, rim: 1, env: 0.4, glow: 0.3, gizmo: 0, rimSweep: 1,
};

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const seg = (u: number, a: number, b: number) => clamp01((u - a) / (b - a));
const ease = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
const mix = (a: number, b: number, u: number) => a + (b - a) * u;
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/** Canvas helpers: soft radial sprite and a walnut grain strip. */
function radialTexture(inner: string, outer: string, size = 128) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grd.addColorStop(0, inner);
  grd.addColorStop(1, outer);
  g.fillStyle = grd;
  g.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function woodTexture() {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 256;
  const g = c.getContext('2d')!;
  g.fillStyle = '#6b4a35';
  g.fillRect(0, 0, 64, 256);
  for (let i = 0; i < 70; i++) {
    g.strokeStyle = `rgba(${40 + Math.random() * 30},${24 + Math.random() * 16},${14},${0.25 + Math.random() * 0.35})`;
    g.lineWidth = 0.6 + Math.random() * 1.6;
    const x = Math.random() * 64;
    g.beginPath();
    g.moveTo(x, 0);
    for (let y = 0; y <= 256; y += 16) g.lineTo(x + Math.sin(y * 0.03 + i) * 2.5, y);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// ---------- Shared geometry (built once, used by both render rigs) ----------
const BASE_W = 1.9;
const BASE_H = 0.32;
const BASE_D = 1.75;

function buildGeometry() {
  const body = new THREE.LatheGeometry(
    [V(0, 0, 0), V(0.6, 0, 0), V(0.7, 0.015, 0), V(0.748, 0.06, 0), V(0.76, 0.13, 0), V(0.76, 1.12, 0), V(0.755, 1.17, 0), V(0.735, 1.2, 0), V(0.69, 1.215, 0), V(0.665, 1.215, 0)].map((v) => new THREE.Vector2(v.x, v.y)),
    72,
  );
  const lid = new THREE.LatheGeometry([V(0.0, 1.258, 0), V(0.56, 1.258, 0), V(0.645, 1.248, 0), V(0.68, 1.228, 0), V(0.688, 1.205, 0)].map((v) => new THREE.Vector2(v.x, v.y)), 64);
  const knob = new THREE.LatheGeometry([V(0, 1.25, 0), V(0.1, 1.25, 0), V(0.112, 1.265, 0), V(0.112, 1.33, 0), V(0.1, 1.35, 0), V(0, 1.356, 0)].map((v) => new THREE.Vector2(v.x, v.y)), 40);

  const spoutCurve = new THREE.CatmullRomCurve3(
    [V(-0.58, 0.22, 0), V(-0.86, 0.25, 0), V(-1.1, 0.4, 0), V(-1.27, 0.72, 0), V(-1.37, 1.06, 0), V(-1.45, 1.27, 0), V(-1.6, 1.37, 0), V(-1.77, 1.37, 0), V(-1.88, 1.33, 0)],
    false,
    'centripetal',
  );
  const SEG = 140;
  const RAD = 14;
  const R0 = 0.072;
  const spout = new THREE.TubeGeometry(spoutCurve, SEG, R0, RAD, false);
  {
    // Taper the gooseneck toward a pointed tip.
    const pos = spout.attributes.position;
    const p = new THREE.Vector3();
    for (let i = 0; i <= SEG; i++) {
      const u = i / SEG;
      spoutCurve.getPointAt(u, p);
      const r = mix(0.072, 0.026, Math.pow(u, 0.9)) * (u < 0.1 ? 1 + (0.1 - u) * 3 : 1);
      for (let j = 0; j <= RAD; j++) {
        const k = i * (RAD + 1) + j;
        pos.setXYZ(k, p.x + (pos.getX(k) - p.x) * (r / R0), p.y + (pos.getY(k) - p.y) * (r / R0), p.z + (pos.getZ(k) - p.z) * (r / R0));
      }
    }
    spout.computeVertexNormals();
  }
  const handleCurve = new THREE.CatmullRomCurve3(
    [V(0.6, 1.04, 0), V(0.86, 1.06, 0), V(1.12, 1.07, 0), V(1.28, 0.98, 0), V(1.33, 0.75, 0), V(1.3, 0.5, 0), V(1.18, 0.36, 0), V(0.95, 0.32, 0), V(0.6, 0.32, 0)],
    false,
    'centripetal',
  );
  const handle = new THREE.TubeGeometry(handleCurve, 96, 0.04, 10, false);
  const grip = new THREE.CapsuleGeometry(0.075, 0.42, 8, 18);
  const base = new RoundedBoxGeometry(BASE_W, BASE_H, BASE_D, 4, 0.07);
  const dial = new THREE.CylinderGeometry(0.11, 0.115, 0.08, 40).rotateX(Math.PI / 2).translate(0, 0, 0.04);
  const notch = new THREE.BoxGeometry(0.018, 0.06, 0.012).translate(0, 0.05, 0.084);
  const lcd = new THREE.PlaneGeometry(0.46, 0.2);

  // Blockout primitives: deliberately low-poly.
  const cylBetween = (a: THREE.Vector3, b: THREE.Vector3, r: number) => {
    const g = new THREE.CylinderGeometry(r, r, a.distanceTo(b), 6, 1);
    const m = new THREE.Matrix4().lookAt(a, b, new THREE.Vector3(0, 0, 1));
    g.rotateX(Math.PI / 2).applyMatrix4(m).translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
    return g;
  };
  const poly = (c: THREE.Curve<THREE.Vector3>, n: number, r: number) => {
    const pts = c.getSpacedPoints(n);
    return pts.slice(1).map((p, i) => cylBetween(pts[i], p, r));
  };
  const block = {
    base: new THREE.BoxGeometry(BASE_W, BASE_H, BASE_D).translate(0, BASE_H / 2, 0),
    body: new THREE.CylinderGeometry(0.76, 0.76, 1.215, 8).translate(0, 0.6075, 0),
    lid: new THREE.CylinderGeometry(0.66, 0.66, 0.06, 8).translate(0, 1.24, 0),
    knob: new THREE.BoxGeometry(0.2, 0.1, 0.2).translate(0, 1.3, 0),
    spout: poly(spoutCurve, 4, 0.055),
    handle: poly(handleCurve, 4, 0.05),
    dial: new THREE.CylinderGeometry(0.11, 0.11, 0.08, 6).rotateX(Math.PI / 2).translate(0, 0, 0.04),
  };
  const tip = spoutCurve.getPointAt(1);
  const tipDir = spoutCurve.getTangentAt(1);
  return { body, lid, knob, spout, handle, grip, base, dial, notch, lcd, block, tip, tipDir };
}
type Geo = ReturnType<typeof buildGeometry>;

type Rig = {
  root: THREE.Group;
  pivot: THREE.Group;
  lidG: THREE.Group;
  dialG: THREE.Group;
  detail: { mesh: THREE.Mesh; part: Part }[];
  block: THREE.Mesh[];
  baseMeshes: THREE.Object3D[];
  plane: THREE.Plane;
  look: Look;
  mats: Partial<Record<Look, Record<Part, THREE.Material>>>;
};

export function init(canvas: HTMLCanvasElement, opts: FellowOptions): FellowApi {
  const stage = createStage(canvas, { fov: 30, z: 8, alpha: false });
  const { scene, camera, renderer } = stage;
  // prefersReduced: no motion at all (instant changes, animatic steps through stills).
  // staticGL: core.ts renders on demand (software GL); we drive our own loop on user action.
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const staticGL = stage.reduced;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.localClippingEnabled = true;
  renderer.toneMappingExposure = 1.1;
  const BG = 0x0b0a09;
  scene.background = new THREE.Color(BG);
  scene.fog = new THREE.Fog(BG, 15, 34);
  const accent = new THREE.Color(opts.accent);

  const shotDur = opts.shots.map((s) => s.dur);
  const shotStart = shotDur.map((_, i) => shotDur.slice(0, i).reduce((a, b) => a + b, 0));
  const duration = shotDur.reduce((a, b) => a + b, 0);

  const geo: Geo = buildGeometry();

  // ---------- Studio: seamless cyclorama, glow, contact shadow ----------
  {
    const prof: [number, number][] = [[0, 16], [0, -3]];
    const R = 4.5;
    for (let i = 1; i <= 18; i++) {
      const a = (i / 18) * (Math.PI / 2);
      prof.push([R - Math.cos(a) * R, -3 - Math.sin(a) * R]);
    }
    prof.push([20, -3 - R]);
    const pos: number[] = [];
    const idx: number[] = [];
    prof.forEach(([y, z], k) => {
      pos.push(-24, y, z, 24, y, z);
      if (k) idx.push((k - 1) * 2, k * 2, (k - 1) * 2 + 1, (k - 1) * 2 + 1, k * 2, k * 2 + 1);
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    const cyc = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0x141210, roughness: 0.95, metalness: 0 }));
    cyc.receiveShadow = true;
    scene.add(cyc);
  }
  const glowMat = new THREE.MeshBasicMaterial({ map: radialTexture('rgba(255,190,130,1)', 'rgba(255,190,130,0)'), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, opacity: 0.3 });
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(14, 9), glowMat);
  glow.position.set(-0.4, 2.6, -6.5);
  scene.add(glow);
  const contact = new THREE.Mesh(
    new THREE.PlaneGeometry(3.4, 3.1),
    new THREE.MeshBasicMaterial({ map: radialTexture('rgba(0,0,0,0.85)', 'rgba(0,0,0,0)'), transparent: true, depthWrite: false }),
  );
  contact.rotation.x = -Math.PI / 2;
  contact.position.y = 0.004;
  scene.add(contact);

  // ---------- LCD (CanvasTexture) ----------
  const lcdCanvas = document.createElement('canvas');
  lcdCanvas.width = 256;
  lcdCanvas.height = 112;
  const lcdCtx = lcdCanvas.getContext('2d')!;
  const lcdTex = new THREE.CanvasTexture(lcdCanvas);
  lcdTex.colorSpace = THREE.SRGBColorSpace;
  let lcdKey = '';
  const drawLcd = (p: Pose) => {
    const on = p.lcdOn > 0.5 ? 1 : p.lcdOn > 0.05 ? (Math.random() > 0.5 ? 1 : 0.2) : 0;
    const key = `${on}|${Math.round(p.setT)}|${Math.round(p.nowT)}|${p.lcdHold > 0.5}|${Math.round(p.hold * 60)}`;
    if (key === lcdKey) return;
    lcdKey = key;
    const g = lcdCtx;
    g.fillStyle = '#060807';
    g.fillRect(0, 0, 256, 112);
    if (on) {
      g.globalAlpha = on;
      g.shadowColor = 'rgba(230,240,235,0.8)';
      g.shadowBlur = 8;
      g.fillStyle = '#eef3ee';
      g.font = '600 15px Inter, system-ui, sans-serif';
      g.fillText(p.lcdHold > 0.5 ? 'HOLD' : 'SET', 16, 30);
      g.font = '700 30px Inter, system-ui, sans-serif';
      g.fillText(p.lcdHold > 0.5 ? `${String(Math.max(0, 60 - Math.round(p.hold * 60))).padStart(2, '0')}:00` : `${Math.round(p.setT)}°`, 16, 76);
      g.font = '600 15px Inter, system-ui, sans-serif';
      g.fillText('NOW', 150, 30);
      g.font = '700 46px Inter, system-ui, sans-serif';
      g.fillText(`${Math.round(p.nowT)}°`, 146, 86);
      g.font = '500 12px Inter, system-ui, sans-serif';
      g.fillText('°F', 222, 102);
      g.globalAlpha = 1;
      g.shadowBlur = 0;
    }
    lcdTex.needsUpdate = true;
  };

  // ---------- Materials ----------
  const wood = woodTexture();
  const steelMat = () => new THREE.MeshPhysicalMaterial({ color: 0x9a9a9a, metalness: 0.9, roughness: 0.3 });
  const pbrMats: THREE.MeshPhysicalMaterial[] = []; // for x-ray + colour lerp
  const colourTargets: { shell: THREE.MeshPhysicalMaterial[]; knob: THREE.MeshPhysicalMaterial[]; grip: THREE.MeshPhysicalMaterial[]; base: THREE.MeshPhysicalMaterial[] } = { shell: [], knob: [], grip: [], base: [] };
  function makeLook(look: Look, plane: THREE.Plane): Record<Part, THREE.Material> {
    const clip = { clippingPlanes: [plane] };
    if (look === 'wire' || look === 'block') {
      const w = (c: THREE.ColorRepresentation, o = 0.75) => new THREE.MeshBasicMaterial({ color: c, wireframe: true, transparent: true, opacity: o, ...clip });
      const block = new THREE.MeshStandardMaterial({ color: 0x8c8c8c, roughness: 0.9, flatShading: true, ...clip });
      if (look === 'block') return { shell: block, knob: block, grip: block, base: block, dial: block, notch: block, lcd: block };
      return { shell: w(accent), knob: w(accent), grip: w(accent), base: w(0x7e93a3, 0.5), dial: w(0x7e93a3, 0.6), notch: w(0xffffff), lcd: w(0xffffff, 0.6) };
    }
    if (look === 'clay') {
      const c = new THREE.MeshStandardMaterial({ color: 0xc2bdb5, roughness: 0.82, side: THREE.DoubleSide, ...clip });
      const dark = new THREE.MeshStandardMaterial({ color: 0x55524e, roughness: 0.8, ...clip });
      return { shell: c, knob: c, grip: c, base: c, dial: c, notch: c, lcd: dark };
    }
    const shell = new THREE.MeshPhysicalMaterial({ color: 0x1c1c1c, roughness: 0.5, metalness: 0.2, clearcoat: 0.15, clearcoatRoughness: 0.4, side: THREE.DoubleSide, ...clip });
    const knob = new THREE.MeshPhysicalMaterial({ color: 0x1c1c1c, roughness: 0.5, ...clip });
    const grip = new THREE.MeshPhysicalMaterial({ color: 0x1c1c1c, roughness: 0.5, ...clip });
    const base = new THREE.MeshPhysicalMaterial({ color: 0x151515, roughness: 0.6, clearcoat: 0.1, ...clip });
    const dial = Object.assign(steelMat(), clip);
    const notch = new THREE.MeshBasicMaterial({ color: 0xf2f2f2, ...clip });
    const lcd = new THREE.MeshBasicMaterial({ map: lcdTex, toneMapped: false, ...clip });
    pbrMats.push(shell, knob, grip);
    colourTargets.shell.push(shell);
    colourTargets.knob.push(knob);
    colourTargets.grip.push(grip);
    colourTargets.base.push(base);
    return { shell, knob, grip, base, dial, notch, lcd };
  }

  // ---------- Two render rigs (old look above the scan line, new look below) ----------
  function buildRig(): Rig {
    const root = new THREE.Group();
    const pivot = new THREE.Group();
    pivot.position.y = BASE_H;
    root.add(pivot);
    const lidG = new THREE.Group();
    pivot.add(lidG);
    const dialG = new THREE.Group();
    dialG.position.set(0.55, BASE_H / 2, BASE_D / 2 - 0.004);
    root.add(dialG);
    const detail: Rig['detail'] = [];
    const block: THREE.Mesh[] = [];
    const baseMeshes: THREE.Object3D[] = [dialG];
    const add = (g: THREE.BufferGeometry, part: Part, parent: THREE.Object3D, setup?: (m: THREE.Mesh) => void) => {
      const m = new THREE.Mesh(g);
      m.castShadow = true;
      m.receiveShadow = true;
      setup?.(m);
      parent.add(m);
      detail.push({ mesh: m, part });
      return m;
    };
    add(geo.body, 'shell', pivot);
    add(geo.spout, 'shell', pivot);
    add(geo.handle, 'shell', pivot);
    add(geo.grip, 'grip', pivot, (m) => {
      m.position.set(1.33, 0.73, 0);
      m.rotation.z = -0.04;
    });
    add(geo.lid, 'shell', lidG);
    add(geo.knob, 'knob', lidG);
    baseMeshes.push(add(geo.base, 'base', root, (m) => (m.position.y = BASE_H / 2)));
    add(geo.dial, 'dial', dialG);
    add(geo.notch, 'notch', dialG);
    baseMeshes.push(
      add(geo.lcd, 'lcd', root, (m) => {
        m.position.set(-0.42, BASE_H / 2, BASE_D / 2 + 0.003);
        m.castShadow = false;
      }),
    );
    const addB = (g: THREE.BufferGeometry, parent: THREE.Object3D) => {
      const m = new THREE.Mesh(g);
      m.castShadow = true;
      m.receiveShadow = true;
      parent.add(m);
      block.push(m);
      return m;
    };
    baseMeshes.push(addB(geo.block.base, root));
    addB(geo.block.body, pivot);
    addB(geo.block.lid, lidG);
    addB(geo.block.knob, lidG);
    geo.block.spout.forEach((g) => addB(g, pivot));
    geo.block.handle.forEach((g) => addB(g, pivot));
    addB(geo.block.dial, dialG);
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 1000);
    const rig: Rig = { root, pivot, lidG, dialG, detail, block, baseMeshes, plane, look: 'pbr', mats: {} };
    scene.add(root);
    return rig;
  }
  const rigs: [Rig, Rig] = [buildRig(), buildRig()];
  (['block', 'wire', 'clay', 'pbr'] as Look[]).forEach((l) => rigs.forEach((r) => (r.mats[l] = makeLook(l, r.plane))));
  const woodMat = (m: THREE.MeshPhysicalMaterial, on: boolean) => {
    if (on && !m.map) {
      m.map = wood;
      m.needsUpdate = true;
    } else if (!on && m.map) {
      m.map = null;
      m.needsUpdate = true;
    }
  };
  function applyLook(r: Rig, look: Look) {
    r.look = look;
    const mats = r.mats[look]!;
    r.detail.forEach(({ mesh, part }) => {
      mesh.material = mats[part];
      mesh.visible = look !== 'block';
      mesh.castShadow = look !== 'wire' && part !== 'lcd';
    });
    r.block.forEach((m) => {
      m.material = mats.shell;
      m.visible = look === 'block';
    });
  }
  const triCount = (ms: THREE.Mesh[]) => ms.reduce((a, m) => a + (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3, 0);
  const triangles = { blockout: Math.round(triCount(rigs[0].block)), detail: Math.round(triCount(rigs[0].detail.map((d) => d.mesh))) };

  // ---------- Internals: element, water, convection (live in rig 0's pivot) ----------
  const host = rigs[0].pivot;
  const elementMat = new THREE.MeshBasicMaterial({ color: 0x000000, toneMapped: false });
  const element = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.028, 10, 64), elementMat);
  element.rotation.x = Math.PI / 2;
  element.position.y = 0.07;
  host.add(element);
  const elementLight = new THREE.PointLight(0xff7a2e, 0, 2.2, 2);
  elementLight.position.y = 0.25;
  host.add(elementLight);
  const water = new THREE.Mesh(
    new THREE.CylinderGeometry(0.735, 0.735, 1, 48),
    new THREE.MeshPhysicalMaterial({ color: 0x8fb8d6, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.5, depthWrite: false }),
  );
  host.add(water);
  const CN = 80;
  const cPos = new Float32Array(CN * 3);
  const cCol = new Float32Array(CN * 3);
  const cSeed = Array.from({ length: CN }, () => ({ a: Math.random() * Math.PI * 2, r: Math.random() * 0.55, y: Math.random(), s: 0.25 + Math.random() * 0.35 }));
  const cGeo = new THREE.BufferGeometry();
  cGeo.setAttribute('position', new THREE.BufferAttribute(cPos, 3));
  cGeo.setAttribute('color', new THREE.BufferAttribute(cCol, 3));
  const sprite = radialTexture('rgba(255,255,255,1)', 'rgba(255,255,255,0)', 64);
  const convection = new THREE.Points(cGeo, new THREE.PointsMaterial({ size: 0.07, map: sprite, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  host.add(convection);
  const tipObj = new THREE.Object3D();
  tipObj.position.copy(geo.tip).addScaledVector(geo.tipDir, 0.01);
  host.add(tipObj);
  const comLocal = V(0.2, 0.55, 0);

  // ---------- Pour rig: dripper on a mug, stream, bloom ----------
  const pourPose = { lift: 0.55, tilt: 0.42 };
  host.position.y = BASE_H + pourPose.lift;
  host.rotation.z = pourPose.tilt;
  scene.updateMatrixWorld(true);
  const pourTip = tipObj.getWorldPosition(new THREE.Vector3());
  host.position.y = BASE_H;
  host.rotation.z = 0;
  const dripX = pourTip.x;
  const ceramic = new THREE.MeshPhysicalMaterial({ color: 0xf1eee8, roughness: 0.3, clearcoat: 0.6, side: THREE.DoubleSide });
  const clayDrip = new THREE.MeshStandardMaterial({ color: 0xc2bdb5, roughness: 0.82, side: THREE.DoubleSide });
  const mugMat = new THREE.MeshPhysicalMaterial({ color: 0x2b2a28, roughness: 0.45, clearcoat: 0.4, side: THREE.DoubleSide });
  const dripper = new THREE.Group();
  dripper.position.set(dripX, 0, pourTip.z);
  const mug: THREE.Mesh<THREE.BufferGeometry, THREE.Material> = new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(0, 0), new THREE.Vector2(0.3, 0), new THREE.Vector2(0.33, 0.03), new THREE.Vector2(0.33, 0.5), new THREE.Vector2(0.3, 0.5), new THREE.Vector2(0.3, 0.06), new THREE.Vector2(0, 0.06)], 40), mugMat);
  const cone: THREE.Mesh<THREE.BufferGeometry, THREE.Material> = new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(0.38, 0.5), new THREE.Vector2(0.12, 0.52), new THREE.Vector2(0.38, 0.86), new THREE.Vector2(0.41, 0.86), new THREE.Vector2(0.16, 0.5)], 40), ceramic);
  const bloom = new THREE.Mesh(new THREE.CircleGeometry(0.26, 32), new THREE.MeshStandardMaterial({ color: 0x3e2716, roughness: 1 }));
  bloom.rotation.x = -Math.PI / 2;
  bloom.position.y = 0.66;
  [mug, cone].forEach((m) => {
    m.castShadow = true;
    m.receiveShadow = true;
  });
  dripper.add(mug, cone, bloom);
  scene.add(dripper);
  const streamMat = new THREE.MeshPhysicalMaterial({ color: 0xd8ecff, roughness: 0.05, transparent: true, opacity: 0.75, emissive: 0x223344 });
  const stream = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 10, 1, true), streamMat);
  scene.add(stream);

  // ---------- Steam ----------
  const SN = 110;
  const sPos = new Float32Array(SN * 3);
  const sCol = new Float32Array(SN * 3);
  const sP = Array.from({ length: SN }, () => ({ life: Math.random(), span: 2.5 + Math.random() * 2, v: new THREE.Vector3() }));
  const sGeo = new THREE.BufferGeometry();
  sGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
  sGeo.setAttribute('color', new THREE.BufferAttribute(sCol, 3));
  const steam = new THREE.Points(sGeo, new THREE.PointsMaterial({ size: 0.8, map: sprite, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  steam.frustumCulled = false;
  scene.add(steam);
  for (let i = 0; i < SN; i++) sPos[i * 3 + 1] = -10;

  // ---------- Scan line for stage transitions ----------
  const scan = new THREE.Mesh(
    new THREE.PlaneGeometry(4.6, 3.4),
    new THREE.MeshBasicMaterial({ map: radialTexture('rgba(255,200,150,0.9)', 'rgba(255,200,150,0)'), color: accent, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
  );
  scan.rotation.x = -Math.PI / 2;
  scan.position.x = -0.3;
  scan.visible = false;
  scene.add(scan);

  // ---------- COM marker + HOLD ring ----------
  const comG = new THREE.Group();
  const comMat = new THREE.MeshBasicMaterial({ color: accent, transparent: true, toneMapped: false, depthTest: false });
  comG.add(new THREE.Mesh(new THREE.SphereGeometry(0.075, 20, 12), comMat));
  const comRing = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.012, 8, 48), comMat);
  comG.add(comRing);
  scene.add(comG);
  const comLineGeo = new THREE.BufferGeometry().setFromPoints([V(0, 0, 0), V(0, -1, 0)]);
  const comLine = new THREE.Line(comLineGeo, new THREE.LineDashedMaterial({ color: accent, dashSize: 0.05, gapSize: 0.04, transparent: true, depthTest: false }));
  comG.renderOrder = comLine.renderOrder = 10;
  comG.children.forEach((c) => (c.renderOrder = 10));
  comLine.computeLineDistances();
  scene.add(comLine);
  const holdMat = new THREE.MeshBasicMaterial({ color: accent, transparent: true, toneMapped: false, side: THREE.DoubleSide });
  const holdTrack = new THREE.Mesh(new THREE.RingGeometry(1.42, 1.46, 128), new THREE.MeshBasicMaterial({ color: 0x3a342e, transparent: true, side: THREE.DoubleSide }));
  holdTrack.rotation.x = -Math.PI / 2;
  holdTrack.position.y = 0.006;
  scene.add(holdTrack);
  const holdRing = new THREE.Mesh(new THREE.RingGeometry(1.4, 1.48, 4, 1, 0, 0.01), holdMat);
  holdRing.rotation.x = -Math.PI / 2;
  holdRing.position.y = 0.008;
  scene.add(holdRing);
  let holdBuilt = -1;

  // ---------- Lights + softbox gizmos ----------
  const target = V(-0.2, 0.9, 0);
  const key = new THREE.DirectionalLight(0xfff0dc, 2.6);
  key.position.set(3.4, 5.2, 4.4);
  key.target.position.copy(target);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -3.6, right: 3.6, top: 3.6, bottom: -3.6, near: 1, far: 16 });
  key.shadow.camera.updateProjectionMatrix();
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02;
  const fill = new THREE.DirectionalLight(0xbfd3ff, 0.8);
  fill.position.set(-5, 2.4, 3.6);
  fill.target.position.copy(target);
  const rimL = new THREE.SpotLight(0xffe3c6, 90, 0, 0.55, 0.7, 2);
  rimL.position.set(-3.4, 3.2, -3.6);
  rimL.target.position.set(-1, 1, 0);
  const rimR = new THREE.SpotLight(0xffffff, 55, 0, 0.55, 0.7, 2);
  rimR.position.set(3, 2.6, -3.6);
  rimR.target.position.set(0.5, 1, 0);
  scene.add(key, key.target, fill, fill.target, rimL, rimL.target, rimR, rimR.target);
  const BASES = { key: 2.6, fill: 0.8, rimL: 90, rimR: 55 };

  const gizmos: { mat: THREE.MeshBasicMaterial; line: THREE.LineBasicMaterial; name: LightName; color: THREE.Color }[] = [];
  const softbox = (name: LightName, from: THREE.Vector3, w: number, h: number, color: number) => {
    const dir = from.clone().sub(target).normalize();
    const p = target.clone().addScaledVector(dir, 4.3);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, side: THREE.DoubleSide, toneMapped: false, depthWrite: false });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    m.position.copy(p);
    m.lookAt(target);
    const line = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0 });
    const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([p, target]), line);
    scene.add(m, l);
    gizmos.push({ mat, line, name, color: new THREE.Color(color) });
  };
  softbox('key', key.position, 1.0, 0.7, 0xf0b77a);
  softbox('fill', fill.position, 0.9, 0.9, 0x9fc0ff);
  softbox('rim', rimL.position, 0.35, 1.6, 0xffffff);
  softbox('rim', rimR.position, 0.35, 1.6, 0xffffff);

  // ---------- State ----------
  const state = {
    stage: opts.stage,
    colour: opts.colour,
    lights: { ...opts.lights },
    dock: 'lookdev' as DockName,
    anim: { active: false, playing: false, t: 3 },
    user: { theta: 0, phi: 0 },
  };
  const pose: Pose = { ...REST };
  const camPos = new THREE.Vector3(4, 2, 7);
  const camTgt = target.clone();
  const curCol = { body: new THREE.Color(COLOURS[opts.colour].body), base: new THREE.Color(COLOURS[opts.colour].base), metal: 0, rough: 0.5, coat: 0.1, wood: COLOURS[opts.colour].wood };
  let sweep = { active: false, p: 0 };
  let front = 0;
  applyLook(rigs[0], STAGES[state.stage].look);
  applyLook(rigs[1], STAGES[state.stage].look);
  rigs[1].root.visible = false;

  const PRESETS: Record<DockName, { theta: number; phi: number; r: number; t: [number, number, number] }> = {
    story: { theta: 0.3, phi: 1.28, r: 7.4, t: [-0.3, 0.9, 0] },
    lookdev: { theta: 0.45, phi: 1.24, r: 7.2, t: [-0.3, 0.85, 0] },
    lighting: { theta: -0.3, phi: 0.92, r: 12, t: [-0.1, 0.9, 0] },
    animatic: { theta: 0.3, phi: 1.28, r: 7.4, t: [-0.3, 0.9, 0] },
  };

  // ---------- Animatic: one function per shot → pose + camera ----------
  type Cam = [number, number, number, number, number, number];
  const camLerp = (a: Cam, b: Cam, u: number): Cam => a.map((v, i) => mix(v, b[i], ease(u))) as Cam;
  const SHOTS: ((u: number, p: Pose) => Cam)[] = [
    (u, p) => {
      Object.assign(p, { key: 0, fill: 0, rim: seg(u, 0, 0.6) * 2.6, env: 0.03, glow: 0.12, base: 0, lift: -BASE_H, lcdOn: 0, rimSweep: u });
      return camLerp([0.3, 1.05, 6.4, -0.45, 0.95, 0], [-0.1, 1.1, 5.0, -0.5, 1.0, 0], u);
    },
    (u, p) => {
      Object.assign(p, { base: 0, lift: -BASE_H, lcdOn: 0, lid: ease(seg(u, 0.1, 0.45)), water: mix(0.12, 0.85, seg(u, 0.3, 1)), env: 0.45, glow: 0.2 });
      return camLerp([0.9, 2.05, 1.6, 0, 0.95, 0], [0.35, 2.3, 0.75, 0, 0.8, 0], u);
    },
    (u, p) => {
      const d = seg(u, 0, 0.45);
      const bounce = d < 1 ? 1 - ease(d) + Math.sin(d * Math.PI) * 0.06 : 0;
      Object.assign(p, { lift: 0.75 * bounce, lcdOn: seg(u, 0.5, 0.65), setT: 205, nowT: 68, water: 0.85 });
      return camLerp([0.1, 1.0, 4.6, -0.15, 0.6, 0.3], [-0.5, 0.45, 2.5, -0.42, 0.18, 0.85], u);
    },
    (u, p) => {
      const down = ease(seg(u, 0.1, 0.5));
      const up = ease(seg(u, 0.5, 0.9));
      const setT = 205 - 70 * down + 70 * up;
      Object.assign(p, { setT, nowT: 68, dial: ((setT - 205) / 77) * 2.4, water: 0.85 });
      return camLerp([1.35, 0.6, 2.05, 0.55, 0.17, 0.9], [0.95, 0.42, 1.8, 0.55, 0.16, 0.9], u);
    },
    (u, p) => {
      const a = mix(0.9, -0.5, ease(u));
      Object.assign(p, { setT: 205, nowT: 68 + 137 * ease(seg(u, 0.2, 1)), xray: seg(u, 0, 0.25), element: seg(u, 0.1, 0.4), convect: seg(u, 0.2, 0.4), water: 0.85, key: 0.6, glow: 0.45 });
      return [Math.sin(a) * 4.6, 1.5, Math.cos(a) * 4.6, 0, 0.8, 0];
    },
    (u, p) => {
      Object.assign(p, { xray: 1 - seg(u, 0, 0.15), element: 1 - seg(u, 0, 0.15), hold: ease(seg(u, 0.2, 0.95)), lcdHold: u > 0.2 ? 1 : 0, nowT: 205, steam: 0.4, water: 0.85 });
      return camLerp([0.1, 5.2, 3.6, 0, 0.3, 0], [1.4, 4.6, 3.0, 0, 0.3, 0], u);
    },
    (u, p) => {
      Object.assign(p, { lift: 0.5 * ease(seg(u, 0, 0.2)), tilt: 0.36 * Math.sin(Math.PI * seg(u, 0.2, 0.9)), com: seg(u, 0.1, 0.2), water: 0.85 });
      return camLerp([0.2, 1.25, 5.7, -0.25, 1.05, 0], [0.05, 1.3, 5.3, -0.2, 1.05, 0], u);
    },
    (u, p) => {
      const k = ease(seg(u, 0, 0.3));
      Object.assign(p, { lift: pourPose.lift * k, tilt: pourPose.tilt * k, dripper: 1, pour: seg(u, 0.3, 0.36), bloom: seg(u, 0.45, 1), steam: seg(u, 0.3, 1), water: 0.85, glow: 0.5 });
      return camLerp([dripX - 0.5, 1.2, 3.4, dripX + 0.25, 0.95, 0], [dripX - 0.35, 0.95, 2.7, dripX + 0.1, 0.88, 0], u);
    },
    (u, p) => {
      const k = Math.min(3, Math.floor(u * 4));
      Object.assign(p, { spin: ease(u * 4 - k) * Math.PI * 2, glow: 0.45 });
      carousel = CAROUSEL[k];
      return [0.5, 1.35, 5.6, -0.2, 0.85, 0];
    },
    (u, p) => {
      Object.assign(p, { key: 1 - 0.4 * seg(u, 0.3, 1), steam: 0.3, glow: 0.6 });
      return camLerp([0, 1.4, 6.2, -0.2, 0.9, 0], [0, 1.75, 8.8, -0.2, 1.0, 0], u);
    },
  ];
  let carousel: Colourway | null = null;

  const shotAt = (t: number) => {
    let i = shotStart.length - 1;
    while (i > 0 && t < shotStart[i]) i--;
    return { i, u: clamp01((t - shotStart[i]) / shotDur[i]) };
  };

  // ---------- Targets ----------
  const tgtPose: Pose = { ...REST };
  const tgtCam = { pos: new THREE.Vector3(), tgt: new THREE.Vector3() };
  const spherical = new THREE.Spherical();
  function computeTargets(t: number) {
    Object.assign(tgtPose, REST);
    carousel = null;
    const aspect = camera.aspect;
    const widen = aspect < 0.8 ? 1.75 : aspect < 1.1 ? 1.45 : 1;
    if (state.anim.active) {
      const { i, u } = shotAt(state.anim.t);
      const c = SHOTS[i](u, tgtPose);
      tgtCam.tgt.set(c[3], c[4], c[5]);
      tgtCam.pos.set(c[0], c[1], c[2]).sub(tgtCam.tgt).multiplyScalar(widen).add(tgtCam.tgt);
    } else {
      const s = STAGES[state.stage];
      Object.assign(tgtPose, { env: s.env, key: s.key, fill: s.fill, rim: s.rim, glow: s.glow, gizmo: state.dock === 'lighting' || state.stage === 'lighting' ? 1 : 0 });
      if (s.final) Object.assign(tgtPose, { lift: pourPose.lift, tilt: pourPose.tilt, dripper: 1, pour: 1, bloom: 0.8, steam: 1 });
      const pr = PRESETS[state.dock];
      const drift = staticGL ? 0 : Math.sin(t * 0.25) * 0.06;
      spherical.set(pr.r * widen + (s.final ? 1 : 0), Math.min(1.5, Math.max(0.35, pr.phi + state.user.phi)), pr.theta + state.user.theta + drift);
      tgtCam.tgt.set(pr.t[0] + (s.final ? -0.75 : 0), pr.t[1], pr.t[2]);
      tgtCam.pos.setFromSpherical(spherical).add(tgtCam.tgt);
    }
    if (!state.lights.key) tgtPose.key = 0;
    if (!state.lights.fill) tgtPose.fill = 0;
    if (!state.lights.rim) tgtPose.rim = 0;
  }

  // ---------- Frame update ----------
  const tmp = new THREE.Vector3();
  const tmp2 = new THREE.Vector3();
  let elapsed = 0;
  let unsettled = 1;
  function update(dt: number, instant = false) {
    elapsed += dt;
    if (state.anim.playing) {
      state.anim.t += dt;
      if (state.anim.t >= duration) {
        state.anim.t = duration - 0.001;
        state.anim.playing = false;
      }
    }
    computeTargets(elapsed);
    const k = instant ? 1 : 1 - Math.exp(-dt * (state.anim.active ? (state.anim.playing ? 30 : 7) : 4));
    unsettled = sweep.active ? 1 : 0;
    (Object.keys(pose) as (keyof Pose)[]).forEach((n) => {
      const d = tgtPose[n] - pose[n];
      unsettled = Math.max(unsettled, Math.abs(d) / (n === 'setT' || n === 'nowT' ? 100 : 1));
      pose[n] += d * k;
    });
    if (state.anim.active && (state.anim.playing || instant)) {
      // Hard cuts between shots: snap discrete values.
      pose.base = tgtPose.base;
      pose.lcdHold = tgtPose.lcdHold;
      pose.spin = tgtPose.spin;
    }
    const kc = instant ? 1 : 1 - Math.exp(-dt * (state.anim.active ? (state.anim.playing ? 40 : 5) : 3.5));
    unsettled = Math.max(unsettled, camPos.distanceTo(tgtCam.pos), camTgt.distanceTo(tgtCam.tgt));
    camPos.lerp(tgtCam.pos, kc);
    camTgt.lerp(tgtCam.tgt, kc);
    camera.position.copy(camPos);
    camera.lookAt(camTgt);

    // Colourway (carousel overrides during shot 9).
    const cw = COLOURS[carousel ?? state.colour];
    const kk = instant ? 1 : 1 - Math.exp(-dt * (carousel ? 20 : 5));
    curCol.body.lerp(tmpCol.set(cw.body), kk);
    curCol.base.lerp(tmpCol.set(cw.base), kk);
    curCol.metal += (cw.metal - curCol.metal) * kk;
    curCol.rough += (cw.rough - curCol.rough) * kk;
    curCol.coat += (cw.coat - curCol.coat) * kk;
    curCol.wood += (cw.wood - curCol.wood) * kk;
    colourTargets.shell.forEach((m) => {
      m.color.copy(curCol.body);
      m.metalness = curCol.metal;
      m.roughness = curCol.rough;
      m.clearcoat = curCol.coat;
    });
    colourTargets.base.forEach((m) => m.color.copy(curCol.base));
    [...colourTargets.knob, ...colourTargets.grip].forEach((m) => {
      const w = curCol.wood > 0.5;
      woodMat(m, w);
      m.color.copy(w ? tmpCol.set(0xffffff) : curCol.body);
      m.metalness = w ? 0 : curCol.metal;
      m.roughness = w ? 0.55 : curCol.rough;
    });

    // X-ray.
    const xr = pose.xray;
    pbrMats.forEach((m) => {
      const tr = xr > 0.01;
      if (m.transparent !== tr) {
        m.transparent = tr;
        m.depthWrite = !tr;
        m.needsUpdate = true;
      }
      m.opacity = 1 - xr * 0.82;
    });

    // Rig poses (both rigs share the pose).
    rigs.forEach((r) => {
      r.root.rotation.y = pose.spin;
      r.pivot.position.y = BASE_H + pose.lift;
      r.pivot.rotation.z = pose.tilt;
      r.lidG.position.set(pose.lid * 0.28, pose.lid * 0.5, 0);
      r.lidG.rotation.z = -pose.lid * 0.35;
      r.dialG.rotation.z = pose.dial;
      const showBase = pose.base > 0.5;
      r.baseMeshes.forEach((m) => {
        if (m === r.dialG) m.visible = showBase;
        else (m as THREE.Mesh).visible = showBase && ((r.look === 'block') === r.block.includes(m as THREE.Mesh));
      });
    });
    contact.visible = pose.base > 0.5;
    drawLcd(pose);

    // Stage transition sweep.
    if (sweep.active) {
      sweep.p += instant ? 1 : dt / 1.15;
      const h = mix(-0.15, 2.4 + Math.max(0, pose.lift), ease(clamp01(sweep.p)));
      const back = 1 - front;
      rigs[front].plane.set(V(0, 1, 0), -h);
      rigs[back].plane.set(V(0, -1, 0), h);
      scan.visible = true;
      scan.position.y = h;
      (scan.material as THREE.MeshBasicMaterial).opacity = Math.sin(Math.PI * clamp01(sweep.p)) * 0.9;
      if (sweep.p >= 1) {
        sweep.active = false;
        rigs[front].root.visible = false;
        rigs[front].plane.set(V(0, 1, 0), 1000);
        rigs[back].plane.set(V(0, 1, 0), 1000);
        front = back;
        scan.visible = false;
      }
    }

    // Lights.
    key.intensity = BASES.key * pose.key;
    fill.intensity = BASES.fill * pose.fill;
    rimL.intensity = BASES.rimL * pose.rim;
    rimR.intensity = BASES.rimR * pose.rim * (state.anim.active && shotAt(state.anim.t).i === 0 ? 0.2 : 1);
    rimL.position.x = mix(-6.5, -3.4, pose.rimSweep);
    scene.environmentIntensity = pose.env;
    glowMat.opacity = pose.glow * 0.55;
    gizmos.forEach((g) => {
      const on = state.lights[g.name];
      g.mat.opacity = pose.gizmo * (on ? 0.95 : 0.18);
      g.line.opacity = pose.gizmo * (on ? 0.35 : 0.08);
      g.mat.visible = g.line.visible = pose.gizmo > 0.01;
    });

    // Internals.
    elementMat.color.setRGB(1.6 * pose.element, 0.45 * pose.element, 0.08 * pose.element);
    elementLight.intensity = pose.element * 3;
    element.visible = pose.element > 0.01;
    const lvl = pose.water;
    water.visible = lvl > 0.02 && (pose.lid > 0.05 || pose.xray > 0.05);
    water.scale.y = Math.max(0.01, lvl);
    water.position.y = 0.02 + lvl / 2;
    convection.visible = pose.convect > 0.01;
    if (convection.visible) {
      cSeed.forEach((s, i) => {
        s.y += dt * s.s * 0.6;
        if (s.y > 1) s.y -= 1;
        const r = s.r * (1 - 0.4 * Math.sin(s.y * Math.PI));
        const a = s.a + s.y * 2;
        cPos[i * 3] = Math.cos(a) * r;
        cPos[i * 3 + 1] = 0.1 + s.y * lvl * 0.95;
        cPos[i * 3 + 2] = Math.sin(a) * r;
        const heat = pose.convect * (1 - s.y * 0.6);
        cCol[i * 3] = heat * 0.9;
        cCol[i * 3 + 1] = heat * mix(0.32, 0.55, s.y);
        cCol[i * 3 + 2] = heat * mix(0.06, 0.3, s.y);
      });
      cGeo.attributes.position.needsUpdate = true;
      cGeo.attributes.color.needsUpdate = true;
    }

    // Dripper, stream, bloom.
    dripper.visible = pose.dripper > 0.02;
    dripper.scale.setScalar(Math.max(0.001, ease(clamp01(pose.dripper))));
    const pbr = STAGES[state.stage].look === 'pbr' || state.anim.active;
    cone.material = pbr ? ceramic : clayDrip;
    mug.material = pbr ? mugMat : clayDrip;
    bloom.scale.setScalar(0.55 + 0.45 * pose.bloom);
    bloom.position.y = 0.64 + 0.04 * pose.bloom;
    host.updateMatrixWorld(true);
    tipObj.getWorldPosition(tmp);
    const endY = 0.66;
    stream.visible = pose.pour > 0.05 && tmp.y > endY && pbr;
    if (stream.visible) {
      const len = tmp.y - endY;
      stream.position.set(tmp.x, endY + len / 2, tmp.z);
      const wob = 1 + Math.sin(elapsed * 30) * 0.08;
      stream.scale.set(0.011 * wob * pose.pour, len, 0.011 * wob * pose.pour);
      streamMat.opacity = 0.75 * pose.pour;
    }

    // COM marker.
    comG.visible = comLine.visible = pose.com > 0.02;
    if (comG.visible) {
      tmp2.copy(comLocal);
      host.localToWorld(tmp2);
      comG.position.copy(tmp2);
      comG.lookAt(camera.position);
      comMat.opacity = pose.com;
      comLine.position.copy(tmp2);
      comLine.scale.y = tmp2.y - BASE_H;
      (comLine.material as THREE.LineDashedMaterial).opacity = pose.com;
    }

    // HOLD ring.
    holdTrack.visible = holdRing.visible = pose.hold > 0.005;
    if (holdRing.visible && Math.abs(pose.hold - holdBuilt) > 0.004) {
      holdBuilt = pose.hold;
      holdRing.geometry.dispose();
      holdRing.geometry = new THREE.RingGeometry(1.4, 1.48, 128, 1, -Math.PI / 2, Math.max(0.001, pose.hold * Math.PI * 2));
    }
    holdMat.opacity = Math.min(1, pose.hold * 4);

    // Steam.
    const emitters: THREE.Vector3[] = [];
    if (pose.steam > 0.02) {
      if (pose.dripper > 0.5) emitters.push(V(dripX, 0.86, pourTip.z));
      else emitters.push(tmp.clone());
    }
    sP.forEach((s, i) => {
      s.life -= dt / s.span;
      if (s.life <= 0) {
        if (!emitters.length) {
          sPos[i * 3 + 1] = -10;
          s.life = Math.random();
          return;
        }
        const e = emitters[i % emitters.length];
        sPos[i * 3] = e.x + (Math.random() - 0.5) * 0.22;
        sPos[i * 3 + 1] = e.y + Math.random() * 0.1;
        sPos[i * 3 + 2] = e.z + (Math.random() - 0.5) * 0.22;
        s.v.set((Math.random() - 0.5) * 0.1, 0.18 + Math.random() * 0.22, (Math.random() - 0.5) * 0.1);
        s.life = 1;
      }
      sPos[i * 3] += (s.v.x + Math.sin(elapsed * 1.3 + i) * 0.05) * dt;
      sPos[i * 3 + 1] += s.v.y * dt;
      sPos[i * 3 + 2] += s.v.z * dt;
      const a = Math.pow(Math.sin(Math.PI * (1 - s.life)), 1.5) * 0.045 * pose.steam;
      sCol[i * 3] = sCol[i * 3 + 1] = sCol[i * 3 + 2] = Math.max(0, a);
    });
    sGeo.attributes.position.needsUpdate = true;
    sGeo.attributes.color.needsUpdate = true;
  }
  const tmpCol = new THREE.Color();

  // ---------- Drag to orbit ----------
  let down = false;
  let lx = 0;
  let ly = 0;
  let moved = 0;
  canvas.addEventListener('pointerdown', (e) => {
    down = true;
    moved = 0;
    lx = e.clientX;
    ly = e.clientY;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!down) return;
    const dx = e.clientX - lx;
    const dy = e.clientY - ly;
    lx = e.clientX;
    ly = e.clientY;
    moved += Math.abs(dx) + Math.abs(dy);
    if (state.anim.active && moved > 6) {
      state.anim.active = false;
      state.anim.playing = false;
      state.user.theta = 0;
      state.user.phi = 0;
      emit();
    }
    state.user.theta -= dx * 0.008;
    state.user.phi = Math.max(-0.8, Math.min(0.35, state.user.phi - dy * 0.004));
    kick();
  });
  const up = () => (down = false);
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);

  // ---------- Loop / reduced-motion handling ----------
  const emit = () => {
    const { i, u } = shotAt(state.anim.t);
    opts.onTime({ t: state.anim.t, shot: i, local: u, playing: state.anim.playing, active: state.anim.active });
  };
  let wasPlaying = false;
  let lastCoreTick = 0;
  let lastStepAt = performance.now();
  const step = () => {
    // Real elapsed time (not the core's clamped dt) so slow devices still finish moves on time.
    const now = performance.now();
    const dt = Math.min(staticGL ? 0.25 : 0.05, Math.max(0, (now - lastStepAt) / 1000));
    lastStepAt = now;
    update(prefersReduced ? 0 : dt, prefersReduced);
    if (state.anim.playing || wasPlaying) emit();
    wasPlaying = state.anim.playing;
  };
  stage.onFrame(() => {
    lastCoreTick = performance.now();
    step();
  });
  // Own loop for software-GL devices, only after an explicit action (and while the animatic plays).
  let driveUntil = 0;
  let driveRaf = 0;
  const driveTick = (now: number) => {
    driveRaf = 0;
    if (now - lastCoreTick > 40) {
      step();
      stage.render();
    }
    const busy = unsettled > 0.002 && now < driveUntil + 8000;
    if (now < driveUntil || state.anim.playing || busy) driveRaf = requestAnimationFrame(driveTick);
  };
  const drive = (ms: number) => {
    driveUntil = Math.max(driveUntil, performance.now() + ms);
    if (!driveRaf) driveRaf = requestAnimationFrame(driveTick);
  };
  const kick = (ms = 1600) => {
    if (prefersReduced) {
      update(0, true);
      stage.render();
    } else if (staticGL) drive(ms);
  };
  let stepTimer = 0;

  // Warm-up: settle everything and pre-roll the steam so the very first (possibly static) frame is complete.
  for (let i = 0; i < 40; i++) update(0.1, true);

  const api: FellowApi = {
    duration,
    triangles,
    time: () => state.anim.t,
    playing: () => state.anim.playing,
    setStage(s) {
      const prevLook = STAGES[state.stage].look;
      state.stage = s;
      state.anim.active = false;
      state.anim.playing = false;
      const look = STAGES[s].look;
      if (look !== prevLook || look !== rigs[front].look) {
        if (prefersReduced) {
          applyLook(rigs[front], look);
        } else {
          if (sweep.active) {
            // Finish the running sweep before starting a new one.
            sweep.p = 1;
            update(0);
          }
          const back = 1 - front;
          applyLook(rigs[back], look);
          rigs[back].root.visible = true;
          sweep = { active: true, p: 0 };
        }
      }
      emit();
      kick();
    },
    setColour(c) {
      state.colour = c;
      kick();
    },
    setLight(n, on) {
      state.lights[n] = on;
      kick();
    },
    setDock(d) {
      state.dock = d;
      state.user.theta = 0;
      state.user.phi = 0;
      if (d === 'lookdev' || d === 'lighting') {
        state.anim.active = false;
        state.anim.playing = false;
        emit();
      }
      kick();
    },
    play(from) {
      if (rigs[front].look !== 'pbr') api.setStage('final');
      state.anim.active = true;
      if (from !== undefined) state.anim.t = from;
      if (state.anim.t >= duration - 0.05) state.anim.t = 0;
      state.user.theta = state.user.phi = 0;
      if (prefersReduced) {
        // Reduced motion: step through shots as stills instead of animating.
        clearInterval(stepTimer);
        state.anim.playing = true;
        let i = shotAt(state.anim.t).i;
        const next = () => {
          if (i >= shotDur.length) {
            clearInterval(stepTimer);
            state.anim.playing = false;
            emit();
            return;
          }
          state.anim.t = shotStart[i] + shotDur[i] * 0.7;
          kick();
          emit();
          i++;
        };
        stepTimer = window.setInterval(next, 2600);
        next();
        return;
      }
      state.anim.playing = true;
      emit();
      kick();
    },
    pause() {
      clearInterval(stepTimer);
      state.anim.playing = false;
      emit();
      kick();
    },
    seek(t) {
      if (!Number.isFinite(t)) return;
      if (rigs[front].look !== 'pbr' && !sweep.active) api.setStage('final');
      state.anim.active = true;
      state.anim.t = Math.max(0, Math.min(duration - 0.001, t));
      emit();
      kick();
    },
    showShot(i) {
      clearInterval(stepTimer);
      state.anim.playing = false;
      api.seek(shotStart[i] + shotDur[i] * (i === 0 ? 0.85 : i === 8 ? 0.2 : 0.62));
    },
    snapshots() {
      try {
        const save = { stage: state.stage, anim: { ...state.anim }, dock: state.dock, user: { ...state.user }, lights: { ...state.lights } };
        const vis = rigs.map((r) => r.root.visible);
        const looks = rigs.map((r) => r.look);
        const size = renderer.getSize(new THREE.Vector2());
        const shoot = (look: Look) => {
          state.stage = 'final';
          state.anim.active = false;
          state.dock = 'lookdev';
          state.user = { theta: 0, phi: 0 };
          state.lights = { key: true, fill: true, rim: true };
          applyLook(rigs[0], look);
          rigs[0].root.visible = true;
          rigs[1].root.visible = false;
          renderer.setSize(960, 720, false);
          camera.aspect = 960 / 720;
          camera.updateProjectionMatrix();
          update(0, true);
          if (look === 'clay') {
            cone.material = mug.material = clayDrip;
            stream.visible = false;
            steam.visible = false;
            scene.environmentIntensity = 0.45;
            glowMat.opacity = 0.08;
          }
          renderer.render(scene, camera);
          steam.visible = true;
          return renderer.domElement.toDataURL('image/jpeg', 0.86);
        };
        const clay = shoot('clay');
        const fin = shoot('pbr');
        Object.assign(state, { stage: save.stage, dock: save.dock, user: save.user, lights: save.lights });
        state.anim = save.anim;
        rigs.forEach((r, i) => {
          applyLook(r, looks[i]);
          r.root.visible = vis[i];
        });
        renderer.setSize(size.x, size.y, false);
        camera.aspect = size.x / Math.max(1, size.y);
        camera.updateProjectionMatrix();
        update(0, true);
        stage.render();
        return { clay, final: fin };
      } catch {
        return null;
      }
    },
  };
  return api;
}
