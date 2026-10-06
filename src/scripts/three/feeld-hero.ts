// Feeld hero: a heat-map "aura" field (one fragment shader) that warms where you touch it,
// with a small constellation of three glassy, iridescent orbs (linked profiles) floating
// in front, joined by fine threads that carry a pulse when two of them connect.
// Procedural, no downloads. Uses the shared stage (60 fps cap, quality governor, off-screen pause).
import { createStage, onQuality, THREE } from './core';
import { AURA_STOPS } from '../../data/cases/feeld';

const VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;

const FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform float uTime;
uniform float uAspect;
uniform vec2 uTouch;
uniform float uHeat;
uniform float uPulse;
uniform vec3 uStops[7];
uniform float uPos[7];
uniform float uGrain;

float k(vec2 p, vec2 c, float r) { vec2 d = p - c; return exp(-dot(d, d) / (r * r)); }
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

vec3 ramp(float x) {
  vec3 c = uStops[0];
  for (int i = 0; i < 6; i++) {
    float t = clamp((x - uPos[i]) / (uPos[i + 1] - uPos[i]), 0.0, 1.0);
    c = mix(c, uStops[i + 1], smoothstep(0.0, 1.0, t));
  }
  return c;
}

void main() {
  vec2 p = vec2((vUv.x - 0.5) * uAspect, vUv.y - 0.5);
  float t = uTime;
  float breath = 1.0 + 0.05 * sin(t * 6.2831 / 5.5);
  float f = 0.0;
  f += 0.95 * k(p, vec2(-0.32 * uAspect + 0.08 * sin(t * 0.21), 0.12 + 0.06 * cos(t * 0.27)), 0.34 * breath);
  f += 0.85 * k(p, vec2(0.28 * uAspect + 0.07 * cos(t * 0.19), -0.16 + 0.07 * sin(t * 0.23)), 0.3 * breath);
  f += 0.6 * k(p, vec2(0.05 * sin(t * 0.17), 0.3 + 0.05 * sin(t * 0.31)), 0.24);
  f += 0.55 * k(p, vec2(0.36 * uAspect * cos(t * 0.11), -0.38), 0.26);
  f += 0.35 * k(p, vec2(-0.1, -0.05), 0.5);
  // Touch: warmth gathers where the pointer rests.
  f += uHeat * 0.9 * k(p, vec2((uTouch.x - 0.5) * uAspect, uTouch.y - 0.5), 0.2);
  f += uPulse * 0.35 * k(p, vec2(0.0, 0.02), 0.42);
  float v = f / (0.55 + f) * 1.28;
  vec3 col = ramp(clamp(v, 0.0, 1.0));
  col += (hash(vUv * 900.0 + fract(t)) - 0.5) * uGrain;
  gl_FragColor = vec4(col, 1.0);
}
`;

export function initHero(canvas: HTMLCanvasElement, root: HTMLElement) {
  const stage = createStage(canvas, { fov: 32, z: 9 });
  const { scene, camera, onFrame, reduced, renderer, pointer } = stage;
  renderer.toneMapping = THREE.NoToneMapping;

  // ---- Aura backdrop: a plane that always fills the view at z = -4.
  const stops = AURA_STOPS.map(([, c]) => new THREE.Vector3(c[0] / 255, c[1] / 255, c[2] / 255));
  const uniforms = {
    uTime: { value: 0 },
    uAspect: { value: 1 },
    uTouch: { value: new THREE.Vector2(0.62, 0.6) },
    uHeat: { value: 0 },
    uPulse: { value: 0 },
    uStops: { value: stops },
    uPos: { value: AURA_STOPS.map(([x]) => x) },
    uGrain: { value: 0.035 },
  };
  const aura = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms, depthWrite: false }));
  aura.position.z = -4;
  aura.renderOrder = -1;
  scene.add(aura);
  let lastAspect = 0;
  const fitAura = () => {
    if (camera.aspect === lastAspect) return;
    lastAspect = camera.aspect;
    const d = camera.position.z - aura.position.z;
    const h = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * d * 1.04;
    aura.scale.set(h * camera.aspect, h, 1);
    uniforms.uAspect.value = camera.aspect;
  };

  // ---- Lights for the orbs (the stage already provides a soft room environment).
  scene.add(new THREE.HemisphereLight(0xfff1ea, 0x3a1f5c, 0.6));
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(3, 4, 6);
  scene.add(key);
  const warm = new THREE.PointLight(0xff6fb5, 18, 14);
  warm.position.set(-2.5, -1.5, 3);
  scene.add(warm);

  // ---- Constellation: three linked profiles.
  const rig = new THREE.Group();
  scene.add(rig);
  const orbDefs = [
    { c: 0xf5f0ea, r: 0.62, base: new THREE.Vector3(-0.9, 0.35, 0), ph: 0 },
    { c: 0xc7b6ff, r: 0.46, base: new THREE.Vector3(1.05, 0.75, -0.6), ph: 2.1 },
    { c: 0xff9e7a, r: 0.4, base: new THREE.Vector3(0.55, -0.95, 0.4), ph: 4.2 },
  ];
  let seg = 48;
  const orbs = orbDefs.map((d) => {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(d.r, seg, Math.round(seg * 0.66)),
      new THREE.MeshPhysicalMaterial({ color: d.c, roughness: 0.18, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.12, iridescence: 0.75, iridescenceIOR: 1.35, sheen: 0.4, sheenColor: new THREE.Color(0xffc9a3), envMapIntensity: 1.1 }),
    );
    m.position.copy(d.base);
    rig.add(m);
    return m;
  });

  // Threads between them: unit cylinders re-oriented each frame (no allocations).
  const pairs: [number, number][] = [
    [0, 1],
    [0, 2],
    [1, 2],
  ];
  const threadMat = new THREE.MeshBasicMaterial({ color: 0xfff3e6, transparent: true, opacity: 0.55 });
  const threads = pairs.map(() => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 1, 8, 1, true), threadMat);
    rig.add(m);
    return m;
  });
  // A small spark that travels along a thread when two orbs "connect".
  const spark = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  rig.add(spark);
  const halo = new THREE.Mesh(new THREE.RingGeometry(0.72, 0.76, 64), new THREE.MeshBasicMaterial({ color: 0xfff3e6, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
  rig.add(halo);

  const UP = new THREE.Vector3(0, 1, 0);
  const dir = new THREE.Vector3();
  const mid = new THREE.Vector3();
  const place = (m: THREE.Mesh, a: THREE.Vector3, b: THREE.Vector3) => {
    dir.subVectors(b, a);
    const len = dir.length();
    mid.addVectors(a, b).multiplyScalar(0.5);
    m.position.copy(mid);
    m.scale.set(1, len, 1);
    m.quaternion.setFromUnitVectors(UP, dir.normalize());
  };

  const fitRig = () => {
    const small = canvas.clientWidth < 520;
    rig.scale.setScalar(small ? 0.8 : 1);
    rig.position.set(small ? 0 : 0.15, small ? 0.1 : 0, 0);
  };
  fitRig();
  new ResizeObserver(fitRig).observe(canvas);

  // Quality: fewer sphere segments and no grain on the lighter tiers.
  onQuality((q) => {
    uniforms.uGrain.value = q.extras ? 0.035 : 0;
    const want = q.tier >= 3 ? 28 : 48;
    if (want !== seg) {
      seg = want;
      orbs.forEach((m, i) => {
        m.geometry.dispose();
        m.geometry = new THREE.SphereGeometry(orbDefs[i].r, seg, Math.round(seg * 0.66));
      });
    }
  });

  // Touch heat: follows the pointer over the hero; cools when it leaves.
  let rect = root.getBoundingClientRect();
  const refresh = () => (rect = root.getBoundingClientRect());
  window.addEventListener('scroll', refresh, { passive: true });
  window.addEventListener('resize', refresh, { passive: true });
  const touch = new THREE.Vector2(0.62, 0.6);
  let heatTarget = 0;
  const onMove = (e: PointerEvent) => {
    touch.set((e.clientX - rect.left) / Math.max(1, rect.width), 1 - (e.clientY - rect.top) / Math.max(1, rect.height));
    heatTarget = 1;
    stage.invalidate();
  };
  root.addEventListener('pointermove', onMove, { passive: true });
  root.addEventListener('pointerdown', onMove, { passive: true });
  root.addEventListener('pointerleave', () => (heatTarget = 0));

  const CYCLE = 6;
  onFrame((t, dt) => {
    fitAura();
    const tt = reduced ? 2.4 : t;
    uniforms.uTime.value = tt;
    uniforms.uTouch.value.lerp(touch, 1 - Math.exp(-6 * dt));
    uniforms.uHeat.value += (heatTarget - uniforms.uHeat.value) * (1 - Math.exp(-(heatTarget ? 4 : 1.2) * dt));
    const breath = Math.sin((tt * Math.PI * 2) / 5.5);
    orbs.forEach((m, i) => {
      const d = orbDefs[i];
      m.position.set(d.base.x + Math.sin(tt * 0.5 + d.ph) * 0.12, d.base.y + Math.cos(tt * 0.42 + d.ph) * 0.14, d.base.z + Math.sin(tt * 0.3 + d.ph) * 0.1);
      m.scale.setScalar(1 + breath * 0.025);
    });
    pairs.forEach(([a, b], i) => place(threads[i], orbs[a].position, orbs[b].position));
    // Every six seconds a spark travels from the first orb to the second, then a heartbeat.
    const c = reduced ? 0.7 : (tt % CYCLE) / CYCLE;
    const run = Math.min(1, c / 0.35);
    const s = run * run * (3 - 2 * run);
    spark.position.lerpVectors(orbs[0].position, orbs[1].position, s);
    spark.visible = c < 0.36;
    const beat = c > 0.35 && c < 0.6 ? Math.sin(((c - 0.35) / 0.25) * Math.PI) : 0;
    uniforms.uPulse.value = beat;
    halo.position.copy(orbs[1].position);
    halo.lookAt(camera.position);
    halo.scale.setScalar(0.7 + (c > 0.35 ? (c - 0.35) * 1.6 : 0));
    (halo.material as THREE.MeshBasicMaterial).opacity = beat * 0.7;
    threadMat.opacity = 0.45 + beat * 0.4;
    rig.rotation.y = -0.15 + pointer.x * 0.18;
    rig.rotation.x = 0.06 - pointer.y * 0.1;
  });

  return stage;
}
