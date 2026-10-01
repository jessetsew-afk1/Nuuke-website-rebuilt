// Exploded phone: the design layers of one screen float apart in 3D, then
// assemble into the device as you scroll. Drag to orbit.
import { createStage, makePhone, svgTexture, THREE, RoundedPlane } from './core';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export type Layer = { label: string; svg: string };

export async function initStack(root: HTMLElement, canvas: HTMLCanvasElement, layers: Layer[], accent: string) {
  const stage = createStage(canvas, { fov: 30, z: 13 });
  const { scene, camera, onFrame } = stage;
  const isSmall = window.innerWidth < 760;

  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const key = new THREE.DirectionalLight(0xffffff, 2);
  key.position.set(5, 6, 8);
  scene.add(key);
  const glow = new THREE.PointLight(new THREE.Color(accent), 30, 20);
  glow.position.set(-3, -2, 4);
  scene.add(glow);

  const rig = new THREE.Group();
  scene.add(rig);
  const phone = makePhone(null);
  (phone.screenMat as THREE.MeshBasicMaterial).color.set(0x050505);
  rig.add(phone.group);

  const planes: THREE.Mesh[] = [];
  const edges: THREE.LineSegments[] = [];
  const W = 1.4;
  const H = 3.0;
  const textures = await Promise.all(layers.map((l) => svgTexture(l.svg, 600, 1286)));
  textures.forEach((tex, i) => {
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: i === 0 ? 1 : 0.92, side: THREE.DoubleSide, toneMapped: false, depthWrite: false });
    const m = new THREE.Mesh(new RoundedPlane(W, H, 0.14), mat);
    m.renderOrder = i + 1;
    rig.add(m);
    planes.push(m);
    const e = new THREE.LineSegments(new THREE.EdgesGeometry(new RoundedPlane(W, H, 0.14)), new THREE.LineBasicMaterial({ color: new THREE.Color(accent), transparent: true, opacity: 0.6 }));
    m.add(e);
    edges.push(e);
  });

  // 0 = exploded, 1 = assembled.
  const state = { p: 0, active: 0 };
  const labels = [...root.querySelectorAll<HTMLElement>('[data-layer]')];
  const setActive = (i: number) => labels.forEach((l, j) => l.classList.toggle('is-active', j === i));

  ScrollTrigger.create({
    trigger: root,
    start: 'top 70%',
    end: 'bottom 40%',
    scrub: 0.8,
    onUpdate: (st) => {
      state.p = st.progress;
      const idx = Math.min(layers.length - 1, Math.floor(st.progress * layers.length * 0.999));
      if (idx !== state.active) {
        state.active = idx;
        setActive(idx);
      }
    },
  });
  setActive(0);
  labels.forEach((l, i) =>
    l.addEventListener('mouseenter', () => {
      state.active = i;
      setActive(i);
    }),
  );

  // Drag to orbit.
  let dragX = 0;
  let dragY = 0;
  let down = false;
  let lx = 0;
  let ly = 0;
  canvas.addEventListener('pointerdown', (e) => {
    down = true;
    lx = e.clientX;
    ly = e.clientY;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!down) return;
    dragX += (e.clientX - lx) * 0.008;
    dragY += (e.clientY - ly) * 0.005;
    dragY = Math.max(-0.6, Math.min(0.6, dragY));
    lx = e.clientX;
    ly = e.clientY;
  });
  canvas.addEventListener('pointerup', () => (down = false));

  const n = planes.length;
  onFrame((t) => {
    const explode = 1 - state.p; // 1 exploded → 0 assembled
    const ease = explode * explode * (3 - 2 * explode);
    const gap = (isSmall ? 0.6 : 0.8) * ease;
    planes.forEach((m, i) => {
      const z = 0.09 + (i + 1) * 0.004 + (i - (n - 1) / 2 + 0.5) * gap * 1.6 + ease * 0.8;
      m.position.set(ease * (i - (n - 1) / 2) * 0.35, ease * 0.15 * Math.sin(t + i), z);
      const isActive = i === state.active;
      const mat = m.material as THREE.MeshBasicMaterial;
      mat.opacity += ((isActive || ease < 0.05 ? 1 : 0.55) - mat.opacity) * 0.1;
      (edges[i].material as THREE.LineBasicMaterial).opacity = isActive ? 0.95 : 0.25 * ease;
      m.scale.setScalar(1 + (isActive ? 0.04 * ease : 0));
    });
    phone.group.position.z = -ease * 1.2;
    (phone.group.children[0] as THREE.Mesh).visible = true;
    rig.rotation.y = -0.65 * ease + dragX + Math.sin(t * 0.4) * 0.05;
    rig.rotation.x = 0.35 * ease + dragY;
    camera.position.z = isSmall ? 11 : 8.2;
  });
}
