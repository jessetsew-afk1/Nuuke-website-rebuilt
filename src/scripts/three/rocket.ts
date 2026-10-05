// The NUUKE rocket: a retro riveted rocket (silver body, red nose, porthole, swept fins,
// ribbed engine) with a living flame. Built procedurally so it costs no downloads.
import { THREE } from './core';

const RED = 0x9c0f16;
const RED_DARK = 0x5e080c;

function lathe(points: [number, number][], segs = 64) {
  return new THREE.LatheGeometry(
    points.map(([r, y]) => new THREE.Vector2(r, y)),
    segs,
  );
}

/** Body radius at height y (used to place porthole and rivets on the hull). */
const hull: [number, number][] = [
  [0.4, 0],
  [0.47, 0.12],
  [0.53, 0.42],
  [0.56, 0.78],
  [0.55, 1.15],
  [0.51, 1.5],
  [0.45, 1.82],
  [0.43, 1.9],
];
export function hullRadius(y: number) {
  for (let i = 1; i < hull.length; i++) {
    if (y <= hull[i][1]) {
      const [r0, y0] = hull[i - 1];
      const [r1, y1] = hull[i];
      return r0 + ((y - y0) / (y1 - y0)) * (r1 - r0);
    }
  }
  return hull[hull.length - 1][0];
}

function brushedTexture() {
  // Subtle weathered-metal noise so the hull doesn't read as plastic.
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  g.fillStyle = '#cfc9bf';
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2600; i++) {
    const v = 180 + Math.random() * 60;
    g.fillStyle = `rgba(${v},${v - 6},${v - 14},${Math.random() * 0.25})`;
    g.fillRect(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 3, 1);
  }
  for (let i = 0; i < 40; i++) {
    g.fillStyle = `rgba(120,96,70,${Math.random() * 0.12})`;
    g.beginPath();
    g.arc(Math.random() * 256, Math.random() * 256, 4 + Math.random() * 18, 0, Math.PI * 2);
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 2);
  return t;
}

const FLAME_VERT = `
uniform float uTime;
uniform float uThrust;
varying vec2 vUv;
varying float vH;
void main() {
  vUv = uv;
  vec3 p = position;
  float h = clamp(-p.y / 1.0, 0.0, 1.0);
  vH = h;
  float wob = sin(uTime * 38.0 + p.y * 9.0) * 0.035 + sin(uTime * 23.0 + p.x * 12.0) * 0.025;
  p.x += wob * h;
  p.z += wob * h * 0.7;
  p.y *= mix(0.55, 1.6, uThrust) * (0.92 + 0.08 * sin(uTime * 30.0));
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`;
const FLAME_FRAG = `
uniform float uTime;
uniform vec3 uCore;
uniform vec3 uEdge;
uniform float uAlpha;
varying vec2 vUv;
varying float vH;
void main() {
  float edge = abs(vUv.x - 0.5) * 2.0;
  float core = smoothstep(0.9, 0.0, edge) * (1.0 - vH);
  vec3 col = mix(uEdge, uCore, core);
  float a = (1.0 - vH) * smoothstep(1.0, 0.2, edge) * uAlpha;
  a *= 0.85 + 0.15 * sin(uTime * 50.0 + vH * 20.0);
  gl_FragColor = vec4(col * (1.4 + core), a);
}`;

export type Rocket = {
  group: THREE.Group;
  /** Nozzle position in rocket space (flame/particles spawn here). */
  nozzle: THREE.Vector3;
  update: (t: number, thrust: number) => void;
  setOpacity: (o: number) => void;
};

