// Tiimo hero: soft pastel "task blocks", discs and pebbles drifting slowly
// around the phone. Procedural geometry only; calm motion, pointer parallax.
import { THREE, createStage } from './core';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const PASTELS = [0xdccfff, 0xffd3df, 0xffdcbf, 0xfff0b0, 0xc9f1dd, 0xd2e7ff, 0xa98bff];

export async function init(canvas: HTMLCanvasElement) {
  const stage = createStage(canvas, { fov: 32, z: 12 });
  const { scene, camera } = stage;

  scene.add(new THREE.HemisphereLight(0xffffff, 0xd9cdf7, 1.4));
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(3, 5, 6);
  scene.add(key);

  const group = new THREE.Group();
  scene.add(group);

  const slab = new RoundedBoxGeometry(1.7, 0.52, 0.22, 5, 0.2);
  const tall = new RoundedBoxGeometry(1.1, 1.1, 0.26, 5, 0.32);
  const pebble = new THREE.SphereGeometry(0.42, 40, 24);
  const ring = new THREE.TorusGeometry(0.45, 0.13, 20, 48);

  // Hand-placed around the edges so the phone stays clear.
  const spots: [number, number, number, number][] = [
    [-3.6, 2.6, -1.5, 0], [3.5, 2.9, -2, 1], [-4.1, -0.4, -2.5, 2], [4.2, 0.2, -1, 3],
    [-3.2, -2.9, -0.5, 4], [3.1, -2.8, -1.8, 5], [-1.9, 3.7, -3.5, 6], [1.9, -3.8, -3, 0],
    [-4.8, 1.6, -4, 1], [5, -1.7, -3.6, 2], [0.4, 4.3, -4.5, 3], [-0.6, -4.4, -2.2, 4],
  ];
  const geos = [slab, tall, pebble, ring, slab, pebble];
  const items = spots.map(([x, y, z, c], i) => {
    const mat = new THREE.MeshPhysicalMaterial({
      color: PASTELS[c],
      roughness: 0.42,
      metalness: 0,
      clearcoat: 0.7,
      clearcoatRoughness: 0.35,
      sheen: 0.6,
      sheenColor: new THREE.Color(0xffffff),
    });
    const m = new THREE.Mesh(geos[i % geos.length], mat);
    m.position.set(x, y, z);
    m.rotation.set(Math.sin(i) * 0.5, Math.cos(i * 1.3) * 0.6, (i % 2 ? 1 : -1) * 0.25);
    const s = 0.75 + ((i * 37) % 10) / 22;
    m.scale.setScalar(s);
    group.add(m);
    return { m, base: m.position.clone(), rot: m.rotation.clone(), ph: i * 1.618, sp: 0.25 + (i % 4) * 0.05 };
  });

  const resize = () => {
    // Pull the camera back on narrow canvases so nothing crops.
    const a = camera.aspect;
    camera.position.z = a < 0.9 ? 14 : 12;
  };
  resize();
  window.addEventListener('resize', resize, { passive: true });

  stage.onFrame((t) => {
    const k = stage.reduced ? 0 : 1;
    for (const it of items) {
      it.m.position.y = it.base.y + Math.sin(t * it.sp + it.ph) * 0.22 * k;
      it.m.position.x = it.base.x + Math.cos(t * it.sp * 0.7 + it.ph) * 0.12 * k;
      it.m.rotation.x = it.rot.x + Math.sin(t * 0.2 + it.ph) * 0.25 * k;
      it.m.rotation.y = it.rot.y + t * 0.08 * k;
    }
    group.rotation.y += (stage.pointer.x * 0.18 - group.rotation.y) * 0.05;
    group.rotation.x += (-stage.pointer.y * 0.12 - group.rotation.x) * 0.05;
  });
  stage.render();
  return stage;
}
