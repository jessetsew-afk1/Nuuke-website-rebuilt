// The four service worlds. Each surface is baked once on the GPU (albedo, ocean mask,
// slope/normal detail, night lights and clouds), then lit per pixel with a real
// terminator, ocean glints, a separately drifting cloud deck and a fresnel atmosphere.
import { THREE, makePhone, svgTexture } from '../core';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Baker } from './bake';
import { OUT, RING, SPHERE } from './glsl';

export type Quality = { phone: boolean; tex: number; seg: number; particles: number };

export type World = {
  /** Positioned in the system; its world position is the planet centre. */
  group: THREE.Group;
  radius: number;
  /** How far (in radii) the camera sits at this world's stop, and the sun phase angle there. */
  frame: { dist: number; phase: number; lift: number };
  update: (t: number, dt: number, cam: THREE.Camera) => void;
};

export const SUN_COLOR = new THREE.Color(1.0, 0.94, 0.88).multiplyScalar(1.55);

// ---------------------------------------------------------------- surface bakes

const BAKE_HEAD = /* glsl */ `
uniform float uPass;
uniform vec3 uSeed;
uniform vec3 uAccent;
uniform float uEps;
uniform float uBumpK;
`;
const BAKE_MAIN = /* glsl */ `
float height(vec3 p);
float relief(float h);
void surface(vec3 p, float h, out vec3 alb, out float spec, out float night, out float cloud);
void main() {
  vec3 p = uvToDir(vUv);
  float h = height(p);
  vec3 alb; float spec; float night; float cloud;
  surface(p, h, alb, spec, night, cloud);
  if (uPass < 0.5) {
    gl_FragColor = vec4(pow(clamp(alb, 0.0, 1.0), vec3(1.0 / 2.2)), clamp(spec, 0.0, 1.0));
  } else {
    vec3 e = eastOf(p);
    vec3 n = cross(p, e);
    float r0 = relief(h);
    float he = relief(height(normalize(p + e * uEps)));
    float hn = relief(height(normalize(p + n * uEps)));
    vec2 s = vec2(he - r0, hn - r0) / uEps * uBumpK;
    gl_FragColor = vec4(clamp(0.5 + 0.5 * s, 0.0, 1.0), clamp(night, 0.0, 1.0), clamp(cloud, 0.0, 1.0));
  }
}`;

/** Mobile: a living ocean world, rose deserts, ice caps, city lights along the coasts. */
const TERRA = /* glsl */ `
vec3 warpv(vec3 q) { return vec3(fbm(q + 3.1, 4), fbm(q + 7.7, 4), fbm(q + 1.9, 4)); }
float height(vec3 p) {
  vec3 q = p * 1.15 + uSeed;
  vec3 w = warpv(q * 1.4);
  float c = fbm(q + w * 0.6, 7);
  float land = smoothstep(-0.02, 0.2, c);
  float m = ridged(q * 3.2 + w * 0.8, 6);
  return c + land * m * 0.38;
}
float relief(float h) { return max(h, 0.085); }
void surface(vec3 p, float h, out vec3 alb, out float spec, out float night, out float cloud) {
  float sea = 0.085;
  float lat = abs(p.y);
  vec3 q = p * 1.15 + uSeed;
  float e = h - sea;
  if (e < 0.0) {
    float d = smoothstep(0.0, 0.3, -e);
    alb = mix(vec3(0.05, 0.19, 0.26), vec3(0.008, 0.035, 0.085), d);
    alb = mix(alb, vec3(0.03, 0.06, 0.1), smoothstep(0.5, 0.9, lat));
    spec = 1.0;
  } else {
    float moist = fbm(q * 2.6 + 11.0, 5);
    float dry = 1.0 - smoothstep(0.0, 0.5, abs(lat - 0.3));
    vec3 desert = mix(vec3(0.66, 0.46, 0.33), vec3(0.6, 0.32, 0.3), fbm(q * 5.0, 3) * 0.5 + 0.5);
    vec3 green = mix(vec3(0.07, 0.13, 0.06), vec3(0.18, 0.21, 0.1), fbm(q * 7.0, 3) * 0.5 + 0.5);
    float lush = smoothstep(-0.05, 0.25, moist - dry * 0.3);
    vec3 c = mix(desert, green, lush);
    c = mix(c, vec3(0.32, 0.28, 0.26), smoothstep(0.22, 0.42, e));
    c = mix(c, vec3(0.93, 0.93, 0.96), smoothstep(0.5, 0.6, e + lat * 0.25));
    c = mix(c, vec3(0.74, 0.65, 0.52), 1.0 - smoothstep(0.0, 0.012, e));
    c *= 0.86 + 0.28 * (fbm(q * 26.0, 3) * 0.5 + 0.5);
    alb = c;
    spec = 0.03;
  }
  float ice = smoothstep(0.8, 0.86, lat + fbm(q * 4.0, 4) * 0.08);
  alb = mix(alb, vec3(0.88, 0.92, 0.97), ice);
  spec *= 1.0 - ice;
  float landM = smoothstep(0.0, 0.01, e);
  float coast = 1.0 - smoothstep(0.0, 0.14, e);
  float region = smoothstep(-0.05, 0.3, fbm(q * 3.0 + 41.0, 4));
  float pts = smoothstep(0.74, 0.95, snoise(q * 95.0) * 0.5 + 0.5);
  float sprawl = smoothstep(0.62, 0.9, fbm(q * 24.0 + 5.0, 3) * 0.5 + 0.5);
  night = landM * (1.0 - ice) * region * (0.15 + 0.85 * coast * coast) * (pts * 0.9 + sprawl * 0.5);
  vec3 cq = q * 1.05 + 50.0;
  vec3 cw = warpv(cq * 0.8);
  float cl = fbm(vec3(cq.x, cq.y * 1.7, cq.z) + cw * 1.5, 7);
  float streak = fbm(vec3(cq.x * 0.6, cq.y * 7.0, cq.z * 0.6) + cw, 4);
  cloud = smoothstep(0.12, 0.55, cl + streak * 0.2);
  cloud *= 0.6 + 0.4 * smoothstep(0.05, 0.35, lat);
}`;