export function makeRocket(): Rocket {
  const group = new THREE.Group();
  const ship = new THREE.Group();
  ship.position.y = -0.95; // centre the model around its middle
  group.add(ship);

  const metal = new THREE.MeshStandardMaterial({ color: 0xe8e2d8, map: brushedTexture(), metalness: 0.55, roughness: 0.42 });
  const red = new THREE.MeshStandardMaterial({ color: RED, metalness: 0.15, roughness: 0.68 });
  const redDark = new THREE.MeshStandardMaterial({ color: RED_DARK, metalness: 0.4, roughness: 0.45 });
  const rivetMat = new THREE.MeshStandardMaterial({ color: 0xbfb8ad, metalness: 0.9, roughness: 0.35 });
  const mats = [metal, red, redDark, rivetMat];

  // Hull
  ship.add(new THREE.Mesh(lathe(hull), metal));

  // Nose cone (ogive)
  const nose: [number, number][] = [];
  for (let i = 0; i <= 16; i++) {
    const k = i / 16;
    nose.push([0.445 * Math.cos(k * Math.PI * 0.5) ** 0.85, 1.88 + k * 1.05]);
  }
  nose[nose.length - 1][0] = 0.001;
  ship.add(new THREE.Mesh(lathe(nose), red));

  // Bands with rivets
  const bandYs = [0.16, 0.95, 1.86];
  const rivetGeo = new THREE.SphereGeometry(0.012, 6, 5);
  const rivets = new THREE.InstancedMesh(rivetGeo, rivetMat, bandYs.length * 28 + 40);
  let ri = 0;
  const m4 = new THREE.Matrix4();
  bandYs.forEach((y) => {
    const r = hullRadius(y) + 0.006;
    const band = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.004, r + 0.004, 0.05, 64, 1, true), metal);
    band.position.y = y;
    ship.add(band);
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2;
      m4.makeTranslation(Math.cos(a) * (r + 0.012), y + 0.04, Math.sin(a) * (r + 0.012));
      rivets.setMatrixAt(ri++, m4);
    }
  });
  // Vertical seam of rivets
  for (let i = 0; i < 40; i++) {
    const y = 0.22 + (i / 40) * 1.6;
    const r = hullRadius(y) + 0.008;
    const a = Math.PI * 0.75;
    m4.makeTranslation(Math.cos(a) * r, y, Math.sin(a) * r);
    rivets.setMatrixAt(ri++, m4);
  }
  rivets.count = ri;
  ship.add(rivets);

  // Porthole facing +z
  const py = 1.28;
  const pr = hullRadius(py);
  const port = new THREE.Group();
  port.position.set(0, py, pr + 0.01);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.055, 16, 48), red);
  const glass = new THREE.Mesh(
    new THREE.CircleGeometry(0.19, 40),
    new THREE.MeshPhysicalMaterial({ color: 0x3d4a6e, metalness: 0.1, roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.05 }),
  );
  glass.position.z = 0.0;
  const back = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.08, 40), redDark);
  back.rotation.x = Math.PI / 2;
  back.position.z = -0.045;
  port.add(back);
  port.add(ring, glass);
  mats.push(glass.material as THREE.MeshPhysicalMaterial);
  ship.add(port);

  // Engine: ribbed red bell
  const ribs = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const r = 0.36 - i * 0.03;
    const t = new THREE.Mesh(new THREE.TorusGeometry(r, 0.045, 12, 48), i % 2 ? redDark : red);
    t.rotation.x = Math.PI / 2;
    t.position.y = -0.02 - i * 0.075;
    ribs.add(t);
  }
  const bell = new THREE.Mesh(lathe([[0.2, -0.32], [0.3, -0.36], [0.27, -0.24], [0.33, -0.02]], 40), redDark);
  ribs.add(bell);
  ship.add(ribs);

  // Fins: three swept blades with a foot, like the reference.
  const fin = new THREE.Shape();
  fin.moveTo(0, 0.95);
  fin.bezierCurveTo(0.22, 0.85, 0.5, 0.55, 0.56, 0.05);
  fin.lineTo(0.5, -0.62);
  fin.quadraticCurveTo(0.47, -0.7, 0.4, -0.66);
  fin.lineTo(0.38, -0.1);
  fin.bezierCurveTo(0.33, 0.18, 0.16, 0.26, 0, 0.22);
  fin.lineTo(0, 0.95);
  const finGeo = new THREE.ExtrudeGeometry(fin, { depth: 0.07, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 3, curveSegments: 18 });
  finGeo.translate(0, 0, -0.035);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 2;
    const f = new THREE.Mesh(finGeo, red);
    const holder = new THREE.Group();
    f.position.x = 0.42;
    holder.add(f);
    holder.rotation.y = a;
    ship.add(holder);
  }

  // Flame: two additive cones with a flickering shader.
  const flameMat = (core: number, edge: number, alpha: number) =>
    new THREE.ShaderMaterial({
      vertexShader: FLAME_VERT,
      fragmentShader: FLAME_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uThrust: { value: 1 }, uCore: { value: new THREE.Color(core) }, uEdge: { value: new THREE.Color(edge) }, uAlpha: { value: alpha } },
    });
  const outerGeo = new THREE.ConeGeometry(0.3, 1, 32, 12, true);
  outerGeo.rotateX(Math.PI);
  outerGeo.translate(0, -0.5, 0);
  const innerGeo = new THREE.ConeGeometry(0.17, 0.75, 24, 10, true);
  innerGeo.rotateX(Math.PI);
  innerGeo.translate(0, -0.375, 0);
  const outer = new THREE.Mesh(outerGeo, flameMat(0xffc93a, 0xff5a00, 0.55));
  const inner = new THREE.Mesh(innerGeo, flameMat(0xfffbe0, 0xffb020, 0.85));
  const flame = new THREE.Group();
  flame.add(outer, inner);
  flame.position.y = -0.36;
  ship.add(flame);
  const glow = new THREE.PointLight(0xff8a2a, 6, 6, 1.6);
  glow.position.y = -0.7;
  ship.add(glow);

  const nozzle = new THREE.Vector3(0, -0.95 - 0.4, 0);
  const flames = [outer.material as THREE.ShaderMaterial, inner.material as THREE.ShaderMaterial];

  return {
    group,
    nozzle,
    update(t, thrust) {
      flames.forEach((m) => {
        m.uniforms.uTime.value = t;
        m.uniforms.uThrust.value = thrust;
      });
      flame.visible = thrust > 0.02;
      flame.scale.setScalar(0.6 + thrust * 0.6);
      glow.intensity = thrust * (5 + Math.sin(t * 40) * 1.5);
    },
    setOpacity(o) {
      mats.forEach((m) => {
        m.transparent = o < 1;
        m.opacity = o;
      });
      flames.forEach((m) => (m.uniforms.uAlpha.value = o));
      group.visible = o > 0.01;
    },
  };
}
