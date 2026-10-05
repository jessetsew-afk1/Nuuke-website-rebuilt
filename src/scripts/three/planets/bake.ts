// Bakes procedural shaders into textures on the GPU once, so the per-frame shaders only
// sample them. Every target is tracked so the whole system can be disposed in one go.
import { compileSoon, THREE } from '../core';
import { NOISE, SPHERE } from './glsl';

const VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

type Idle = () => Promise<void>;

/** Resolve in the browser's next idle period (or after a frame where there is no such API). */
export const idle: Idle = () =>
  new Promise((r) => {
    const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    if (ric) ric(() => r(), { timeout: 250 });
    else setTimeout(r, 16);
  });

/**
 * Bakes are queued, not drawn on the spot: bake() hands back the target texture at once and
 * flush() later compiles each bake shader without blocking (KHR_parallel_shader_compile) and
 * draws one bake per idle period, so building the system never stalls the page.
 */
export class Baker {
  private jobs: { mat: THREE.ShaderMaterial; rt: THREE.WebGLRenderTarget }[] = [];
  private scene = new THREE.Scene();
  private cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
  readonly targets: THREE.WebGLRenderTarget[] = [];
  constructor(private renderer: THREE.WebGLRenderer) {
    this.quad.frustumCulled = false;
    this.scene.add(this.quad);
  }

  /** Render `body` (a GLSL fragment main that writes gl_FragColor from vUv) into a w x h texture. */
  bake(body: string, w: number, h: number, uniforms: Record<string, THREE.IUniform> = {}, opts: { mips?: boolean; wrap?: boolean } = {}) {
    const mips = opts.mips ?? true;
    const rt = new THREE.WebGLRenderTarget(w, h, {
      depthBuffer: false,
      generateMipmaps: mips,
      minFilter: mips ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      wrapS: opts.wrap === false ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping,
      wrapT: THREE.ClampToEdgeWrapping,
    });
    rt.texture.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: `precision highp float;\nvarying vec2 vUv;\n${NOISE}\n${SPHERE}\n${body}`,
      uniforms,
      depthTest: false,
      depthWrite: false,
    });
    this.jobs.push({ mat, rt });
    this.targets.push(rt);
    return rt.texture;
  }

  /** Draw every queued bake, one per idle period, compiling its shader asynchronously first. */
  async flush(wait: Idle = idle) {
    // Materials are released at the end: bakes that share a shader (two passes of one surface)
    // then share one compiled program instead of compiling it again.
    const done: THREE.ShaderMaterial[] = [];
    while (this.jobs.length) {
      const job = this.jobs.shift()!;
      this.quad.material = job.mat;
      const prev = this.renderer.getRenderTarget();
      this.renderer.setRenderTarget(job.rt); // compile the variant that draws into a target
      const pending = compileSoon(this.renderer, this.scene, this.cam);
      this.renderer.setRenderTarget(prev);
      await pending;
      // Draw it in strips of about 256k pixels, one strip per idle period, so a big bake never
      // occupies the GPU for long (the page keeps animating smoothly meanwhile).
      const { width: w, height: h } = job.rt;
      const strips = Math.max(1, Math.ceil((w * h) / 262144));
      const rows = Math.ceil(h / strips);
      const mips = job.rt.texture.generateMipmaps;
      for (let y = 0; y < h; y += rows) {
        await wait();
        const last = y + rows >= h;
        job.rt.texture.generateMipmaps = mips && last;
        job.rt.scissor.set(0, y, w, Math.min(rows, h - y));
        job.rt.scissorTest = true;
        const prevXr = this.renderer.xr.enabled;
        const prevRT = this.renderer.getRenderTarget();
        const ac = this.renderer.autoClear;
        this.renderer.xr.enabled = false;
        this.renderer.autoClear = false;
        this.renderer.setRenderTarget(job.rt);
        this.renderer.render(this.scene, this.cam);
        this.renderer.setRenderTarget(prevRT);
        this.renderer.autoClear = ac;
        this.renderer.xr.enabled = prevXr;
      }
      job.rt.scissorTest = false;
      job.rt.texture.generateMipmaps = mips;
      done.push(job.mat);
    }
    done.forEach((m) => m.dispose());
  }

  dispose() {
    this.jobs.forEach((j) => j.mat.dispose());
    this.jobs.length = 0;
    this.targets.forEach((t) => t.dispose());
    this.targets.length = 0;
    this.quad.geometry.dispose();
  }
}
