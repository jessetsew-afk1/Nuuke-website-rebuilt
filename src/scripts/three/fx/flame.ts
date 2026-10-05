// Stylised-real rocket exhaust: three nested noise-driven plume layers (white-blue core with
// shock diamonds, yellow-orange body, flickering red-orange sheath) plus a hot nozzle glow.
// The group hangs from the nozzle exit and points down its local -y axis.
import { THREE } from '../core';
import { SIMPLEX3 } from './noise';
import { glowTexture } from './textures';

const VERT = /* glsl */ `
${SIMPLEX3}
uniform float uTime;
uniform float uLen;
uniform float uR0;
uniform float uR1;
uniform float uTaper;
uniform float uTurb;
uniform float uSpeed;
uniform float uSeed;
uniform float uPinch;
uniform float uDiamonds;
varying float vH;
varying float vAng;
varying vec3 vN;
varying vec3 vView;
void main() {
  float h = clamp(-position.y, 0.0, 1.0);
  float ang = atan(position.z, position.x);
  float r = mix(uR0, uR1, smoothstep(0.0, 0.22, h));
  r *= 1.0 - pow(h, uTaper);
  float dia = 0.5 + 0.5 * cos(h * uDiamonds * 6.2831);
  r *= 1.0 - uPinch * dia * smoothstep(0.85, 0.0, h);
  float n = snoise(vec3(cos(ang) * 1.3 + uSeed, sin(ang) * 1.3, h * 3.5 * uLen - uTime * uSpeed));
  r *= 1.0 + n * uTurb * (0.3 + h * 1.4);
  vec3 p = vec3(cos(ang) * r, -h * uLen, sin(ang) * r);
  float sway = h * h * uLen * uTurb * 0.6;
  p.x += sin(uTime * 11.0 + h * 4.0 + uSeed) * sway;
  p.z += cos(uTime * 8.7 + h * 3.0 + uSeed) * sway;
  vH = h;
  vAng = ang;
  vec4 wp = modelMatrix * vec4(p, 1.0);
  vN = normalize(mat3(modelMatrix) * vec3(cos(ang), 0.0, sin(ang)));
  vView = normalize(cameraPosition - wp.xyz);
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

const FRAG = /* glsl */ `
${SIMPLEX3}
uniform float uTime;
uniform float uSeed;
uniform float uSpeed;
uniform float uLen;
uniform vec3 uC0;
uniform vec3 uC1;
uniform float uGain;
uniform float uAlpha;
uniform float uEdgePow;
uniform float uShock;
uniform float uDiamonds;
varying float vH;
varying float vAng;
varying vec3 vN;
varying vec3 vView;
void main() {
  float facing = abs(dot(normalize(vN), normalize(vView)));
  float dens = pow(facing, uEdgePow);
  float n = fbm3(vec3(cos(vAng) * 1.4 + uSeed, sin(vAng) * 1.4 + vH * 0.5, vH * 4.0 * uLen - uTime * uSpeed * 1.4));
  float along = pow(1.0 - vH, 1.25);
  float breakup = smoothstep(0.0, 0.4, (1.0 - vH) + n * 0.55 - 0.08);
  float I = dens * along * breakup * (0.6 + 0.8 * (n * 0.5 + 0.5));
  vec3 col = mix(uC0, uC1, smoothstep(0.0, 0.85, vH + (1.0 - facing) * 0.35 + n * 0.1));
  // Shock diamonds: bright pinched knots along the core at full thrust
  float dd = pow(0.5 + 0.5 * cos(vH * uDiamonds * 6.2831 + 3.14159), 10.0) * smoothstep(0.9, 0.05, vH) * uShock;
  I += dd * 1.4 * dens;
  col += vec3(1.3, 1.1, 0.9) * dd * 1.6;
  I *= 0.86 + 0.14 * sin(uTime * 61.0 + vH * 31.0 + uSeed * 7.0);
  gl_FragColor = vec4(col * I * uGain * uAlpha, 1.0);
}`;

type Layer = {
  frac: number; // length relative to the plume
  r0: number;
  r1: number;
  taper: number;
  turb: number;
  speed: number;
  pinch: number;
  c0: THREE.Color;
  c1: THREE.Color;
  gain: number;
  edge: number;
};

export type Flame = {
  group: THREE.Group;
  /** thrust 0 (off) .. ~1.6 (launch). `boost` lengthens the plume (launch / warp). */
  update: (t: number, thrust: number, alpha: number, boost?: number) => void;
  dispose: () => void;
};

export function makeFlame(lite: boolean, nozzleR = 0.27): Flame {
  const group = new THREE.Group();
  const layers: Layer[] = [
    // sheath
    { frac: 1.25, r0: nozzleR * 1.08, r1: nozzleR * 1.75, taper: 1.6, turb: 0.22, speed: 7, pinch: 0, c0: new THREE.Color(1.6, 0.62, 0.16), c1: new THREE.Color(0.7, 0.14, 0.05), gain: 0.55, edge: 1.6 },
    // body
    { frac: 1.0, r0: nozzleR * 0.95, r1: nozzleR * 1.25, taper: 1.9, turb: 0.13, speed: 10, pinch: 0.06, c0: new THREE.Color(2.3, 1.45, 0.55), c1: new THREE.Color(1.5, 0.42, 0.08), gain: 0.9, edge: 1.25 },
    // core
    { frac: 0.6, r0: nozzleR * 0.62, r1: nozzleR * 0.7, taper: 2.4, turb: 0.05, speed: 14, pinch: 0.22, c0: new THREE.Color(0.85, 1.15, 2.3), c1: new THREE.Color(2.3, 1.75, 0.9), gain: 1.2, edge: 0.9 },
  ];
  const geo = new THREE.CylinderGeometry(1, 1, 1, lite ? 20 : 32, lite ? 26 : 44, true);
  geo.translate(0, -0.5, 0);
  const mats: THREE.ShaderMaterial[] = [];
  layers.forEach((L, i) => {
    const m = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      uniforms: {
        uTime: { value: 0 },
        uLen: { value: 1 },
        uR0: { value: L.r0 },
        uR1: { value: L.r1 },
        uTaper: { value: L.taper },
        uTurb: { value: L.turb },
        uSpeed: { value: L.speed },
        uSeed: { value: i * 3.7 },
        uPinch: { value: L.pinch },
        uDiamonds: { value: 4.5 },
        uC0: { value: L.c0 },
        uC1: { value: L.c1 },
        uGain: { value: L.gain },
        uAlpha: { value: 1 },
        uEdgePow: { value: L.edge },
        uShock: { value: 0 },
      },
    });
    const mesh = new THREE.Mesh(geo, m);
    mesh.renderOrder = 3 + i;
    mesh.frustumCulled = false;
    group.add(mesh);
    mats.push(m);
  });

  // Hot glow right at the nozzle exit (reads as the Mach disk / bright throat)
  const glowMat = new THREE.SpriteMaterial({ map: glowTexture(), color: new THREE.Color(1.5, 0.9, 0.42), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
  const glow = new THREE.Sprite(glowMat);
  glow.position.y = -0.08;
  glow.renderOrder = 6;
  group.add(glow);
  const glow2Mat = new THREE.SpriteMaterial({ map: glowTexture(), color: new THREE.Color(1.2, 0.45, 0.12), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.6 });
  const glow2 = new THREE.Sprite(glow2Mat);
  glow2.renderOrder = 2;
  group.add(glow2);

  return {
    group,
    update(t, thrust, alpha, boost = 0) {
      const on = thrust > 0.02 && alpha > 0.01;
      group.visible = on;
      if (!on) return;
      const L = (0.35 + thrust * 1.25) * (1 + boost);
      const shock = THREE.MathUtils.smoothstep(thrust, 0.9, 1.35);
      const flick = 0.94 + Math.sin(t * 37) * 0.03 + Math.sin(t * 23.3) * 0.03;
      mats.forEach((m, i) => {
        const u = m.uniforms;
        u.uTime.value = t;
        u.uLen.value = L * layers[i].frac * flick;
        u.uAlpha.value = alpha * Math.min(1, thrust * 3);
        u.uShock.value = i === 2 ? shock : 0;
        u.uDiamonds.value = 3.2 + 1.4 / Math.max(0.6, L * 0.6);
      });
      const g = Math.min(1.6, thrust) * alpha;
      glow.scale.setScalar(0.55 + g * 0.55);
      glowMat.opacity = Math.min(1, g * 1.2) * flick;
      glow2.position.y = -L * 0.35;
      glow2.scale.set(1.2 + g * 1.4, L * 1.1, 1);
      glow2Mat.opacity = g * 0.45;
    },
    dispose() {
      geo.dispose();
      mats.forEach((m) => m.dispose());
      glowMat.dispose();
      glow2Mat.dispose();
    },
  };
}
