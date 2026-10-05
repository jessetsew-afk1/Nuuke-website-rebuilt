// The mascot in 3D: a procedural retro rocket (lathed hull, extruded fins,
// porthole, additive exhaust) wrapped in orbital rings. It follows a DOM anchor,
// so CSS decides where it sits, and it tilts toward the pointer.
import { createStage, THREE } from './three/core';

const TOP = 2.85;
const BOT = -1.35;
/** Hull radius at height y — a pointed ogive that tapers toward the nozzle. */
function radius(y: number) {
  const c = 0.2;
  if (y >= c) {
    const u = (y - c) / (TOP - c);
    return 0.82 * Math.pow(Math.max(0, 1 - Math.pow(u, 2.2)), 0.62);
  }
  const u = (c - y) / (c - BOT);
  return 0.82 - 0.2 * Math.pow(u, 1.8);
}
function lathe(y0: number, y1: number, mat: THREE.Material, steps = 40) {
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i <= steps; i++) {
    const y = y0 + ((y1 - y0) * i) / steps;
    pts.push(new THREE.Vector2(Math.max(0.0001, radius(y)), y));
  }
  return new THREE.Mesh(new THREE.LatheGeometry(pts, 72), mat);
}
function glowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.25, 'rgba(255,120,190,0.8)');
  grd.addColorStop(1, 'rgba(255,46,136,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function initRocket(canvas: HTMLCanvasElement, anchor: HTMLElement, onReady: () => void) {
  const stage = createStage(canvas, { fov: 30, z: 12 });
  const { scene, camera } = stage;

  const cream = new THREE.MeshPhysicalMaterial({ color: 0xf4ece1, metalness: 0.25, roughness: 0.34, clearcoat: 0.9, clearcoatRoughness: 0.2 });
  const pink = new THREE.MeshPhysicalMaterial({ color: 0xff2e88, metalness: 0.2, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.15 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x23232b, metalness: 0.85, roughness: 0.32 });

  const rocket = new THREE.Group();
  rocket.add(lathe(1.55, TOP, pink, 50));
  rocket.add(lathe(-0.85, 1.55, cream, 60));
  rocket.add(lathe(BOT, -0.85, pink, 16));
  for (const y of [1.55, -0.85]) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(radius(y) + 0.005, 0.035, 10, 72), dark);
    band.rotation.x = Math.PI / 2;
    band.position.y = y;
    rocket.add(band);
  }

  // porthole
  const py = 0.55;
  const pr = radius(py);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.06, 16, 48), dark);
  ring.position.set(0, py, pr - 0.02);
  rocket.add(ring);
  const glass = new THREE.Mesh(
    new THREE.CircleGeometry(0.25, 40),
    new THREE.MeshPhysicalMaterial({ color: 0x241a66, emissive: 0x3a22b0, emissiveIntensity: 0.35, roughness: 0.05, metalness: 0.1, clearcoat: 1 }),
  );
  glass.position.set(0, py, pr - 0.015);
  rocket.add(glass);

  // fins
  const fs = new THREE.Shape();
  fs.moveTo(0.5, -0.3);
  fs.bezierCurveTo(1.05, -0.55, 1.38, -1.1, 1.4, -1.9);
  fs.quadraticCurveTo(1.0, -1.58, 0.5, -1.3);
  fs.closePath();
  const fg = new THREE.ExtrudeGeometry(fs, { depth: 0.08, bevelEnabled: true, bevelSize: 0.025, bevelThickness: 0.025, bevelSegments: 3, curveSegments: 24 });
  fg.translate(0, 0, -0.04);
  for (let i = 0; i < 3; i++) {
    const fin = new THREE.Mesh(fg, pink);
    fin.rotation.y = -Math.PI / 2 + (i * Math.PI * 2) / 3;
    rocket.add(fin);
  }

  // nozzle + exhaust
  const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.5, 0.36, 48, 1, true), dark);
  nozzle.position.y = BOT - 0.17;
  rocket.add(nozzle);
  const flame = new THREE.Group();
  flame.position.y = BOT - 0.34;
  const outer = new THREE.Mesh(
    new THREE.ConeGeometry(0.44, 2.1, 40, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xff2e88, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
  );
  outer.rotation.x = Math.PI;
  outer.position.y = -1.05;
  const inner = new THREE.Mesh(
    new THREE.ConeGeometry(0.24, 1.2, 32, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffe0a8, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  inner.rotation.x = Math.PI;
  inner.position.y = -0.6;
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  glow.scale.set(2.2, 2.2, 1);
  glow.position.y = -0.3;
  flame.add(outer, inner, glow);
  rocket.add(flame);

  const fire = new THREE.PointLight(0xff2e88, 6, 6, 1.6);
  fire.position.set(0, BOT - 0.8, 0.6);
  rocket.add(fire);
  const rim = new THREE.DirectionalLight(0x8b5cff, 2.2);
  rim.position.set(-4, 2, -3);
  scene.add(rim);
  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(3, 4, 6);
  scene.add(key);

  // orbital rings with tiny moons
  const orbits = new THREE.Group();
  const moons: { m: THREE.Mesh; r: number; s: number; o: number }[] = [];
  [
    { r: 2.35, tilt: [1.2, 0.2, 0.3], c: 0xff2e88, s: 0.5 },
    { r: 2.8, tilt: [1.38, -0.4, -0.2], c: 0xffffff, s: -0.32 },
  ].forEach((o, i) => {
    const g = new THREE.Group();
    g.rotation.set(o.tilt[0], o.tilt[1], o.tilt[2]);
    const line = new THREE.Mesh(
      new THREE.TorusGeometry(o.r, 0.007, 6, 200),
      new THREE.MeshBasicMaterial({ color: o.c, transparent: true, opacity: i ? 0.28 : 0.55 }),
    );
    g.add(line);
    const m = new THREE.Mesh(new THREE.SphereGeometry(i ? 0.06 : 0.09, 16, 12), new THREE.MeshBasicMaterial({ color: o.c }));
    g.add(m);
    moons.push({ m, r: o.r, s: o.s, o: i * 2 });
    orbits.add(g);
  });

  const holder = new THREE.Group(); // positioned from the DOM anchor
  const tilt = new THREE.Group(); // pointer tilt
  holder.add(tilt);
  tilt.add(orbits, rocket);
  rocket.rotation.z = -0.32;
  scene.add(holder);

  // Map the anchor's box onto the world plane z = 0.
  const place = () => {
    const a = anchor.getBoundingClientRect();
    const c = canvas.getBoundingClientRect();
    if (!c.width || !c.height) return;
    const halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
    const halfW = halfH * camera.aspect;
    const nx = ((a.left + a.width / 2 - c.left) / c.width) * 2 - 1;
    const ny = -(((a.top + a.height / 2 - c.top) / c.height) * 2 - 1);
    holder.position.set(nx * halfW, ny * halfH, 0);
    const s = ((a.height / c.height) * 2 * halfH) / 6.4;
    holder.scale.setScalar(s);
  };

  let launch = 0;
  let first = true;
  stage.onFrame((t) => {
    place();
    const still = stage.reduced;
    const tt = still ? 1.2 : t;
    rocket.rotation.y = tt * 0.45;
    rocket.position.y = Math.sin(tt * 1.3) * 0.08 + launch * 0.4;
    tilt.rotation.x = -stage.pointer.y * 0.22;
    tilt.rotation.y = stage.pointer.x * 0.35;
    const flick = still ? 1 : 1 + Math.sin(t * 38) * 0.06 + Math.sin(t * 23) * 0.05;
    flame.scale.set(1 + launch * 0.2, flick * (1 + launch * 1.4), 1 + launch * 0.2);
    fire.intensity = 5 + flick * 2 + launch * 6;
    moons.forEach((o) => {
      const a = tt * o.s + o.o;
      o.m.position.set(Math.cos(a) * o.r, Math.sin(a) * o.r, 0);
    });
    orbits.rotation.y = tt * 0.05;
    if (first) {
      first = false;
      requestAnimationFrame(onReady);
    }
  });

  return {
    setLaunch(p: number) {
      launch = p;
      if (stage.reduced) stage.render();
    },
  };
}