/** Animation: an amber gas giant with turbulent belts, a great storm and lightning on the night side. */
const GIANT = /* glsl */ `
float height(vec3 p) { return fbm(vec3(p.x * 3.0, p.y * 16.0, p.z * 3.0) + uSeed, 4) * 0.04; }
float relief(float h) { return h; }
void surface(vec3 p, float h, out vec3 alb, out float spec, out float night, out float cloud) {
  vec3 q = p + uSeed;
  float turb = fbm(vec3(q.x * 2.2, q.y * 7.0, q.z * 2.2), 6);
  vec3 w = vec3(fbm(q * 3.0 + 1.0, 4), fbm(q * 3.0 + 5.0, 4), fbm(q * 3.0 + 9.0, 4));
  float t = p.y * 5.2 + turb * 0.5 + fbm(q * 5.0 + w * 1.6, 5) * 0.2;
  float b = 0.5 + 0.5 * sin(t * 3.0 + sin(t * 1.3) * 1.6);
  vec3 brown = vec3(0.26, 0.13, 0.07), rust = vec3(0.6, 0.29, 0.12), amber = vec3(0.86, 0.52, 0.2), cream = vec3(0.9, 0.8, 0.64);
  vec3 c = mix(brown, rust, smoothstep(0.0, 0.35, b));
  c = mix(c, amber, smoothstep(0.3, 0.62, b));
  c = mix(c, cream, smoothstep(0.62, 0.95, b));
  float fine = fbm(vec3(q.x * 9.0, q.y * 70.0, q.z * 9.0) + w * 0.8, 5);
  c *= 0.84 + 0.32 * (fine * 0.5 + 0.5);
  c = mix(c, vec3(0.32, 0.24, 0.2), smoothstep(0.72, 0.97, abs(p.y)) * 0.7);
  // the great storm
  vec3 s = normalize(vec3(0.62, -0.34, 0.7));
  vec3 se = eastOf(s);
  vec3 sn = cross(s, se);
  vec3 v = p - s;
  vec2 sp = vec2(dot(v, se) / 0.3, dot(v, sn) / 0.16);
  float r = length(sp);
  float sw = (1.0 - smoothstep(0.0, 1.4, r)) * 4.5;
  vec2 rp = mat2(cos(sw), -sin(sw), sin(sw), cos(sw)) * sp;
  float sN = fbm(vec3(rp * 2.6, 3.0), 5);
  float sM = 1.0 - smoothstep(0.82, 1.08, r);
  vec3 sc = mix(vec3(0.66, 0.24, 0.09), vec3(0.95, 0.6, 0.34), sN * 0.5 + 0.5);
  sc = mix(sc, vec3(0.97, 0.9, 0.8), smoothstep(0.62, 0.92, r));
  c = mix(c, sc, sM);
  // a chain of small white ovals in the southern belt
  vec3 wv = worley(vec3(q.x * 5.0, q.y * 2.0, q.z * 5.0) + 7.0);
  float ov = (1.0 - smoothstep(0.1, 0.2, wv.x)) * step(0.55, wv.z) * (1.0 - smoothstep(0.0, 0.06, abs(p.y + 0.6)));
  c = mix(c, vec3(0.97, 0.94, 0.88), ov * 0.85);
  alb = c;
  spec = 0.0;
  float storms = smoothstep(0.7, 0.95, snoise(q * 34.0) * 0.5 + 0.5) * (1.0 - smoothstep(0.3, 0.7, b));
  night = storms;
  cloud = 0.0;
}`;

/** Marketing: an ice world laced with glowing cracks, open teal seas and thin haze. */
const ICE = /* glsl */ `
float lin(vec3 x) { return 1.0 - abs(snoise(x)); }
float relief(float h) { return h; }
void iceF(vec3 p, out float base, out float a, out float b, out float c) {
  vec3 q = p + uSeed;
  vec3 w = vec3(fbm(q * 2.0 + 1.0, 3), fbm(q * 2.0 + 4.0, 3), fbm(q * 2.0 + 8.0, 3)) * 0.35;
  base = fbm(q * 2.0, 6);
  a = lin(q * 2.2 + w);
  b = lin(q * 5.3 + w * 1.5 + 3.0);
  c = lin(q * 12.0 + w * 2.0 + 7.0);
}
float height(vec3 p) {
  float base, a, b, c;
  iceF(p, base, a, b, c);
  return base * 0.07 + pow(a, 34.0) * 0.06 + pow(b, 36.0) * 0.04 + pow(c, 40.0) * 0.025 - pow(a, 10.0) * 0.02 - pow(b, 12.0) * 0.012;
}
void surface(vec3 p, float h, out vec3 alb, out float spec, out float night, out float cloud) {
  vec3 q = p + uSeed;
  float base, a, b, c;
  iceF(p, base, a, b, c);
  vec3 ic = mix(vec3(0.9, 0.95, 0.97), vec3(0.68, 0.82, 0.86), smoothstep(-0.25, 0.45, fbm(q * 3.0, 4)));
  float chaos = smoothstep(0.16, 0.36, fbm(q * 1.5 + 20.0, 5));
  ic = mix(ic, vec3(0.66, 0.68, 0.68) * (0.85 + 0.3 * (fbm(q * 22.0, 3) * 0.5 + 0.5)), chaos * 0.45);
  float la = pow(a, 16.0), lb = pow(b, 20.0), lc = pow(c, 24.0);
  ic = mix(ic, vec3(0.5, 0.38, 0.31), clamp(la * 0.8 + lb * 0.55 + lc * 0.35, 0.0, 1.0));
  float seaN = fbm(q * 1.2 + 70.0, 5);
  float sea = smoothstep(0.3, 0.32, seaN);
  alb = mix(ic, vec3(0.008, 0.07, 0.08), sea);
  alb *= 0.93 + 0.14 * (fbm(q * 40.0, 2) * 0.5 + 0.5);
  spec = mix(0.12, 1.0, sea);
  float shore = smoothstep(0.27, 0.3, seaN) * (1.0 - sea);
  float region = smoothstep(0.0, 0.3, fbm(q * 2.5 + 3.0, 3));
  float hubs = smoothstep(0.8, 0.95, snoise(q * 70.0) * 0.5 + 0.5) * smoothstep(0.5, 0.9, a);
  night = (pow(a, 40.0) * 0.9 + pow(b, 50.0) * 0.4) * region + shore * 0.35 + hubs * 1.2;
  cloud = smoothstep(0.25, 0.75, fbm(vec3(q.x * 1.6, q.y * 3.4, q.z * 1.6) + 30.0, 6)) * 0.5;
}`;

