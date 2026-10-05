// Services as a solar system: the NUUKE sun at the centre, one planet per service.
// Scroll progress (0..1) flies the camera from an overview to each planet in turn.
import { createStage, makePhone, svgTexture, THREE } from './core';
import { makeRocket } from './rocket';

export type ServicesScene = {
  setProgress: (p: number) => void;
  /** Screen positions of each planet (CSS px) for HTML labels. */
  planetsOnScreen: () => { x: number; y: number; visible: boolean }[];
};

const SUN_FRAG = `
uniform float uTime;
varying vec3 vN;
varying vec3 vP;
void main() {
  float f = pow(1.0 - abs(dot(normalize(vN), vec3(0.0, 0.0, 1.0))), 2.2);
  float n = sin(vP.x * 6.0 + uTime) * sin(vP.y * 7.0 - uTime * 1.3) * sin(vP.z * 5.0 + uTime * 0.7);
  vec3 core = mix(vec3(1.0, 0.35, 0.62), vec3(1.0, 0.85, 0.9), 0.5 + 0.5 * n);
  vec3 col = mix(core, vec3(1.0, 0.18, 0.53), f);
  gl_FragColor = vec4(col * (1.2 + f * 1.5), 1.0);
}`;
const SUN_VERT = `
varying vec3 vN;
varying vec3 vP;
void main() {
  vN = normalMatrix * normal;
  vP = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

function glowSprite(color: string, size: number) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, color);
  grd.addColorStop(0.35, color.replace('1)', '0.35)'));
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  s.scale.setScalar(size);
  return s;
}

function bandTexture(a: string, b: string) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const g = c.getContext('2d')!;
  g.fillStyle = a;
  g.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 18; i++) {
    g.fillStyle = b;
    g.globalAlpha = 0.15 + Math.random() * 0.35;
    const y = Math.random() * 256;
    g.fillRect(0, y, 512, 4 + Math.random() * 18);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export async function initServices(canvas: HTMLCanvasElement, colors: string[]): Promise<ServicesScene> {
  const stage = createStage(canvas, { fov: 40, z: 30 });
  const { scene, camera, onFrame } = stage;
  scene.add(new THREE.AmbientLight(0xffffff, 0.25));
  const sunLight = new THREE.PointLight(0xffd6e6, 260, 120, 1.4);
  scene.add(sunLight);

  // Sun
  const sunMat = new THREE.ShaderMaterial({ vertexShader: SUN_VERT, fragmentShader: SUN_FRAG, uniforms: { uTime: { value: 0 } } });
  const sun = new THREE.Mesh(new THREE.SphereGeometry(2.4, 64, 64), sunMat);
  scene.add(sun, glowSprite('rgba(255,46,136,1)', 16));

  const system = new THREE.Group();
  system.rotation.x = 0.32;
  scene.add(system);

  const radii = [8, 12.5, 17, 21.5];
  const angles = [0.4, 2.2, 3.9, 5.5];
  const planets: THREE.Group[] = [];
  const spinners: ((t: number) => void)[] = [];

  radii.forEach((r) => {
    const pts = new THREE.EllipseCurve(0, 0, r, r, 0, Math.PI * 2).getPoints(160);
    const line = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(pts.map((p) => new THREE.Vector3(p.x, 0, p.y))),
      new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.12 }),
    );
    system.add(line);
  });

  const col = colors.map((c) => new THREE.Color(c));

  // 1. Mobile, banded planet, phone moon, ring of app tiles
  {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(1.5, 48, 48), new THREE.MeshStandardMaterial({ map: bandTexture('#3a0d22', colors[0]), roughness: 0.6, emissive: col[0], emissiveIntensity: 0.12 }));
    g.add(body);
    const tiles = new THREE.InstancedMesh(new THREE.BoxGeometry(0.26, 0.26, 0.05), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: col[0], emissiveIntensity: 0.6, roughness: 0.3 }), 36);
    const m = new THREE.Matrix4();
    for (let i = 0; i < 36; i++) {
      const a = (i / 36) * Math.PI * 2;
      m.makeRotationY(-a).setPosition(Math.cos(a) * 2.5, 0, Math.sin(a) * 2.5);
      tiles.setMatrixAt(i, m);
    }
    const ring = new THREE.Group();
    ring.add(tiles);
    ring.rotation.z = 0.35;
    g.add(ring);
    const screen = await svgTexture(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 375 775"><rect width="375" height="775" fill="#0b0b10"/><rect x="24" y="80" width="327" height="200" rx="26" fill="${colors[0]}"/><g fill="#1c1c26"><rect x="24" y="300" width="155" height="150" rx="22"/><rect x="196" y="300" width="155" height="150" rx="22"/><rect x="24" y="470" width="327" height="80" rx="20"/></g><rect x="24" y="700" width="327" height="50" rx="25" fill="#fff"/></svg>`,
      375,
      775,
    );
    const phone = makePhone(screen);
    phone.group.scale.setScalar(0.45);
    const moon = new THREE.Group();
    phone.group.position.set(3.4, 0.6, 0);
    moon.add(phone.group);
    g.add(moon);
    spinners.push((t) => {
      ring.rotation.y = t * 0.25;
      moon.rotation.y = t * 0.4;
      phone.group.rotation.y = -t * 0.4 + 0.4;
      body.rotation.y = t * 0.1;
    });
    planets.push(g);
  }
  // 2. 3D & animation, faceted low-poly planet with geometric moons
  {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.IcosahedronGeometry(1.6, 1), new THREE.MeshStandardMaterial({ color: col[1], flatShading: true, roughness: 0.4, metalness: 0.2 }));
    const wire = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(1.62, 1)), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 }));
    g.add(body, wire);
    const knot = new THREE.Mesh(new THREE.TorusKnotGeometry(0.32, 0.1, 100, 12), new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0.15 }));
    const cube = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.45), new THREE.MeshStandardMaterial({ color: col[1], emissive: col[1], emissiveIntensity: 0.4 }));
    g.add(knot, cube);
    spinners.push((t) => {
      body.rotation.y = wire.rotation.y = t * 0.2;
      body.rotation.x = wire.rotation.x = t * 0.1;
      knot.position.set(Math.cos(t * 0.6) * 2.6, Math.sin(t * 0.9) * 0.6, Math.sin(t * 0.6) * 2.6);
      knot.rotation.set(t, t * 0.7, 0);
      cube.position.set(Math.cos(t * 0.6 + Math.PI) * 2.3, 0.4, Math.sin(t * 0.6 + Math.PI) * 2.3);
      cube.rotation.set(t * 0.8, t, 0);
    });
    planets.push(g);
  }
  // 3. Marketing, planet broadcasting signal rings
  {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(1.45, 48, 48), new THREE.MeshStandardMaterial({ map: bandTexture('#0a3328', colors[2]), roughness: 0.5, emissive: col[2], emissiveIntensity: 0.1 }));
    g.add(body);
    const rings = [0, 1, 2].map(() => {
      const r = new THREE.Mesh(new THREE.TorusGeometry(1.8, 0.03, 8, 80), new THREE.MeshBasicMaterial({ color: col[2], transparent: true, opacity: 0.8 }));
      r.rotation.x = Math.PI / 2;
      g.add(r);
      return r;
    });
    spinners.push((t) => {
      body.rotation.y = t * 0.15;
      rings.forEach((r, i) => {
        const k = (t * 0.35 + i / 3) % 1;
        r.scale.setScalar(1 + k * 1.6);
        (r.material as THREE.MeshBasicMaterial).opacity = 0.8 * (1 - k);
      });
    });
    planets.push(g);
  }
  // 4. AI, neural sphere
  {
    const g = new THREE.Group();
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i < 120; i++) {
      const phi = Math.acos(1 - (2 * (i + 0.5)) / 120);
      const th = Math.PI * (1 + Math.sqrt(5)) * i;
      pts.push(new THREE.Vector3(Math.cos(th) * Math.sin(phi), Math.sin(th) * Math.sin(phi), Math.cos(phi)).multiplyScalar(1.6));
    }
    const lv: number[] = [];
    pts.forEach((a, i) => pts.forEach((b, j) => j > i && a.distanceTo(b) < 0.5 && lv.push(a.x, a.y, a.z, b.x, b.y, b.z)));
    const net = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(lv, 3)), new THREE.LineBasicMaterial({ color: col[3], transparent: true, opacity: 0.7 }));
    const dots = new THREE.Points(new THREE.BufferGeometry().setFromPoints(pts), new THREE.PointsMaterial({ color: 0xffffff, size: 0.09 }));
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.7, 32, 32), new THREE.MeshStandardMaterial({ color: col[3], emissive: col[3], emissiveIntensity: 1.6 }));
    g.add(net, dots, core, glowSprite('rgba(139,92,255,1)', 5));
    spinners.push((t) => {
      net.rotation.y = dots.rotation.y = t * 0.25;
      core.scale.setScalar(1 + Math.sin(t * 2) * 0.08);
    });
    planets.push(g);
  }

  planets.forEach((p, i) => {
    p.position.set(Math.cos(angles[i]) * radii[i], 0, Math.sin(angles[i]) * radii[i]);
    system.add(p);
  });

  // A small rocket ferries between planets.
  const rocket = makeRocket();
  rocket.group.scale.setScalar(0.35);
  scene.add(rocket.group);

  let progress = 0;
  const camPos = new THREE.Vector3(0, 14, 34);
  const look = new THREE.Vector3();
  const lookCur = new THREE.Vector3();
  const wp = new THREE.Vector3();
  const isSmall = () => window.innerWidth < 760;

  onFrame((t) => {
    sunMat.uniforms.uTime.value = t;
    sun.rotation.y = t * 0.05;
    system.rotation.y = t * 0.012;
    spinners.forEach((f) => f(t));

    // Camera stops: overview, then each planet.
    const stops = planets.length + 1;
    const f = Math.min(stops - 1, Math.max(0, progress * (stops - 1)));
    const i = Math.floor(f);
    const k = f - i;
    const e = k * k * (3 - 2 * k);
    const stopPose = (s: number) => {
      if (s === 0) return { pos: new THREE.Vector3(0, 16, isSmall() ? 46 : 36), look: new THREE.Vector3(0, -1, 0) };
      const p = planets[s - 1];
      p.getWorldPosition(wp);
      const out = wp.clone().normalize();
      const side = new THREE.Vector3(-out.z, 0, out.x);
      const pos = wp.clone().add(out.multiplyScalar(isSmall() ? 9 : 6.5)).add(new THREE.Vector3(0, 1.6, 0)).add(side.multiplyScalar(isSmall() ? 0 : -2.2));
      return { pos, look: wp.clone() };
    };
    const a = stopPose(i);
    const b = stopPose(Math.min(stops - 1, i + 1));
    const mid = a.pos.clone().lerp(b.pos, e).add(new THREE.Vector3(0, Math.sin(e * Math.PI) * 4, 0));
    camPos.lerp(mid, 0.08);
    look.copy(a.look).lerp(b.look, e);
    lookCur.lerp(look, 0.08);
    camera.position.copy(camPos);
    camera.lookAt(lookCur);

    // Rocket follows just ahead of the camera toward the target planet.
    const rp = lookCur.clone().lerp(camPos, 0.35).add(new THREE.Vector3(Math.sin(t) * 0.6, 1 + Math.sin(t * 1.3) * 0.3, 0));
    rocket.group.position.lerp(rp, 0.05);
    rocket.group.lookAt(lookCur);
    rocket.group.rotateX(Math.PI / 2);
    rocket.update(t, 0.6);
  });

  return {
    setProgress: (p) => (progress = p),
    planetsOnScreen: () =>
      planets.map((p) => {
        p.getWorldPosition(wp);
        const v = wp.clone().project(camera);
        return { x: (v.x * 0.5 + 0.5) * canvas.clientWidth, y: (-v.y * 0.5 + 0.5) * canvas.clientHeight, visible: v.z < 1 };
      }),
  };
}
