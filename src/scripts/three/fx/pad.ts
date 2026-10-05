// Launch complex for the loader: concrete deck with a flame trench, steel launch ring and
// hold-down clamps, a cross-braced lattice service tower with umbilical arms that swing
// away at ignition, warning beacons, floodlight masts and distant site lights.
import { THREE } from '../core';
import { concreteMaps, scorchTexture, glowTexture, groundFade } from './textures';

export const DECK = 0.6; // deck top height
export const ROCKET_BASE = DECK + 1.67; // rocket group y when standing on the deck

const up = new THREE.Vector3(0, 1, 0);
const tmpQ = new THREE.Quaternion();
const tmpV = new THREE.Vector3();

/** Collects box members between two points into one InstancedMesh. */
class Members {
  list: THREE.Matrix4[] = [];
  add(a: THREE.Vector3, b: THREE.Vector3, t: number, t2 = t) {
    const d = tmpV.subVectors(b, a);
    const len = d.length();
    tmpQ.setFromUnitVectors(up, d.normalize());
    const m = new THREE.Matrix4().compose(new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5), tmpQ, new THREE.Vector3(t, len, t2));
    this.list.push(m);
  }
  build(geo: THREE.BufferGeometry, mat: THREE.Material) {
    const im = new THREE.InstancedMesh(geo, mat, this.list.length);
    this.list.forEach((m, i) => im.setMatrixAt(i, m));
    im.castShadow = true;
    im.receiveShadow = true;
    return im;
  }
}

type Arm = { pivot: THREE.Group; base: number; delay: number };

export type Pad = {
  group: THREE.Group;
  /** World points where the trench throws exhaust out sideways, with their directions. */
  trench: { p: THREE.Vector3; d: THREE.Vector3 }[];
  /** Idle cryogenic vents (world space). */
  vents: THREE.Vector3[];
  update: (t: number, s: { swing: number; clamps: number; alarm: number; burn: number }) => void;
  dispose: () => void;
};

