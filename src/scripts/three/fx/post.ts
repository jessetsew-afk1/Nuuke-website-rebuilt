// Post-processing for the journey, folded into one full-screen pass after the bloom mips:
// heat haze behind the nozzle, warp zoom blur and chromatic fringing, then a cinematic finish
// (lens flare from the sun, flash, vignette, grain), ACES tone mapping and sRGB output.
// Optional touches (haze, fringing, grain) switch off on the lighter quality tiers.
import { THREE } from '../core';
import { makePipeline, type Pipeline } from './pipeline';
import { SIMPLEX3, HASH } from './noise';

const FINAL_FRAG = /* glsl */ `
${SIMPLEX3}
${HASH}
uniform float uTime;
uniform vec2 uHazeO;    // haze origin in uv
uniform vec2 uHazeDir;  // flame direction in pixels (normalised)
uniform float uHazeLen; // px
uniform float uHazeW;   // px
uniform float uHaze;    // strength
uniform float uWarp;    // 0..1 radial zoom blur
uniform float uAberr;   // chromatic fringe at the edges
uniform vec2 uSun;      // sun position in uv
uniform float uSunVis;  // 0..1
uniform float uFlash;
uniform vec3 uFlashCol;
uniform float uVignette;
uniform float uGrain;
float disc(vec2 p, vec2 c, float r, float soft) { return 1.0 - smoothstep(r * (1.0 - soft), r, length(p - c)); }
void main() {
  vec2 uv = vUv;
  if (uHaze > 0.001) {
    vec2 rel = uv * uRes - uHazeO * uRes;
    float along = dot(rel, uHazeDir);
    float across = dot(rel, vec2(-uHazeDir.y, uHazeDir.x));
    float L = max(uHazeLen, 1.0);
    float wid = uHazeW * (0.6 + 1.6 * clamp(along / L, 0.0, 1.0));
    float m = smoothstep(-0.05 * L, 0.12 * L, along) * (1.0 - smoothstep(0.55 * L, L, along)) * exp(-pow(across / max(wid, 1.0), 2.0));
    if (m * uHaze > 0.001) {
      vec2 q = rel / 38.0;
      float n1 = snoise(vec3(q.x, q.y - uTime * 4.0, uTime * 0.6));
      float n2 = snoise(vec3(q.x + 7.3, q.y - uTime * 3.2, uTime * 0.7));
      uv += vec2(n1, n2) * m * uHaze * 6.0 / uRes;
    }
  }
  vec2 c = uv - 0.5;
  float r2 = dot(c, c);
  vec3 col;
  if (uWarp > 0.001) {
    vec3 acc = vec3(0.0);
    float wsum = 0.0;
    for (int i = 0; i < 10; i++) {
      float k = float(i) / 9.0;
      vec2 suv = 0.5 + c * (1.0 - k * uWarp * 0.12 * (0.3 + r2 * 3.0));
      float w = 1.0 - k * 0.6;
      acc += hdr(suv) * w;
      wsum += w;
    }
    col = acc / wsum;
  } else {
    col = hdr(uv);
  }
  float ab = uAberr * r2;
  if (ab > 0.00005) {
    col.r = mix(col.r, hdr(uv + c * ab).r, 0.9);
    col.b = mix(col.b, hdr(uv - c * ab).b, 0.9);
  }
  float asp = uRes.x / uRes.y;
  if (uSunVis > 0.001) {
    vec2 p = vec2(vUv.x * asp, vUv.y);
    vec2 s = vec2(uSun.x * asp, uSun.y);
    vec2 ctr = vec2(0.5 * asp, 0.5);
    vec2 axis = ctr - s;
    vec3 fl = vec3(0.0);
    fl += vec3(0.35, 0.55, 1.0) * disc(p, s + axis * 0.55, 0.035, 0.6) * 0.18;
    fl += vec3(1.0, 0.45, 0.75) * disc(p, s + axis * 0.85, 0.07, 0.7) * 0.1;
    fl += vec3(0.6, 1.0, 0.7) * disc(p, s + axis * 1.25, 0.02, 0.5) * 0.25;
    fl += vec3(0.45, 0.6, 1.0) * disc(p, s + axis * 1.55, 0.12, 0.85) * 0.07;
    float ring = disc(p, s + axis * 1.9, 0.2, 0.15) - disc(p, s + axis * 1.9, 0.19, 0.3);
    fl += vec3(0.9, 0.6, 1.0) * max(ring, 0.0) * 0.06;
    // anamorphic streak through the sun
    vec2 d = p - s;
    fl += vec3(0.45, 0.6, 1.2) * exp(-abs(d.y) * 260.0) * exp(-abs(d.x) * 2.2) * 0.5;
    fl += vec3(1.3, 1.1, 0.9) * exp(-length(d) * 22.0) * 0.4;
    col += fl * uSunVis;
  }
  col = mix(col, uFlashCol, clamp(uFlash, 0.0, 1.0));
  vec2 cv = vUv - 0.5;
  float v = 1.0 - smoothstep(0.35, 0.95, length(cv * vec2(asp * 0.75, 1.0))) * uVignette;
  col *= v;
  if (uGrain > 0.0) col += (hash12(vUv * uRes + fract(uTime) * 100.0) - 0.5) * uGrain;
  gl_FragColor = vec4(display(col), 1.0);
}`;

export type Post = Pipeline & { u: Record<string, THREE.IUniform> };

export function makePost(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera, lite: boolean): Post {
  const pipe = makePipeline(renderer, scene, camera, {
    bloom: { strength: 0.5, radius: 0.42, threshold: 1.0, knee: 0.4 },
    maxSamples: lite ? 0 : 4,
    finalFrag: FINAL_FRAG,
    uniforms: {
      uTime: { value: 0 },
      uHazeO: { value: new THREE.Vector2(0.5, 0.5) },
      uHazeDir: { value: new THREE.Vector2(0, -1) },
      uHazeLen: { value: 200 },
      uHazeW: { value: 30 },
      uHaze: { value: 0 },
      uWarp: { value: 0 },
      uAberr: { value: 0 },
      uSun: { value: new THREE.Vector2(0.9, 0.9) },
      uSunVis: { value: 0 },
      uFlash: { value: 0 },
      uFlashCol: { value: new THREE.Color(1, 1, 1) },
      uVignette: { value: 0.55 },
      uGrain: { value: 0.012 },
    },
  });
  return { ...pipe, u: pipe.uniforms };
}
