// Flighty Passport globe: a dotted night globe with a year of flights drawn as glowing
// great-circle arcs. Arcs draw in, comets ride them, drag to spin, and focus(i) swings a
// route to face you. Budget: one Points cloud, one LineSegments graticule, one tube per route.
import { createStage, THREE } from './core';

export type LatLon = [number, number];
export type GlobeRoute = { a: LatLon; b: LatLon };
export type GlobeAPI = { focus: (i: number) => void; dispose: () => void };

const D = Math.PI / 180;
const vec = (lat: number, lon: number, r = 1) =>
  new THREE.Vector3(Math.cos(lat * D) * Math.sin(lon * D) * r, Math.sin(lat * D) * r, Math.cos(lat * D) * Math.cos(lon * D) * r);

function arcCurve(a: LatLon, b: LatLon) {
  const A = vec(a[0], a[1]);
  const B = vec(b[0], b[1]);
  const om = A.angleTo(B);
  const pts: THREE.Vector3[] = [];
  const n = 48;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const s1 = Math.sin((1 - t) * om) / Math.sin(om);
    const s2 = Math.sin(t * om) / Math.sin(om);
    const lift = 1.004 + 0.22 * Math.sin(Math.PI * t) * Math.min(1, om * 1.3);
    pts.push(A.clone().multiplyScalar(s1).add(B.clone().multiplyScalar(s2)).multiplyScalar(lift));
  }
  return new THREE.CatmullRomCurve3(pts);
}

const ARC_VS = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const ARC_FS = /* glsl */ `
  uniform float uProg; uniform float uHi; uniform vec3 uColor;
  varying vec2 vUv;
  void main() {
    if (vUv.x > uProg) discard;
    float head = smoothstep(uProg - 0.18, uProg, vUv.x) * step(uProg, 0.999);
    vec3 c = uColor * (0.55 + 0.6 * uHi) + head * 0.8;
    gl_FragColor = vec4(c, (0.35 + 0.65 * uHi));
  }
`;