/** AI: an obsidian world with a neural lattice glowing through cracks, under violet cloud. */
const NEURAL = /* glsl */ `
float relief(float h) { return h; }
void nF(vec3 p, out vec3 v1, out vec3 v2) {
  vec3 q = p + uSeed;
  vec3 wq = q + vec3(fbm(q * 2.0, 3), fbm(q * 2.0 + 5.0, 3), fbm(q * 2.0 + 9.0, 3)) * 0.16;
  v1 = worley(wq * 3.6);
  v2 = worley(wq * 9.5 + 4.0);
}
float height(vec3 p) {
  vec3 v1, v2;
  nF(p, v1, v2);
  float vein1 = 1.0 - smoothstep(0.0, 0.08, v1.y - v1.x);
  float vein2 = 1.0 - smoothstep(0.0, 0.06, v2.y - v2.x);
  return fbm((p + uSeed) * 3.0, 6) * 0.22 - vein1 * 0.05 - vein2 * 0.025;
}
void surface(vec3 p, float h, out vec3 alb, out float spec, out float night, out float cloud) {
  vec3 q = p + uSeed;
  vec3 v1, v2;
  nF(p, v1, v2);
  float vein1 = 1.0 - smoothstep(0.0, 0.022, v1.y - v1.x);
  float vein2 = 1.0 - smoothstep(0.0, 0.016, v2.y - v2.x);
  float halo1 = 1.0 - smoothstep(0.0, 0.09, v1.y - v1.x);
  float node = 1.0 - smoothstep(0.015, 0.06, v1.x);
  vec3 c = mix(vec3(0.03, 0.027, 0.036), vec3(0.15, 0.14, 0.16), smoothstep(-0.3, 0.45, fbm(q * 4.0, 5)));
  c *= 0.82 + 0.36 * (fbm(q * 30.0, 3) * 0.5 + 0.5);
  c = mix(c, uAccent * 0.18, halo1 * 0.35);
  alb = c;
  spec = 0.5 * (1.0 - vein1);
  night = vein1 * 0.7 + halo1 * 0.12 + vein2 * 0.35 * step(0.45, v2.z) + node * step(0.6, v1.z);
  vec3 cq = q * 1.4 + 20.0;
  vec3 cw = vec3(fbm(cq, 4), fbm(cq + 3.0, 4), fbm(cq + 6.0, 4));
  cloud = smoothstep(0.02, 0.6, fbm(vec3(cq.x, cq.y * 2.2, cq.z) + cw * 1.3, 6)) * 0.85;
}`;

// ---------------------------------------------------------------- per-frame shaders

const PLANET_VERT = /* glsl */ `
${SPHERE}
varying vec2 vUv;
varying vec3 vW;
varying vec3 vN;
varying vec3 vE;
varying vec3 vNo;
varying vec3 vP;
void main() {
  vUv = uv;
  vec3 p = normalize(position);
  vP = p;
  vec3 e = eastOf(p);
  mat3 m = mat3(modelMatrix);
  vN = normalize(m * p);
  vE = normalize(m * e);
  vNo = normalize(m * cross(p, e));
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const PLANET_FRAG = /* glsl */ `
${RING}
uniform sampler2D mapA;
uniform sampler2D mapB;
uniform vec3 uSun;
uniform vec3 uSunCol;
uniform vec3 uAtmo;
uniform vec3 uNight;
uniform float uTime;
uniform float uCloudU;
uniform float uBump;
uniform float uNightK;
uniform float uAtmoK;
uniform vec3 uCenter;
uniform vec3 uRingN;
uniform float uRingIn;
uniform float uRingOut;
varying vec2 vUv;
varying vec3 vW;
varying vec3 vN;
varying vec3 vE;
varying vec3 vNo;
varying vec3 vP;
void main() {
  vec2 uv = vUv;
  vec4 A;
#ifdef FLOW
  float sp = (sin(uv.y * 41.0) * 0.6 + sin(uv.y * 17.0 + 1.0) * 0.4) * 0.02;
  float ph0 = fract(uTime * 0.025);
  float ph1 = fract(uTime * 0.025 + 0.5);
  float w0 = 1.0 - abs(ph0 * 2.0 - 1.0);
  A = texture2D(mapA, uv + vec2(sp * ph0, 0.0)) * w0 + texture2D(mapA, uv + vec2(sp * ph1, 0.0)) * (1.0 - w0);
#else
  A = texture2D(mapA, uv);
#endif
  vec4 B = texture2D(mapB, uv);
  vec3 alb = pow(A.rgb, vec3(2.2));
  vec2 sl = (B.rg * 2.0 - 1.0) * uBump;
  vec3 Ng = normalize(vN);
  vec3 N = normalize(Ng - sl.x * normalize(vE) - sl.y * normalize(vNo));
  vec3 L = normalize(uSun - vW);
  vec3 V = normalize(cameraPosition - vW);
  float ndlG = dot(Ng, L);
  float ndl = dot(N, L);
  float dayMask = smoothstep(-0.06, 0.1, ndlG);
  vec3 sunT = mix(vec3(1.0, 0.42, 0.22), vec3(1.0), smoothstep(0.0, 0.32, ndlG));
  vec3 light = uSunCol * sunT * clamp(ndl, 0.0, 1.0) * dayMask;
  float cloudHere = 0.0;
#ifdef CLOUDS
  cloudHere = texture2D(mapB, uv + vec2(uCloudU, 0.0)).a;
  float cs = texture2D(mapB, uv + vec2(uCloudU + 0.006, -0.003)).a;
  light *= 1.0 - 0.55 * cs;
#endif
#ifdef RINGED
  float dn = dot(L, uRingN);
  if (abs(dn) > 1e-4) {
    float tt = dot(uCenter - vW, uRingN) / dn;
    if (tt > 0.0) {
      float r = length(vW + L * tt - uCenter);
      light *= 1.0 - 0.8 * ringDensity((r - uRingIn) / (uRingOut - uRingIn));
    }
  }
#endif
  vec3 col = alb * (light + vec3(0.006, 0.006, 0.009));
  // sun glint on water and glassy ground
  vec3 H = normalize(L + V);
  float nh = max(dot(normalize(mix(N, Ng, 0.8)), H), 0.0);
  float fres = 0.04 + 0.96 * pow(1.0 - max(dot(Ng, V), 0.0), 5.0);
  float spec = (pow(nh, 220.0) * 3.5 + pow(nh, 22.0) * 0.14) * A.a * (0.45 + fres);
  col += uSunCol * sunT * spec * clamp(ndlG * 5.0, 0.0, 1.0) * (1.0 - 0.8 * cloudHere);
  // atmospheric haze over the lit disc, thickening toward the limb
  float mu = max(dot(Ng, V), 0.0);
  float rim = pow(1.0 - mu, 2.4);
  float dayAtm = smoothstep(-0.3, 0.45, ndlG);
  col = mix(col, uAtmo * dayAtm * 0.4, clamp(rim * uAtmoK * 0.55, 0.0, 1.0));
  col += uAtmo * dayAtm * 0.012 * uAtmoK;
  float nightMask = 1.0 - smoothstep(-0.16, 0.06, ndlG);
#if defined(NEURAL)
  float pulse = 0.5 + 0.5 * sin(uTime * 1.7 - dot(vP, vec3(9.0, 5.0, 7.0)));
  pulse = 0.35 + 0.65 * pulse * pulse;
  col += uNight * B.b * (0.12 + 0.88 * nightMask) * pulse * uNightK * (1.0 - 0.45 * cloudHere);
#elif defined(LIGHTNING)
  vec2 cell = floor(uv * vec2(70.0, 35.0));
  float flick = step(0.985, fract(sin(dot(cell, vec2(12.9898, 78.233)) + floor(uTime * 7.0) * 3.17) * 43758.5453));
  col += uNight * B.b * flick * nightMask * uNightK;
#else
  float tw = 0.8 + 0.2 * sin(uTime * 2.3 + B.b * 50.0 + vUv.x * 300.0);
  col += uNight * B.b * nightMask * uNightK * tw * (1.0 - 0.7 * cloudHere);
#endif
  gl_FragColor = vec4(col, 1.0);
  ${OUT}
}`;

const CLOUD_FRAG = /* glsl */ `
uniform sampler2D mapB;
uniform vec3 uSun;
uniform vec3 uSunCol;
uniform vec3 uAtmo;
uniform float uCloudU;
uniform float uOpacity;
uniform vec3 uTint;
varying vec2 vUv;
varying vec3 vW;
varying vec3 vN;
varying vec3 vE;
varying vec3 vNo;
varying vec3 vP;
void main() {
  vec2 uv = vUv + vec2(uCloudU, 0.0);
  float c = texture2D(mapB, uv).a;
  // fake relief: compare density toward the sun for soft self-shadowing
  vec3 Ng = normalize(vN);
  vec3 L = normalize(uSun - vW);
  vec3 V = normalize(cameraPosition - vW);
  vec2 toSun = vec2(dot(L, normalize(vE)), dot(L, normalize(vNo)));
  float c2 = texture2D(mapB, uv + toSun * vec2(0.004, 0.008)).a;
  float shade = clamp(1.0 - (c2 - c) * 2.5, 0.55, 1.15);
  float ndl = dot(Ng, L);
  float lit = smoothstep(-0.12, 0.25, ndl);
  vec3 sunT = mix(vec3(1.0, 0.45, 0.25), vec3(1.0), smoothstep(0.0, 0.3, ndl));
  vec3 col = uTint * uSunCol * sunT * (0.1 + 0.9 * clamp(ndl * 0.85 + 0.2, 0.0, 1.0)) * lit * shade * 0.95;
  float rim = pow(1.0 - max(dot(Ng, V), 0.0), 2.0);
  col = mix(col, uAtmo * lit, 0.2 * rim);
  float a = c * uOpacity * (1.0 - 0.35 * pow(rim, 2.0));
  gl_FragColor = vec4(col, a);
  ${OUT}
}`;

const ATMO_VERT = /* glsl */ `
varying vec3 vW;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;
const ATMO_FRAG = /* glsl */ `
uniform vec3 uCenter;
uniform vec3 uSun;
uniform vec3 uColor;
uniform float uR;
uniform float uRa;
uniform float uK;
varying vec3 vW;
void main() {
  vec3 rd = normalize(vW - cameraPosition);
  vec3 oc = uCenter - cameraPosition;
  float tc = dot(oc, rd);
  vec3 cp = cameraPosition + rd * tc;
  float d = length(cp - uCenter);
  float h = (d - uR) / (uRa - uR);
  float glow = h > 0.0 ? pow(clamp(1.0 - h, 0.0, 1.0), 3.2) : pow(clamp(d / uR, 0.0, 1.0), 14.0) * 0.9;
  vec3 n = normalize(cp - uCenter + rd * 0.0001);
  vec3 L = normalize(uSun - uCenter);
  float sunF = dot(n, L);
  float lit = smoothstep(-0.45, 0.35, sunF);
  float fwd = pow(max(dot(rd, L), 0.0), 6.0);
  vec3 sunset = vec3(1.0, 0.5, 0.3);
  vec3 col = mix(uColor, uColor * 0.6 + sunset * 0.5, (1.0 - smoothstep(-0.1, 0.4, sunF)) * lit);
  float k = glow * (lit + fwd * 1.6 * (1.0 - lit * 0.5));
  gl_FragColor = vec4(col * k * uK * 0.55, 1.0);
  ${OUT}
}`;

