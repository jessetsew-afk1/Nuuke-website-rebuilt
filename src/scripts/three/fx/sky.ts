// Backdrop for the journey: a sky dome that goes from dusk to deep space (with a nebula and a
// sun), a star field that stretches into streaks at speed (scroll or warp), and near-camera
// dust with a soft depth-of-field look for parallax "presence".
import { THREE } from '../core';
import { SIMPLEX3, HASH } from './noise';

/**
 * Projection used by the backdrop only (dome, stars, dust). The warp jump widens this one
 * while the real camera stays at its normal field of view, so the jump stretches space
 * around the rocket without moving or resizing the rocket itself.
 */
export const backdropProj = { value: new THREE.Matrix4() };

const DOME_VERT = /* glsl */ `
uniform mat4 uProj;
varying vec3 vDir;
void main() {
  vDir = position;
  vec4 p = uProj * modelViewMatrix * vec4(position, 1.0);
  gl_Position = p.xyww;
}`;
// The deep-space nebula is eight octaves of 3D noise per pixel: far too much work to repeat
// for every pixel of every frame on everyday GPUs. It is baked once into an equirectangular
// texture (stored as sqrt for smooth gradients in 8 bits) and the dome just samples it.
const NEBULA_BAKE = /* glsl */ `
${SIMPLEX3}
varying vec2 vUv;
void main() {
  float lon = (vUv.x - 0.5) * 6.28318530718;
  float lat = (vUv.y - 0.5) * 3.14159265359;
  vec3 d = vec3(cos(lat) * cos(lon), sin(lat), cos(lat) * sin(lon));
  vec3 sp = vec3(0.004, 0.004, 0.01);
  float n1 = fbm5(d * 2.2);
  float n2 = fbm3(d * 5.0 + 3.1);
  float band = exp(-pow(dot(d, normalize(vec3(0.3, 0.8, -0.5))) * 2.6, 2.0));
  float neb = smoothstep(-0.15, 0.6, n1) * (0.35 + band * 0.9);
  sp += vec3(0.16, 0.035, 0.12) * neb * neb * 0.55;
  sp += vec3(0.04, 0.07, 0.2) * smoothstep(0.0, 0.7, n2) * band * 0.35;
  sp += vec3(0.26, 0.05, 0.16) * pow(max(n1 * n2, 0.0), 1.5) * band * 0.6;
  gl_FragColor = vec4(sqrt(clamp(sp, 0.0, 1.0)), 1.0);
}`;

const DOME_FRAG = /* glsl */ `
${HASH}
uniform float uAlt;      // 0 = ground at dusk, 1 = space
uniform vec3 uSunDir;
uniform float uSunBoost;
uniform float uTime;
uniform float uFlash;
uniform sampler2D tNebula;
varying vec3 vDir;
void main() {
  vec3 d = normalize(vDir);
  float e = d.y;
  float s = max(dot(d, normalize(uSunDir)), 0.0);
  float spaceK = smoothstep(0.55, 1.0, uAlt);
  vec3 atm = vec3(0.0);
  if (spaceK < 1.0) {
    // Dusk atmosphere
    vec3 zenith = vec3(0.005, 0.01, 0.035);
    vec3 mid = vec3(0.022, 0.05, 0.14);
    vec3 glowBand = vec3(0.32, 0.2, 0.3);
    vec3 hor = vec3(0.85, 0.34, 0.12);
    vec3 ground = vec3(0.012, 0.011, 0.016);
    atm = mix(hor, glowBand, smoothstep(0.0, 0.07, e));
    atm = mix(atm, mid, smoothstep(0.05, 0.3, e));
    atm = mix(atm, zenith, smoothstep(0.3, 0.9, e));
    float haze = exp(-abs(e) * 30.0);
    atm = e < 0.0 ? mix(ground, hor * 0.45, haze) : atm;
    atm += vec3(1.0, 0.42, 0.15) * (pow(s, 6.0) * 0.35 + pow(s, 60.0) * 0.5) * (1.0 - smoothstep(0.0, 0.35, e));
    atm += vec3(2.4, 1.2, 0.55) * pow(s, 1400.0) * 2.5;
    // As we climb, the sky thins to violet then black
    vec3 thin = mix(vec3(0.02, 0.02, 0.07), vec3(0.08, 0.05, 0.18), exp(-abs(e - 0.0) * 6.0));
    atm = mix(atm, thin, smoothstep(0.35, 0.8, uAlt));
  }
  vec3 sp = vec3(0.0);
  if (spaceK > 0.0) {
    // Deep space with a nebula (baked), and the sun: white core, a soft warm halo
    vec2 uv = vec2(atan(d.z, d.x) / 6.28318530718 + 0.5, asin(clamp(e, -1.0, 1.0)) / 3.14159265359 + 0.5);
    vec3 nb = texture2D(tNebula, uv).rgb;
    sp = nb * nb;
    sp += (vec3(1.6, 1.45, 1.3) * pow(s, 2400.0) * 9.0 + vec3(1.6, 1.25, 0.9) * pow(s, 120.0) * 0.1 + vec3(1.5, 1.05, 0.7) * pow(s, 14.0) * 0.007) * uSunBoost;
  }
  vec3 c = mix(atm, sp, spaceK);
  c += vec3(1.0) * uFlash;
  c += (hash12(gl_FragCoord.xy + uTime) - 0.5) / 255.0;
  gl_FragColor = vec4(c, 1.0);
}`;

