// Home hero: service "artifacts" float in space around the headline and fly past
// the camera as you scroll (replaces the old GIF tiles, ~9 MB → ~0 MB of media).
import { createStage, makePhone, svgTexture, THREE } from './core';

const PHONE_UI = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 375 775">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff2e88"/><stop offset="1" stop-color="#8b5cff"/></linearGradient></defs>
<rect width="375" height="775" fill="#0b0b10"/>
<rect x="24" y="70" width="140" height="14" rx="7" fill="#fff" opacity=".9"/>
<rect x="24" y="94" width="90" height="10" rx="5" fill="#fff" opacity=".35"/>
<rect x="24" y="130" width="327" height="200" rx="26" fill="url(#g)"/>
<circle cx="80" cy="200" r="30" fill="#fff" opacity=".25"/>
<rect x="48" y="270" width="160" height="14" rx="7" fill="#fff"/>
<rect x="48" y="294" width="100" height="10" rx="5" fill="#fff" opacity=".6"/>
<g fill="#16161d"><rect x="24" y="352" width="155" height="150" rx="22"/><rect x="196" y="352" width="155" height="150" rx="22"/></g>
<rect x="44" y="372" width="40" height="40" rx="12" fill="#ff2e88" opacity=".9"/>
<rect x="216" y="372" width="40" height="40" rx="12" fill="#3ee6b0" opacity=".9"/>
<g fill="#fff" opacity=".7"><rect x="44" y="440" width="100" height="10" rx="5"/><rect x="216" y="440" width="100" height="10" rx="5"/></g>
<g fill="#fff" opacity=".3"><rect x="44" y="460" width="70" height="8" rx="4"/><rect x="216" y="460" width="70" height="8" rx="4"/></g>
<g fill="#16161d"><rect x="24" y="522" width="327" height="72" rx="20"/><rect x="24" y="606" width="327" height="72" rx="20"/></g>
<circle cx="60" cy="558" r="18" fill="#8b5cff"/><circle cx="60" cy="642" r="18" fill="#ffb547"/>
<g fill="#fff" opacity=".7"><rect x="92" y="548" width="140" height="10" rx="5"/><rect x="92" y="632" width="120" height="10" rx="5"/></g>
<rect x="24" y="706" width="327" height="54" rx="27" fill="#fff"/>
<rect x="140" y="728" width="95" height="10" rx="5" fill="#0b0b10"/>
</svg>`;

export async function initHero(canvas: HTMLCanvasElement, section: HTMLElement) {
  const stage = createStage(canvas, { fov: 32, z: 14 });
  const { scene, camera, pointer, onFrame } = stage;
  const isSmall = window.innerWidth < 760;
  const S = isSmall ? 0.62 : 1;

  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(4, 6, 8);
  scene.add(key);
  const rim = new THREE.PointLight(0xff2e88, 40, 30);
  rim.position.set(-6, -2, 4);
  scene.add(rim);
  const rim2 = new THREE.PointLight(0x8b5cff, 40, 30);
  rim2.position.set(6, 3, 3);
  scene.add(rim2);

  const world = new THREE.Group();
  scene.add(world);
  type Item = { obj: THREE.Object3D; base: THREE.Vector3; spin: THREE.Vector3; float: number; depth: number };
  const items: Item[] = [];
  const add = (obj: THREE.Object3D, x: number, y: number, z: number, spin: [number, number, number], depth = 1) => {
    obj.position.set(x * (isSmall ? 0.55 : 1), y * (isSmall ? 1.25 : 1), z);
    obj.scale.multiplyScalar(S);
    world.add(obj);
    items.push({ obj, base: obj.position.clone(), spin: new THREE.Vector3(...spin), float: Math.random() * Math.PI * 2, depth });
  };

  // 1. Phone — mobile apps
  const screenTex = await svgTexture(PHONE_UI);
  const phone = makePhone(screenTex);
  phone.group.rotation.set(0.1, 0.5, -0.12);
  add(phone.group, -5.4, 1.6, -1, [0, 0.18, 0], 1.2);

  // 2. Chrome knot — 3D & animation
  const knot = new THREE.Mesh(
    new THREE.TorusKnotGeometry(0.8, 0.28, 220, 32, 2, 3),
    new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 1, roughness: 0.12, iridescence: 1, iridescenceIOR: 1.6, iridescenceThicknessRange: [200, 700] }),
  );
  add(knot, 5.3, 1.9, -2, [0.25, 0.35, 0], 0.9);

  // 3. Iridescent gem — brand / marketing
  const gem = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.85, 0),
    new THREE.MeshPhysicalMaterial({ color: 0x3ee6b0, metalness: 0.2, roughness: 0.1, clearcoat: 1, iridescence: 0.8, flatShading: true }),
  );
  add(gem, -5, -2.5, 0.5, [0.3, 0.2, 0.1], 1.4);

  // 4. Neural globe — AI
  const globe = new THREE.Group();
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i < 90; i++) {
    const phi = Math.acos(1 - (2 * (i + 0.5)) / 90);
    const th = Math.PI * (1 + Math.sqrt(5)) * i;
    pts.push(new THREE.Vector3(Math.cos(th) * Math.sin(phi), Math.sin(th) * Math.sin(phi), Math.cos(phi)).multiplyScalar(1.1));
  }
  const lineVerts: number[] = [];
  pts.forEach((a, i) => pts.forEach((b, j) => j > i && a.distanceTo(b) < 0.42 && lineVerts.push(a.x, a.y, a.z, b.x, b.y, b.z)));
  const lines = new THREE.LineSegments(
    new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(lineVerts, 3)),
    new THREE.LineBasicMaterial({ color: 0x8b5cff, transparent: true, opacity: 0.55 }),
  );
  const dots = new THREE.Points(new THREE.BufferGeometry().setFromPoints(pts), new THREE.PointsMaterial({ color: 0xffffff, size: 0.06 }));
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.42, 32, 32), new THREE.MeshStandardMaterial({ color: 0x8b5cff, emissive: 0x8b5cff, emissiveIntensity: 1.6 }));
  globe.add(lines, dots, core);
  add(globe, 5.2, -2.2, 0, [0.05, 0.3, 0], 1.1);

  // 5. Glowing pink bar — nod to the original hero shape
  const bar = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.28, 1.8, 8, 24),
    new THREE.MeshStandardMaterial({ color: 0xff2e88, emissive: 0xff2e88, emissiveIntensity: 1.3, roughness: 0.3 }),
  );
  bar.rotation.z = 1.1;
  add(bar, 2.4, -3.7, -3, [0.1, 0, 0.3], 0.7);

  // 6. Small orbiting cubes for depth
  const cubeMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0.6, roughness: 0.25 });
  for (let i = 0; i < 9; i++) {
    const c = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.22), cubeMat);
    const a = (i / 9) * Math.PI * 2;
    add(c, Math.cos(a) * 7.2, Math.sin(a) * 3.6, -4 - Math.random() * 3, [Math.random(), Math.random(), 0], 0.5);
  }

  // Scroll progress through the hero (0 at top, 1 once the hero has scrolled away).
  let progress = 0;
  const updateProgress = () => {
    const r = section.getBoundingClientRect();
    progress = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height * 0.9)));
  };
  window.addEventListener('scroll', updateProgress, { passive: true });
  updateProgress();

  // Intro: everything drifts in from deep space.
  const born = performance.now();
  onFrame((t, dt) => {
    const intro = stage.reduced ? 1 : Math.min(1, (performance.now() - born) / 2200);
    const ease = 1 - Math.pow(1 - intro, 4);
    for (const it of items) {
      const spread = 1 + progress * 0.9 * it.depth;
      it.obj.position.x = it.base.x * spread;
      it.obj.position.y = it.base.y * spread + Math.sin(t * 0.8 + it.float) * 0.18;
      it.obj.position.z = it.base.z - (1 - ease) * 18 + progress * 9 * it.depth;
      it.obj.rotation.x += it.spin.x * dt;
      it.obj.rotation.y += it.spin.y * dt;
      it.obj.rotation.z += it.spin.z * dt * 0.3;
    }
    world.rotation.y = pointer.x * 0.12;
    world.rotation.x = -pointer.y * 0.08;
    camera.position.x = pointer.x * 0.4;
    camera.position.y = pointer.y * 0.25;
    camera.lookAt(0, 0, 0);
  });
}
