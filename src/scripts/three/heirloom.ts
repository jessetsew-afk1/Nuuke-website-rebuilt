// Heirloom: the limestone loop as one scroll-driven diorama.
// Every station (rock pile, kiln, CO₂ tank, storage, hydrator, tray racks, robot)
// lives on a single floating slab. Scroll progress (0..1 → 8 beats) drives the
// camera and each station's state; time only drives ambient motion (particles,
// flicker). Budget: ~25 draw calls, one Points object for every particle,
// instancing for rocks and trays, DPR capped by createStage().
import { createStage, THREE } from './core';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export type Stats = { calls: number; triangles: number; points: number; dpr: number; particles: number };
export type LoopScene = {
  /** p = 0..1 across all beats. `instant` skips easing (reduced motion, jumps). */
  setProgress: (p: number, instant?: boolean) => void;
  reduced: boolean;
  dispose: () => void;
};
type InitOpts = {
  /** Small phone-mock canvas: fewer particles, no labels, no caption offset. */
  compact?: boolean;
  /** Container for world-anchored HTML labels. */
  labels?: HTMLElement | null;
  onStats?: (s: Stats) => void;
};

const BEATS = 8;
const C = {
  lime: 0xf2efe8,
  mineral: 0x8c8a85,
  charcoal: 0x1e1e1c,
  kiln: 0xd2691e,
  ember: 0xe2783a,
  air: 0xa9c1d9,
  water: 0x7fb8d8,
};

// ---------- small maths helpers ----------
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (v: number) => {
  const x = clamp01(v);
  return x * x * x * (x * (x * 6 - 15) + 10);
};
/** 0..1 progress of b inside [a, c]. */
const range = (b: number, a: number, c: number) => clamp01((b - a) / (c - a));
/** 1 inside [a, c], fading over `f` on both sides. */
const win = (b: number, a: number, c: number, f = 0.25) => clamp01(Math.min((b - a + f) / f, (c + f - b) / f));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function hash(x: number, y: number, z: number) {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return s - Math.floor(s);
}
function vnoise(x: number, y: number, z: number) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  const fx = x - ix, fy = y - iy, fz = z - iz;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy), sz = fz * fz * (3 - 2 * fz);
  let v = 0;
  for (let k = 0; k < 8; k++) {
    const dx = k & 1, dy = (k >> 1) & 1, dz = (k >> 2) & 1;
    const w = (dx ? sx : 1 - sx) * (dy ? sy : 1 - sy) * (dz ? sz : 1 - sz);
    v += w * hash(ix + dx, iy + dy, iz + dz);
  }
  return v;
}
let seed = 7;
const rand = () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};

// ---------- shared GLSL ----------
const NOISE_GLSL = /* glsl */ `
  float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float n2(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.-2.*f);
    return mix(mix(h2(i), h2(i+vec2(1,0)), u.x), mix(h2(i+vec2(0,1)), h2(i+vec2(1,1)), u.x), u.y); }
`;

/** A chunk of limestone: displaced icosahedron, cut by a few planes, faceted. */
function rockGeometry(s: number) {
  const g = new THREE.IcosahedronGeometry(1, 3);
  const pos = g.attributes.position;
  const v = new THREE.Vector3();
  const cuts = Array.from({ length: 4 }, (_, i) => ({
    n: new THREE.Vector3(Math.sin(s * 3 + i * 2.1), Math.cos(s * 5 + i * 1.3) * 0.8, Math.sin(s + i * 4.7)).normalize(),
    d: 0.62 + 0.18 * hash(s, i, 1),
  }));
  const colors = new Float32Array(pos.count * 3);
  const base = new THREE.Color(C.lime);
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const n = vnoise(v.x * 1.6 + s, v.y * 1.6, v.z * 1.6) * 0.45 + vnoise(v.x * 4 + s, v.y * 4, v.z * 4) * 0.12;
    v.multiplyScalar(0.78 + n);
    for (const c of cuts) {
      const d = v.dot(c.n);
      if (d > c.d) v.addScaledVector(c.n, c.d - d);
    }
    v.y *= 0.72;
    pos.setXYZ(i, v.x, v.y, v.z);
    const shade = 0.78 + 0.22 * vnoise(v.x * 6 + 9, v.y * 6, v.z * 6 + s);
    colors[i * 3] = base.r * shade;
    colors[i * 3 + 1] = base.g * shade * 0.995;
    colors[i * 3 + 2] = base.b * shade * 0.98;
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  g.computeVertexNormals();
  return g;
}

/** Sampled curve for cheap per-particle lookups. */
function sampled(points: [number, number, number][], n = 200, closed = false) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), closed, 'catmullrom', 0.3);
  const pts = curve.getSpacedPoints(n);
  const at = (t: number, out: THREE.Vector3) => {
    const x = clamp01(t) * n;
    const i = Math.min(n - 1, Math.floor(x));
    return out.lerpVectors(pts[i], pts[i + 1], x - i);
  };
  return { curve, at };
}