export function makeDome(renderer: THREE.WebGLRenderer) {
  // Bake the nebula once (2048 x 1024, no mipmaps so the longitude seam stays invisible), in
  // strips: bakeStrip(px) draws about px pixels and returns true once the whole map is done.
  const nebula = new THREE.WebGLRenderTarget(2048, 1024, { depthBuffer: false, generateMipmaps: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, wrapS: THREE.RepeatWrapping });
  const bakeMat = new THREE.ShaderMaterial({
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: NEBULA_BAKE,
    depthTest: false,
    depthWrite: false,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bakeMat);
  quad.frustumCulled = false;
  const bakeScene = new THREE.Scene().add(quad);
  const bakeCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  let row = 0;
  const bakeStrip = (px: number) => {
    if (row >= nebula.height) return true;
    const rows = Math.max(8, Math.min(nebula.height - row, Math.floor(px / nebula.width)));
    nebula.scissor.set(0, row, nebula.width, rows);
    nebula.scissorTest = true;
    const prev = renderer.getRenderTarget();
    const ac = renderer.autoClear;
    renderer.autoClear = false;
    renderer.setRenderTarget(nebula);
    renderer.render(bakeScene, bakeCam);
    renderer.setRenderTarget(prev);
    renderer.autoClear = ac;
    nebula.scissorTest = false;
    row += rows;
    if (row >= nebula.height) {
      bakeMat.dispose();
      quad.geometry.dispose();
      return true;
    }
    return false;
  };

  const mat = new THREE.ShaderMaterial({
    vertexShader: DOME_VERT,
    fragmentShader: DOME_FRAG,
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: false,
    uniforms: {
      uAlt: { value: 0 },
      uSunDir: { value: new THREE.Vector3(-0.5, 0.06, -1).normalize() },
      uSunBoost: { value: 1 },
      uTime: { value: 0 },
      uFlash: { value: 0 },
      tNebula: { value: nebula.texture },
      uProj: backdropProj,
    },
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(10, 48, 24), mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = -100;
  return { mesh, mat, bakeStrip, dispose: () => (nebula.dispose(), mat.dispose(), mesh.geometry.dispose()) };
}

// ---------- Stars: wrap in a box around the camera, streak along their motion ----------
const STAR_VERT = /* glsl */ `
attribute vec3 iPos;
attribute vec3 iData; // size, brightness, seed
uniform mat4 uProj;
uniform vec3 uOffset;
uniform vec3 uVel;
uniform float uStreak;
uniform vec2 uRes;
uniform float uPx;
uniform float uTime;
uniform float uBoost;
varying vec2 vUv;
varying float vB;
varying float vSeed;
varying float vLen;
void main() {
  vec3 p = mod(iPos + uOffset + 80.0, 160.0) - 80.0;
  float dist = length(p);
  vec3 wp = p + cameraPosition;
  mat4 vp = uProj * viewMatrix;
  vec4 h = vp * vec4(wp, 1.0);
  vec4 t = vp * vec4(wp - uVel * uStreak, 1.0);
  if (h.w <= 0.0) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
  if (t.w <= 0.05) t = h;
  vec2 dir = (h.xy / h.w - t.xy / t.w) * uRes * 0.5;
  float len = length(dir);
  vLen = len;
  dir = len > 0.001 ? dir / len : vec2(0.0, 1.0);
  vec2 nrm = vec2(-dir.y, dir.x);
  float along = position.y + 0.5;
  vec4 q = mix(t, h, along);
  float w = uPx * iData.x;
  q.xy += (nrm * position.x * w + dir * position.y * w) / uRes * 2.0 * q.w;
  gl_Position = q;
  vUv = position.xy + 0.5;
  float tw = 0.7 + 0.3 * sin(uTime * (0.7 + iData.z * 2.3) + iData.z * 50.0);
  vB = iData.y * tw * smoothstep(14.0, 34.0, dist) * (1.0 / (1.0 + len * 0.004)) * (1.0 + uBoost);
  vSeed = iData.z;
}`;
const STAR_FRAG = /* glsl */ `
uniform float uAlpha;
varying vec2 vUv;
varying float vB;
varying float vSeed;
varying float vLen;
void main() {
  vec2 c = vUv - 0.5;
  float across = 1.0 - smoothstep(0.0, 0.5, abs(c.x));
  float dot0 = 1.0 - smoothstep(0.0, 0.5, length(c));
  float a = mix(dot0, across * smoothstep(0.0, 0.3, vUv.y), smoothstep(0.5, 4.0, vLen));
  vec3 tint = vSeed < 0.2 ? vec3(0.75, 0.85, 1.25) : vSeed > 0.85 ? vec3(1.25, 0.95, 0.75) : vec3(1.0);
  gl_FragColor = vec4(tint * a * vB * uAlpha * 1.6, 1.0);
}`;

export function makeStars(count: number) {
  const g = new THREE.InstancedBufferGeometry();
  const quad = new THREE.PlaneGeometry(1, 1);
  g.index = quad.index;
  g.setAttribute('position', quad.attributes.position);
  const pos = new Float32Array(count * 3);
  const data = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 160;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 160;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 160;
    const big = Math.random();
    data[i * 3] = 1 + Math.pow(big, 6) * 2.4;
    data[i * 3 + 1] = 0.25 + Math.pow(Math.random(), 2.2) * 1.3 + (big > 0.97 ? 1.2 : 0);
    data[i * 3 + 2] = Math.random();
  }
  g.setAttribute('iPos', new THREE.InstancedBufferAttribute(pos, 3));
  g.setAttribute('iData', new THREE.InstancedBufferAttribute(data, 3));
  g.instanceCount = count;
  const mat = new THREE.ShaderMaterial({
    vertexShader: STAR_VERT,
    fragmentShader: STAR_FRAG,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uOffset: { value: new THREE.Vector3() },
      uVel: { value: new THREE.Vector3() },
      uStreak: { value: 0.06 },
      uRes: { value: new THREE.Vector2(1, 1) },
      uPx: { value: 2 },
      uTime: { value: 0 },
      uAlpha: { value: 0 },
      uBoost: { value: 0 },
      uProj: backdropProj,
    },
  });
  const mesh = new THREE.Mesh(g, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = -50;
  return { mesh, mat, dispose: () => (g.dispose(), mat.dispose()) };
}

// ---------- Near dust: soft bokeh discs between the camera and the rocket ----------
const DUST_VERT = /* glsl */ `
attribute vec3 iPos;
attribute vec2 iData; // size, seed
uniform mat4 uProj;
uniform vec3 uOffset;
uniform vec3 uBox;
uniform vec3 uCenter;
uniform float uFocus;
uniform float uTime;
varying vec2 vUv;
varying float vA;
varying float vBlur;
void main() {
  vec3 p = mod(iPos + uOffset + uBox * 0.5, uBox) - uBox * 0.5 + uCenter;
  p.x += sin(uTime * 0.3 + iData.y * 20.0) * 0.08;
  vec4 mv = viewMatrix * vec4(p, 1.0);
  float depth = -mv.z;
  float blur = clamp(abs(depth - uFocus) / max(depth, 0.5) * 2.4, 0.0, 3.0);
  float size = iData.x * (0.025 + blur * 0.08);
  mv.xy += position.xy * size;
  gl_Position = uProj * mv;
  vUv = position.xy + 0.5;
  vBlur = blur;
  vA = smoothstep(0.8, 2.5, depth) * (1.0 - smoothstep(uFocus * 1.2, uFocus * 1.9, depth)) / (1.0 + blur * blur * 6.0) * 0.55;
}`;
const DUST_FRAG = /* glsl */ `
uniform float uAlpha;
varying vec2 vUv;
varying float vA;
varying float vBlur;
void main() {
  float d = length(vUv - 0.5) * 2.0;
  float disc = 1.0 - smoothstep(0.75 - vBlur * 0.15, 1.0, d);
  float rim = smoothstep(0.55, 0.9, d) * (1.0 - smoothstep(0.9, 1.0, d)) * min(vBlur, 1.0) * 0.5;
  float a = (disc * (0.6 + 0.4 * (1.0 - d)) + rim) * vA * uAlpha;
  gl_FragColor = vec4(vec3(1.0, 0.86, 0.92) * a, 1.0);
}`;

export function makeDust(count: number) {
  const g = new THREE.InstancedBufferGeometry();
  const quad = new THREE.PlaneGeometry(1, 1);
  g.index = quad.index;
  g.setAttribute('position', quad.attributes.position);
  const pos = new Float32Array(count * 3);
  const data = new Float32Array(count * 2);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = Math.random() * 16;
    pos[i * 3 + 1] = Math.random() * 12;
    pos[i * 3 + 2] = Math.random() * 11;
    data[i * 2] = 0.5 + Math.random();
    data[i * 2 + 1] = Math.random();
  }
  g.setAttribute('iPos', new THREE.InstancedBufferAttribute(pos, 3));
  g.setAttribute('iData', new THREE.InstancedBufferAttribute(data, 2));
  g.instanceCount = count;
  const mat = new THREE.ShaderMaterial({
    vertexShader: DUST_VERT,
    fragmentShader: DUST_FRAG,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uOffset: { value: new THREE.Vector3() },
      uBox: { value: new THREE.Vector3(16, 12, 11) },
      uCenter: { value: new THREE.Vector3(0, 0, 5.5) },
      uFocus: { value: 12 },
      uTime: { value: 0 },
      uProj: backdropProj,
      uAlpha: { value: 0 },
    },
  });
  const mesh = new THREE.Mesh(g, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = 20;
  return { mesh, mat, dispose: () => (g.dispose(), mat.dispose()) };
}