export function init(canvas: HTMLCanvasElement, routes: GlobeRoute[], airports: LatLon[], onFocus?: (i: number) => void): GlobeAPI {
  const stage = createStage(canvas, { fov: 30, z: 4.6, env: false });
  const { scene, camera } = stage;
  camera.position.set(0, 0.15, 4.6);
  camera.lookAt(0, 0, 0);

  const globe = new THREE.Group();
  scene.add(globe);

  // core sphere hides back-facing dots
  globe.add(new THREE.Mesh(new THREE.SphereGeometry(0.995, 64, 48), new THREE.MeshBasicMaterial({ color: 0x0b0c14 })));

  // fresnel rim
  const rim = new THREE.Mesh(
    new THREE.SphereGeometry(1.12, 64, 48),
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      vertexShader: `varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`,
      fragmentShader: `varying vec3 vN; varying vec3 vV; void main(){ float f = pow(1. - abs(dot(vN, vV)), 3.); gl_FragColor = vec4(vec3(0.42,0.6,1.)*f*0.9, f); }`,
    }),
  );
  scene.add(rim);

  // dot grid
  const dots: number[] = [];
  for (let lat = -84; lat <= 84; lat += 3) {
    const count = Math.max(6, Math.round(120 * Math.cos(lat * D)));
    for (let k = 0; k < count; k++) {
      const v = vec(lat, (k / count) * 360 - 180, 1.0);
      dots.push(v.x, v.y, v.z);
    }
  }
  const dotGeo = new THREE.BufferGeometry();
  dotGeo.setAttribute('position', new THREE.Float32BufferAttribute(dots, 3));
  globe.add(new THREE.Points(dotGeo, new THREE.PointsMaterial({ color: 0x3b4060, size: 0.011, sizeAttenuation: true })));

  // graticule
  const lines: number[] = [];
  const pushLine = (fn: (s: number) => THREE.Vector3, steps: number) => {
    for (let i = 0; i < steps; i++) {
      const p = fn(i / steps);
      const q = fn((i + 1) / steps);
      lines.push(p.x, p.y, p.z, q.x, q.y, q.z);
    }
  };
  for (let lon = -180; lon < 180; lon += 30) pushLine((s) => vec(-90 + s * 180, lon, 1.001), 60);
  for (let lat = -60; lat <= 60; lat += 30) pushLine((s) => vec(lat, -180 + s * 360, 1.001), 120);
  const latGeo = new THREE.BufferGeometry();
  latGeo.setAttribute('position', new THREE.Float32BufferAttribute(lines, 3));
  globe.add(new THREE.LineSegments(latGeo, new THREE.LineBasicMaterial({ color: 0x1c1f30, transparent: true, opacity: 0.9 })));

  // airports
  const ap: number[] = [];
  airports.forEach(([la, lo]) => {
    const v = vec(la, lo, 1.006);
    ap.push(v.x, v.y, v.z);
  });
  const apGeo = new THREE.BufferGeometry();
  apGeo.setAttribute('position', new THREE.Float32BufferAttribute(ap, 3));
  globe.add(new THREE.Points(apGeo, new THREE.PointsMaterial({ color: 0xf5f5f0, size: 0.045, sizeAttenuation: true })));

  // routes
  const palette = [0x2ee58a, 0xffb020, 0x6cb4ff];
  const arcs = routes.map((r, i) => {
    const curve = arcCurve(r.a, r.b);
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uProg: { value: stage.reduced ? 1 : 0 }, uHi: { value: 1 }, uColor: { value: new THREE.Color(palette[i % palette.length]) } },
      vertexShader: ARC_VS,
      fragmentShader: ARC_FS,
    });
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 64, 0.0075, 6, false), mat);
    globe.add(mesh);
    const comet = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    comet.visible = false;
    globe.add(comet);
    const mid = curve.getPointAt(0.5).normalize();
    return { curve, mat, comet, mid, phase: (i * 0.137) % 1 };
  });

  // rotation state: start facing North America
  const rot = { x: 0.62, y: 1.68 };
  const target = { x: rot.x, y: rot.y };
  let focused = -1;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let idle = 0;
  globe.rotation.set(rot.x, rot.y, 0);

  const onDown = (e: PointerEvent) => {
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    canvas.setPointerCapture?.(e.pointerId);
  };
  const onMove = (e: PointerEvent) => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    target.y += dx * 0.008;
    target.x = Math.max(-1.1, Math.min(1.1, target.x + dy * 0.006));
    idle = 0;
    stage.render();
  };
  const onUp = () => (dragging = false);
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);

  const t0 = performance.now();
  stage.onFrame((t, dt) => {
    idle += dt;
    if (!dragging && focused < 0 && idle > 2 && !stage.reduced) target.y += dt * 0.12;
    const k = stage.reduced ? 1 : 1 - Math.pow(0.002, dt);
    rot.x += (target.x - rot.x) * k;
    rot.y += (target.y - rot.y) * k;
    globe.rotation.set(rot.x, rot.y, 0);
    const el = (performance.now() - t0) / 1000;
    arcs.forEach((a, i) => {
      if (!stage.reduced) a.mat.uniforms.uProg.value = Math.min(1, Math.max(0, (el - 0.3 - i * 0.14) / 1.1));
      const hi = focused < 0 || focused === i ? 1 : 0.15;
      a.mat.uniforms.uHi.value += (hi - a.mat.uniforms.uHi.value) * Math.min(1, dt * 6);
      const on = a.mat.uniforms.uProg.value >= 1 && !stage.reduced && (focused < 0 || focused === i);
      a.comet.visible = on;
      if (on) a.comet.position.copy(a.curve.getPointAt((t * 0.16 + a.phase) % 1));
    });
  });

  return {
    focus: (i: number) => {
      focused = focused === i ? -1 : i;
      if (focused >= 0) {
        const m = arcs[i].mid;
        const lat = Math.asin(m.y);
        const lon = Math.atan2(m.x, m.z);
        target.x = lat;
        // nearest equivalent angle to avoid a long spin
        let ty = -lon;
        while (ty - rot.y > Math.PI) ty -= Math.PI * 2;
        while (ty - rot.y < -Math.PI) ty += Math.PI * 2;
        target.y = ty;
      }
      idle = 0;
      onFocus?.(focused);
      stage.render();
    },
    dispose: () => {
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      stage.dispose();
    },
  };
}
