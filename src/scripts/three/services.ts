// Services as a solar system: the NUUKE star at the centre, one world per service.
// Scroll progress (0..1) flies a cinematic camera from an overview to each world in turn.
// Heavy lifting lives in ./planets/*: GPU-baked surfaces, the sun, deep space and belts.
import { bgSlot, bgUrgent, buildRoomEnv, createStage, isLiteDevice, onQuality, THREE } from './core';
import { makeRocket } from './rocket';
import { makePipeline } from './fx/pipeline';
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

// Film finish (after bloom, tone mapping and sRGB, all in the pipeline's single final pass):
// soft vignette, a hint of lens fringing toward the edges and fine grain.
const FINISH_FRAG = /* glsl */ `
uniform float uTime;
uniform float uCA;
uniform float uGrain;
void main() {
  vec2 c = vUv - 0.5;
  float r2 = dot(c, c);
  vec3 col;
  if (uCA > 0.0) {
    vec2 off = c * r2 * uCA;
    col = vec3(display(hdr(vUv + off)).r, display(hdr(vUv)).g, display(hdr(vUv - off)).b);
  } else {
    col = display(hdr(vUv));
  }
  col *= 1.0 - smoothstep(0.12, 0.62, r2) * 0.42;
  float n = fract(sin(dot(floor(vUv * uRes) + fract(uTime * 7.31) * 113.0, vec2(12.9898, 78.233))) * 43758.5453);
  col += (n - 0.5) * 0.022 * uGrain;
  gl_FragColor = vec4(col, 1.0);
}`;

const ORBITS = [8.5, 13.5, 20.5, 25.5];
const ANGLES = [-0.7, 0.3, 4.25, 5.35];
const BELT_R = 17;

const smoother = (x: number) => {
  const k = THREE.MathUtils.clamp(x, 0, 1);
  return k * k * k * (k * (k * 6 - 15) + 10);
};

