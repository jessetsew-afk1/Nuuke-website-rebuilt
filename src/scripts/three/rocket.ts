// The NUUKE rocket: a retro riveted rocket (brushed silver body, lacquered red ogive nose,
// porthole with a lit cabin, swept red fins, ribbed engine with a heat-tinted bell) and a
// living exhaust plume. Built procedurally (no downloads); textures are cached and shared.
import { THREE } from './core';
import { hullMaps, paintMaps, bellMaps, cabinTexture, HULL_TOP } from './fx/textures';
import { makeFlame } from './fx/flame';

const RED = 0xb3121c;
const RED_DARK = 0x6a0a10;

function lathe(points: [number, number][], segs = 64) {
  return new THREE.LatheGeometry(
    points.map(([r, y]) => new THREE.Vector2(r, y)),
    segs,
  );
}

/** Hull profile control points [radius, y] in ship space (y = 0 at the engine collar). */
const hull: [number, number][] = [
  [0.4, 0],
  [0.47, 0.12],
  [0.53, 0.42],
  [0.56, 0.78],
  [0.55, 1.15],
  [0.51, 1.5],
  [0.45, 1.82],
  [0.43, HULL_TOP],
];

// Smooth (Catmull-Rom) radius lookup, resampled evenly in y so texture v = y / HULL_TOP.
const dense = (() => {
  const curve = new THREE.CatmullRomCurve3(hull.map(([r, y]) => new THREE.Vector3(r, y, 0)), false, 'centripetal');
  return curve.getPoints(400);
})();
export function hullRadius(y: number) {
  if (y <= dense[0].y) return dense[0].x;
  for (let i = 1; i < dense.length; i++) {
    if (y <= dense[i].y) {
      const a = dense[i - 1];
      const b = dense[i];
      return a.x + ((y - a.y) / (b.y - a.y || 1)) * (b.x - a.x);
    }
  }
  return dense[dense.length - 1].x;
}

export type Rocket = {
  group: THREE.Group;
  /** Nozzle position in rocket space (flame/particles spawn here). */
  nozzle: THREE.Vector3;
  /** The porthole (centre of the glass, facing the ship's +z). */
  porthole: THREE.Object3D;
  /** Radius of the porthole glass in ship units. */
  portholeRadius: number;
  update: (t: number, thrust: number, boost?: number) => void;
  setOpacity: (o: number) => void;
  /** 0..1 how bright the cabin glow behind the porthole is. */
  setCabin: (v: number) => void;
  /** Scale the exhaust brightness (flame, glow sprites, engine light). 1 = default. */
  setFlameIntensity: (v: number) => void;
  dispose: () => void;
};

/**
 * opts.lite  fewer segments / smaller textures (defaults to on for phones).
 * opts.small for a rocket drawn tiny (e.g. among the planets): a dimmer exhaust that does not
 *            bloom into a fireball, and an engine light with a short reach.
 * opts.flame exhaust brightness multiplier (default 1, or 0.3 when small).
 */