export function makePad(lite: boolean): Pad {
  const group = new THREE.Group();
  const disposables: { dispose: () => void }[] = [];
  const keep = <T extends { dispose: () => void }>(x: T) => (disposables.push(x), x);

  const cm = concreteMaps(lite);
  const unit = keep(new THREE.BoxGeometry(1, 1, 1));

  // Ground that melts into the horizon
  const groundMap = cm.map.clone();
  groundMap.repeat.set(26, 26);
  groundMap.needsUpdate = true;
  const groundRough = cm.rough.clone();
  groundRough.repeat.set(26, 26);
  groundRough.needsUpdate = true;
  keep(groundMap);
  keep(groundRough);
  const ground = new THREE.Mesh(
    keep(new THREE.CircleGeometry(70, 64)),
    keep(new THREE.MeshStandardMaterial({ map: groundMap, roughnessMap: groundRough, color: 0x9a948c, roughness: 1, metalness: 0, alphaMap: groundFade(), transparent: true, depthWrite: true })),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.renderOrder = -20;
  ground.receiveShadow = true;
  group.add(ground);

  const concrete = keep(new THREE.MeshStandardMaterial({ map: cm.map, roughnessMap: cm.rough, color: 0xb8b2aa, roughness: 1, metalness: 0 }));
  const deckTop = keep(new THREE.MeshStandardMaterial({ map: scorchTexture(), color: 0x8f8a84, roughness: 0.92, metalness: 0 }));
  const steel = keep(new THREE.MeshStandardMaterial({ color: 0x59606b, roughness: 0.5, metalness: 0.75 }));
  const steelDark = keep(new THREE.MeshStandardMaterial({ color: 0x2a2d33, roughness: 0.6, metalness: 0.7 }));
  const towerMat = keep(new THREE.MeshStandardMaterial({ color: 0x6b717c, roughness: 0.55, metalness: 0.65 }));
  const hazard = keep(new THREE.MeshStandardMaterial({ color: 0xd8a020, roughness: 0.5, metalness: 0.2 }));
  const black = keep(new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 1, metalness: 0 }));
  const hose = keep(new THREE.MeshStandardMaterial({ color: 0x15161a, roughness: 0.55, metalness: 0.1 }));

  // Apron + deck
  const apron = new THREE.Mesh(keep(new THREE.CylinderGeometry(6.2, 6.4, 0.12, 8)), concrete);
  apron.position.y = 0.06;
  apron.rotation.y = Math.PI / 8;
  apron.receiveShadow = true;
  group.add(apron);
  const deck = new THREE.Mesh(keep(new THREE.CylinderGeometry(3.0, 3.35, DECK, 8)), [concrete, deckTop, concrete]);
  deck.position.y = DECK / 2;
  deck.rotation.y = Math.PI / 8;
  deck.receiveShadow = true;
  deck.castShadow = true;
  group.add(deck);
  // Hazard stripe around the deck edge
  const stripe = new THREE.Mesh(keep(new THREE.CylinderGeometry(3.02, 3.02, 0.05, 8, 1, true)), hazard);
  stripe.position.y = DECK - 0.04;
  stripe.rotation.y = Math.PI / 8;
  group.add(stripe);

  // Launch ring, flame hole and trench
  const ring = new THREE.Mesh(keep(new THREE.RingGeometry(0.62, 1.45, 48)), steel);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = DECK + 0.006;
  ring.receiveShadow = true;
  group.add(ring);
  const holeMat = keep(new THREE.MeshBasicMaterial({ color: 0x020202 }));
  const hole = new THREE.Mesh(keep(new THREE.CircleGeometry(0.62, 48)), holeMat);
  hole.rotation.x = -Math.PI / 2;
  hole.position.y = DECK + 0.004;
  group.add(hole);
  const trenchCut = new THREE.Mesh(unit, black);
  trenchCut.scale.set(6.9, 0.02, 0.9);
  trenchCut.position.y = DECK + 0.002;
  group.add(trenchCut);
  // Steel grating over the trench (a row of thin bars)
  const grate = new Members();
  for (let x = -3.3; x <= 3.3; x += 0.12) {
    if (Math.abs(x) < 0.7) continue;
    grate.add(new THREE.Vector3(x, DECK + 0.01, -0.45), new THREE.Vector3(x, DECK + 0.01, 0.45), 0.025);
  }
  group.add(grate.build(unit, steelDark));
  for (const sx of [-1, 1]) {
    const mouth = new THREE.Mesh(unit, black);
    mouth.scale.set(0.3, 0.42, 0.95);
    mouth.position.set(sx * 3.05, 0.22, 0);
    group.add(mouth);
    const lintel = new THREE.Mesh(unit, steel);
    lintel.scale.set(0.34, 0.08, 1.15);
    lintel.position.set(sx * 3.06, 0.47, 0);
    group.add(lintel);
  }
  // Pedestals + hold-down clamps under each fin foot
  const clamps: THREE.Group[] = [];
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 2;
    const fx = Math.cos(a) * 0.87;
    const fz = -Math.sin(a) * 0.87;
    const ped = new THREE.Mesh(unit, steel);
    ped.scale.set(0.26, 0.06, 0.26);
    ped.position.set(fx, DECK + 0.03, fz);
    ped.castShadow = true;
    group.add(ped);
    const g = new THREE.Group();
    g.position.set(fx * 1.18, DECK + 0.06, fz * 1.18);
    g.rotation.y = a;
    const jaw = new THREE.Mesh(unit, steelDark);
    jaw.scale.set(0.2, 0.08, 0.12);
    jaw.position.set(-0.08, 0.05, 0);
    g.add(jaw);
    const hinge = new THREE.Mesh(unit, hazard);
    hinge.scale.set(0.08, 0.1, 0.16);
    g.add(hinge);
    group.add(g);
    clamps.push(g);
  }

  // Service tower: 4 legs, rings and X bracing on every face
  const T = new THREE.Vector3(-2.45, DECK, -0.75);
  const half = 0.42;
  const levels = 11;
  const step = 0.58;
  const H = levels * step;
  const tower = new Members();
  const corners = [
    [-half, -half],
    [half, -half],
    [half, half],
    [-half, half],
  ];
  corners.forEach(([x, z]) => tower.add(new THREE.Vector3(T.x + x, T.y, T.z + z), new THREE.Vector3(T.x + x, T.y + H + 0.3, T.z + z), 0.07));
  for (let l = 0; l <= levels; l++) {
    const y = T.y + l * step;
    for (let c = 0; c < 4; c++) {
      const [x0, z0] = corners[c];
      const [x1, z1] = corners[(c + 1) % 4];
      tower.add(new THREE.Vector3(T.x + x0, y, T.z + z0), new THREE.Vector3(T.x + x1, y, T.z + z1), 0.045);
      if (l < levels) {
        tower.add(new THREE.Vector3(T.x + x0, y, T.z + z0), new THREE.Vector3(T.x + x1, y + step, T.z + z1), 0.026);
        tower.add(new THREE.Vector3(T.x + x1, y, T.z + z1), new THREE.Vector3(T.x + x0, y + step, T.z + z0), 0.026);
      }
    }
  }
  // Crown: mast + lightning rod
  tower.add(new THREE.Vector3(T.x, T.y + H + 0.3, T.z), new THREE.Vector3(T.x, T.y + H + 1.5, T.z), 0.05);
  group.add(tower.build(unit, towerMat));
  // Service platforms
  [3, 6, 9].forEach((l) => {
    const p = new THREE.Mesh(unit, steelDark);
    p.scale.set(half * 2 + 0.36, 0.03, half * 2 + 0.36);
    p.position.set(T.x, T.y + l * step, T.z);
    p.castShadow = true;
    group.add(p);
  });
  const roof = new THREE.Mesh(unit, hazard);
  roof.scale.set(half * 2 + 0.1, 0.12, half * 2 + 0.1);
  roof.position.set(T.x, T.y + H + 0.3, T.z);
  group.add(roof);

  // Umbilical arms
  const arms: Arm[] = [];
  const armHeights = [
    [1.85, 0.53],
    [2.62, 0.5],
    [3.55, 0.33],
  ];
  const armGeo = unit;
  armHeights.forEach(([y, hullR], i) => {
    const pivot = new THREE.Group();
    const start = new THREE.Vector3(T.x + half, y, T.z + half * 0.4);
    pivot.position.copy(start);
    const toAxis = new THREE.Vector3(-start.x, 0, -start.z);
    const reach = toAxis.length() - hullR - 0.02;
    const base = Math.atan2(-toAxis.z, toAxis.x);
    pivot.rotation.y = base;
    const m = new Members();
    const hgt = 0.22;
    m.add(new THREE.Vector3(0, 0, -0.09), new THREE.Vector3(reach, 0, -0.09), 0.035);
    m.add(new THREE.Vector3(0, 0, 0.09), new THREE.Vector3(reach, 0, 0.09), 0.035);
    m.add(new THREE.Vector3(0, hgt, -0.09), new THREE.Vector3(reach - 0.1, hgt, -0.09), 0.03);
    m.add(new THREE.Vector3(0, hgt, 0.09), new THREE.Vector3(reach - 0.1, hgt, 0.09), 0.03);
    const n = Math.max(3, Math.round(reach / 0.24));
    for (let k = 0; k <= n; k++) {
      const x = (k / n) * (reach - 0.1);
      const x2 = ((k + 1) / n) * (reach - 0.1);
      for (const z of [-0.09, 0.09]) {
        m.add(new THREE.Vector3(x, 0, z), new THREE.Vector3(x, hgt, z), 0.018);
        if (k < n) m.add(new THREE.Vector3(x, 0, z), new THREE.Vector3(x2, hgt, z), 0.016);
      }
      m.add(new THREE.Vector3(x, 0, -0.09), new THREE.Vector3(x, 0, 0.09), 0.016);
    }
    const truss = m.build(armGeo, towerMat);
    pivot.add(truss);
    const plate = new THREE.Mesh(unit, hazard);
    plate.scale.set(0.06, 0.2, 0.26);
    plate.position.set(reach - 0.02, 0.05, 0);
    pivot.add(plate);
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0.2, -0.02, 0.05), new THREE.Vector3(reach * 0.45, -0.32, 0.05), new THREE.Vector3(reach * 0.8, -0.18, 0.05), new THREE.Vector3(reach - 0.04, 0.0, 0.05)]);
    const tube = new THREE.Mesh(keep(new THREE.TubeGeometry(curve, 24, 0.028, 8)), hose);
    tube.castShadow = true;
    pivot.add(tube);
    group.add(pivot);
    arms.push({ pivot, base, delay: i * 0.18 });
  });

  // Warning beacons (HDR emissive so they bloom) with glow sprites
  const beaconMat = keep(new THREE.MeshBasicMaterial({ color: new THREE.Color(6, 0.35, 0.25) }));
  const amberMat = keep(new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 2.4, 0.4) }));
  const bulb = keep(new THREE.SphereGeometry(0.045, 10, 8));
  const glowMats: THREE.SpriteMaterial[] = [];
  const beacons: { mesh: THREE.Mesh; sprite: THREE.Sprite; phase: number; kind: 'red' | 'amber' | 'steady' }[] = [];
  const addBeacon = (p: THREE.Vector3, kind: 'red' | 'amber' | 'steady', phase = 0, scale = 0.6) => {
    const mesh = new THREE.Mesh(bulb, kind === 'amber' ? amberMat : beaconMat);
    mesh.position.copy(p);
    group.add(mesh);
    const sm = keep(new THREE.SpriteMaterial({ map: glowTexture(), color: kind === 'amber' ? 0xffa030 : 0xff2a1a, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    glowMats.push(sm);
    const sprite = new THREE.Sprite(sm);
    sprite.position.copy(p);
    sprite.scale.setScalar(scale);
    group.add(sprite);
    beacons.push({ mesh, sprite, phase, kind });
  };
  addBeacon(new THREE.Vector3(T.x, T.y + H + 1.55, T.z), 'red', 0, 0.9);
  for (let l = 3; l <= levels; l += 3) addBeacon(new THREE.Vector3(T.x + half + 0.02, T.y + l * step + 0.05, T.z + half + 0.02), 'steady', l * 0.1, 0.4);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    addBeacon(new THREE.Vector3(Math.cos(a) * 2.75, DECK + 0.06, Math.sin(a) * 2.75), 'amber', i * 0.25, 0.45);
  }

  // Floodlight masts behind the pad, plus far-off site lights for scale
  const lampMat = keep(new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 2.45, 2.2) }));
  [
    [-7.5, -8.5, 6.5],
    [8.5, -11, 7.5],
  ].forEach(([x, z, h]) => {
    const mast = new Members();
    mast.add(new THREE.Vector3(x, 0, z), new THREE.Vector3(x, h, z), 0.12);
    group.add(mast.build(unit, steelDark));
    const head = new THREE.Group();
    head.position.set(x, h, z);
    head.lookAt(0, 2, 0);
    const box = new THREE.Mesh(unit, steelDark);
    box.scale.set(1.3, 0.7, 0.18);
    head.add(box);
    for (let r = 0; r < 2; r++)
      for (let c = 0; c < 4; c++) {
        const lamp = new THREE.Mesh(unit, lampMat);
        lamp.scale.set(0.24, 0.22, 0.02);
        lamp.position.set(-0.45 + c * 0.3, -0.15 + r * 0.3, 0.1);
        head.add(lamp);
      }
    group.add(head);
    const sm = keep(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xfff1d8, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.32 }));
    const s = new THREE.Sprite(sm);
    s.position.set(x, h, z).add(new THREE.Vector3(-x, 2 - h, -z).normalize().multiplyScalar(0.3));
    s.scale.setScalar(1.7);
    group.add(s);
  });
  const farN = lite ? 40 : 90;
  const farGeo = keep(new THREE.BufferGeometry());
  const farPos = new Float32Array(farN * 3);
  for (let i = 0; i < farN; i++) {
    const a = -Math.PI * 0.95 + Math.random() * Math.PI * 0.9;
    const d = 26 + Math.random() * 34;
    farPos[i * 3] = Math.cos(a) * d;
    farPos[i * 3 + 1] = 0.05 + Math.random() * (Math.random() < 0.15 ? 2.5 : 0.4);
    farPos[i * 3 + 2] = Math.sin(a) * d;
  }
  farGeo.setAttribute('position', new THREE.BufferAttribute(farPos, 3));
  const farMat = keep(new THREE.PointsMaterial({ color: new THREE.Color(3.5, 2.2, 1.2), size: 2.2, sizeAttenuation: false, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  group.add(new THREE.Points(farGeo, farMat));

  const trench = [
    { p: new THREE.Vector3(-3.25, 0.25, 0), d: new THREE.Vector3(-1, 0.08, 0) },
    { p: new THREE.Vector3(3.25, 0.25, 0), d: new THREE.Vector3(1, 0.08, 0) },
  ];
  const vents = [new THREE.Vector3(-0.42, 2.9, -0.2), new THREE.Vector3(0.38, DECK + 0.1, 0.5), new THREE.Vector3(-0.6, DECK + 0.1, -0.4)];

  const ease = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

  return {
    group,
    trench,
    vents,
    update(t, s) {
      arms.forEach((a) => {
        const k = ease((s.swing * 1.6 - a.delay) / 1);
        a.pivot.rotation.y = a.base + k * 1.45;
      });
      clamps.forEach((c) => (c.children[0].rotation.z = ease(s.clamps) * 1.2));
      beacons.forEach((b) => {
        let on = 1;
        if (b.kind === 'red') on = 0.15 + 0.85 * (Math.sin(t * 4 + b.phase) > 0.2 ? 1 : 0);
        else if (b.kind === 'amber') on = s.alarm > 0 ? (Math.sin(t * 12 + b.phase * 6) > 0 ? 1 : 0.1) : 0.35;
        else on = 0.8;
        b.sprite.material.opacity = on;
        b.mesh.visible = on > 0.3;
      });
      holeMat.color.setRGB(0.01 + s.burn * 3.2, 0.005 + s.burn * 1.2, s.burn * 0.3);
    },
    dispose() {
      group.traverse((o) => {
        const m = o as THREE.Mesh;
        if ((m as THREE.InstancedMesh).isInstancedMesh) (m as THREE.InstancedMesh).dispose();
      });
      disposables.forEach((d) => d.dispose());
      glowMats.forEach((m) => m.dispose());
    },
  };
}
