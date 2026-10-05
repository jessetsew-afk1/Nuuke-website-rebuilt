// Bakes procedural shaders into textures on the GPU once, so the per-frame shaders only
// sample them. Every target is tracked so the whole system can be disposed in one go.
import { THREE } from '../core';
import { NOISE, SPHERE } from './glsl';

const VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

export class Baker {
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
    this.quad.material = mat;
    const prev = this.renderer.getRenderTarget();
    const prevXr = this.renderer.xr.enabled;
    this.renderer.xr.enabled = false;
    this.renderer.setRenderTarget(rt);
    this.renderer.render(this.scene, this.cam);
    this.renderer.setRenderTarget(prev);
    this.renderer.xr.enabled = prevXr;
    mat.dispose();
    this.targets.push(rt);
    return rt.texture;
  }

  dispose() {
    this.targets.forEach((t) => t.dispose());
    this.targets.length = 0;
    this.quad.geometry.dispose();
  }
}
