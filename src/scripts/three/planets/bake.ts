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

/** Hands out one unit of work at a time; resolves with a pixel budget for that unit. */
export type Slot = () => Promise<number>;

type Job = { mat: THREE.ShaderMaterial; rt: THREE.WebGLRenderTarget };

/**
 * Bakes are queued, not drawn on the spot: bake() hands back the target texture(s) at once and
 * flush() later compiles each bake shader without blocking (KHR_parallel_shader_compile) and
 * draws it in horizontal strips, one strip per slot, each strip sized to the slot's pixel
 * budget, so building the system never stalls the page or hogs the GPU.
 */
export class Baker {
  private jobs: Job[] = [];
  private scene = new THREE.Scene();
  private cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
  readonly targets: THREE.WebGLRenderTarget[] = [];
  constructor(private renderer: THREE.WebGLRenderer) {
    this.quad.frustumCulled = false;
    this.scene.add(this.quad);
  }

  private target(w: number, h: number, count: number, opts: { mips?: boolean; wrap?: boolean }) {
    const mips = opts.mips ?? true;
    const rt = new THREE.WebGLRenderTarget(w, h, {
      depthBuffer: false,
      generateMipmaps: mips,
      minFilter: mips ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      wrapS: opts.wrap === false ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping,
      wrapT: THREE.ClampToEdgeWrapping,
      count,
    });
    const an = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    rt.textures.forEach((t) => (t.anisotropy = an));
    this.targets.push(rt);
    return rt;
  }

  /** Render `body` (a GLSL fragment main that writes gl_FragColor from vUv) into a w x h texture. */
  bake(body: string, w: number, h: number, uniforms: Record<string, THREE.IUniform> = {}, opts: { mips?: boolean; wrap?: boolean } = {}) {
    const rt = this.target(w, h, 1, opts);
    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: `precision highp float;\nvarying vec2 vUv;\n${NOISE}\n${SPHERE}\n${body}`,
      uniforms,
      depthTest: false,
      depthWrite: false,
    });
    this.jobs.push({ mat, rt });
    return rt.texture;
  }

  /**
   * Like bake(), but one pass writes `count` textures at once (outputs gOut0, gOut1, ...), so
   * work shared between them (e.g. a costly height field) is done once instead of per texture.
   */
  bakeMulti(body: string, w: number, h: number, count: number, uniforms: Record<string, THREE.IUniform> = {}, opts: { mips?: boolean; wrap?: boolean } = {}) {
    const rt = this.target(w, h, count, opts);
    const outs = Array.from({ length: count }, (_, i) => `layout(location = ${i}) out highp vec4 gOut${i};`).join('\n');
    const mat = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: VERT,
      fragmentShader: `precision highp float;\nvarying vec2 vUv;\n${outs}\n${NOISE}\n${SPHERE}\n${body}`,
      uniforms,
      depthTest: false,
      depthWrite: false,
    });
    this.jobs.push({ mat, rt });
    return rt.textures;
  }

  /** Draw every queued bake, strip by strip, one strip per slot. */
  async flush(slot: Slot) {
    // Materials are released at the end: bakes that share a shader then share one program.
    const done: THREE.ShaderMaterial[] = [];
    while (this.jobs.length) {
      const job = this.jobs.shift()!;
      this.quad.material = job.mat;
      const prev = this.renderer.getRenderTarget();
      this.renderer.setRenderTarget(job.rt); // compile the variant that draws into a target
      const pending = compileSoon(this.renderer, this.scene, this.cam);
      this.renderer.setRenderTarget(prev);
      await pending;
      const { width: w, height: h } = job.rt;
      const texs = job.rt.textures;
      const mips = texs.map((t) => t.generateMipmaps);
      let y = 0;
      let first = true;
      while (y < h) {
        const px = await slot();
        // The first strip also links the shader where that is not done in parallel: keep it small.
        const rows = Math.max(4, Math.min(h - y, Math.floor((first ? Math.min(px, 32768) : px) / w)));
        first = false;
        const last = y + rows >= h;
        texs.forEach((t, i) => (t.generateMipmaps = mips[i] && last));
        job.rt.scissor.set(0, y, w, rows);
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
        y += rows;
      }
      job.rt.scissorTest = false;
      texs.forEach((t, i) => (t.generateMipmaps = mips[i]));
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
