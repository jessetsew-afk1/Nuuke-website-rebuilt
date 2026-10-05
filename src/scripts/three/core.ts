// Shared Three.js stage: renderer, camera, studio lighting, resize and
// an animation loop that only runs while the canvas is on screen.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export { THREE };

export type Stage = {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  pointer: THREE.Vector2; // smoothed, -1..1
  onFrame: (fn: (t: number, dt: number) => void) => void;
  render: () => void;
  dispose: () => void;
  reduced: boolean;
};

export function createStage(canvas: HTMLCanvasElement, opts: { fov?: number; z?: number; env?: boolean; alpha?: boolean } = {}): Stage {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: opts.alpha ?? true, powerPreference: 'high-performance' });
  // No GPU (software rasteriser) or the visitor prefers less motion → static frames only.
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches || isSoftwareGL(renderer.getContext());
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(opts.fov ?? 35, 1, 0.1, 100);
  camera.position.set(0, 0, opts.z ?? 10);

  if (opts.env !== false) {
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
  }

  const resize = () => {
    const w = canvas.clientWidth || canvas.parentElement?.clientWidth || 1;
    const h = canvas.clientHeight || canvas.parentElement?.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);

  const pointer = new THREE.Vector2();
  const target = new THREE.Vector2();
  const onMove = (e: PointerEvent) => {
    target.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
  };
  window.addEventListener('pointermove', onMove, { passive: true });

  const frames: ((t: number, dt: number) => void)[] = [];
  const timer = new THREE.Timer();
  let visible = true;
  let raf = 0;
  const render = () => renderer.render(scene, camera);
  const tick = () => {
    raf = 0;
    if (!visible || document.hidden) return;
    timer.update();
    const dt = Math.min(timer.getDelta(), 0.05);
    const t = timer.getElapsed();
    pointer.lerp(target, 0.06);
    for (const f of frames) f(t, dt);
    render();
    if (!reduced || performance.now() < activeUntil) raf = requestAnimationFrame(tick);
  };
  // In static mode, still animate for a few seconds after the visitor interacts.
  let activeUntil = 0;
  if (reduced) {
    const wake = () => {
      activeUntil = performance.now() + 4000;
      start();
    };
    ['pointerdown', 'keydown', 'click'].forEach((ev) => window.addEventListener(ev, wake, { passive: true }));
  }
  const start = () => {
    if (!raf) raf = requestAnimationFrame(tick);
  };
  const io = new IntersectionObserver((entries) => {
    visible = entries[0]?.isIntersecting ?? true;
    if (visible) {
      timer.update();
      start();
    }
  });
  io.observe(canvas);
  document.addEventListener('visibilitychange', () => !document.hidden && start());
  if (reduced) {
    let last = 0;
    window.addEventListener(
      'scroll',
      () => {
        const now = performance.now();
        if (now - last > 220) {
          last = now;
          start();
        }
      },
      { passive: true },
    );
  }

  return {
    renderer,
    scene,
    camera,
    pointer,
    reduced,
    onFrame: (fn) => {
      frames.push(fn);
      start();
    },
    render,
    dispose: () => {
      io.disconnect();
      ro.disconnect();
      window.removeEventListener('pointermove', onMove);
      renderer.dispose();
    },
  };
}

/** True when WebGL is running on a software rasteriser (no usable GPU). */
export function isSoftwareGL(gl: WebGLRenderingContext | WebGL2RenderingContext) {
  if (/[?&]gl=force\b/.test(location.search)) return false;
  try {
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const name = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '';
    return /swiftshader|llvmpipe|softpipe|software|basic render/i.test(name);
  } catch {
    return false;
  }
}

/** A modern phone: rounded aluminium body, glass front, a screen that takes any texture. */
export function makePhone(screen: THREE.Texture | null, opts: { color?: number; w?: number; h?: number } = {}) {
  const w = opts.w ?? 1.5;
  const h = opts.h ?? 3.1;
  const d = 0.16;
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new RoundedBoxGeometry(w, h, d, 6, 0.2),
    new THREE.MeshPhysicalMaterial({ color: opts.color ?? 0x1b1b20, metalness: 0.9, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.2 }),
  );
  group.add(body);
  const screenMat = new THREE.MeshBasicMaterial({ color: 0xffffff, map: screen ?? null, toneMapped: false });
  const scr = new THREE.Mesh(new RoundedPlane(w - 0.1, h - 0.1, 0.16), screenMat);
  scr.position.z = d / 2 + 0.002;
  group.add(scr);
  const glass = new THREE.Mesh(
    new RoundedPlane(w - 0.04, h - 0.04, 0.18),
    new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.08, roughness: 0.05, metalness: 0, clearcoat: 1 }),
  );
  glass.position.z = d / 2 + 0.006;
  group.add(glass);
  const island = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.22, 4, 12), new THREE.MeshBasicMaterial({ color: 0x000000 }));
  island.rotation.z = Math.PI / 2;
  island.position.set(0, h / 2 - 0.16, d / 2 + 0.004);
  group.add(island);
  return { group, screen: scr, screenMat };
}

/** Flat rectangle with rounded corners and correct 0..1 UVs. */
export class RoundedPlane extends THREE.ShapeGeometry {
  constructor(w: number, h: number, r: number) {
    const s = new THREE.Shape();
    const x = -w / 2;
    const y = -h / 2;
    s.moveTo(x + r, y);
    s.lineTo(x + w - r, y);
    s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r);
    s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h);
    s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r);
    s.quadraticCurveTo(x, y, x + r, y);
    super(s, 12);
    const pos = this.attributes.position;
    const uv = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) {
      uv[i * 2] = (pos.getX(i) - x) / w;
      uv[i * 2 + 1] = (pos.getY(i) - y) / h;
    }
    this.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  }
}

/** Draw an SVG string into a texture (used for wireframes and UI screens). */
export function svgTexture(svg: string, width = 750, height = 1550): Promise<THREE.CanvasTexture> {
  return new Promise((resolve) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    img.onload = () => {
      ctx.drawImage(img, 0, 0, width, height);
      tex.needsUpdate = true;
      resolve(tex);
    };
    img.onerror = () => resolve(tex);
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  });
}
