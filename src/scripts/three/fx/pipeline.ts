// Lean HDR post pipeline shared by the homepage journey and the services system.
// scene → one HDR target (MSAA when the quality tier allows) → bloom mips at reduced size
// → ONE full-screen pass that adds the bloom, applies the scene's finishing touches,
// tone maps (ACES) and encodes sRGB straight to the canvas.
// (The old EffectComposer chains used three to four full-resolution passes per frame plus a
// second full-size MSAA target; this keeps one.)
import { THREE } from '../core';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

const BLUR_X = new THREE.Vector2(1, 0);
const BLUR_Y = new THREE.Vector2(0, 1);

/** UnrealBloomPass that leaves its composite in a texture instead of blending it at full size. */
class BloomTexture extends UnrealBloomPass {
  get hp() {
    return this.highPassUniforms as Record<string, THREE.IUniform>;
  }
  scale = 1;
  private w = 2;
  private h = 2;
  get texture() {
    return this.renderTargetsHorizontal[0].texture;
  }
  setSize(w: number, h: number) {
    this.w = w;
    this.h = h;
    const s = this.scale ?? 1;
    super.setSize(Math.max(4, Math.round(w * s)), Math.max(4, Math.round(h * s)));
  }
  setScale(s: number) {
    if (s === this.scale) return;
    this.scale = s;
    this.setSize(this.w, this.h);
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
  setQuality: (q: { samples: number; bloom: number }) => void;
  /** Compile the post shaders now (call during idle so the first real frame does not stall). */
  warm: () => void;
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

  return {
    render,
    bloom,
    uniforms,
    setQuality: (q) => {
      const s = Math.min(maxSamples, q.samples);
      if (s !== rt.samples) {
        rt.samples = s;
        rt.dispose(); // re-allocated with the new sample count on next use
      }
      bloom.setScale(q.bloom);
    },
    warm: () => {
      sync();
      const prev = renderer.getRenderTarget();
      bloom.renderBloom(renderer, rt);
      renderer.setRenderTarget(prev);
      renderer.compile((quad as unknown as { _mesh: THREE.Mesh })._mesh, camera);
    },
    dispose: () => {
      rt.dispose();
      bloom.dispose();
      material.dispose();
      quad.dispose();
    },
  };
}