// ---------------------------------------------------------------- builders

type Kind = 'terra' | 'giant' | 'ice' | 'neural';
const SRC: Record<Kind, string> = { terra: TERRA, giant: GIANT, ice: ICE, neural: NEURAL };

function bakeSurface(baker: Baker, kind: Kind, accent: THREE.Color, q: Quality, seed: number[], bumpK: number) {
  const w = q.tex;
  const h = q.tex / 2;
  const u = (pass: number) => ({
    uPass: { value: pass },
    uSeed: { value: new THREE.Vector3(...seed) },
    uAccent: { value: new THREE.Vector3(accent.r, accent.g, accent.b) },
    uEps: { value: 1.6 / w },
    uBumpK: { value: bumpK },
  });
  const body = `${BAKE_HEAD}\n${SRC[kind]}\n${BAKE_MAIN}`;
  const a = baker.bake(body, w, h, u(0));
  const b = baker.bake(body, w, h, u(1));
  return { a, b };
}

type SurfaceOpts = {
  kind: Kind;
  radius: number;
  accent: THREE.Color;
  atmo: THREE.Color;
  night: THREE.Color;
  seed: number[];
  bumpK: number;
  bump: number;
  nightK: number;
  atmoK: number;
  atmoScale: number;
  clouds?: { opacity: number; tint?: THREE.Color; speed: number };
  tilt: number;
  spin: number;
};

