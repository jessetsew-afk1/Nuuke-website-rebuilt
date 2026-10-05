// Gentler Streak hero: a soft clay sculpture of the Activity Path.
// The band is the "safe zone" extruded into 3D, thirty pearls are thirty days,
// and a seven-segment weekly ring turns slowly behind it. Procedural, no downloads.
import { createStage, THREE } from './core';

const C = {
  coral: 0xff7a45,
  coralDeep: 0xe2551f,
  sun: 0xf4c430,
  lilac: 0xb9a6e8,
  plum: 0x4a2f78,
  mint: 0x7ed957,
  leaf: 0x2f7d32,
  cream: 0xfff4ec,
};

const days = [0.1, 0.4, 0.8, 1.3, 0.6, -0.2, -0.6, 0.1, 0.3, 1.5, 0.7, 0.2, -0.4, -1.2, -0.3, 0.2, 0.4, 0.6, 0.1, -0.1, 0.3, 0.5, 1.1, 0.4, 0.0, -0.5, 0.2, 0.3, 0.5, 0.15];

export function initHero(canvas: HTMLCanvasElement) {
  const stage = createStage(canvas, { fov: 30, z: 13 });
  const { scene, onFrame, pointer, reduced } = stage;

  scene.add(new THREE.HemisphereLight(0xfff1e6, 0x8a5a7a, 1.4));
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(4, 7, 8);
  scene.add(key);
  const warm = new THREE.PointLight(C.coral, 40, 30);
  warm.position.set(-4, 2, 5);
  scene.add(warm);

  const rig = new THREE.Group();
  scene.add(rig);

  // --- The band: area between two smooth curves, extruded into a soft slab.
  const X0 = -5.2;
  const X1 = 5.2;
  const centre = (t: number) => Math.sin(t * Math.PI * 1.6 + 1.2) * 0.45 + Math.sin(t * Math.PI * 3.1 + 2.4) * 0.15;
  const half = (t: number) => 0.62 * (0.82 + 0.18 * Math.cos(t * Math.PI * 2.2 + 1.2));
  const xs = (t: number) => X0 + (X1 - X0) * t;
  const N = 80;
  const shape = new THREE.Shape();
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const p = new THREE.Vector2(xs(t), centre(t) + half(t));
    if (i === 0) shape.moveTo(p.x, p.y);
    else shape.lineTo(p.x, p.y);
  }
  for (let i = N; i >= 0; i--) {
    const t = i / N;
    shape.lineTo(xs(t), centre(t) - half(t));
  }
  const bandGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.35, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.1, bevelSegments: 4, curveSegments: 4 });
  bandGeo.translate(0, 0, -0.17);
  const bandMat = new THREE.MeshPhysicalMaterial({ color: C.mint, roughness: 0.45, clearcoat: 0.6, clearcoatRoughness: 0.4, sheen: 0.6, sheenColor: new THREE.Color(0xeaffd9), transparent: true, opacity: 0.88 });
  const bandMesh = new THREE.Mesh(bandGeo, bandMat);
  rig.add(bandMesh);

  // --- Pearls: one per day. Inside the band = cream with a leaf core; above = coral; below = lilac.
  const pearlGeo = new THREE.SphereGeometry(0.17, 32, 20);
  const mats = {
    in: new THREE.MeshPhysicalMaterial({ color: C.cream, roughness: 0.25, clearcoat: 1, sheen: 0.4 }),
    up: new THREE.MeshPhysicalMaterial({ color: C.coral, roughness: 0.3, clearcoat: 1 }),
    down: new THREE.MeshPhysicalMaterial({ color: C.lilac, roughness: 0.3, clearcoat: 1 }),
  };
  const pearls = days.map((v, i) => {
    const t = i / (days.length - 1);
    const m = new THREE.Mesh(pearlGeo, v > 1 ? mats.up : v < -1 ? mats.down : mats.in);
    const y = centre(t) + v * half(t);
    m.position.set(xs(t), y, 0.42);
    m.userData = { y, phase: i * 0.37 };
    if (i === days.length - 1) m.scale.setScalar(1.6);
    rig.add(m);
    return m;
  });
  // Today: a halo around the last pearl.
  const today = pearls[pearls.length - 1];
  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.04, 12, 64), new THREE.MeshPhysicalMaterial({ color: C.coral, roughness: 0.3, clearcoat: 1, emissive: C.coral, emissiveIntensity: 0.25 }));
  halo.position.copy(today.position);
  rig.add(halo);

  // --- Weekly ring: seven clay arcs behind the band. Rest days are lilac and still count.
  const ring = new THREE.Group();
  const week = [C.coral, C.sun, C.lilac, C.coral, C.mint, C.lilac, C.coral];
  const gap = 0.07;
  week.forEach((c, i) => {
    const arc = (Math.PI * 2) / 7 - gap;
    const g = new THREE.TorusGeometry(2.6, 0.26, 24, 48, arc);
    const m = new THREE.Mesh(g, new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.5, clearcoat: 0.5, sheen: 0.5 }));
    m.rotation.z = Math.PI / 2 - (i + 1) * ((Math.PI * 2) / 7) + gap / 2;
    ring.add(m);
  });
  ring.position.set(1.9, 1.3, -3.2);
  scene.add(ring);

  // A soft sun disc far behind.
  const sun = new THREE.Mesh(new THREE.CircleGeometry(3.4, 64), new THREE.MeshBasicMaterial({ color: 0xffb089, transparent: true, opacity: 0.45, depthWrite: false }));
  sun.position.set(1.9, 1.3, -5);
  scene.add(sun);

  rig.rotation.set(-0.18, -0.42, 0.04);
  rig.position.set(-0.3, -0.9, 0);
  const small = () => canvas.clientWidth < 520;
  const fit = () => {
    const s = small() ? 0.78 : 1;
    rig.scale.setScalar(s);
    ring.scale.setScalar(s);
  };
  fit();
  new ResizeObserver(fit).observe(canvas);

  onFrame((t) => {
    // Breathing: one slow cycle every ~5.5 s.
    const breath = reduced ? 0 : Math.sin((t * Math.PI * 2) / 5.5);
    pearls.forEach((p) => {
      p.position.y = p.userData.y + (reduced ? 0 : Math.sin(t * 1.1 + p.userData.phase) * 0.05);
    });
    halo.position.y = today.position.y;
    halo.scale.setScalar(1 + breath * 0.08);
    ring.rotation.z = reduced ? 0.2 : t * 0.06;
    sun.scale.setScalar(1 + breath * 0.03);
    rig.rotation.y = -0.42 + pointer.x * 0.12;
    rig.rotation.x = -0.18 - pointer.y * 0.06;
  });

  return stage;
}