export function init(canvas: HTMLCanvasElement, opts: InitOpts = {}): LoopScene {
  const compact = !!opts.compact;
  const stage = createStage(canvas, { fov: 35, z: 20 });
  const { scene, camera, renderer, pointer } = stage;
  const small = window.innerWidth < 760;
  const lite = compact || small;
  const PCOUNT = lite ? 0.5 : 1;

  scene.fog = new THREE.Fog(0x151514, 38, 90);
  scene.environmentIntensity = 0.45;

  // ---------- lights ----------
  const hemi = new THREE.HemisphereLight(0xfaf7f0, 0x2a2622, 1.25);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffffff, 1.9);
  key.position.set(10, 18, 12);
  scene.add(key);
  const kilnLight = new THREE.PointLight(C.ember, 0, 18, 1.4);
  kilnLight.position.set(-6, 2.4, 0.6);
  scene.add(kilnLight);

  // ---------- diorama slab: strata on the side, grid on top ----------
  const R = 13;
  const strata: [number, number][] = [
    [0.28, 0x2c2b28], // pad
    [0.6, 0x3b3631], // clay
    [0.5, 0x544c41], // sandstone
    [0.62, 0x3e3d3b], // storage formation
    [0.65, 0x232220], // basement
  ];
  {
    const parts: THREE.BufferGeometry[] = [];
    let y = 0;
    strata.forEach(([h, col], i) => {
      const g = new THREE.CylinderGeometry(R, R, h, 120, 1, i !== strata.length - 1);
      g.translate(0, y - h / 2, 0);
      const c = new THREE.Color(col);
      const arr = new Float32Array(g.attributes.position.count * 3);
      for (let k = 0; k < arr.length; k += 3) {
        arr[k] = c.r;
        arr[k + 1] = c.g;
        arr[k + 2] = c.b;
      }
      g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
      parts.push(g);
      y -= h;
    });
    const slab = new THREE.Mesh(mergeGeometries(parts), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }));
    scene.add(slab);
    // Grid on the top surface.
    const cv = document.createElement('canvas');
    cv.width = cv.height = 1024;
    const ctx = cv.getContext('2d')!;
    ctx.fillStyle = '#262624';
    ctx.fillRect(0, 0, 1024, 1024);
    ctx.strokeStyle = 'rgba(242,239,232,0.07)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i <= 1024; i += 1024 / 26) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 1024);
      ctx.moveTo(0, i);
      ctx.lineTo(1024, i);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(242,239,232,0.22)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(512, 512, 506, 0, Math.PI * 2);
    ctx.stroke();
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    const top = new THREE.Mesh(new THREE.CircleGeometry(R, 120), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.92 }));
    top.rotation.x = -Math.PI / 2;
    top.position.y = 0.002;
    scene.add(top);
  }

  // ---------- contact shadows (one instanced call) ----------
  {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 128;
    const ctx = cv.getContext('2d')!;
    const gr = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(0,0,0,0.75)');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, 128, 128);
    const spots: [number, number, number, number][] = [
      [-9.4, 4.6, 5, 4.2], [-6, 0, 4.4, 4.4], [-5, -10, 3.2, 3.2], [-7.7, -9.2, 3, 3],
      [-1.4, -5.4, 3, 3], [4.5, -1, 8.5, 7.6], [0.4, 0.5, 2.2, 2.2],
    ];
    const g = new THREE.PlaneGeometry(1, 1);
    g.rotateX(-Math.PI / 2);
    const m = new THREE.InstancedMesh(g, new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false, opacity: 0.7 }), spots.length);
    const o = new THREE.Object3D();
    spots.forEach(([x, z, sx, sz], i) => {
      o.position.set(x, 0.01, z);
      o.scale.set(sx, 1, sz);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    });
    m.renderOrder = 1;
    scene.add(m);
  }

  const metalDark = new THREE.MeshStandardMaterial({ color: 0x3a3936, metalness: 0.65, roughness: 0.42 });
  const metalLight = new THREE.MeshStandardMaterial({ color: 0xd9d7d0, metalness: 0.35, roughness: 0.32 });
  const powderMat = new THREE.MeshStandardMaterial({ color: 0xfbfaf6, roughness: 1 });

  // ---------- 1 · limestone rocks (2 instanced variants) ----------
  const PILE = new THREE.Vector3(-9.4, 0, 4.6);
  const KILN = new THREE.Vector3(-6, 0, 0);
  const rockMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88, metalness: 0, flatShading: true });
  type Rock = { pos: THREE.Vector3; rot: THREE.Euler; s: number; travel: number };
  const rockSets = [rockGeometry(1.3), rockGeometry(4.1)].map((geo, v) => {
    const n = v === 0 ? 9 : 8;
    const mesh = new THREE.InstancedMesh(geo, rockMat, n);
    const rocks: Rock[] = [];
    for (let i = 0; i < n; i++) {
      const a = rand() * Math.PI * 2;
      const r = rand() * 2.1;
      const s = 0.38 + rand() * 0.55 + (i === 0 && v === 0 ? 0.35 : 0);
      rocks.push({
        pos: new THREE.Vector3(PILE.x + Math.cos(a) * r, s * 0.55 + (r < 1 ? 0.35 : 0), PILE.z + Math.sin(a) * r * 0.8),
        rot: new THREE.Euler(rand() * 3, rand() * 6, rand() * 3),
        s,
        travel: v === 0 && i >= 5 ? i - 5 : -1, // four rocks ride into the kiln
      });
    }
    scene.add(mesh);
    return { mesh, rocks };
  });

  // ---------- 2 · electric kiln ----------
  const kilnParts: { haze?: THREE.Mesh; coilMat?: THREE.MeshStandardMaterial } = {};
  const kilnHeat = { value: 0.1 };
  const time = { value: 0 };
  {
    const theta = Math.atan2(5, 7.2); // cut-away faces the kiln camera
    const gap = Math.PI * 0.5;
    const shell = new THREE.Mesh(
      new THREE.CylinderGeometry(1.35, 1.5, 4.6, 48, 1, true, theta + gap / 2, Math.PI * 2 - gap),
      new THREE.MeshStandardMaterial({ color: 0x34332f, metalness: 0.6, roughness: 0.45, side: THREE.DoubleSide }),
    );
    shell.position.set(KILN.x, 2.3, KILN.z);
    scene.add(shell);
    const linerMat = new THREE.ShaderMaterial({
      uniforms: { uTime: time, uHeat: kilnHeat },
      vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
      fragmentShader: /* glsl */ `
        varying vec2 vUv; uniform float uTime, uHeat; ${NOISE_GLSL}
        void main(){
          float n = n2(vec2(vUv.x*9., vUv.y*3. - uTime*.7))*.6 + n2(vec2(vUv.x*23., vUv.y*7. - uTime*1.1))*.4;
          float m = n2(vec2(vUv.x*31.+4., vUv.y*9. + uTime*.35));
          vec3 cold = vec3(.10,.085,.075);
          vec3 hot = mix(vec3(.85,.22,.03), vec3(1.,.72,.32), m*uHeat);
          float h = uHeat * (.62 + .38*n);
          vec3 col = mix(cold, hot*2.4, h) * (.55 + .7*(1.-vUv.y));
          gl_FragColor = vec4(col, 1.);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
      side: THREE.BackSide,
    });
    const liner = new THREE.Mesh(new THREE.CylinderGeometry(1.12, 1.24, 4.45, 40, 1, true), linerMat);
    liner.position.copy(shell.position);
    scene.add(liner);
    const floorGlow = new THREE.Mesh(new THREE.CircleGeometry(1.2, 32), linerMat);
    floorGlow.rotation.x = Math.PI / 2;
    floorGlow.position.set(KILN.x, 0.15, KILN.z);
    scene.add(floorGlow);
    // Electric heating elements: merged rings.
    const rings = mergeGeometries(
      Array.from({ length: 6 }, (_, i) => {
        const g = new THREE.TorusGeometry(1.08, 0.035, 6, 48);
        g.rotateX(Math.PI / 2);
        g.translate(0, 0.6 + i * 0.68, 0);
        return g;
      }),
    );
    const coilMat = new THREE.MeshStandardMaterial({ color: 0x2a1a10, emissive: new THREE.Color(C.ember), emissiveIntensity: 0 });
    const coils = new THREE.Mesh(rings, coilMat);
    coils.position.set(KILN.x, 0, KILN.z);
    scene.add(coils);
    // Top collar + base plinth + outlet chute (merged, dark metal).
    const collar = new THREE.TorusGeometry(1.42, 0.12, 8, 48);
    collar.rotateX(Math.PI / 2);
    collar.translate(KILN.x, 4.6, KILN.z);
    const plinth = new THREE.CylinderGeometry(1.75, 1.85, 0.3, 48);
    plinth.translate(KILN.x, 0.15, KILN.z);
    const chute = new THREE.BoxGeometry(0.5, 0.18, 1.1);
    chute.rotateX(0.45);
    chute.rotateY(-0.65);
    chute.translate(-4.95, 0.95, -1.15);
    scene.add(new THREE.Mesh(mergeGeometries([collar, plinth, chute]), metalDark));
    // Heat shimmer column.
    const haze = new THREE.Mesh(
      new THREE.PlaneGeometry(3.2, 5.5, 1, 1),
      new THREE.ShaderMaterial({
        uniforms: { uTime: time, uHeat: kilnHeat, uColor: { value: new THREE.Color(C.ember) } },
        vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
        fragmentShader: /* glsl */ `
          varying vec2 vUv; uniform float uTime, uHeat; uniform vec3 uColor; ${NOISE_GLSL}
          void main(){
            vec2 uv = vUv; uv.x += sin(uv.y*11. - uTime*3.) * .035 * uv.y;
            float f = n2(vec2(uv.x*5., uv.y*3. - uTime*1.3)) * n2(vec2(uv.x*9.+3., uv.y*6. - uTime*2.1));
            float edge = smoothstep(0.,.32,uv.x) * smoothstep(1.,.68,uv.x);
            float vert = smoothstep(0.,.08,uv.y) * pow(1.-uv.y, 1.4);
            float a = f * edge * vert * uHeat * 1.1;
            gl_FragColor = vec4(uColor * 1.6, a);
            #include <colorspace_fragment>
          }`,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    haze.position.set(KILN.x, 4.6 + 2.6, KILN.z);
    scene.add(haze);
    kilnParts.haze = haze;
    kilnParts.coilMat = coilMat;
  }

  // ---------- 3/4 · CO₂ pipe, tank, concrete, storage ----------
  const TANK = new THREE.Vector3(-5, 0, -10);
  const wallDir = new THREE.Vector2(TANK.x, TANK.z).normalize();
  const wall = (r: number, y: number): [number, number, number] => [wallDir.x * r, y, wallDir.y * r];
  const routeA = sampled([[-6, 4.3, 0], [-6, 5.9, -0.9], [-5.8, 6.7, -4.6], [-5.3, 5.8, -8.3], [-5, 4.15, -10]]);
  const BLOCK = new THREE.Vector3(-7.7, 0.625, -9.2);
  const routeB = sampled([[-5.85, 0.9, -9.75], [-6.5, 1.35, -9.5], [-7.6, 1.3, -9.25]], 60);
  const routeC = sampled([[-5.25, 0.35, -10.55], wall(12.0, 0.32), wall(13.12, 0.1), wall(13.12, -0.7), wall(13.12, -1.6)], 120);
  {
    const glass = new THREE.Mesh(
      new THREE.TubeGeometry(routeA.curve, 80, 0.2, 12, false),
      new THREE.MeshStandardMaterial({ color: 0xcfd8e0, transparent: true, opacity: 0.16, roughness: 0.1, metalness: 0.2, depthWrite: false }),
    );
    scene.add(glass);
    const pipes = mergeGeometries([new THREE.TubeGeometry(routeB.curve, 24, 0.09, 8, false), new THREE.TubeGeometry(routeC.curve, 60, 0.11, 8, false)]);
    scene.add(new THREE.Mesh(pipes, metalDark));
    const tank = new THREE.Mesh(new THREE.CapsuleGeometry(0.95, 2.1, 8, 32), metalLight);
    tank.position.set(TANK.x, 2.0, TANK.z);
    scene.add(tank);
    // Tank bands + legs merged.
    const band1 = new THREE.TorusGeometry(0.97, 0.05, 6, 40);
    band1.rotateX(Math.PI / 2);
    const band2 = band1.clone();
    band1.translate(TANK.x, 1.4, TANK.z);
    band2.translate(TANK.x, 2.6, TANK.z);
    scene.add(new THREE.Mesh(mergeGeometries([band1, band2]), metalDark));
  }
  // Concrete block + mineral speckle overlay.
  const speckMat = (() => {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 256;
    const ctx = cv.getContext('2d')!;
    for (let i = 0; i < 700; i++) {
      const r = 0.6 + Math.random() * 2.2;
      ctx.fillStyle = Math.random() > 0.5 ? 'rgba(169,193,217,0.95)' : 'rgba(255,255,255,0.9)';
      ctx.beginPath();
      ctx.arc(Math.random() * 256, Math.random() * 256, r, 0, Math.PI * 2);
      ctx.fill();
    }
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: 0, depthWrite: false });
  })();
  {
    const g = new THREE.BoxGeometry(1.8, 1.25, 1.8);
    const block = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0x9a978f, roughness: 0.95 }));
    block.position.copy(BLOCK);
    scene.add(block);
    const over = new THREE.Mesh(new THREE.BoxGeometry(1.82, 1.27, 1.82), speckMat);
    over.position.copy(block.position);
    scene.add(over);
  }

  // ---------- CaO mound at the kiln outlet ----------
  const mound = new THREE.Mesh(new THREE.SphereGeometry(0.8, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2), powderMat);
  mound.position.set(-4.4, 0.02, -1.75);
  scene.add(mound);

  // ---------- 5 · hydrator ----------
  const HYD = new THREE.Vector3(-1.4, 0, -5.4);
  const hydPowderMat = new THREE.MeshStandardMaterial({ color: 0xece8dc, roughness: 1 });
  const hydPowder = new THREE.Mesh(new THREE.CylinderGeometry(0.98, 0.98, 1, 36), hydPowderMat);
  {
    const vessel = new THREE.CylinderGeometry(1.1, 0.85, 1.3, 40, 1, true);
    vessel.translate(HYD.x, 0.65, HYD.z);
    const rim = new THREE.TorusGeometry(1.1, 0.06, 6, 40);
    rim.rotateX(Math.PI / 2);
    rim.translate(HYD.x, 1.3, HYD.z);
    const post = new THREE.BoxGeometry(0.12, 3.4, 0.12);
    post.translate(HYD.x + 1.35, 1.7, HYD.z);
    const arm = new THREE.BoxGeometry(1.45, 0.1, 0.1);
    arm.translate(HYD.x + 0.68, 3.35, HYD.z);
    const nozzle = new THREE.CylinderGeometry(0.06, 0.14, 0.3, 12);
    nozzle.translate(HYD.x, 3.18, HYD.z);
    const m = new THREE.Mesh(mergeGeometries([vessel, rim, post, arm, nozzle]), new THREE.MeshStandardMaterial({ color: 0x4a4944, metalness: 0.6, roughness: 0.4, side: THREE.DoubleSide }));
    scene.add(m);
    hydPowder.position.set(HYD.x, 0.1, HYD.z);
    scene.add(hydPowder);
  }

  // ---------- 6 · tray racks (~12 m) ----------
  const RACK_X = [3.2, 5.8];
  const BAYS = 4;
  const LEVELS = 20;
  const LEVEL0 = 0.5;
  const STEP = 0.56;
  const RACK_H = 11.7;
  const bayZ = (j: number) => -2.5 + j; // centres -2.5..0.5
  {
    const parts: THREE.BufferGeometry[] = [];
    for (const cx of RACK_X) {
      for (const dx of [-0.8, 0.8]) {
        for (let j = 0; j <= BAYS; j++) {
          const p = new THREE.BoxGeometry(0.08, RACK_H, 0.08);
          p.translate(cx + dx, RACK_H / 2, -3 + j);
          parts.push(p);
        }
        for (let l = 0; l <= 5; l++) {
          const b = new THREE.BoxGeometry(0.06, 0.06, BAYS);
          b.translate(cx + dx, 0.25 + l * (RACK_H - 0.3) / 5, -1);
          parts.push(b);
        }
      }
      const cap = new THREE.BoxGeometry(1.75, 0.12, BAYS + 0.1);
      cap.translate(cx, RACK_H, -1);
      parts.push(cap);
    }
    scene.add(new THREE.Mesh(mergeGeometries(parts), new THREE.MeshStandardMaterial({ color: 0x5a5953, metalness: 0.7, roughness: 0.38 })));
  }
  const TRAYS = RACK_X.length * BAYS * LEVELS;
  const trayMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1.45, 0.05, 0.9), new THREE.MeshStandardMaterial({ color: 0xbfc2c4, metalness: 0.75, roughness: 0.3 }), TRAYS);
  const trayPowder = new THREE.InstancedMesh(new THREE.BoxGeometry(1.36, 0.045, 0.82), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 }), TRAYS);
  type Tray = { x: number; y: number; z: number; level: number; bay: number; rack: number; delay: number; jitter: number };
  const trays: Tray[] = [];
  RACK_X.forEach((x, r) => {
    for (let j = 0; j < BAYS; j++)
      for (let l = 0; l < LEVELS; l++) trays.push({ x, y: LEVEL0 + l * STEP, z: bayZ(j), level: l, bay: j, rack: r, delay: ((l / LEVELS) * 0.62 + j * 0.03 + r * 0.05) * 0.9, jitter: rand() });
  });
  // The tray the robot will pick: rack 0, front bay, level 2.
  const PICK = trays.findIndex((t) => t.rack === 0 && t.bay === 3 && t.level === 2);
  scene.add(trayMesh, trayPowder);
  // Person for scale.
  {
    const body = new THREE.CapsuleGeometry(0.22, 1.05, 4, 12);
    body.translate(0, 0.75, 0);
    const head = new THREE.SphereGeometry(0.15, 16, 12);
    head.translate(0, 1.62, 0);
    const person = new THREE.Mesh(mergeGeometries([body, head]), new THREE.MeshStandardMaterial({ color: C.mineral, roughness: 0.8 }));
    person.position.set(7.6, 0, 2.2);
    scene.add(person);
  }

  // ---------- 8 · robot arm (hierarchy) ----------
  const ROBOT = new THREE.Vector3(0.4, 0, 0.5);
  const robotWhite = new THREE.MeshStandardMaterial({ color: 0xe9e7e0, metalness: 0.2, roughness: 0.4 });
  const robotAccent = new THREE.MeshStandardMaterial({ color: C.ember, metalness: 0.2, roughness: 0.5 });
  const robot = new THREE.Group();
  robot.position.copy(ROBOT);
  scene.add(robot);
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.35, 1.1), metalDark);
  base.position.y = 0.175;
  robot.add(base);
  const yaw = new THREE.Group();
  yaw.position.y = 0.35;
  robot.add(yaw);
  const turret = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.38, 0.5, 24), robotAccent);
  turret.position.y = 0.25;
  yaw.add(turret);
  const L1 = 1.3;
  const L2 = 1.2;
  const shoulder = new THREE.Group();
  shoulder.position.y = 0.5;
  yaw.add(shoulder);
  const link1 = new THREE.Mesh(new THREE.BoxGeometry(L1, 0.2, 0.22), robotWhite);
  link1.position.x = L1 / 2;
  shoulder.add(link1);
  const elbow = new THREE.Group();
  elbow.position.x = L1;
  shoulder.add(elbow);
  const link2 = new THREE.Mesh(new THREE.BoxGeometry(L2, 0.16, 0.18), robotWhite);
  link2.position.x = L2 / 2;
  elbow.add(link2);
  const wrist = new THREE.Group();
  wrist.position.x = L2;
  elbow.add(wrist);
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.7), robotAccent);
  wrist.add(grip);
  // The carried tray (separate object, same look as the instanced trays).
  const carried = new THREE.Group();
  const cTray = new THREE.Mesh(trayMesh.geometry, trayMesh.material);
  const cPowder = new THREE.Mesh(trayPowder.geometry, new THREE.MeshStandardMaterial({ color: 0xe6dfcf, roughness: 1 }));
  cPowder.position.y = 0.045;
  carried.add(cTray, cPowder);
  carried.rotation.y = 0; // long side along the arm
  scene.add(carried);
  const SHOULDER_Y = 0.35 + 0.5;
  const TRAY_OFF = 0.78; // tray centre beyond the wrist

  /** Pose the arm so the wrist reaches world point p (elbow-up 2-link IK). */
  const pose = { yaw: 0, sh: 0.9, el: -1.6 };
  const solve = (p: THREE.Vector3) => {
    const dx = p.x - ROBOT.x;
    const dz = p.z - ROBOT.z;
    const yawA = Math.atan2(-dz, dx);
    const hr = Math.max(0.2, Math.hypot(dx, dz) - TRAY_OFF);
    const vy = p.y - SHOULDER_Y;
    const d = Math.min(L1 + L2 - 0.01, Math.hypot(hr, vy));
    const cosE = (d * d - L1 * L1 - L2 * L2) / (2 * L1 * L2);
    const el = -Math.acos(Math.max(-1, Math.min(1, cosE)));
    const sh = Math.atan2(vy, hr) - Math.atan2(L2 * Math.sin(el), L1 + L2 * Math.cos(el));
    return { yaw: yawA, sh, el };
  };

  // ---------- conveyor loop (glowing reveal in beat 8) ----------
  const loop = sampled(
    [[-4.4, 0.12, -1.9], [-3.0, 0.12, -3.6], [-1.4, 0.12, -3.9], [0.9, 0.12, -3.9], [1.8, 0.12, -2.6], [1.8, 0.12, 1.6], [0.6, 0.12, 2.4], [-1.6, 0.12, 2.4], [-4.0, 0.12, 2.0], [-5.4, 0.12, 1.4]],
    300,
    true,
  );
  const reveal = { value: 0 };
  {
    const tube = new THREE.Mesh(
      new THREE.TubeGeometry(loop.curve, 300, 0.11, 8, true),
      new THREE.ShaderMaterial({
        uniforms: { uTime: time, uReveal: reveal, uColor: { value: new THREE.Color(C.ember) } },
        vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
        fragmentShader: /* glsl */ `
          varying vec2 vUv; uniform float uTime, uReveal; uniform vec3 uColor;
          void main(){
            float dash = step(.55, fract(vUv.x*70. - uTime*1.2));
            float lit = smoothstep(uReveal, uReveal - .04, vUv.x) * step(.001, uReveal);
            vec3 base = vec3(.16,.16,.15) + dash*.05;
            vec3 col = mix(base, uColor*(1.2 + 1.6*dash), lit);
            gl_FragColor = vec4(col, 1.);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }`,
      }),
    );
    scene.add(tube);
  }
  const nearestT = (p: THREE.Vector3) => {
    let best = 0, bd = Infinity;
    const v = new THREE.Vector3();
    for (let i = 0; i <= 300; i++) {
      loop.at(i / 300, v);
      const d = v.distanceToSquared(p);
      if (d < bd) { bd = d; best = i / 300; }
    }
    return best;
  };
  const DROP = new THREE.Vector3(-0.2, 0.2, 2.4);
  const T_DROP = nearestT(DROP);
  const T_KILN = nearestT(new THREE.Vector3(-5.4, 0.12, 1.4));

  // ---------- particles: every stream in ONE Points object ----------
  const N = {
    A: Math.round(520 * PCOUNT), // kiln → tank
    B: Math.round(140 * PCOUNT), // tank → concrete
    Cw: Math.round(180 * PCOUNT), // tank → underground
    P: Math.round(320 * PCOUNT), // stored in the formation
    O: Math.round(90 * PCOUNT), // CaO falling
    W: Math.round(70 * PCOUNT), // water droplets
    air: Math.round(1000 * PCOUNT), // ambient air through the racks
  };
  const total = N.A + N.B + N.Cw + N.P + N.O + N.W + N.air;
  const pPos = new Float32Array(total * 3);
  const pCol = new Float32Array(total * 3);
  const pSize = new Float32Array(total);
  const pAlpha = new Float32Array(total);
  const kind = new Uint8Array(total); // 0 A, 1 B, 2 C, 3 P, 4 O, 5 W, 6 air
  const phase = new Float32Array(total);
  const speed = new Float32Array(total);
  const jit = new Float32Array(total * 3);
  const extra = new Float32Array(total); // absorb x for air, etc.
  {
    let i = 0;
    const add = (k: number, n: number, col: number, size: number) => {
      const c = new THREE.Color(col);
      for (let q = 0; q < n; q++, i++) {
        kind[i] = k;
        phase[i] = rand();
        speed[i] = 0.7 + rand() * 0.6;
        const a = rand() * Math.PI * 2, r = Math.sqrt(rand());
        jit[i * 3] = Math.cos(a) * r;
        jit[i * 3 + 1] = (rand() - 0.5) * 2;
        jit[i * 3 + 2] = Math.sin(a) * r;
        pCol[i * 3] = c.r;
        pCol[i * 3 + 1] = c.g;
        pCol[i * 3 + 2] = c.b;
        pSize[i] = size * (0.7 + rand() * 0.6);
        extra[i] = 2.6 + rand() * 4.6;
      }
    };
    add(0, N.A, C.air, 0.16);
    add(1, N.B, C.air, 0.13);
    add(2, N.Cw, C.air, 0.13);
    add(3, N.P, C.air, 0.14);
    add(4, N.O, 0xffffff, 0.09);
    add(5, N.W, C.water, 0.14);
    add(6, N.air, C.air, 0.1);
  }
  // Fixed positions for the stored-CO₂ pocket in the strata wall.
  const pocketStart = N.A + N.B + N.Cw;
  {
    const ang0 = Math.atan2(wallDir.y, wallDir.x);
    for (let q = 0; q < N.P; q++) {
      const i = pocketStart + q;
      const a = ang0 + (rand() - 0.5) * 0.42;
      const y = -1.42 - rand() * 0.5;
      const r = R + 0.04;
      pPos[i * 3] = Math.cos(a) * r;
      pPos[i * 3 + 1] = y;
      pPos[i * 3 + 2] = Math.sin(a) * r;
      phase[i] = Math.abs(a - ang0) / 0.21 * 0.7 + rand() * 0.3; // fills from the well outward
    }
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3).setUsage(THREE.DynamicDrawUsage));
  pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
  pGeo.setAttribute('aSize', new THREE.BufferAttribute(pSize, 1));
  pGeo.setAttribute('aAlpha', new THREE.BufferAttribute(pAlpha, 1).setUsage(THREE.DynamicDrawUsage));
  const pScale = { value: 400 };
  const points = new THREE.Points(
    pGeo,
    new THREE.ShaderMaterial({
      uniforms: { uScale: pScale },
      vertexShader: /* glsl */ `
        attribute float aSize; attribute float aAlpha; attribute vec3 color;
        uniform float uScale; varying float vA; varying vec3 vC;
        void main(){ vec4 mv = modelViewMatrix * vec4(position,1.); gl_Position = projectionMatrix * mv;
          gl_PointSize = aSize * uScale / -mv.z; vA = aAlpha; vC = color; }`,
      fragmentShader: /* glsl */ `
        varying float vA; varying vec3 vC;
        void main(){ float d = length(gl_PointCoord - .5); float a = smoothstep(.5, .1, d) * vA;
          if (a < .01) discard; gl_FragColor = vec4(vC * .95, a);
          #include <colorspace_fragment>
        }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  points.frustumCulled = false;
  points.renderOrder = 5;
  scene.add(points);

  // ---------- world-anchored labels ----------
  type Label = { el: HTMLElement; pos: THREE.Vector3; a: number; c: number };
  const labels: Label[] = [];
  if (opts.labels && !compact) {
    const specs: [string, [number, number, number], number, number, string?][] = [
      ['CaCO₃ · limestone', [-9.4, 2.1, 4.6], -0.5, 0.95],
      ['~900 °C', [-6, 5.3, 0], 1.15, 2.0, 'hot'],
      ['Pure CO₂ → capture', [-5.7, 7.3, -4.6], 2.25, 3.0, 'air'],
      ['CaO powder', [-4.2, 1.2, -1.9], 2.35, 3.0],
      ['Concrete · Tracy', [BLOCK.x, 1.8, BLOCK.z], 3.2, 4.0],
      ['Geologic storage · planned (LA)', wall(R, -1.15), 3.3, 4.0, 'air'],
      ['Ca(OH)₂', [-1.4, 2.0, -5.4], 4.25, 5.0],
      ['~40 ft · 12 m', [4.5, RACK_H + 0.8, -1], 5.25, 6.05, 'hot'],
      ['Air in', [0.6, 9.4, -1], 6.2, 6.95, 'air'],
      ['Air out, less CO₂', [9.4, 9.4, -1], 6.2, 6.95, 'air'],
      ['Finished tray', [2.2, 2.9, 0.5], 7.05, 7.45],
      ['Limestone in', [-9.4, 1.8, 4.6], 7.75, 9],
      ['Kiln · 900 °C', [-6, 5.4, 0], 7.75, 9, 'hot'],
      ['CO₂ storage', [-5, 4.6, -10], 7.75, 9, 'air'],
      ['Hydration', [-1.4, 2.2, -5.4], 7.75, 9],
      ['Trays · ~3 days', [4.5, RACK_H + 0.8, -1], 7.75, 9],
      ['Robots', [0.4, 2.6, 0.5], 7.75, 9],
    ];
    for (const [text, p, a, c, tone] of specs) {
      const el = document.createElement('span');
      el.className = 'hlx-tag' + (tone ? ` hlx-tag--${tone}` : '');
      el.textContent = text;
      opts.labels.appendChild(el);
      labels.push({ el, pos: new THREE.Vector3(...p), a, c });
    }
  }

  // ---------- camera keyframes ----------
  type Key = { b: number; pos: THREE.Vector3; tgt: THREE.Vector3 };
  const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  const KEYS: Key[] = [
    { b: 0, pos: V(-1.0, 5.2, 16.5), tgt: V(-8.6, 1.0, 4.4) },
    { b: 0.55, pos: V(-3.4, 2.9, 12.0), tgt: V(-9.0, 0.7, 4.6) },
    { b: 1.55, pos: V(0.6, 4.4, 9.4), tgt: V(-6.0, 2.4, 0.0) },
    { b: 2.55, pos: V(4.0, 11.0, 6.0), tgt: V(-5.5, 3.0, -5.0) },
    { b: 3.55, pos: V(-12.4, 3.4, -26.0), tgt: V(-4.6, -0.7, -10.2) },
    { b: 4.55, pos: V(5.0, 5.0, -12.5), tgt: V(-1.4, 1.2, -5.4) },
    { b: 5.55, pos: V(21.0, 6.5, 18.0), tgt: V(4.0, 5.8, -1.2) },
    { b: 6.55, pos: V(4.4, 6.6, 19.5), tgt: V(4.4, 6.0, -1.0) },
    { b: 7.3, pos: V(-3.4, 3.7, 7.4), tgt: V(1.6, 1.4, 0.4) },
    { b: 7.97, pos: V(10, 30, 29), tgt: V(-1.6, -0.5, -2.6) },
  ];
  const camPos = new THREE.Vector3();
  const camTgt = new THREE.Vector3();
  const tmpA = new THREE.Vector3();
  const tmpB = new THREE.Vector3();
  let distK = 1;
  const placeCamera = (b: number) => {
    let i = 0;
    while (i < KEYS.length - 2 && b > KEYS[i + 1].b) i++;
    const k0 = KEYS[i], k1 = KEYS[i + 1];
    const u = (b - k0.b) / (k1.b - k0.b);
    const e = smooth(range(u, 0.28, 0.92));
    camTgt.lerpVectors(k0.tgt, k1.tgt, e);
    tmpA.subVectors(k0.pos, k0.tgt).multiplyScalar(distK).add(k0.tgt);
    tmpB.subVectors(k1.pos, k1.tgt).multiplyScalar(distK * (k1 === KEYS[KEYS.length - 1] && distK > 1 ? 1.22 : 1)).add(k1.tgt);
    camPos.lerpVectors(tmpA, tmpB, e);
    // Swoop over anything in the way: the longer the move, the higher the arc.
    camPos.y += Math.sin(Math.PI * e) * (1.5 + tmpA.distanceTo(tmpB) * 0.15);
  };

  // ---------- layout: fov, caption offset, point scale ----------
  let lastW = 0, lastH = 0;
  const layout = () => {
    const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
    if (w === lastW && h === lastH) return;
    lastW = w;
    lastH = h;
    const aspect = w / h;
    camera.fov = aspect < 1 ? 46 : 35;
    distK = aspect < 0.75 ? 1.45 : aspect < 1.2 ? 1.2 : 1;
    if (!compact && aspect >= 1.1) camera.setViewOffset(w, h, -w * 0.13, 0, w, h);
    else if (!compact && aspect < 1.1) camera.setViewOffset(w, h, 0, h * 0.13, w, h);
    else camera.clearViewOffset();
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    pScale.value = (h * renderer.getPixelRatio()) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
  };

  // ---------- per-frame state ----------
  const state = { target: 0, cur: 0 };
  const o3 = new THREE.Object3D();
  const v3 = new THREE.Vector3();
  const colA = new THREE.Color(0xffffff);
  const colB = new THREE.Color(0xe6dfcf);
  const colTmp = new THREE.Color();
  const lookAt = new THREE.Vector3();
  let statT = 0;

  let lastT = 0;
  const update = (t: number, dt: number, instant = false) => {
    layout();
    lastT = t;
    time.value = t;
    if (instant || stage.reduced) state.cur = state.target;
    else state.cur += (state.target - state.cur) * (1 - Math.exp(-dt * 4.5));
    const b = state.cur * BEATS;

    // Camera.
    placeCamera(Math.min(b, 7.999));
    const px = stage.reduced ? 0 : pointer.x * 0.35;
    const py = stage.reduced ? 0 : pointer.y * 0.2;
    camera.position.set(camPos.x + px, camPos.y + py, camPos.z);
    lookAt.copy(camTgt);
    camera.lookAt(lookAt);

    // Kiln heat.
    const heat = 0.12 + 0.88 * smooth(range(b, 0.95, 1.75));
    kilnHeat.value = heat * (stage.reduced ? 1 : 0.94 + 0.06 * Math.sin(t * 7.3) * Math.sin(t * 3.1));
    kilnLight.intensity = heat * 55;
    kilnParts.coilMat!.emissiveIntensity = heat * 2.6;
    kilnParts.haze!.lookAt(camera.position.x, kilnParts.haze!.position.y, camera.position.z);

    // Rocks (four ride into the kiln mouth during the kiln beat).
    for (const set of rockSets) {
      set.rocks.forEach((r, i) => {
        o3.rotation.copy(r.rot);
        o3.scale.setScalar(r.s);
        o3.position.copy(r.pos);
        if (r.travel >= 0) {
          const u = range(b, 0.95 + r.travel * 0.12, 1.5 + r.travel * 0.12);
          if (u > 0) {
            const top = v3.set(KILN.x, 5.4, KILN.z);
            o3.position.lerpVectors(r.pos, top, smooth(u));
            o3.position.y += Math.sin(Math.PI * Math.min(1, u * 1.1)) * 2.5;
            if (u > 0.85) o3.position.y = lerp(top.y, 2.4, (u - 0.85) / 0.15);
            o3.rotation.x += u * 4;
            o3.scale.setScalar(r.s * (u > 0.97 ? 0.001 : 1));
          }
        }
        o3.updateMatrix();
        set.mesh.setMatrixAt(i, o3.matrix);
      });
      set.mesh.instanceMatrix.needsUpdate = true;
    }

    // CaO mound grows during the split.
    const moundU = smooth(range(b, 2.2, 3.15));
    mound.scale.set(0.2 + moundU * 0.9, 0.05 + moundU * 0.75, 0.2 + moundU * 0.9);

    // Concrete mineralises during storage.
    speckMat.opacity = smooth(range(b, 3.25, 4.2)) * 0.95;

    // Hydrator fill and colour.
    const fill = smooth(range(b, 3.9, 4.55));
    hydPowder.scale.y = 0.15 + fill * 0.95;
    hydPowder.position.y = 0.1 + hydPowder.scale.y * 0.5;
    const hyd = smooth(range(b, 4.3, 5.0));
    hydPowderMat.color.setRGB(lerp(0.84, 1, hyd), lerp(0.81, 1, hyd), lerp(0.73, 1, hyd));
    hydPowder.scale.x = hydPowder.scale.z = 0.92 + hyd * 0.06;

    // Trays rise (beat 6), carbonate (beat 7), one is picked (beat 8).
    const rise = range(b, 4.95, 5.75);
    const day = range(b, 6.05, 6.95);
    const b8 = range(b, 7, 8);
    for (let i = 0; i < TRAYS; i++) {
      const tr = trays[i];
      const u = clamp01((rise - tr.delay) / 0.3);
      const spread = smooth(range(u, 0, 0.35));
      const up = smooth(range(u, 0.3, 1));
      const visible = u > 0 && !(i === PICK && b8 > 0.24);
      o3.rotation.set(0, 0, 0);
      o3.position.set(tr.x, lerp(0.15, tr.y, up), tr.z);
      o3.scale.setScalar(visible ? 1 : 0.0001);
      o3.updateMatrix();
      trayMesh.setMatrixAt(i, o3.matrix);
      o3.position.y += 0.045;
      o3.scale.set(visible ? Math.max(0.0001, spread) : 0.0001, 1, visible ? Math.max(0.0001, spread) : 0.0001);
      o3.updateMatrix();
      trayPowder.setMatrixAt(i, o3.matrix);
      // Carbonation: Ca(OH)₂ white → CaCO₃ limestone. Inlet side (rack 0) first.
      const c = clamp01(day * 1.25 - tr.rack * 0.18 - tr.jitter * 0.07);
      colTmp.lerpColors(colA, colB, c);
      trayPowder.setColorAt(i, colTmp);
    }
    trayMesh.instanceMatrix.needsUpdate = true;
    trayPowder.instanceMatrix.needsUpdate = true;
    if (trayPowder.instanceColor) trayPowder.instanceColor.needsUpdate = true;

    // Time-lapse light during the three days.
    const cyc = win(b, 6.05, 6.95, 0.15) * (0.5 - 0.5 * Math.cos(day * Math.PI * 2 * 3));
    key.intensity = 1.9 - cyc * 1.1;
    hemi.intensity = 1.25 - cyc * 0.55;

    // Robot arm.
    const pickTray = trays[PICK];
    const pickWrist = v3.set(pickTray.x, pickTray.y + 0.08, pickTray.z);
    const rest = { yaw: 0.3, sh: 1.25, el: -2.3 };
    const reach = solve(pickWrist);
    const pre = solve(tmpA.set(pickTray.x - 0.7, pickTray.y + 0.08, pickTray.z));
    const lift = solve(tmpA.set(pickTray.x - 0.9, pickTray.y + 0.6, pickTray.z));
    const drop = solve(DROP);
    const above = solve(tmpB.set(DROP.x, DROP.y + 0.8, DROP.z));
    const mix = (a: typeof pose, c: typeof pose, k: number) => {
      const e = smooth(k);
      pose.yaw = lerp(a.yaw, c.yaw, e);
      pose.sh = lerp(a.sh, c.sh, e);
      pose.el = lerp(a.el, c.el, e);
    };
    // Unwrap yaw so the swing goes the short way round.
    const unwrap = (a: number, ref: number) => {
      while (a - ref > Math.PI) a -= Math.PI * 2;
      while (a - ref < -Math.PI) a += Math.PI * 2;
      return a;
    };
    drop.yaw = unwrap(drop.yaw, lift.yaw);
    above.yaw = unwrap(above.yaw, lift.yaw);
    rest.yaw = unwrap(rest.yaw, lift.yaw);
    if (b8 <= 0) {
      const idle = stage.reduced ? 0 : Math.sin(t * 0.8) * 0.06;
      pose.yaw = rest.yaw + idle;
      pose.sh = rest.sh;
      pose.el = rest.el;
    } else if (b8 < 0.12) mix(rest, pre, b8 / 0.12);
    else if (b8 < 0.22) mix(pre, reach, (b8 - 0.12) / 0.1);
    else if (b8 < 0.3) mix(reach, lift, (b8 - 0.22) / 0.08);
    else if (b8 < 0.46) mix(lift, above, (b8 - 0.3) / 0.16);
    else if (b8 < 0.54) mix(above, drop, (b8 - 0.46) / 0.08);
    else mix(drop, rest, (b8 - 0.54) / 0.2);
    yaw.rotation.y = pose.yaw;
    shoulder.rotation.z = pose.sh;
    elbow.rotation.z = pose.el;
    wrist.rotation.z = -(pose.sh + pose.el);
    // Carried tray: on the gripper, then riding the conveyor to the kiln.
    if (b8 > 0.24 && b8 < 0.55) {
      carried.visible = true;
      robot.updateMatrixWorld(true);
      wrist.getWorldPosition(v3);
      const dirX = Math.cos(pose.yaw), dirZ = -Math.sin(pose.yaw);
      carried.position.set(v3.x + dirX * TRAY_OFF, v3.y - 0.02, v3.z + dirZ * TRAY_OFF);
      carried.rotation.y = pose.yaw;
    } else if (b8 >= 0.55 && b8 < 0.97) {
      carried.visible = true;
      const k = smooth(range(b8, 0.56, 0.95));
      let tEnd = T_KILN;
      if (tEnd < T_DROP) tEnd += 1;
      const tt = lerp(T_DROP, tEnd, k) % 1;
      loop.at(tt, v3);
      carried.position.set(v3.x, 0.24, v3.z);
      loop.at((tt + 0.01) % 1, tmpA);
      carried.rotation.y = Math.atan2(-(tmpA.z - v3.z), tmpA.x - v3.x);
    } else carried.visible = false;

    // Conveyor reveal.
    reveal.value = smooth(range(b, 7.4, 7.95)) * 1.04;

    // Particles.
    const aA = win(b, 2.25, 4.2, 0.3) + 0.35 * range(b, 7.5, 7.9);
    const aBC = win(b, 3.1, 4.4, 0.3) + 0.35 * range(b, 7.5, 7.9);
    const fillP = range(b, 3.2, 4.15);
    const aO = win(b, 2.2, 3.3, 0.2);
    const aW = win(b, 4.15, 5.0, 0.2);
    const aAir = win(b, 6.05, 6.95, 0.25) + 0.3 * range(b, 7.6, 7.95);
    const flow = stage.reduced ? 0.37 : t;
    for (let i = 0; i < total; i++) {
      const k = kind[i];
      const i3 = i * 3;
      if (k <= 2) {
        const route = k === 0 ? routeA : k === 1 ? routeB : routeC;
        const rr = k === 0 ? 0.15 : 0.07;
        const s = (phase[i] + flow * speed[i] * (k === 0 ? 0.14 : 0.3)) % 1;
        route.at(s, v3);
        pPos[i3] = v3.x + jit[i3] * rr;
        pPos[i3 + 1] = v3.y + jit[i3 + 1] * rr;
        pPos[i3 + 2] = v3.z + jit[i3 + 2] * rr;
        pAlpha[i] = (k === 0 ? aA : aBC) * 0.9 * Math.min(1, s * 12, (1 - s) * 12);
      } else if (k === 3) {
        pAlpha[i] = phase[i] < fillP * 1.05 ? 0.9 : 0;
      } else if (k === 4) {
        const s = (phase[i] + flow * speed[i] * 0.9) % 1;
        pPos[i3] = -4.95 + jit[i3] * 0.12 + s * 0.4;
        pPos[i3 + 1] = 0.9 - s * 0.75;
        pPos[i3 + 2] = -1.3 + jit[i3 + 2] * 0.12 - s * 0.35;
        pAlpha[i] = aO * 0.8;
      } else if (k === 5) {
        const s = (phase[i] + flow * speed[i] * 0.85) % 1;
        pPos[i3] = HYD.x + jit[i3] * 0.22 * s;
        pPos[i3 + 1] = 3.0 - s * s * 2.0;
        pPos[i3 + 2] = HYD.z + jit[i3 + 2] * 0.22 * s;
        pAlpha[i] = aW * 0.95;
      } else {
        const s = (phase[i] + flow * speed[i] * 0.07) % 1;
        const x = -2.2 + s * 13.5;
        pPos[i3] = x;
        pPos[i3 + 1] = 0.5 + (jit[i3 + 1] * 0.5 + 0.5) * 11;
        pPos[i3 + 2] = -1 + jit[i3 + 2] * 2.6;
        // About three in four molecules are taken up inside the racks.
        const absorbed = phase[i] * 7 % 1 < 0.75;
        const fade = absorbed ? 1 - clamp01((x - extra[i]) / 0.6) : 1;
        pAlpha[i] = aAir * 0.75 * fade * Math.min(1, s * 10, (1 - s) * 10);
      }
    }
    pGeo.attributes.position.needsUpdate = true;
    pGeo.attributes.aAlpha.needsUpdate = true;

    // Labels.
    if (labels.length) {
      camera.updateMatrixWorld();
      const w = lastW, h = lastH;
      for (const l of labels) {
        const o = win(b, l.a, l.c, 0.18);
        if (o <= 0.01) {
          if (l.el.style.opacity !== '0') l.el.style.opacity = '0';
          continue;
        }
        v3.copy(l.pos).project(camera);
        if (v3.z > 1) {
          l.el.style.opacity = '0';
          continue;
        }
        const x = (v3.x * 0.5 + 0.5) * w;
        const y = (-v3.y * 0.5 + 0.5) * h;
        l.el.style.opacity = String(o);
        l.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%)`;
      }
    }

    // Stats for the performance chapter.
    if (opts.onStats && t - statT > 1) {
      statT = t;
      const r = renderer.info.render;
      opts.onStats({ calls: r.calls, triangles: r.triangles, points: r.points, dpr: renderer.getPixelRatio(), particles: total });
    }
  };

  stage.onFrame((t, dt) => update(t, dt));
  let pending = 0;
  let lastRender = 0;
  const renderNow = () => {
    pending = 0;
    lastRender = performance.now();
    update(lastT, 0, true);
    stage.render();
  };

  return {
    reduced: stage.reduced,
    setProgress: (p, instant = false) => {
      state.target = clamp01(p);
      // Static mode (reduced motion or software GL): state comes from progress alone,
      // so render a frame for it, coalesced, with a guaranteed trailing frame.
      if (instant) renderNow();
      else if (stage.reduced && !pending) pending = window.setTimeout(renderNow, Math.max(0, 110 - (performance.now() - lastRender)));
    },
    dispose: () => {
      clearTimeout(pending);
      labels.forEach((l) => l.el.remove());
      stage.dispose();
    },
  };
}