/** Builds surface + clouds + atmosphere. Returns the group, a spin pivot for equatorial extras, and an updater. */
async function makeSurface(baker: Baker, q: Quality, o: SurfaceOpts, ring?: { inner: number; outer: number }) {
  const group = new THREE.Group();
  const tilt = new THREE.Group();
  tilt.rotation.z = o.tilt;
  group.add(tilt);
  const spin = new THREE.Group();
  tilt.add(spin);

  const { a, b } = bakeSurface(baker, o.kind, o.accent, q, o.seed, o.bumpK);
  await new Promise((r) => setTimeout(r, 0));

  const defines: Record<string, string> = {};
  if (o.clouds) defines.CLOUDS = '';
  if (ring) defines.RINGED = '';
  if (o.kind === 'giant') {
    defines.FLOW = '';
    defines.LIGHTNING = '';
  }
  if (o.kind === 'neural') defines.NEURAL = '';
  const sunPos = new THREE.Vector3();
  const center = new THREE.Vector3();
  const ringN = new THREE.Vector3(0, 1, 0);
  const uniforms = {
    mapA: { value: a },
    mapB: { value: b },
    uSun: { value: sunPos },
    uSunCol: { value: SUN_COLOR },
    uAtmo: { value: o.atmo },
    uNight: { value: o.night },
    uTime: { value: 0 },
    uCloudU: { value: 0 },
    uBump: { value: o.bump },
    uNightK: { value: o.nightK },
    uAtmoK: { value: o.atmoK },
    uCenter: { value: center },
    uRingN: { value: ringN },
    uRingIn: { value: ring ? ring.inner : 0 },
    uRingOut: { value: ring ? ring.outer : 1 },
  };
  const seg = q.seg;
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(o.radius, seg, Math.round(seg * 0.75)),
    new THREE.ShaderMaterial({ vertexShader: PLANET_VERT, fragmentShader: PLANET_FRAG, uniforms, defines }),
  );
  spin.add(body);

  let cloudMat: THREE.ShaderMaterial | null = null;
  if (o.clouds) {
    cloudMat = new THREE.ShaderMaterial({
      vertexShader: PLANET_VERT,
      fragmentShader: CLOUD_FRAG,
      uniforms: {
        mapB: { value: b },
        uSun: { value: sunPos },
        uSunCol: { value: SUN_COLOR },
        uAtmo: { value: o.atmo },
        uCloudU: uniforms.uCloudU,
        uOpacity: { value: o.clouds.opacity },
        uTint: { value: o.clouds.tint ?? new THREE.Color(1, 1, 1) },
      },
      transparent: true,
      depthWrite: false,
    });
    const clouds = new THREE.Mesh(new THREE.SphereGeometry(o.radius * 1.012, seg, Math.round(seg * 0.75)), cloudMat);
    clouds.renderOrder = 1;
    spin.add(clouds);
  }

  const ra = o.radius * o.atmoScale;
  const atmo = new THREE.Mesh(
    new THREE.SphereGeometry(ra, 64, 48),
    new THREE.ShaderMaterial({
      vertexShader: ATMO_VERT,
      fragmentShader: ATMO_FRAG,
      uniforms: { uCenter: { value: center }, uSun: { value: sunPos }, uColor: { value: o.atmo }, uR: { value: o.radius * 0.995 }, uRa: { value: ra }, uK: { value: o.atmoK } },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  atmo.renderOrder = 2;
  group.add(atmo);

  const cloudSpeed = o.clouds?.speed ?? 0;
  const update = (t: number, dt: number) => {
    spin.rotation.y += dt * o.spin;
    uniforms.uTime.value = t;
    uniforms.uCloudU.value = (uniforms.uCloudU.value + dt * cloudSpeed) % 1;
    group.getWorldPosition(center);
  };
  return { group, tilt, spin, update, uniforms, ringN };
}

// ---------------------------------------------------------------- textures for props

function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, srgb = true) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function softDot(inner = 'rgba(255,255,255,1)', mid = 'rgba(255,255,255,0.25)') {
  return canvasTex(128, 128, (g) => {
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, inner);
    grd.addColorStop(0.25, mid);
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
  });
}

function appIconTexture() {
  return canvasTex(128, 128, (g) => {
    const r = 30;
    g.beginPath();
    g.roundRect(6, 6, 116, 116, r);
    const grd = g.createLinearGradient(0, 0, 128, 128);
    grd.addColorStop(0, '#ffffff');
    grd.addColorStop(1, '#b8b8c8');
    g.fillStyle = grd;
    g.fill();
    g.fillStyle = 'rgba(0,0,0,0.28)';
    g.beginPath();
    g.roundRect(34, 34, 60, 60, 16);
    g.fill();
    g.fillStyle = 'rgba(255,255,255,0.9)';
    g.beginPath();
    g.arc(64, 64, 14, 0, Math.PI * 2);
    g.fill();
  });
}

function solarPanelTexture() {
  return canvasTex(256, 64, (g) => {
    g.fillStyle = '#0b1530';
    g.fillRect(0, 0, 256, 64);
    for (let x = 0; x < 16; x++)
      for (let y = 0; y < 4; y++) {
        const v = 40 + Math.random() * 30;
        g.fillStyle = `rgb(${v * 0.35},${v * 0.6},${v * 1.6})`;
        g.fillRect(x * 16 + 1, y * 16 + 1, 14, 14);
      }
    g.fillStyle = 'rgba(200,210,230,0.5)';
    g.fillRect(0, 31, 256, 2);
  });
}

// ---------------------------------------------------------------- the four worlds

function orbitPos(r: number, a: number, incl: number, out: THREE.Vector3) {
  return out.set(Math.cos(a) * r, Math.sin(a) * r * Math.sin(incl), Math.sin(a) * r * Math.cos(incl));
}

