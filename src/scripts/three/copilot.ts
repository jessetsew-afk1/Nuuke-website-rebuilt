// Copilot Money concept, spatial sketch of net worth.
// Each account is a column of instanced coins on a glass plinth; debt hangs below it.
// Month changes drop coins in (or lift them out) with a per-coin stagger; drag orbits.
import { createStage, THREE } from './core';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

type Acct = { id: string; name: string; color: string; k: number[] };
type Data = { accounts: Acct[]; months: string[]; coin: number };

const MAX = 30;
const STEP = 0.135;
const PLINTH = 0.22;

export function init(root: HTMLElement, data: Data, startMonth: number) {
  const canvas = root.querySelector<HTMLCanvasElement>('[data-cms-canvas]')!;
  const tagsEl = root.querySelector<HTMLElement>('[data-cms-tags]')!;
  const stage = createStage(canvas, { fov: 30, z: 15 });
  const { scene, camera } = stage;

  scene.add(new THREE.HemisphereLight(0x9fc0ff, 0x000814, 0.6));
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(4, 8, 6);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x1c6cff, 2.5);
  rim.position.set(-6, 2, -6);
  scene.add(rim);

  const world = new THREE.Group();
  scene.add(world);
  const n = data.accounts.length;
  const gapX = 1.55;
  const width = gapX * (n - 1) + 1.6;

  // Glass plinth: the zero line. Debt coins show through it, below.
  const plinth = new THREE.Mesh(
    new RoundedBoxGeometry(width, PLINTH, 2.6, 4, 0.1),
    new THREE.MeshPhysicalMaterial({ color: 0x1c3a6e, transparent: true, opacity: 0.45, roughness: 0.15, metalness: 0.1, clearcoat: 1, depthWrite: false }),
  );
  world.add(plinth);
  const edge = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(width, PLINTH, 2.6)),
    new THREE.LineBasicMaterial({ color: 0x5b93ff, transparent: true, opacity: 0.35 }),
  );
  world.add(edge);

  const coinGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.11, 48);
  const dummy = new THREE.Object3D();
  type Col = {
    mesh: THREE.InstancedMesh;
    mat: THREE.MeshStandardMaterial;
    x: number;
    y: Float32Array;
    s: Float32Array;
    jitter: Float32Array;
    target: number;
    neg: boolean;
    tag: HTMLElement;
    acct: Acct;
  };
  const cols: Col[] = data.accounts.map((a, i) => {
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(a.color),
      metalness: 0.65,
      roughness: 0.28,
      emissive: new THREE.Color(a.color),
      emissiveIntensity: 0.12,
      transparent: true,
    });
    const mesh = new THREE.InstancedMesh(coinGeo, mat, MAX);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    world.add(mesh);
    const jitter = new Float32Array(MAX * 3);
    for (let j = 0; j < MAX * 3; j++) jitter[j] = Math.sin(i * 91.7 + j * 12.9898) * 0.5;
    const tag = document.createElement('span');
    tag.className = 'cms-tag';
    tagsEl.appendChild(tag);
    const col: Col = { mesh, mat, x: (i - (n - 1) / 2) * gapX, y: new Float32Array(MAX).fill(6), s: new Float32Array(MAX), jitter, target: 0, neg: false, tag, acct: a };
    return col;
  });

  // Orbit state: drag (or arrow keys) to turn the world; a gentle sway when idle.
  let yaw = -0.35;
  let pitch = 0.32;
  let tYaw = yaw;
  let tPitch = pitch;
  let dragging = false;
  let px = 0;
  let py = 0;

  const v = new THREE.Vector3();
  const restY = (c: Col, j: number) => (c.neg ? -PLINTH / 2 - 0.08 - j * STEP : PLINTH / 2 + 0.07 + j * STEP);
  const placeTags = () => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    cols.forEach((c) => {
      const top = c.target === 0 ? 0.3 : c.neg ? restY(c, c.target - 1) - 0.35 : restY(c, c.target - 1) + 0.4;
      v.set(c.x, top, 0).applyMatrix4(world.matrixWorld).project(camera);
      const x = (v.x * 0.5 + 0.5) * w;
      const y = (-v.y * 0.5 + 0.5) * h;
      c.tag.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, ${c.neg ? '0' : '-100%'})`;
    });
  };

  let changedAt = 0;
  const update = (dt: number) => {
    const now = performance.now() / 1000;
    cols.forEach((c, ci) => {
      for (let j = 0; j < MAX; j++) {
        const on = j < c.target;
        const delay = (on ? j : MAX - j) * 0.028 + ci * 0.04;
        const go = stage.reduced || now - changedAt > delay;
        const ty = on ? restY(c, j) : restY(c, j) + (c.neg ? -2.2 : 2.6);
        if (go) {
          const k = stage.reduced ? 1 : Math.min(1, dt * 9);
          c.y[j] += (ty - c.y[j]) * k;
          c.s[j] += ((on ? 1 : 0) - c.s[j]) * Math.min(1, k * 1.2);
        }
        dummy.position.set(c.x + c.jitter[j * 3] * 0.05, c.y[j], c.jitter[j * 3 + 1] * 0.05);
        dummy.rotation.set(0, c.jitter[j * 3 + 2] * 3, 0);
        const s = Math.max(0.0001, c.s[j]);
        dummy.scale.set(s, s, s);
        dummy.updateMatrix();
        c.mesh.setMatrixAt(j, dummy.matrix);
      }
      c.mesh.instanceMatrix.needsUpdate = true;
    });
    world.rotation.set(pitch, yaw, 0);
    world.updateMatrixWorld();
    placeTags();
  };
  const redraw = () => {
    yaw = tYaw;
    pitch = tPitch;
    update(1);
    stage.render();
  };

  let month = startMonth;
  const setMonth = (m: number, instant = false) => {
    month = m;
    changedAt = performance.now() / 1000;
    cols.forEach((c) => {
      const k = c.acct.k[m];
      c.neg = k < 0;
      c.target = Math.min(MAX, Math.round(Math.abs(k) / data.coin));
      c.tag.innerHTML = `<i style="background:${c.acct.color}"></i>${k < 0 ? '−' : ''}$${Math.abs(k)}k`;
      if (instant || stage.reduced) {
        for (let j = 0; j < MAX; j++) {
          c.y[j] = restY(c, j);
          c.s[j] = j < c.target ? 1 : 0;
        }
      }
    });
    if (stage.reduced) redraw();
  };

  let focus: string | null = null;
  const setFocus = (id: string | null) => {
    focus = id;
    cols.forEach((c) => {
      const on = !focus || focus === c.acct.id;
      c.mat.opacity = on ? 1 : 0.18;
      c.mat.depthWrite = on;
      c.tag.style.opacity = on ? '1' : '0.25';
    });
    if (stage.reduced) redraw();
  };

  canvas.addEventListener('pointerdown', (e) => {
    dragging = true;
    px = e.clientX;
    py = e.clientY;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    tYaw += (e.clientX - px) * 0.008;
    tPitch = Math.min(0.75, Math.max(0.05, tPitch + (e.clientY - py) * 0.004));
    px = e.clientX;
    py = e.clientY;
  });
  const up = () => (dragging = false);
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') tYaw -= 0.25;
    else if (e.key === 'ArrowRight') tYaw += 0.25;
    else return;
    e.preventDefault();
    if (stage.reduced) redraw();
  });

  const fit = () => {
    const aspect = canvas.clientWidth / Math.max(1, canvas.clientHeight);
    camera.position.set(0, 0.9, aspect < 1 ? 23 : aspect < 1.4 ? 18 : 15);
    camera.lookAt(0, 0.9, 0);
    if (stage.reduced) redraw();
  };
  fit();
  new ResizeObserver(fit).observe(canvas);

  setMonth(startMonth, true);
  setFocus(null);

  stage.onFrame((t, dt) => {
    if (!dragging && !stage.reduced) tYaw += Math.sin(t * 0.25) * 0.0008;
    const k = stage.reduced ? 1 : Math.min(1, dt * 6);
    yaw += (tYaw - yaw) * k;
    pitch += (tPitch - pitch) * k;
    update(dt);
  });

  return {
    setMonth: (m: number) => {
      if (m !== month) setMonth(m);
    },
    setFocus,
  };
}
