// Lean HDR post pipeline shared by the homepage journey and the services system.
// scene → one HDR target (MSAA when the quality tier allows) → bloom mips at reduced size
// → ONE full-screen pass that adds the bloom, applies the scene's finishing touches,
// tone maps (ACES) and encodes sRGB straight to the canvas.
// (The old EffectComposer chains used three to four full-resolution passes per frame plus a
// second full-size MSAA target; this keeps one.)
import { compileSoon, THREE } from '../core';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

const BLUR_X = new THREE.Vector2(1, 0);
const BLUR_Y = new THREE.Vector2(0, 1);

// The bloom always works at the same internal height, whatever the window size, pixel ratio or
// quality tier: its blur radii are in bloom texels, so a fixed height keeps the glow the same
// size (as a fraction of the screen) and the same strength everywhere. Before, a large or
// high-DPR window got a tighter, hotter glow than a small one.
const BLOOM_H = 720;

// Bright-pass that also downsamples properly: four bilinear taps (a 4x4 texel footprint)
// instead of one, so small highlights (stars, sparks, sub-pixel glints) feed the bloom
// steadily instead of popping in and out as they move between texels.
const HIGHPASS_FRAG = /* glsl */ `
uniform sampler2D tDiffuse;
uniform float luminosityThreshold;
uniform float smoothWidth;
uniform vec2 uTap;
varying vec2 vUv;
vec4 tap(vec2 uv) {
  vec4 t = texture2D(tDiffuse, uv);
  float v = dot(t.rgb, vec3(0.299, 0.587, 0.114));
  return t * smoothstep(luminosityThreshold, luminosityThreshold + smoothWidth, v);
}
void main() {
  gl_FragColor = 0.25 * (tap(vUv + uTap * vec2(-1.0, -1.0)) + tap(vUv + uTap * vec2(1.0, -1.0)) + tap(vUv + uTap * vec2(-1.0, 1.0)) + tap(vUv + uTap * vec2(1.0, 1.0)));
}`;

/** UnrealBloomPass that leaves its composite in a texture instead of blending it at full size. */
class BloomTexture extends UnrealBloomPass {
  constructor(res: THREE.Vector2, strength: number, radius: number, threshold: number) {
    super(res, strength, radius, threshold);
    this.materialHighPassFilter.dispose();
    this.materialHighPassFilter = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        luminosityThreshold: { value: threshold },
        smoothWidth: { value: 0.01 },
        uTap: { value: new THREE.Vector2(0.001, 0.001) },
      },
      vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: HIGHPASS_FRAG,
      depthTest: false,
      depthWrite: false,
    });
    this.highPassUniforms = this.materialHighPassFilter.uniforms;
  }
  get hp() {
    return this.highPassUniforms as Record<string, THREE.IUniform>;
  }
  get texture() {
    return this.renderTargetsHorizontal[0].texture;
  }
  /** w x h = the scene target in device pixels; the bloom itself runs at BLOOM_H rows. */
  setSize(w: number, h: number) {
    const H = BLOOM_H;
    const W = Math.max(4, Math.round((H * w) / Math.max(1, h)));
    super.setSize(W, H);
    // the bright target is half of that: a quarter of one of its texels per tap
    const bw = Math.round(W / 2);
    const bh = Math.round(H / 2);
    (this.hp['uTap'].value as THREE.Vector2).set(0.25 / bw, 0.25 / bh);
  }
  /** Every material the bloom uses (for asynchronous shader compilation). */
  materials() {
    return [this.materialHighPassFilter, ...this.separableBlurMaterials, this.compositeMaterial];
  }
  /** Same steps as UnrealBloomPass.render, minus the final full-resolution additive blend. */
  renderBloom(renderer: THREE.WebGLRenderer, input: THREE.WebGLRenderTarget) {
    const self = this as unknown as {
      _fsQuad: FullScreenQuad;
      _oldClearColor: THREE.Color;
      _oldClearAlpha: number;
    };
    const quad = self._fsQuad;
    renderer.getClearColor(self._oldClearColor);
    self._oldClearAlpha = renderer.getClearAlpha();
    const oldAutoClear = renderer.autoClear;
    renderer.autoClear = false;
    renderer.setClearColor(this.clearColor, 0);

    this.hp['tDiffuse'].value = input.texture;
    this.hp['luminosityThreshold'].value = this.threshold;
    quad.material = this.materialHighPassFilter;
    renderer.setRenderTarget(this.renderTargetBright);
    renderer.clear();
    quad.render(renderer);

    let inputRT = this.renderTargetBright;
    for (let i = 0; i < this.nMips; i++) {
      const m = this.separableBlurMaterials[i];
      quad.material = m;
      m.uniforms['colorTexture'].value = inputRT.texture;
      m.uniforms['direction'].value = BLUR_X;
      renderer.setRenderTarget(this.renderTargetsHorizontal[i]);
      renderer.clear();
      quad.render(renderer);
      m.uniforms['colorTexture'].value = this.renderTargetsHorizontal[i].texture;
      m.uniforms['direction'].value = BLUR_Y;
      renderer.setRenderTarget(this.renderTargetsVertical[i]);
      renderer.clear();
      quad.render(renderer);
      inputRT = this.renderTargetsVertical[i];
    }

    quad.material = this.compositeMaterial;
    this.compositeMaterial.uniforms['bloomStrength'].value = this.strength;
    this.compositeMaterial.uniforms['bloomRadius'].value = this.radius;
    this.compositeMaterial.uniforms['bloomTintColors'].value = this.bloomTintColors;
    renderer.setRenderTarget(this.renderTargetsHorizontal[0]);
    renderer.clear();
    quad.render(renderer);

    renderer.setClearColor(self._oldClearColor, self._oldClearAlpha);
    renderer.autoClear = oldAutoClear;
  }
}