/** 1. Mobile App Development: ocean world, ring of app-tile debris and dust, a phone for a moon. */
export async function makeMobile(baker: Baker, q: Quality, accent: THREE.Color, hex: string): Promise<World> {
  const R = 1.5;
  const ring = { inner: R * 1.38, outer: R * 2.45 };
  const s = await makeSurface(
    baker,
    q,
    {
      kind: 'terra',
      radius: R,
      accent,
      atmo: new THREE.Color(0.55, 0.42, 1.0).lerp(accent, 0.45),
      night: new THREE.Color(1.0, 0.62, 0.72).multiplyScalar(1.9),
      seed: [3.1, 7.4, 1.2],
      bumpK: 0.1,
      bump: 0.35,
      nightK: 1,
      atmoK: 0.95,
      atmoScale: 1.16,
      clouds: { opacity: 0.85, speed: 0.004 },
      tilt: 0.38,
      spin: 0.05,
    },
    ring,
  );

  // Rings: a lit, shadowed particle disc.
  const ringMat = new THREE.ShaderMaterial({
    vertexShader: /* glsl */ `
      varying vec3 vW; varying vec2 vL;
      void main() { vL = position.xy; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */ `
      ${RING}
      uniform vec3 uSun; uniform vec3 uCenter; uniform vec3 uN; uniform float uIn; uniform float uOut; uniform float uR; uniform vec3 uTint; uniform vec3 uSunCol;
      varying vec3 vW; varying vec2 vL;
      void main() {
        float r = length(vL);
        float x = (r - uIn) / (uOut - uIn);
        float d = ringDensity(x);
        vec3 L = normalize(uSun - vW);
        vec3 V = normalize(cameraPosition - vW);
        vec3 oc = vW - uCenter;
        float b = dot(oc, L);
        float c = dot(oc, oc) - uR * uR;
        float disc = b * b - c;
        float shadow = (b < 0.0) ? smoothstep(0.0, uR * 0.25, sqrt(max(disc, 0.0))) : 0.0;
        float lightSide = dot(uN, L) * dot(uN, V);
        float fwd = pow(max(dot(-V, L), 0.0), 4.0);
        float k = lightSide > 0.0 ? 0.9 : 0.35 + fwd * 1.2 * (1.0 - d);
        float grain = 0.75 + 0.5 * fract(sin(r * 4321.17) * 917.3);
        vec3 col = mix(vec3(0.78, 0.6, 0.6), vec3(0.95, 0.9, 0.84), rn(x * 40.0)) * uTint;
        col *= uSunCol * k * (1.0 - shadow * 0.92) * grain * 0.55;
        gl_FragColor = vec4(col, d * 0.88);
        ${OUT}
      }`,
    uniforms: {
      uSun: { value: new THREE.Vector3() },
      uCenter: s.uniforms.uCenter,
      uN: s.uniforms.uRingN,
      uIn: { value: ring.inner },
      uOut: { value: ring.outer },
      uR: { value: R },
      uTint: { value: new THREE.Color(1, 0.92, 0.95).lerp(accent, 0.12) },
      uSunCol: { value: SUN_COLOR },
    },
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const ringMesh = new THREE.Mesh(new THREE.RingGeometry(ring.inner, ring.outer, q.phone ? 128 : 256, 1), ringMat);
  ringMesh.rotation.x = -Math.PI / 2;
  ringMesh.renderOrder = 1;
  s.tilt.add(ringMesh);

  // App-tile debris embedded in the ring: dark glass tiles with lit icon faces.
  const n = Math.round(150 * q.particles);
  const tileGeo = new RoundedBoxGeometry(0.085, 0.085, 0.014, 2, 0.02);
  const tiles = new THREE.InstancedMesh(tileGeo, new THREE.MeshStandardMaterial({ color: 0xb8b4c4, metalness: 0.85, roughness: 0.3, envMapIntensity: 2 }), n);
  const faceGeo = new THREE.PlaneGeometry(0.075, 0.075);
  faceGeo.translate(0, 0, 0.0078);
  const faces = new THREE.InstancedMesh(faceGeo, new THREE.MeshBasicMaterial({ map: appIconTexture(), transparent: true, toneMapped: false }), n);
  const m = new THREE.Matrix4();
  const qn = new THREE.Quaternion();
  const e = new THREE.Euler();
  const pos = new THREE.Vector3();
  const sc = new THREE.Vector3();
  const palette = [accent.clone().multiplyScalar(1.6), new THREE.Color(1.6, 1.3, 1.45), new THREE.Color(0.6, 0.9, 2.0), new THREE.Color(2.0, 1.2, 0.5), accent.clone().lerp(new THREE.Color(1, 1, 1), 0.5)];
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = THREE.MathUtils.lerp(ring.inner * 1.05, ring.outer * 0.98, Math.pow(Math.random(), 0.8));
    pos.set(Math.cos(a) * r, (Math.random() - 0.5) * 0.06, Math.sin(a) * r);
    e.set(Math.random() * 6.28, Math.random() * 6.28, Math.random() * 6.28);
    qn.setFromEuler(e);
    sc.setScalar(0.5 + Math.random() * 0.9);
    m.compose(pos, qn, sc);
    tiles.setMatrixAt(i, m);
    faces.setMatrixAt(i, m);
    faces.setColorAt(i, palette[i % palette.length].clone().multiplyScalar(0.5 + Math.random() * 0.6));
  }
  const debris = new THREE.Group();
  debris.add(tiles, faces);
  s.tilt.add(debris);

  // Ring dust: fine sparkle that catches the sun.
  const dn = Math.round(2600 * q.particles);
  const dp = new Float32Array(dn * 3);
  const ds = new Float32Array(dn);
  for (let i = 0; i < dn; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = THREE.MathUtils.lerp(ring.inner * 0.98, ring.outer * 1.08, Math.random());
    dp.set([Math.cos(a) * r, (Math.random() - 0.5) * 0.05, Math.sin(a) * r], i * 3);
    ds[i] = Math.random();
  }
  const dust = new THREE.Points(
    new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(dp, 3)).setAttribute('aS', new THREE.BufferAttribute(ds, 1)),
    sparkleMaterial(new THREE.Color(1.0, 0.85, 0.9), 1.6),
  );
  debris.add(dust);

  // The phone moon.
  const screen = await svgTexture(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 375 775"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${hex}"/><stop offset="1" stop-color="#5b1d8f"/></linearGradient></defs><rect width="375" height="775" fill="#0b0b10"/><rect x="24" y="80" width="327" height="200" rx="26" fill="url(#g)"/><g fill="#1c1c26"><rect x="24" y="300" width="155" height="150" rx="22"/><rect x="196" y="300" width="155" height="150" rx="22"/><rect x="24" y="470" width="327" height="80" rx="20"/><rect x="24" y="570" width="327" height="80" rx="20"/></g><g fill="${hex}" opacity="0.8"><circle cx="70" cy="345" r="18"/><circle cx="242" cy="345" r="18"/></g><rect x="24" y="700" width="327" height="50" rx="25" fill="#fff"/></svg>`,
    375,
    775,
  );
  screen.colorSpace = THREE.SRGBColorSpace;
  const phone = makePhone(screen);
  phone.screenMat.color.setScalar(0.85);
  phone.group.scale.setScalar(0.3);
  const moon = new THREE.Group();
  moon.add(phone.group);
  s.group.add(moon);
  const mp = new THREE.Vector3();

  const ringSpin = 0.06;
  return {
    group: s.group,
    radius: R,
    frame: { dist: 6.6, phase: 0.95, lift: 0.5 },
    update(t, dt, cam) {
      s.update(t, dt);
      debris.rotation.y += dt * ringSpin;
      ringMesh.updateWorldMatrix(true, false);
      s.uniforms.uRingN.value.set(0, 0, 1).transformDirection(ringMesh.matrixWorld);
      (dust.material as THREE.ShaderMaterial).uniforms.uTime.value = t;
      orbitPos(4.3, t * 0.12 + 1.2, 0.35, mp);
      phone.group.position.copy(mp);
      phone.group.lookAt(cam.position);
      phone.group.rotateY(-0.5 + Math.sin(t * 0.25) * 0.25);
      phone.group.rotateZ(0.18);
    },
  };
}

/** Sun-lit sparkle points (ring dust, belts). */
export function sparkleMaterial(color: THREE.Color, size: number) {
  return new THREE.ShaderMaterial({
    vertexShader: /* glsl */ `
      attribute float aS; uniform float uTime; uniform float uSize; uniform float uPR; varying float vA;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        float tw = 0.55 + 0.45 * sin(uTime * (1.0 + aS * 3.0) + aS * 40.0);
        vA = (0.35 + 0.65 * aS) * tw;
        gl_PointSize = uSize * uPR * (0.6 + aS) * (6.0 / -mv.z);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; varying float vA;
      void main() { float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d); gl_FragColor = vec4(uColor * a * vA, 1.0); }`,
    uniforms: { uTime: { value: 0 }, uColor: { value: color }, uSize: { value: size }, uPR: { value: Math.min(window.devicePixelRatio || 1, 1.75) } },
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
}

/** 2. 2D/3D Animation: amber gas giant with a crystal moon, a polished knot and a sculpted cube. */
export async function makeAnimation(baker: Baker, q: Quality, accent: THREE.Color): Promise<World> {
  const R = 2.1;
  const s = await makeSurface(baker, q, {
    kind: 'giant',
    radius: R,
    accent,
    atmo: new THREE.Color(1.0, 0.72, 0.42).lerp(accent, 0.3),
    night: new THREE.Color(1.0, 0.75, 0.45).multiplyScalar(4),
    seed: [1.7, 0.3, 5.9],
    bumpK: 0.6,
    bump: 0.4,
    nightK: 1,
    atmoK: 0.9,
    atmoScale: 1.1,
    tilt: 0.12,
    spin: 0.07,
  });

  // Crystal moon: an irregular faceted geode with an ember core.
  const geo = new THREE.IcosahedronGeometry(0.3, 1);
  const p = geo.attributes.position;
  const key = (x: number, y: number, z: number) => `${x.toFixed(3)},${y.toFixed(3)},${z.toFixed(3)}`;
  const jitter = new Map<string, number>();
  for (let i = 0; i < p.count; i++) {
    const k = key(p.getX(i), p.getY(i), p.getZ(i));
    if (!jitter.has(k)) jitter.set(k, 0.78 + Math.random() * 0.45);
    const f = jitter.get(k)!;
    p.setXYZ(i, p.getX(i) * f, p.getY(i) * f * 1.25, p.getZ(i) * f);
  }
  geo.computeVertexNormals();
  const crystal = new THREE.Mesh(
    geo,
    new THREE.MeshPhysicalMaterial({
      color: 0x7a4a18,
      metalness: 0.35,
      roughness: 0.04,
      clearcoat: 1,
      clearcoatRoughness: 0.02,
      iridescence: 1,
      iridescenceIOR: 1.8,
      flatShading: true,
      emissive: accent,
      emissiveIntensity: 0.45,
      envMapIntensity: 3,
    }),
  );
  const ember = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDot('rgba(255,190,90,1)', 'rgba(255,140,40,0.3)'), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.6 }));
  ember.scale.setScalar(1.1);
  const crystalG = new THREE.Group();
  crystalG.add(crystal, ember);

  const knot = new THREE.Mesh(
    new THREE.TorusKnotGeometry(0.27, 0.085, q.phone ? 120 : 220, q.phone ? 14 : 24),
    new THREE.MeshPhysicalMaterial({ color: 0xffcf8a, metalness: 1, roughness: 0.16, clearcoat: 0.6, envMapIntensity: 2.6 }),
  );
  const cube = new THREE.Group();
  const cubeBody = new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.42, 0.42, 4, 0.05), new THREE.MeshPhysicalMaterial({ color: 0x5a5560, metalness: 0.8, roughness: 0.38, envMapIntensity: 2.4 }));
  const seams = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(0.435, 0.435, 0.435)),
    new THREE.LineBasicMaterial({ color: accent.clone().multiplyScalar(2.2), transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, toneMapped: false }),
  );
  cube.add(cubeBody, seams);
  s.group.add(crystalG, knot, cube);

  const v = new THREE.Vector3();
  return {
    group: s.group,
    radius: R,
    frame: { dist: 5.6, phase: 1.25, lift: 0.22 },
    update(t, dt) {
      s.update(t, dt);
      orbitPos(3.6, t * 0.16, 0.22, v);
      crystalG.position.copy(v);
      crystal.rotation.set(t * 0.2, t * 0.31, 0.3);
      orbitPos(4.4, t * 0.12 + 2.3, -0.3, v);
      knot.position.copy(v);
      knot.rotation.set(t * 0.4, t * 0.25, 0);
      orbitPos(3.1, t * 0.2 + 4.2, 0.45, v);
      cube.position.copy(v);
      cube.rotation.set(t * 0.3, t * 0.45, t * 0.1);
    },
  };
}

