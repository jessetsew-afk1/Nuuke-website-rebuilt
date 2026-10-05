// Homepage flight: the rocket launches from the loader, then follows the visitor
// through the page. Sections mark waypoints with data-fx / data-fy / data-fs / data-fo
// (x, y in -1..1 of the viewport, scale, opacity). The finale flies it into the "n".
import { createStage, THREE } from './core';
import { makeRocket } from './rocket';

export type Journey = {
  launch: () => Promise<void>;
  skipLaunch: () => void;
  setLoad: (p: number) => void;
  /** 0..1 progress through the finale; target = cutout rect in CSS px + tilt in radians. */
  setFinale: (p: number, target: { x: number; y: number; h: number; tilt: number } | null) => void;
};

const SMOKE_VERT = `
attribute float aLife;
attribute float aSize;
attribute float aHeat;
varying float vLife;
varying float vHeat;
uniform float uPx;
void main() {
  vLife = aLife;
  vHeat = aHeat;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize * uPx * (1.0 + (1.0 - aLife) * 2.2) / -mv.z;
  gl_Position = projectionMatrix * mv;
}`;
const SMOKE_FRAG = `
varying float vLife;
varying float vHeat;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  if (d > 0.5) discard;
  float soft = smoothstep(0.5, 0.0, d);
  vec3 hot = mix(vec3(1.0, 0.55, 0.15), vec3(1.0, 0.9, 0.6), vLife);
  vec3 smoke = vec3(0.55, 0.55, 0.6);
  float h = clamp(vHeat * vLife * 1.6, 0.0, 1.0);
  vec3 col = mix(smoke, hot, h);
  float a = soft * vLife * mix(0.18, 0.75, h);
  gl_FragColor = vec4(col, a);
}`;

