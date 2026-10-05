// Services as a solar system: the NUUKE star at the centre, one world per service.
// Scroll progress (0..1) flies a cinematic camera from an overview to each world in turn.
// Heavy lifting lives in ./planets/*: GPU-baked surfaces, the sun, deep space and belts.
import { createStage, THREE } from './core';
import { makeRocket } from './rocket';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { Baker } from './planets/bake';
import { makeSun } from './planets/sun';
import { makeBelt, makeNearDust, makeSpace } from './planets/space';
import { makeAI, makeAnimation, makeMarketing, makeMobile, sparkleMaterial, type Quality, type World } from './planets/worlds';

export type ServicesScene = {
  setProgress: (p: number) => void;
  /** Screen positions of each planet (CSS px) for HTML labels, anchored just under each planet's disc. */
  planetsOnScreen: () => { x: number; y: number; visible: boolean }[];
  /** Free every GPU resource (textures, targets, geometry) and stop rendering. */
  dispose: () => void;
};

// Film finish: soft vignette, a hint of lens fringing toward the edges and fine grain.
const FINISH = {
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) }, uCA: { value: 0.012 } },
  vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform float uTime; uniform vec2 uRes; uniform float uCA; varying vec2 vUv;
    void main() {
      vec2 c = vUv - 0.5;
      float r2 = dot(c, c);
      vec3 col;
      if (uCA > 0.0) {
        vec2 off = c * r2 * uCA;
        col = vec3(texture2D(tDiffuse, vUv + off).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - off).b);
      } else {
        col = texture2D(tDiffuse, vUv).rgb;
      }
      col *= 1.0 - smoothstep(0.12, 0.62, r2) * 0.42;
      float n = fract(sin(dot(floor(vUv * uRes) + fract(uTime * 7.31) * 113.0, vec2(12.9898, 78.233))) * 43758.5453);
      col += (n - 0.5) * 0.022;
      gl_FragColor = vec4(col, 1.0);
    }`,
};

const ORBITS = [8.5, 13.5, 20.5, 25.5];
const ANGLES = [-0.7, 0.3, 4.25, 5.35];
const BELT_R = 17;

const smoother = (x: number) => {
  const k = THREE.MathUtils.clamp(x, 0, 1);
  return k * k * k * (k * (k * 6 - 15) + 10);
};

export async function initServices(canvas: HTMLCanvasElement, colors: string[]): Promise<ServicesScene> {
  const phone = window.innerWidth < 760 || window.matchMedia('(pointer: coarse)').matches;
  const q: Quality = phone ? { phone, tex: 768, seg: 72, particles: 0.45 } : { phone, tex: 1536, seg: 128, particles: 1 };
  const stage = createStage(canvas, { fov: 38, z: 40, alpha: false });
  const { scene, camera, renderer } = stage;
  if (phone) renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
  camera.near = 0.05;
  camera.far = 2400;
  camera.updateProjectionMatrix();
  renderer.setClearColor(0x020203, 1);
  scene.environmentIntensity = 0.3;

  // The star is the only real light; a faint cool fill keeps night sides from going pure black.
  scene.add(new THREE.PointLight(0xfff0e4, 2.8, 0, 0));
  scene.add(new THREE.AmbientLight(0x8088ff, 0.025));

  const baker = new Baker(renderer);
  const yieldFrame = () => new Promise((r) => setTimeout(r, 0));

  const space = makeSpace(baker, q);
  scene.add(space.group);
  const sun = makeSun(phone);
  scene.add(sun.group, sun.flareGroup);

  const system = new THREE.Group();
  scene.add(system);

  const accents = colors.map((c) => new THREE.Color(c));
  await yieldFrame();
  const worlds: World[] = [];
  worlds.push(await makeMobile(baker, q, accents[0], colors[0]));
  await yieldFrame();
  worlds.push(await makeAnimation(baker, q, accents[1]));
  await yieldFrame();
  worlds.push(await makeMarketing(baker, q, accents[2]));
  await yieldFrame();
  worlds.push(await makeAI(baker, q, accents[3]));

  const orbitMat = new THREE.LineBasicMaterial({ color: 0xc9c2ff, transparent: true, opacity: 0.1, depthWrite: false });
  ORBITS.forEach((r, i) => {
    const pts = new THREE.EllipseCurve(0, 0, r, r, 0, Math.PI * 2).getPoints(256);
    system.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts.map((p) => new THREE.Vector3(p.x, 0, p.y))), orbitMat));
    worlds[i].group.position.set(Math.cos(ANGLES[i]) * r, 0, Math.sin(ANGLES[i]) * r);
    system.add(worlds[i].group);
  });

  const belt = makeBelt(q, BELT_R, 1.0);
  const beltDust = new THREE.Points(belt.dustGeo, sparkleMaterial(new THREE.Color(0.9, 0.78, 0.66), 1.1));
  belt.group.add(beltDust);
  system.add(belt.group);

  const near = makeNearDust(q);
  scene.add(near.points);

  // Point sizes follow the real render pixel ratio.
  const pr = renderer.getPixelRatio();
  scene.traverse((o) => {
    const m = (o as THREE.Mesh).material as THREE.ShaderMaterial | undefined;
    if (m && 'uniforms' in m && m.uniforms?.uPR) m.uniforms.uPR.value = pr;
  });

  // The little rocket ferries between worlds.
  const rocket = makeRocket();
  rocket.group.scale.setScalar(0.12);
  scene.add(rocket.group);

  // ------------------------------------------------------------ post: bloom + film finish
  const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: phone ? 2 : 4 });
  const composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), phone ? 0.55 : 0.62, 0.45, 1.0);
  if (phone) {
    const set = bloom.setSize.bind(bloom);
    bloom.setSize = (w: number, h: number) => set(Math.round(w / 2), Math.round(h / 2));
  }
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const finish = new ShaderPass(FINISH);
  finish.uniforms.uCA.value = phone ? 0 : 0.012;
  composer.addPass(finish);
  const size = new THREE.Vector2();
  let lw = 0;
  let lh = 0;
  let lpr = 0;
  stage.setRender(() => {
    renderer.getSize(size);
    const p = renderer.getPixelRatio();
    if (size.x !== lw || size.y !== lh || p !== lpr) {
      lw = size.x;
      lh = size.y;
      lpr = p;
      composer.setPixelRatio(p);
      composer.setSize(lw, lh);
      finish.uniforms.uRes.value.set(lw * p, lh * p);
    }
    composer.render();
  });

  // ------------------------------------------------------------ camera rig
  let progress = 0;
  let fs = 0;
  const wp = new THREE.Vector3();
  const camPos = new THREE.Vector3();
  const lookCur = new THREE.Vector3();
  const tmp = new THREE.Vector3();
  const right = new THREE.Vector3();
  const up = new THREE.Vector3();
  const fwd = new THREE.Vector3();
  const poseA = { pos: new THREE.Vector3(), look: new THREE.Vector3() };
  const poseB = { pos: new THREE.Vector3(), look: new THREE.Vector3() };
  const isSmall = () => canvas.clientWidth < 760;

  const stopPose = (s: number, t: number, out: { pos: THREE.Vector3; look: THREE.Vector3 }) => {
    const small = isSmall();
    if (s === 0) {
      const sw = Math.sin(t * 0.05) * 0.06;
      if (small) out.pos.set(Math.sin(sw) * 44, 50, Math.cos(sw) * 44);
      else out.pos.set(Math.sin(sw + 0.1) * 39, 15, Math.cos(sw + 0.1) * 39);
      out.look.set(small ? 4.5 : 1.5, small ? 0 : -1.5, -3);
      return out;
    }
    const w = worlds[s - 1];
    w.group.getWorldPosition(wp);
    // Toward the sun, swung around by the world's phase angle so the terminator shows.
    tmp.copy(wp).negate().setY(0).normalize();
    const ph = w.frame.phase + Math.sin(t * 0.06 + s) * 0.08;
    const c = Math.cos(ph);
    const sn = Math.sin(ph);
    const dx = tmp.x * c - tmp.z * sn;
    const dz = tmp.x * sn + tmp.z * c;
    tmp.set(dx, w.frame.lift, dz).normalize();
    const dist = w.radius * w.frame.dist * (small ? 1.02 : 1) * (1 + Math.sin(t * 0.13 + s) * 0.025);
    out.pos.copy(wp).addScaledVector(tmp, dist);
    out.look.copy(wp);
    return out;
  };

  // Gyro parallax on phones, only if the browser already allows it (never prompts).
  const gyro = new THREE.Vector2();
  let g0: { b: number; g: number } | null = null;
  const onOrient = (e: DeviceOrientationEvent) => {
    if (e.beta == null || e.gamma == null) return;
    if (!g0) g0 = { b: e.beta, g: e.gamma };
    gyro.set(THREE.MathUtils.clamp((e.gamma - g0.g) / 25, -1, 1), THREE.MathUtils.clamp((e.beta - g0.b) / 25, -1, 1));
  };
  if (phone) window.addEventListener('deviceorientation', onOrient, { passive: true });
  const look2 = new THREE.Vector2();

  const occluders = worlds.map((w) => ({ c: new THREE.Vector3(), r: w.radius }));
  const rocketTarget = new THREE.Vector3();
  const rocketPrev = new THREE.Vector3();
  const rocketVel = new THREE.Vector3();
  const rocketLook = new THREE.Vector3();
  let lastT = -1;
  let first = true;

  const frame = (t: number) => {
    const dt = lastT < 0 ? 0.016 : Math.min(0.5, Math.max(0, t - lastT));
    lastT = t;

    // World motion.
    // (Orbits stay put so every stop keeps its composition; spin, clouds and moons carry the motion.)
    worlds.forEach((w) => w.update(t, dt, camera));
    belt.group.rotation.y = t * 0.004;
    (beltDust.material as THREE.ShaderMaterial).uniforms.uTime.value = t;

    // Camera: eased, held near each stop, with inertia.
    const stops = worlds.length + 1;
    const f = THREE.MathUtils.clamp(progress * (stops - 1), 0, stops - 1);
    fs = first ? f : fs + (f - fs) * (1 - Math.exp(-dt * 2.6));
    const i = Math.min(stops - 2, Math.floor(fs));
    const k = fs - i;
    const e = smoother((k - 0.1) / 0.8);
    const eLook = smoother((k - 0.04) / 0.74);
    stopPose(i, t, poseA);
    stopPose(i + 1, t, poseB);
    const travel = poseA.pos.distanceTo(poseB.pos);
    const arc = Math.sin(Math.PI * e);
    tmp.copy(poseA.pos).lerp(poseB.pos, e);
    tmp.y += arc * travel * 0.1;
    lookCur.copy(poseA.look).lerp(poseB.look, eLook);
    // pull back a touch mid-flight, so the move reveals the system around it
    fwd.copy(tmp).sub(lookCur).normalize();
    tmp.addScaledVector(fwd, arc * travel * 0.08);
    camPos.copy(tmp);

    // Framing: keep the subject clear of the copy (left on desktop, bottom on phones).
    const W = canvas.clientWidth || 1;
    const H = canvas.clientHeight || 1;
    const small = isSmall();
    const stopW = Math.min(1, fs);
    const ox = small ? 0 : W * THREE.MathUtils.lerp(0.1, 0.18, stopW);
    const oy = small ? H * THREE.MathUtils.lerp(0.2, 0.21, stopW) : 0;
    camera.fov = small ? 55 : 38;
    camera.setViewOffset(W, H, -ox, oy, W, H);

    // Operator feel: handheld drift, pointer / gyro parallax, a whisper of roll.
    const d = camPos.distanceTo(lookCur);
    camera.position.copy(camPos);
    camera.lookAt(lookCur);
    right.setFromMatrixColumn(camera.matrixWorld, 0);
    up.setFromMatrixColumn(camera.matrixWorld, 1);
    look2.copy(stage.pointer).add(gyro);
    const hx = Math.sin(t * 0.37) * 0.6 + Math.sin(t * 1.13 + 1.3) * 0.25 + Math.sin(t * 2.7) * 0.05;
    const hy = Math.sin(t * 0.29 + 1.1) * 0.5 + Math.sin(t * 0.97 + 0.4) * 0.22 + Math.sin(t * 2.3 + 2) * 0.05;
    camera.position.addScaledVector(right, (look2.x * 0.07 + hx * 0.006) * d).addScaledVector(up, (look2.y * 0.05 + hy * 0.006) * d);
    camera.lookAt(lookCur);
    camera.rotateZ(Math.sin(t * 0.21) * 0.006 - look2.x * 0.012);
    camera.updateMatrixWorld();
    first = false;

    orbitMat.opacity = 0.03 + 0.09 * (1 - stopW);

    // Rocket: rides ahead of the camera during a move, parks low and to the side at a stop.
    fwd.copy(lookCur).sub(camera.position).normalize();
    const moving = Math.sin(Math.PI * THREE.MathUtils.clamp(k, 0, 1));
    rocketTarget
      .copy(camera.position)
      .addScaledVector(fwd, d * (0.42 + moving * 0.12))
      .addScaledVector(right, d * (small ? 0.12 : 0.2 - moving * 0.08))
      .addScaledVector(up, d * (small ? 0.2 : -0.12 + Math.sin(t * 0.8) * 0.01));
    if (rocketPrev.lengthSq() === 0) rocket.group.position.copy(rocketTarget);
    rocket.group.position.lerp(rocketTarget, 1 - Math.exp(-dt * 2.2));
    rocketVel.copy(rocket.group.position).sub(rocketPrev);
    rocketPrev.copy(rocket.group.position);
    rocketLook.copy(rocket.group.position).add(rocketVel.lengthSq() > 1e-5 ? rocketVel.normalize() : fwd);
    rocketLook.lerp(tmp.copy(rocket.group.position).add(fwd), 0.6);
    rocket.group.lookAt(rocketLook);
    rocket.group.rotateX(Math.PI / 2);
    rocket.group.scale.setScalar(d * 0.012);
    rocket.update(t, 0.18 + moving * 0.6);

    // Sky, dust, sun and flare.
    space.update(t, camera);
    near.update(t, camera.position);
    worlds.forEach((w, j) => w.group.getWorldPosition(occluders[j].c));
    sun.update(t, camera, occluders);
    finish.uniforms.uTime.value = t;
  };

  // Compile everything up front (in parallel where the browser allows) to avoid a hitch on first view.
  frame(0);
  try {
    if (renderer.extensions.has('KHR_parallel_shader_compile')) await renderer.compileAsync(scene, camera);
    else renderer.compile(scene, camera);
  } catch {
    /* compile on first render instead */
  }
  stage.onFrame((t) => frame(t));

  const label = new THREE.Vector3();
  return {
    setProgress: (p) => (progress = p),
    planetsOnScreen: () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      up.setFromMatrixColumn(camera.matrixWorld, 1);
      return worlds.map((wd) => {
        wd.group.getWorldPosition(wp);
        const v = label.copy(wp).project(camera);
        const top = tmp.copy(wp).addScaledVector(up, wd.radius).project(camera);
        const x = Math.min(w - 120, (v.x * 0.5 + 0.5) * w);
        const y = (-v.y * 0.5 + 0.5) * h;
        const rpx = Math.abs((-top.y * 0.5 + 0.5) * h - y);
        // Sit the label under the disc (or at the centre for tiny, far planets).
        const ly = y + Math.max(0, rpx - 18);
        // On phones the copy sits under the planet, so labels only show in the overview.
        const free = !isSmall() || fs < 0.5;
        return { x, y: ly, visible: free && v.z < 1 && x > -40 && x < w + 40 && ly > -40 && ly < h + 40 };
      });
    },
    dispose: () => {
      window.removeEventListener('deviceorientation', onOrient);
      stage.setRender(() => {});
      const textures = new Set<THREE.Texture>();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
        const mats = (Array.isArray(m.material) ? m.material : m.material ? [m.material] : []) as THREE.Material[];
        mats.forEach((mat) => {
          Object.values(mat).forEach((v) => v instanceof THREE.Texture && textures.add(v));
          const u = (mat as THREE.ShaderMaterial).uniforms;
          if (u) Object.values(u).forEach((x) => x?.value instanceof THREE.Texture && textures.add(x.value));
          mat.dispose();
        });
      });
      textures.forEach((t) => t.dispose());
      baker.dispose();
      composer.dispose();
      rt.dispose();
      stage.dispose();
    },
  };
}