/** 3. Digital Marketing: ice world broadcasting transmission waves, ringed by satellites. */
export async function makeMarketing(baker: Baker, q: Quality, accent: THREE.Color): Promise<World> {
  const R = 1.35;
  const s = await makeSurface(baker, q, {
    kind: 'ice',
    radius: R,
    accent,
    atmo: new THREE.Color(0.45, 0.8, 1.0).lerp(accent, 0.5),
    night: accent.clone().multiplyScalar(2.6),
    seed: [8.3, 2.2, 4.4],
    bumpK: 0.25,
    bump: 0.7,
    nightK: 1,
    atmoK: 1.0,
    atmoScale: 1.15,
    clouds: { opacity: 0.55, speed: 0.006, tint: new THREE.Color(0.92, 1.0, 1.0) },
    tilt: -0.25,
    spin: 0.06,
  });

  // Transmission waves: expanding glowing rings with data packets riding them.
  const span = R * 4.6;
  const waveMat = new THREE.ShaderMaterial({
    vertexShader: /* glsl */ `varying vec2 vL; void main() { vL = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uTime; uniform float uR; uniform vec3 uColor; varying vec2 vL;
      void main() {
        float r = length(vL);
        float ang = atan(vL.y, vL.x);
        vec3 col = vec3(0.0);
        for (int i = 0; i < 4; i++) {
          float fi = float(i);
          float k = fract(uTime * 0.16 + fi * 0.25);
          float rad = uR * 1.12 + k * uR * 3.2;
          float w = 0.012 + k * 0.03;
          float d = r - rad;
          float ring = exp(-d * d / (w * w)) + exp(-max(-d, 0.0) * 9.0) * step(d, 0.0) * 0.12;
          float fade = pow(1.0 - k, 1.7) * smoothstep(0.0, 0.06, k);
          float packets = 0.35 + 0.65 * smoothstep(0.55, 1.0, sin(ang * 18.0 - uTime * 1.5 + fi * 2.1));
          col += uColor * ring * fade * packets;
        }
        col *= smoothstep(uR * 1.02, uR * 1.12, r);
        gl_FragColor = vec4(col * 1.6, 1.0);
      }`,
    uniforms: { uTime: { value: 0 }, uR: { value: R }, uColor: { value: accent.clone().multiplyScalar(1.4) } },
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const waves = new THREE.Mesh(new THREE.PlaneGeometry(span * 2, span * 2), waveMat);
  waves.rotation.x = -Math.PI / 2 + 0.08;
  s.tilt.add(waves);

  // Satellites: gold-foil bus, solar wings, a dish and a blinking beacon.
  const panelTex = solarPanelTexture();
  const gold = new THREE.MeshStandardMaterial({ color: 0xd8a64a, metalness: 1, roughness: 0.38, envMapIntensity: 2 });
  const wingMat = new THREE.MeshStandardMaterial({ map: panelTex, metalness: 0.5, roughness: 0.3, side: THREE.DoubleSide, envMapIntensity: 1.5 });
  const white = new THREE.MeshStandardMaterial({ color: 0xe8e8ee, metalness: 0.2, roughness: 0.5 });
  const beaconTex = softDot('rgba(255,255,255,1)', 'rgba(255,255,255,0.2)');
  const sats = [0, 1, 2].map((i) => {
    const g = new THREE.Group();
    const bus = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.15), gold);
    const wing = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.11), wingMat);
    wing.rotation.x = Math.PI / 2;
    const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.62, 6), white);
    strut.rotation.z = Math.PI / 2;
    const dish = new THREE.Mesh(new THREE.SphereGeometry(0.06, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2.6), white);
    dish.material.side = THREE.DoubleSide;
    dish.position.z = 0.1;
    dish.rotation.x = -Math.PI / 2;
    const beacon = new THREE.Sprite(new THREE.SpriteMaterial({ map: beaconTex, color: accent.clone().multiplyScalar(2), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    beacon.scale.setScalar(0.12);
    beacon.position.y = 0.07;
    g.add(bus, wing, strut, dish, beacon);
    g.scale.setScalar(1.15);
    return { g, beacon, r: R * (1.75 + i * 0.42), incl: [0.5, -0.35, 1.1][i], speed: [0.32, 0.24, 0.18][i], off: i * 2.1 };
  });
  sats.forEach((x) => s.group.add(x.g));
  const v = new THREE.Vector3();
  const c = new THREE.Vector3();

  return {
    group: s.group,
    radius: R,
    frame: { dist: 7.2, phase: 1.55, lift: 0.3 },
    update(t, dt) {
      s.update(t, dt);
      waveMat.uniforms.uTime.value = t;
      sats.forEach((x, i) => {
        orbitPos(x.r, t * x.speed + x.off, x.incl, v);
        x.g.position.copy(v);
        x.g.lookAt(s.group.getWorldPosition(c));
        x.beacon.material.opacity = Math.pow(Math.max(0, Math.sin(t * 3 + i * 2)), 12);
      });
    },
  };
}