const FINAL_VERT = /* glsl */ `
precision highp float;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
attribute vec3 position;
attribute vec2 uv;
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

/**
 * Header every final shader gets: scene + bloom samplers, resolution, ACES + sRGB helpers.
 * `hdr(uv)` = scene + bloom (linear HDR), `display(c)` = tone mapped, sRGB encoded colour.
 */
const FINAL_HEAD = /* glsl */ `
precision highp float;
uniform sampler2D tDiffuse;
uniform sampler2D tBloom;
uniform vec2 uRes;
varying vec2 vUv;
#include <tonemapping_pars_fragment>
#include <colorspace_pars_fragment>
vec3 hdr(vec2 uv) { return texture2D(tDiffuse, uv).rgb + texture2D(tBloom, uv).rgb; }
vec3 display(vec3 c) { return sRGBTransferOETF(vec4(ACESFilmicToneMapping(c), 1.0)).rgb; }
`;

export type PipelineOpts = {
  bloom: { strength: number; radius: number; threshold: number; knee?: number };
  /** GLSL with a main() that writes gl_FragColor; may use hdr(), display(), vUv, uRes. */
  finalFrag: string;
  uniforms?: Record<string, THREE.IUniform>;
  /** Upper bound for MSAA samples (the quality tier may ask for fewer). */
  maxSamples?: number;
};

export type Pipeline = {
  render: () => void;
  bloom: BloomTexture;
  uniforms: Record<string, THREE.IUniform>;
  setQuality: (q: { samples: number }) => void;
  /** Compile the post shaders without blocking (KHR_parallel_shader_compile where available). */
  warmAsync: () => Promise<void>;
  /**
   * Compile the scene's shaders without blocking, in the variants this pipeline draws them with
   * (into an HDR target: no tone mapping, linear output), then the post shaders.
   */
  compileAsync: () => Promise<void>;
  /** Draw each material once into a tiny target, waiting for an idle period in between. */
  primeObjects: (wait: () => Promise<unknown>) => Promise<void>;
  /** Draw the scene once into the HDR target (uploads geometry and textures), off screen. */
  prime: () => void;
  /** Run the bloom chain once (links its shaders), off screen. */
  primeBloom: () => void;
  /** The HDR scene target. */
  target: THREE.WebGLRenderTarget;
  dispose: () => void;
};

export function makePipeline(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera, o: PipelineOpts): Pipeline {
  const maxSamples = o.maxSamples ?? 4;
  const rt = new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType, samples: 0 });
  const bloom = new BloomTexture(new THREE.Vector2(256, 256), o.bloom.strength, o.bloom.radius, o.bloom.threshold);
  // A soft knee instead of a hard cut at the threshold: pixels hovering around it (boiling
  // star surfaces, flickering flames, sub-pixel highlights) no longer pop the glow on and off.
  const kq = /[?&]perf\b.*[?&]knee=([\d.]+)|[?&]knee=([\d.]+).*[?&]perf\b/.exec(location.search); // debug A/B
  const knee = kq ? parseFloat(kq[1] ?? kq[2]) : (o.bloom.knee ?? 0);
  bloom.threshold = o.bloom.threshold - knee / 2;
  bloom.hp['smoothWidth'].value = Math.max(0.01, knee);

  const uniforms: Record<string, THREE.IUniform> = {
    tDiffuse: { value: rt.texture },
    tBloom: { value: bloom.texture },
    uRes: { value: new THREE.Vector2(1, 1) },
    toneMappingExposure: { value: renderer.toneMappingExposure },
    ...(o.uniforms ?? {}),
  };
  const material = new THREE.RawShaderMaterial({
    vertexShader: FINAL_VERT,
    fragmentShader: FINAL_HEAD + o.finalFrag,
    uniforms,
    depthTest: false,
    depthWrite: false,
  });
  const quad = new FullScreenQuad(material);

  const size = new THREE.Vector2();
  let w = 0;
  let h = 0;
  let pr = 0;
  const sync = () => {
    renderer.getSize(size);
    const r = renderer.getPixelRatio();
    if (size.x === w && size.y === h && r === pr) return;
    w = size.x;
    h = size.y;
    pr = r;
    const W = Math.max(1, Math.round(w * r));
    const H = Math.max(1, Math.round(h * r));
    rt.setSize(W, H);
    bloom.setSize(W, H);
    uniforms.uRes.value.set(W, H);
  };

  const render = () => {
    sync();
    uniforms.toneMappingExposure.value = renderer.toneMappingExposure;
    uniforms.tBloom.value = bloom.texture;
    renderer.setRenderTarget(rt);
    renderer.render(scene, camera);
    bloom.renderBloom(renderer, rt);
    renderer.setRenderTarget(null);
    // The quad covers every pixel, so skip the clear of the canvas.
    const ac = renderer.autoClear;
    renderer.autoClear = false;
    quad.render(renderer);
    renderer.autoClear = ac;
  };

  const warmAsync = async () => {
    sync();
    const tmp = new THREE.Scene();
    const geo = new THREE.PlaneGeometry(2, 2);
    for (const m of [...bloom.materials(), material]) {
      const mesh = new THREE.Mesh(geo, m);
      mesh.frustumCulled = false;
      tmp.add(mesh);
    }
    await compileSoon(renderer, tmp, camera);
    geo.dispose();
  };

  return {
    render,
    bloom,
    target: rt,
    warmAsync,
    compileAsync: async () => {
      sync();
      const prev = renderer.getRenderTarget();
      renderer.setRenderTarget(rt); // compile() picks its variants from the current target
      const pending = compileSoon(renderer, scene, camera);
      renderer.setRenderTarget(prev);
      await pending;
      await warmAsync();
    },
    primeObjects: async (wait) => {
      // One material at a time into a tiny target: wherever shaders still link on first use
      // (no parallel compile), each link lands in its own idle period instead of one long stall.
      sync();
      const tiny = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType });
      const objs: THREE.Object3D[] = [];
      scene.traverse((o) => {
        const m = o as THREE.Mesh & { isPoints?: boolean; isLine?: boolean; isSprite?: boolean };
        if (m.isMesh || m.isPoints || m.isLine || m.isSprite) objs.push(o);
      });
      const vis = objs.map((o) => o.visible);
      const cull = objs.map((o) => o.frustumCulled);
      const seen = new Set<THREE.Material>();
      const prev = renderer.getRenderTarget();
      for (const o of objs) {
        const mm = (o as THREE.Mesh).material;
        const list = Array.isArray(mm) ? mm : [mm];
        if (list.every((x) => seen.has(x))) continue;
        list.forEach((x) => seen.add(x));
        objs.forEach((x) => (x.visible = x === o));
        o.frustumCulled = false;
        renderer.setRenderTarget(tiny);
        renderer.render(scene, camera);
        renderer.setRenderTarget(prev);
        objs.forEach((x, i) => {
          x.visible = vis[i];
          x.frustumCulled = cull[i];
        });
        await wait();
      }
      tiny.dispose();
    },
    prime: () => {
      // A tiny target: uploads every geometry and texture without the cost of a full frame.
      const tiny = new THREE.WebGLRenderTarget(16, 16, { type: THREE.HalfFloatType });
      const prev = renderer.getRenderTarget();
      renderer.setRenderTarget(tiny);
      renderer.render(scene, camera);
      renderer.setRenderTarget(prev);
      tiny.dispose();
    },
    primeBloom: () => {
      sync();
      const prev = renderer.getRenderTarget();
      bloom.renderBloom(renderer, rt);
      renderer.setRenderTarget(prev);
    },
    uniforms,
    setQuality: (q) => {
      const s = Math.min(maxSamples, q.samples);
      if (s !== rt.samples) {
        rt.samples = s;
        rt.dispose(); // re-allocated with the new sample count on next use
      }
    },
    dispose: () => {
      rt.dispose();
      bloom.dispose();
      material.dispose();
      quad.dispose();
    },
  };
}