export function initJourney(canvas: HTMLCanvasElement): Journey {
  const stage = createStage(canvas, { fov: 35, z: 12 });
  const { scene, camera, renderer, onFrame } = stage;
  const isSmall = () => window.innerWidth < 760;

  scene.add(new THREE.AmbientLight(0xffffff, 0.3));
  const key = new THREE.DirectionalLight(0xfff0dd, 2.2);
  key.position.set(-4, 5, 6);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x8fa8ff, 1.4);
  rim.position.set(5, 2, -4);
  scene.add(rim);
  const pink = new THREE.PointLight(0xff2e88, 8, 14);
  pink.position.set(3, -2, 4);
  scene.add(pink);

  const rocket = makeRocket();
  scene.add(rocket.group);

  // Launch pad (only while loading)
  const pad = new THREE.Group();
  const deck = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.9, 0.35, 48), new THREE.MeshStandardMaterial({ color: 0x23232b, metalness: 0.6, roughness: 0.5 }));
  pad.add(deck);
  const strip = new THREE.Mesh(new THREE.TorusGeometry(1.62, 0.025, 8, 64), new THREE.MeshBasicMaterial({ color: 0xff2e88 }));
  strip.rotation.x = Math.PI / 2;
  strip.position.y = 0.18;
  pad.add(strip);
  const tower = new THREE.Group();
  const steel = new THREE.MeshStandardMaterial({ color: 0x3a3a44, metalness: 0.7, roughness: 0.4 });
  for (let i = 0; i < 2; i++) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 4.2, 0.08), steel);
    leg.position.set(-1.25 - i * 0.4, 2.1, 0);
    tower.add(leg);
  }
  for (let j = 0; j < 9; j++) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.04, 0.04), steel);
    bar.position.set(-1.45, 0.4 + j * 0.45, 0);
    bar.rotation.z = j % 2 ? 0.6 : -0.6;
    tower.add(bar);
  }
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.06, 0.06), steel);
  arm.position.set(-0.85, 3.1, 0);
  tower.add(arm);
  pad.add(tower);
  scene.add(pad);

  // Exhaust / smoke particles (ring buffer, world space)
  const N = 900;
  const pos = new Float32Array(N * 3);
  const vel = new Float32Array(N * 3);
  const life = new Float32Array(N);
  const size = new Float32Array(N);
  const heat = new Float32Array(N);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aLife', new THREE.BufferAttribute(life, 1));
  geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  geo.setAttribute('aHeat', new THREE.BufferAttribute(heat, 1));
  const smokeMat = new THREE.ShaderMaterial({
    vertexShader: SMOKE_VERT,
    fragmentShader: SMOKE_FRAG,
    transparent: true,
    depthWrite: false,
    uniforms: { uPx: { value: renderer.getPixelRatio() * 60 } },
  });
  const smoke = new THREE.Points(geo, smokeMat);
  smoke.frustumCulled = false;
  scene.add(smoke);
  let head = 0;
  const emit = (p: THREE.Vector3, dir: THREE.Vector3, n: number, spread: number, speed: number, hot: number, sz: number) => {
    for (let k = 0; k < n; k++) {
      const i = head;
      head = (head + 1) % N;
      pos[i * 3] = p.x + (Math.random() - 0.5) * 0.15;
      pos[i * 3 + 1] = p.y + (Math.random() - 0.5) * 0.15;
      pos[i * 3 + 2] = p.z + (Math.random() - 0.5) * 0.15;
      vel[i * 3] = dir.x * speed + (Math.random() - 0.5) * spread;
      vel[i * 3 + 1] = dir.y * speed + (Math.random() - 0.5) * spread;
      vel[i * 3 + 2] = dir.z * speed + (Math.random() - 0.5) * spread * 0.5;
      life[i] = 1;
      size[i] = sz * (0.6 + Math.random() * 0.8);
      heat[i] = hot;
    }
  };

  // ------------------------------------------------------------------
  const view = () => {
    const h = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
    return { h, w: h * camera.aspect };
  };
  const toWorld = (px: number, py: number) => {
    const { h, w } = view();
    return new THREE.Vector2((px / window.innerWidth) * 2 * w - w, h - (py / window.innerHeight) * 2 * h);
  };
  const unitPx = () => window.innerHeight / (2 * view().h);
  const ROCKET_H = 3.6; // model height in units (nose to fin feet)

  type Way = { el: HTMLElement; x: number; y: number; s: number; o: number };
  let ways: Way[] = [];
  const readWays = () => {
    // Optional data-mfx / data-mfy / data-mfs / data-mfo override the pose on phones.
    const m = isSmall();
    const num = (el: HTMLElement, k: string, d: string) => parseFloat((m && el.dataset['m' + k]) || el.dataset[k] || d);
    ways = [...document.querySelectorAll<HTMLElement>('[data-fx]')].map((el) => ({
      el,
      x: num(el, 'fx', '0'),
      y: num(el, 'fy', '0'),
      s: num(el, 'fs', '1'),
      o: num(el, 'fo', '1'),
    }));
  };
  readWays();
  window.addEventListener('resize', readWays);

  const smooth = (t: number) => t * t * (3 - 2 * t);
  const waypoint = () => {
    const mid = window.innerHeight * 0.5;
    const centers = ways.map((w) => {
      const r = w.el.getBoundingClientRect();
      return r.top + r.height / 2;
    });
    let i = 0;
    while (i < ways.length - 1 && centers[i + 1] < mid) i++;
    const a = ways[i];
    const b = ways[Math.min(i + 1, ways.length - 1)];
    const span = centers[Math.min(i + 1, ways.length - 1)] - centers[i];
    const t = span > 0 ? smooth(Math.min(1, Math.max(0, (mid - centers[i]) / span))) : 0;
    const lerp = (p: number, q: number) => p + (q - p) * t;
    return { x: lerp(a.x, b.x), y: lerp(a.y, b.y), s: lerp(a.s, b.s), o: lerp(a.o, b.o) };
  };

  // ------------------------------------------------------------------
  type Mode = 'pad' | 'ignite' | 'ascend' | 'arrive' | 'fly';
  let mode: Mode = 'pad';
  let modeT = 0;
  let load = 0;
  let launchResolve: (() => void) | null = null;
  let finale = 0;
  let finaleTarget: { x: number; y: number; h: number; tilt: number } | null = null;

  const cur = new THREE.Vector3(0, -2, 0);
  let curScale = 1;
  let curOpacity = 1;
  let facing = 0; // 0 = nose up, 1 = nose down
  let lastScroll = window.scrollY;
  let sv = 0; // smoothed scroll velocity (px/frame)
  let spin = 0;
  let shake = 0;
  const tmp = new THREE.Vector3();
  const dirDown = new THREE.Vector3();

  const padPose = () => {
    const { h } = view();
    const base = -h + (isSmall() ? 1.7 : 1.4);
    pad.position.set(0, base, 0);
    pad.scale.setScalar(isSmall() ? 0.7 : 1);
    return new THREE.Vector3(0, base + 0.18 + 1.65 * (isSmall() ? 0.7 : 1), 0);
  };

  onFrame((t, dt) => {
    modeT += dt;
    const { h, w } = view();
    const k = isSmall() ? 0.62 : 1;
    let target = new THREE.Vector3();
    let scale = k;
    let opacity = 1;
    let thrust = 0.35;
    let rotZ = 0;

    // Scroll velocity (px per frame, smoothed)
    const sy = window.scrollY;
    sv += (sy - lastScroll - sv) * 0.2;
    lastScroll = sy;

    if (mode === 'pad') {
      target = padPose();
      scale = k * 0.9;
      thrust = load > 0.97 ? 0.15 : 0;
      if (load > 0.4 && Math.random() < 0.3) {
        rocket.group.localToWorld(tmp.copy(rocket.nozzle));
        emit(tmp, dirDown.set(Math.random() - 0.5, 0.1, 0), 1, 0.4, 0.4, 0, 0.9);
      }
      cur.copy(target);
    } else if (mode === 'ignite') {
      target = padPose();
      scale = k * 0.9;
      thrust = Math.min(1.4, modeT * 1.4);
      shake = 0.05 * Math.min(1, modeT);
      rocket.group.localToWorld(tmp.copy(rocket.nozzle));
      emit(tmp, dirDown.set(0, -1, 0), 14, 3.2, 1.2, 1, 1.6);
      if (modeT > 1.1) {
        mode = 'ascend';
        modeT = 0;
      }
      cur.copy(target);
    } else if (mode === 'ascend') {
      thrust = 1.5;
      shake = 0.04 * Math.max(0, 1 - modeT);
      const start = padPose();
      const lift = Math.pow(modeT, 2.2) * 9;
      target.set(start.x, start.y + lift, 0);
      cur.copy(target);
      scale = k * 0.9;
      rocket.group.localToWorld(tmp.copy(rocket.nozzle));
      emit(tmp, dirDown.set(0, -1, 0), 10, 1.2, 2, 1, 1.4);
      pad.position.y -= dt * modeT * 3;
      if (cur.y > h + 4) {
        mode = 'arrive';
        modeT = 0;
        pad.visible = false;
        cur.set(0, -h - 4, 0);
        launchResolve?.();
        launchResolve = null;
      }
    }

    if (mode === 'arrive' || mode === 'fly') {
      const wp = waypoint();
      target.set(wp.x * w * 0.92, wp.y * h * 0.85, 0);
      scale = k * wp.s;
      opacity = wp.o;
      thrust = 0.45 + Math.min(1, Math.abs(sv) / 30);
      // Turn toward travel: nose up when scrolling down, nose down when scrolling back up.
      if (sv < -2.5) facing += (1 - facing) * 0.06;
      else if (sv > 2.5) facing += (0 - facing) * 0.06;
      const dx = target.x - cur.x;
      rotZ = facing * Math.PI - Math.atan2(dx * 0.9, 1.2 + Math.abs(sv) * 0.05) * (facing > 0.5 ? -1 : 1);

      if (finale > 0 && finaleTarget) {
        const f = smooth(Math.min(1, finale / 0.75));
        const tw = toWorld(finaleTarget.x, finaleTarget.y);
        const targetScale = finaleTarget.h / (ROCKET_H * unitPx());
        target.set(target.x + (tw.x - target.x) * f, target.y + (tw.y - target.y) * f, 0);
        scale = scale + (targetScale - scale) * f;
        rotZ = rotZ + (finaleTarget.tilt - rotZ) * f;
        opacity = finale < 0.78 ? opacity : Math.max(0, 1 - (finale - 0.78) / 0.12);
        thrust = thrust * (1 - f * 0.6);
      }
      const ease = mode === 'arrive' ? Math.min(0.08, 0.02 + modeT * 0.03) : finale > 0 ? 0.2 : 0.07;
      cur.lerp(target, ease);
      if (mode === 'arrive' && cur.distanceTo(target) < 0.15) mode = 'fly';
      // Exhaust trail while moving
      if (opacity > 0.3 && Math.random() < 0.6 + Math.min(0.4, Math.abs(sv) / 40)) {
        rocket.group.localToWorld(tmp.copy(rocket.nozzle));
        const back = new THREE.Vector3(0, -1, 0).applyQuaternion(rocket.group.quaternion);
        emit(tmp, back, 2, 0.25, 0.6, 0.7, 0.55 * scale);
      }
    }

    curScale += (scale - curScale) * 0.12;
    curOpacity += (opacity - curOpacity) * 0.12;
    rocket.group.position.copy(cur);
    if (shake > 0) rocket.group.position.x += (Math.random() - 0.5) * shake;
    rocket.group.scale.setScalar(curScale);
    rocket.group.rotation.z += (rotZ - rocket.group.rotation.z) * 0.1;
    spin += dt * (0.35 + Math.abs(sv) * 0.01);
    rocket.group.rotation.y = finale > 0.4 ? rocket.group.rotation.y * 0.9 + 0.5 * 0.1 : 0.5 + Math.sin(spin) * 0.6;
    rocket.update(t, thrust);
    rocket.setOpacity(curOpacity);

    // Particles
    for (let i = 0; i < N; i++) {
      if (life[i] <= 0) continue;
      life[i] -= dt * (heat[i] > 0.5 ? 0.9 : 0.55);
      pos[i * 3] += vel[i * 3] * dt;
      pos[i * 3 + 1] += vel[i * 3 + 1] * dt;
      pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
      vel[i * 3] *= 0.97;
      vel[i * 3 + 1] *= 0.97;
    }
    // Scrolling drags the trail with the page so it reads as motion through space.
    const drift = (sv / window.innerHeight) * 2 * h;
    for (let i = 0; i < N; i++) if (life[i] > 0) pos[i * 3 + 1] += drift;
    geo.attributes.position.needsUpdate = true;
    (geo.attributes.aLife as THREE.BufferAttribute).needsUpdate = true;
  });

  return {
    setLoad: (p) => (load = p),
    launch: () =>
      new Promise((res) => {
        launchResolve = res;
        mode = 'ignite';
        modeT = 0;
      }),
    skipLaunch: () => {
      pad.visible = false;
      mode = 'arrive';
      modeT = 0;
      const { h } = view();
      cur.set(0, -h - 3, 0);
    },
    setFinale: (p, target) => {
      finale = p;
      finaleTarget = target;
    },
  };
}