export function makeRocket(opts: { lite?: boolean; small?: boolean; flame?: number } = {}): Rocket {
  const lite = opts.lite ?? (opts.small || window.innerWidth < 760 || window.matchMedia('(pointer: coarse)').matches);
  let flameK = opts.flame ?? (opts.small ? 0.3 : 1);
  const segs = lite ? 48 : 96;
  const group = new THREE.Group();
  const ship = new THREE.Group();
  ship.position.y = -0.95; // centre the model around its middle
  group.add(ship);

  const hm = hullMaps(lite);
  const pm = paintMaps(lite);
  const bm = bellMaps(lite);
  pm.map.repeat.set(2, 2);
  pm.rough.repeat.set(2, 2);

  const metal = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    map: hm.map,
    metalness: 1,
    metalnessMap: hm.orm,
    roughness: 1,
    roughnessMap: hm.orm,
    normalMap: hm.normal,
    normalScale: new THREE.Vector2(0.55, 0.55),
    anisotropy: lite ? 0 : 0.5,
    clearcoat: 0.25,
    clearcoatRoughness: 0.25,
  });
  const red = new THREE.MeshPhysicalMaterial({
    color: RED,
    map: pm.map,
    roughness: 1,
    roughnessMap: pm.rough,
    metalness: 0.05,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
  });
  const redDark = new THREE.MeshPhysicalMaterial({ color: RED_DARK, roughness: 0.45, metalness: 0.1, clearcoat: 0.8, clearcoatRoughness: 0.12 });
  const chrome = new THREE.MeshPhysicalMaterial({ color: 0xe9e9ee, metalness: 1, roughness: 0.12, clearcoat: 0.6, clearcoatRoughness: 0.05 });
  const bellMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: bm.map, normalMap: bm.normal, metalness: 0.85, roughness: 0.38 });
  const bellInner = new THREE.MeshStandardMaterial({ color: 0x1a1412, roughness: 0.85, metalness: 0.3, emissive: 0xff5a1a, emissiveIntensity: 0, side: THREE.BackSide });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x07080c,
    metalness: 0,
    roughness: 0.03,
    clearcoat: 1,
    clearcoatRoughness: 0.02,
    emissive: 0xffffff,
    emissiveMap: cabinTexture(),
    emissiveIntensity: 1,
    envMapIntensity: 1.8,
  });
  const dark = new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.7, metalness: 0.5 });
  const mats: THREE.Material[] = [metal, red, redDark, chrome, bellMat, bellInner, glassMat, dark];

  // Hull (evenly sampled so the panel texture lines up)
  const hullPts: [number, number][] = [];
  for (let i = 0; i <= 60; i++) {
    const y = (i / 60) * HULL_TOP;
    hullPts.push([hullRadius(y), y]);
  }
  ship.add(new THREE.Mesh(lathe(hullPts, segs), metal));
  const floor = new THREE.Mesh(new THREE.CircleGeometry(0.41, 32), dark);
  floor.rotation.x = Math.PI / 2;
  floor.position.y = 0.001;
  ship.add(floor);

  // Nose cone (ogive) with a chrome tip
  const nose: [number, number][] = [];
  for (let i = 0; i <= 40; i++) {
    const k = i / 40;
    nose.push([Math.max(0.001, 0.445 * Math.cos(k * Math.PI * 0.5) ** 0.85), 1.88 + k * 1.05]);
  }
  ship.add(new THREE.Mesh(lathe(nose, segs), red));
  const tip = new THREE.Mesh(lathe([[0.001, 2.955], [0.03, 2.94], [0.05, 2.9], [0.062, 2.86], [0.0, 2.84]], 24), chrome);
  ship.add(tip);

  // Chrome bands with domed rivets
  const bandYs = [0.16, 0.95, 1.86];
  const perBand = lite ? 28 : 40;
  const rivetGeo = new THREE.SphereGeometry(0.0115, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2);
  rivetGeo.rotateX(Math.PI / 2);
  const rivets = new THREE.InstancedMesh(rivetGeo, chrome, bandYs.length * perBand * 2);
  let ri = 0;
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const one = new THREE.Vector3(1, 1, 1);
  bandYs.forEach((y) => {
    const r = hullRadius(y);
    const band = new THREE.Mesh(
      lathe([[r - 0.004, y - 0.034], [r + 0.01, y - 0.028], [r + 0.015, y - 0.012], [r + 0.015, y + 0.012], [r + 0.01, y + 0.028], [r - 0.004, y + 0.034]], segs),
      chrome,
    );
    ship.add(band);
    for (const dy of [-0.018, 0.018]) {
      for (let i = 0; i < perBand; i++) {
        const a = ((i + (dy > 0 ? 0.5 : 0)) / perBand) * Math.PI * 2;
        const rr = r + 0.014;
        q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), a);
        m4.compose(new THREE.Vector3(Math.sin(a) * rr, y + dy, Math.cos(a) * rr), q, one);
        rivets.setMatrixAt(ri++, m4);
      }
    }
  });
  rivets.count = ri;
  ship.add(rivets);

  // Porthole facing +z: red lacquered ring, chrome bolts and bezel, convex glass with the cabin glowing behind it
  const py = 1.28;
  const pr = hullRadius(py);
  const port = new THREE.Group();
  port.position.set(0, py, pr + 0.012);
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.235, 0.25, 0.16, 48, 1, true), red);
  collar.rotation.x = Math.PI / 2;
  collar.position.z = -0.06;
  port.add(collar);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.205, 0.052, 20, 64), red);
  port.add(ring);
  const bezel = new THREE.Mesh(new THREE.TorusGeometry(0.168, 0.012, 10, 64), chrome);
  bezel.position.z = 0.012;
  port.add(bezel);
  const bolts = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.012, 0.012, 0.012, 10), chrome, 12);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
    m4.compose(new THREE.Vector3(Math.cos(a) * 0.205, Math.sin(a) * 0.205, 0.052), q, one);
    bolts.setMatrixAt(i, m4);
  }
  port.add(bolts);
  const GR = 0.165;
  const domeR = 0.42;
  const theta = Math.asin(GR / domeR);
  const domeGeo = new THREE.SphereGeometry(domeR, 40, 8, 0, Math.PI * 2, 0, theta);
  domeGeo.rotateX(Math.PI / 2);
  domeGeo.translate(0, 0, -Math.cos(theta) * domeR + 0.004);
  {
    const p = domeGeo.attributes.position;
    const uv = domeGeo.attributes.uv;
    for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / (2 * GR) + 0.5, p.getY(i) / (2 * GR) + 0.5);
  }
  const glass = new THREE.Mesh(domeGeo, glassMat);
  port.add(glass);
  const backing = new THREE.Mesh(new THREE.CircleGeometry(0.2, 40), dark);
  backing.position.z = -0.02;
  port.add(backing);
  ship.add(port);

  // Engine: ribbed red collar and a heat-tinted, tube-walled bell
  const ribs = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const r = 0.37 - i * 0.035;
    const t = new THREE.Mesh(new THREE.TorusGeometry(r, 0.042, 16, segs), i % 2 ? redDark : red);
    t.rotation.x = Math.PI / 2;
    t.position.y = -0.025 - i * 0.07;
    ribs.add(t);
  }
  const bellPts: [number, number][] = [
    [0.3, -0.43],
    [0.285, -0.38],
    [0.255, -0.32],
    [0.22, -0.26],
    [0.2, -0.2],
    [0.205, -0.14],
  ];
  ribs.add(new THREE.Mesh(lathe(bellPts, segs), bellMat));
  ribs.add(new THREE.Mesh(lathe(bellPts.map(([r, y]) => [r - 0.012, y + 0.004] as [number, number]), segs), bellInner));
  const lip = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.008, 8, segs), chrome);
  lip.rotation.x = Math.PI / 2;
  lip.position.y = -0.43;
  ribs.add(lip);
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
  const finGeo = new THREE.ExtrudeGeometry(fin, { depth: 0.06, bevelEnabled: true, bevelThickness: 0.028, bevelSize: 0.028, bevelSegments: lite ? 3 : 5, curveSegments: lite ? 18 : 32 });
  finGeo.translate(0, 0, -0.03);
  const footGeo = new THREE.CylinderGeometry(0.035, 0.045, 0.05, 16);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 2;
    const f = new THREE.Mesh(finGeo, red);
    const holder = new THREE.Group();
    f.position.x = 0.42;
    holder.add(f);
    const foot = new THREE.Mesh(footGeo, chrome);
    foot.position.set(0.42 + 0.45, -0.69, 0);
    holder.add(foot);
    holder.rotation.y = a;
    ship.add(holder);
  }

  // Exhaust
  const flame = makeFlame(lite, 0.29);
  flame.group.position.y = -0.43;
  ship.add(flame.group);
  const glow = new THREE.PointLight(0xff8a2a, 0, opts.small ? 1.2 : 7, 1.6);
  glow.position.y = -0.85;
  ship.add(glow);

  const nozzle = new THREE.Vector3(0, -0.95 - 0.43, 0);
  let opacity = 1;
  let cabin = 1;

  return {
    group,
    nozzle,
    porthole: port,
    portholeRadius: GR,
    update(t, thrust, boost = 0) {
      flame.update(t, thrust, opacity * flameK, boost);
      glow.intensity = thrust * opacity * flameK * (opts.small ? 0.15 : 1) * (5 + Math.sin(t * 40) * 1.2 + Math.sin(t * 17) * 0.8);
      bellInner.emissiveIntensity = Math.min(1.6, thrust * 1.1);
      glassMat.emissiveIntensity = cabin * (0.95 + Math.sin(t * 3.1) * 0.03);
    },
    setOpacity(o) {
      opacity = o;
      mats.forEach((m) => {
        m.transparent = o < 1;
        m.opacity = o;
      });
      group.visible = o > 0.01;
    },
    setCabin(v) {
      cabin = v;
    },
    setFlameIntensity(v) {
      flameK = v;
    },
    dispose() {
      group.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) m.geometry.dispose();
      });
      mats.forEach((m) => m.dispose());
      flame.dispose();
    },
  };
}
