// Shared GLSL snippets for the services solar system: noise, fbm, cellular noise and
// the sphere <-> equirectangular mapping that matches THREE.SphereGeometry's UVs.

/** 3D simplex noise (Ashima Arts / Stefan Gustavson, MIT), fbm, ridged fbm and Worley noise. */
export const NOISE = /* glsl */ `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}
float fbm(vec3 p, int oct) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 10; i++) {
    if (i >= oct) break;
    s += a * snoise(p);
    p = p * 2.03 + vec3(1.7, -3.1, 2.3);
    a *= 0.5;
  }
  return s;
}
float ridged(vec3 p, int oct) {
  float s = 0.0, a = 0.5, w = 1.0;
  for (int i = 0; i < 10; i++) {
    if (i >= oct) break;
    float n = 1.0 - abs(snoise(p));
    n *= n;
    n *= w;
    w = clamp(n * 1.6, 0.0, 1.0);
    s += a * n;
    p = p * 2.07 + vec3(-2.1, 1.3, 0.7);
    a *= 0.5;
  }
  return s;
}
vec3 hash33(vec3 p) {
  p = fract(p * vec3(0.1031, 0.1030, 0.0973));
  p += dot(p, p.yxz + 33.33);
  return fract((p.xxy + p.yxx) * p.zyx);
}
float hash13(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.zyx + 31.32);
  return fract((p.x + p.y) * p.z);
}
// x: distance to nearest feature point, y: second nearest, z: id of nearest cell.
vec3 worley(vec3 x) {
  vec3 n = floor(x);
  vec3 f = fract(x);
  float f1 = 8.0, f2 = 8.0, id = 0.0;
  for (int k = -1; k <= 1; k++)
  for (int j = -1; j <= 1; j++)
  for (int i = -1; i <= 1; i++) {
    vec3 g = vec3(float(i), float(j), float(k));
    vec3 o = hash33(n + g);
    vec3 r = g + o - f;
    float d = dot(r, r);
    if (d < f1) { f2 = f1; f1 = d; id = o.z; }
    else if (d < f2) { f2 = d; }
  }
  return vec3(sqrt(f1), sqrt(f2), id);
}
`;

/** UV (as SphereGeometry lays it out) to a unit direction, plus the local east/north frame. */
export const SPHERE = /* glsl */ `
vec3 uvToDir(vec2 uv) {
  float phi = uv.x * 6.28318530718;
  float th = (1.0 - uv.y) * 3.14159265359;
  return vec3(-cos(phi) * sin(th), cos(th), sin(phi) * sin(th));
}
vec3 eastOf(vec3 p) { return normalize(vec3(p.z, 0.0, -p.x) + vec3(1e-6, 0.0, 0.0)); }
`;

/** Ring density profile shared by the ring shader and the planet (for ring shadows). x in 0..1 across the ring. */
export const RING = /* glsl */ `
float rh(float x) { return fract(sin(x * 127.1) * 43758.5453); }
float rn(float x) { float i = floor(x); float f = fract(x); f = f * f * (3.0 - 2.0 * f); return mix(rh(i), rh(i + 1.0), f); }
float ringDensity(float x) {
  if (x < 0.0 || x > 1.0) return 0.0;
  float d = 0.45 + 0.35 * rn(x * 18.0) + 0.2 * rn(x * 70.0) + 0.12 * rn(x * 260.0) - 0.08;
  d *= smoothstep(0.0, 0.06, x) * smoothstep(1.0, 0.86, x);
  d *= 1.0 - 0.92 * (1.0 - smoothstep(0.012, 0.03, abs(x - 0.63)));   // main division
  d *= 1.0 - 0.6 * (1.0 - smoothstep(0.004, 0.01, abs(x - 0.86)));    // thin outer gap
  d *= mix(0.45, 1.0, smoothstep(0.18, 0.32, x));                        // faint inner C ring
  return clamp(d, 0.0, 1.0);
}
`;

/** Tone mapping + output colour space, so ShaderMaterials match the rest of the scene. */
export const OUT = /* glsl */ `
#include <tonemapping_fragment>
#include <colorspace_fragment>
`;