/** 4. Applied AI & Automation: obsidian world with a pulsing neural lattice and orbiting data streams. */
export async function makeAI(baker: Baker, q: Quality, accent: THREE.Color): Promise<World> {
  const R = 1.55;
  const s = await makeSurface(baker, q, {
    kind: 'neural',
    radius: R,
    accent,
    atmo: new THREE.Color(0.55, 0.45, 1.0).lerp(accent, 0.6),
    night: accent.clone().lerp(new THREE.Color(0.8, 0.85, 1.0), 0.25).multiplyScalar(3.2),
    seed: [4.6, 9.1, 2.7],
    bumpK: 0.22,
    bump: 0.9,
    nightK: 1,
    atmoK: 1.05,
    atmoScale: 1.15,
    clouds: { opacity: 0.6, speed: 0.008, tint: new THREE.Color(0.85, 0.82, 1.0) },
    tilt: 0.2,
    spin: 0.045,
  });

  // Data streams: packets of light racing along inclined orbits (all in one draw call).
  const orbits = 6;
  const per = Math.round(260 * q.particles);
  const n = orbits * per;
  const aU = new Float32Array(n * 3);
  const aV = new Float32Array(n * 3);
  const aP = new Float32Array(n * 4);
  const tmpU = new THREE.Vector3();
  const tmpV = new THREE.Vector3();
  const axis = new THREE.Vector3();
  for (let o = 0; o < orbits; o++) {
    axis.set(Math.random() - 0.5, 1.4, Math.random() - 0.5).normalize();
    tmpU.set(1, 0, 0).cross(axis).normalize();
    tmpV.copy(axis).cross(tmpU).normalize();
    const radius = R * (1.3 + o * 0.16);
    const speed = (0.25 + Math.random() * 0.25) * (o % 2 ? 1 : -1);
    for (let i = 0; i < per; i++) {
      const k = o * per + i;
      aU.set([tmpU.x, tmpU.y, tmpU.z], k * 3);
      aV.set([tmpV.x, tmpV.y, tmpV.z], k * 3);
      const packet = i < per * 0.7;
      const phase = packet ? Math.floor(Math.random() * 7) * 0.9 + Math.random() * 0.22 : (i / per) * Math.PI * 2;
      aP.set([phase, speed, radius, packet ? 1 : 0], k * 4);
    }
  }
  const streamGeo = new THREE.BufferGeometry();
  streamGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  streamGeo.setAttribute('aU', new THREE.BufferAttribute(aU, 3));
  streamGeo.setAttribute('aV', new THREE.BufferAttribute(aV, 3));
  streamGeo.setAttribute('aP', new THREE.BufferAttribute(aP, 4));
  streamGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), R * 3);
  const streamMat = new THREE.ShaderMaterial({
    vertexShader: /* glsl */ `
      attribute vec3 aU; attribute vec3 aV; attribute vec4 aP; uniform float uTime; uniform float uPR; varying float vA; varying float vPk;
      void main() {
        float a = aP.x + uTime * aP.y;
        vec3 p = (cos(a) * aU + sin(a) * aV) * aP.z;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        vPk = aP.w;
        vA = aP.w > 0.5 ? 1.0 : 0.22;
        gl_PointSize = uPR * (aP.w > 0.5 ? 2.6 : 1.4) * (8.0 / -mv.z);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; varying float vA; varying float vPk;
      void main() { float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d); vec3 c = mix(uColor, vec3(1.6), vPk * 0.35); gl_FragColor = vec4(c * a * vA, 1.0); }`,
    uniforms: { uTime: { value: 0 }, uPR: { value: Math.min(window.devicePixelRatio || 1, 1.75) }, uColor: { value: accent.clone().multiplyScalar(1.8) } },
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const streams = new THREE.Points(streamGeo, streamMat);
  s.group.add(streams);

  return {
    group: s.group,
    radius: R,
    frame: { dist: 6.0, phase: 1.75, lift: 0.26 },
    update(t, dt) {
      s.update(t, dt);
      streamMat.uniforms.uTime.value = t;
    },
  };
}

export { canvasTex };