export async function initServices(canvas: HTMLCanvasElement, colors: string[]): Promise<ServicesScene> {
  // The system is built in small steps, one per background-work slot (see bgSlot in core.ts):
  // at most one per frame, only while frames are on time and nobody is scrolling, so building
  // it (long before the section is reached) never makes the page stutter.
  const timing = /[?&]perf\b/.test(location.search);
  let chunkT = performance.now();
  const step = async (label = '') => {
    // ?perf: each chunk's main-thread time shows up as a performance measure ("ss <label>")
    if (timing) performance.measure(`ss ${label}`, { start: chunkT, end: performance.now() });
    const px = await bgSlot(1);
    chunkT = performance.now();
    return px;
  };
  // Close to the section and still not ready (a fast scroller or a busy machine): finish now,
  // a unit every frame, regardless of headroom.
  let urgent = false;
  let ready = false;
  const nearObs = new IntersectionObserver(
    (es) => {
      const on = !ready && (es[0]?.isIntersecting ?? false);
      if (on !== urgent) bgUrgent((urgent = on));
    },
    { rootMargin: '150% 0px' },
  );
  nearObs.observe(canvas.closest('[data-ss]') ?? canvas);
  const phone = isLiteDevice();
  const stage = createStage(canvas, { fov: 38, z: 40, alpha: false, env: false });
  const { scene, camera, renderer } = stage;
  // Draw nothing until everything below is built and compiled.
  stage.setRender(() => {});
  // Surface bakes, mesh detail and particle counts are fixed at build time: pick them from the
  // starting tier (instance and particle counts also follow later tier changes).
  let startTier = 0;
  onQuality((qq) => (startTier = qq.tier))();
  const q: Quality =
    phone || startTier >= 3
      ? { phone, tex: 768, seg: 72, particles: 0.45 }
      : startTier === 2
        ? { phone, tex: 1024, seg: 96, particles: 0.75 }
        : startTier === 1
          ? { phone, tex: 1536, seg: 112, particles: 0.9 }
          : { phone, tex: 1536, seg: 128, particles: 1 };
  await step('stage');
  scene.environment = await buildRoomEnv(renderer);
  await step('env');
  camera.near = 0.05;
  camera.far = 2400;
  camera.updateProjectionMatrix();
  renderer.setClearColor(0x020203, 1);
  scene.environmentIntensity = 0.3;

  // The star is the only real light; a faint cool fill keeps night sides from going pure black.
  scene.add(new THREE.PointLight(0xfff0e4, 2.8, 0, 0));
  scene.add(new THREE.AmbientLight(0x8088ff, 0.025));

  const baker = new Baker(renderer);

  const space = makeSpace(baker, q);
  scene.add(space.group);
  const sun = makeSun(phone);
  scene.add(sun.group, sun.flareGroup);

  const system = new THREE.Group();
  scene.add(system);

  const accents = colors.map((c) => new THREE.Color(c));
  await step('space+sun');
  const worlds: World[] = [];
  worlds.push(await makeMobile(baker, q, accents[0], colors[0]));
  await step('mobile');
  worlds.push(await makeAnimation(baker, q, accents[1]));
  await step('animation');
  worlds.push(await makeMarketing(baker, q, accents[2]));
  await step('marketing');
  worlds.push(await makeAI(baker, q, accents[3]));
  await step('ai');

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
  await step('belt');

  const near = makeNearDust(q);
  scene.add(near.points);

  // Point sizes follow the real render pixel ratio (which the quality governor may change).
  const syncPR = () => {
    const pr = renderer.getPixelRatio();
    scene.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.ShaderMaterial | undefined;
      if (m && 'uniforms' in m && m.uniforms?.uPR) m.uniforms.uPR.value = pr;
    });
  };

  // The little rocket ferries between worlds.
  const rocket = makeRocket({ small: true });
  rocket.group.scale.setScalar(0.12);
  scene.add(rocket.group);
  await step('rocket');

  // ------------------------------------------------------------ post: bloom + film finish
  const post = makePipeline(renderer, scene, camera, {
    bloom: { strength: phone ? 0.55 : 0.62, radius: 0.45, threshold: 1.0, knee: 0.4 },
    maxSamples: phone ? 2 : 4,
    finalFrag: FINISH_FRAG,
    uniforms: { uTime: { value: 0 }, uCA: { value: phone ? 0 : 0.012 }, uGrain: { value: 1 } },
  });
  const finish = { uniforms: post.uniforms };
  onQuality((qq) => {
    post.setQuality(qq);
    belt.setBudget(qq.particles / q.particles);
    finish.uniforms.uCA.value = phone || !qq.extras ? 0 : 0.012;
    finish.uniforms.uGrain.value = qq.extras ? 1 : 0;
    syncPR();
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
  // Canvas size in CSS px as last measured by the stage's ResizeObserver (no layout reads per frame).
  const cssSize = new THREE.Vector2();
  const viewW = () => renderer.getSize(cssSize).x || 1;
  const viewH = () => renderer.getSize(cssSize).y || 1;
  const isSmall = () => viewW() < 760;

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
    const W = viewW();
    const H = viewH();
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
    sun.update(t, camera, occluders, dt);
    finish.uniforms.uTime.value = t;
  };

  // Finish off-screen, one idle period at a time: draw the queued surface bakes, compile every
  // shader without blocking (the exact variants the post pipeline uses), upload the textures,
  // then draw one frame into the pipeline's target so geometry is on the GPU too. A render
  // while compileAsync is still running would force the same compile synchronously, which is
  // why nothing is drawn to the canvas until here.
  frame(0);
  await baker.flush(() => step('bake strip'));
  try {
    await post.compileAsync();
  } catch {
    /* compile on first render instead */
  }
  await step('compile');
  const texs = new Set<THREE.Texture>();
  scene.traverse((o) => {
    const mats = (o as THREE.Mesh).material;
    for (const m of Array.isArray(mats) ? mats : mats ? [mats] : []) {
      for (const v of Object.values(m)) if ((v as THREE.Texture)?.isTexture) texs.add(v as THREE.Texture);
      const u = (m as THREE.ShaderMaterial).uniforms;
      if (u) for (const k in u) if ((u[k].value as THREE.Texture)?.isTexture) texs.add(u[k].value as THREE.Texture);
    }
  });
  for (const tx of texs) {
    if ((tx as THREE.Texture & { isRenderTargetTexture?: boolean }).isRenderTargetTexture) continue;
    renderer.initTexture(tx);
    await step('texture');
  }
  frame(0);
  await post.primeObjects(() => step('prime object'));
  post.prime();
  await step('prime scene');
  post.primeBloom();
  await step('prime bloom');
  ready = true;
  nearObs.disconnect();
  if (urgent) bgUrgent((urgent = false));
  stage.setRender(post.render);
  stage.invalidate();
  stage.onFrame((t) => frame(t));
  if (/[?&]hjdebug\b/.test(location.search)) (window as unknown as { __ss: unknown }).__ss = () => ({ ...sun.dbg, cam: camera.position.toArray(), fs, progress });
  // From here on this canvas is opaque and fills the viewport while its section is pinned:
  // the journey canvas underneath can stop drawing.
  canvas.closest<HTMLElement>('[data-ss]')?.setAttribute('data-gl-cover', '');
  window.dispatchEvent(new Event('nuuke:gl-cover'));

  const label = new THREE.Vector3();
  const onScreen = worlds.map(() => ({ x: 0, y: 0, visible: false }));
  return {
    setProgress: (p) => (progress = p),
    planetsOnScreen: () => {
      const w = viewW();
      const h = viewH();
      up.setFromMatrixColumn(camera.matrixWorld, 1);
      // On phones the copy sits under the planet, so labels only show in the overview.
      const free = !isSmall() || fs < 0.5;
      worlds.forEach((wd, i) => {
        wd.group.getWorldPosition(wp);
        const v = label.copy(wp).project(camera);
        const top = tmp.copy(wp).addScaledVector(up, wd.radius).project(camera);
        const x = Math.min(w - 120, (v.x * 0.5 + 0.5) * w);
        const y = (-v.y * 0.5 + 0.5) * h;
        const rpx = Math.abs((-top.y * 0.5 + 0.5) * h - y);
        // Sit the label under the disc (or at the centre for tiny, far planets).
        const ly = y + Math.max(0, rpx - 18);
        const o = onScreen[i];
        o.x = x;
        o.y = ly;
        o.visible = free && v.z < 1 && x > -40 && x < w + 40 && ly > -40 && ly < h + 40;
      });
      return onScreen;
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
      post.dispose();
      canvas.closest<HTMLElement>('[data-ss]')?.removeAttribute('data-gl-cover');
      window.dispatchEvent(new Event('nuuke:gl-cover'));
      stage.dispose();
    },
  };
}

