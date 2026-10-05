// The NUUKE star: boiling granulated plasma with limb darkening, a ray-streaked corona,
// layered glow and a restrained lens flare that dims when a planet passes in front.
import { THREE } from '../core';
import { NOISE, OUT } from './glsl';
import { canvasTex } from './worlds';

export const SUN_R = 3.2;

const SUN_VERT = /* glsl */ `
varying vec3 vP;
varying vec3 vN;
varying vec3 vW;
void main() {
  vP = normalize(position);
  vN = normalize(mat3(modelMatrix) * normal);
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const SUN_FRAG = /* glsl */ `
${NOISE}
uniform float uTime;
varying vec3 vP;
varying vec3 vN;
varying vec3 vW;
void main() {
  vec3 p = vP;
  float t = uTime;
  // slow convection: domain-warped supergranules
  vec3 w = vec3(snoise(p * 2.0 + t * 0.03), snoise(p * 2.0 + 7.0 - t * 0.025), snoise(p * 2.0 + 13.0 + t * 0.02));
  float big = fbm(p * 2.6 + w * 0.6 + vec3(0.0, t * 0.015, 0.0), 5);
  float mid = fbm(p * 9.0 + w * 1.2 - vec3(t * 0.02), 4);
  // granulation: bright cell centres, dark intergranular lanes
  vec3 g1 = worley(p * 26.0 + w * 0.8 + vec3(t * 0.05, 0.0, -t * 0.04));
  vec3 g2 = worley(p * 60.0 + w + vec3(-t * 0.07, t * 0.05, 0.0));
  float gran = smoothstep(0.0, 0.22, g1.y - g1.x) * (1.0 - 0.5 * g1.x) * 0.65 + smoothstep(0.0, 0.2, g2.y - g2.x) * 0.35;
  // active regions: bright faculae, dark sunspots with a penumbra
  float act = fbm(p * 1.4 + 30.0 + t * 0.004, 4);
  float spotN = snoise(p * 7.0 + 4.0) * 0.5 + 0.5;
  float umbra = smoothstep(0.5, 0.6, act) * smoothstep(0.62, 0.78, spotN);
  float pen = smoothstep(0.45, 0.58, act) * smoothstep(0.5, 0.66, spotN) * (1.0 - umbra);
  float fac = smoothstep(0.2, 0.45, act) * (1.0 - pen - umbra);
  float mu = clamp(dot(normalize(vN), normalize(cameraPosition - vW)), 0.0, 1.0);
  float limb = 0.32 + 0.68 * pow(mu, 0.55);
  float heat = 0.42 + gran * 0.38 + big * 0.42 + mid * 0.18 + fac * 0.22 - pen * 0.35 - umbra * 0.7;
  heat = clamp(heat * (0.6 + 0.4 * mu), 0.0, 1.3);
  vec3 c0 = vec3(0.55, 0.05, 0.16);
  vec3 c1 = vec3(1.0, 0.3, 0.3);
  vec3 c2 = vec3(1.0, 0.6, 0.36);
  vec3 c3 = vec3(1.0, 0.84, 0.62);
  vec3 col = mix(c0, c1, smoothstep(0.05, 0.4, heat));
  col = mix(col, c2, smoothstep(0.35, 0.7, heat));
  col = mix(col, c3, smoothstep(0.65, 1.05, heat));
  col *= limb * (0.42 + heat * 0.95);
  gl_FragColor = vec4(col, 1.0);
  ${OUT}
}`;

const CORONA_FRAG = /* glsl */ `
${NOISE}
uniform float uTime;
uniform float uR;
uniform float uSize;
varying vec2 vUv;
void main() {
  vec2 c = (vUv - 0.5) * uSize;
  float r = length(c);
  float a = atan(c.y, c.x);
  float x = r / uR;
  if (x < 0.98) discard;
  float rays = 0.0;
  rays += snoise(vec3(cos(a) * 3.0, sin(a) * 3.0, uTime * 0.04)) * 0.5 + 0.5;
  rays += (snoise(vec3(cos(a) * 9.0, sin(a) * 9.0, uTime * 0.06 + 3.0)) * 0.5 + 0.5) * 0.6;
  rays += (snoise(vec3(cos(a) * 22.0, sin(a) * 22.0, uTime * 0.08 + 7.0)) * 0.5 + 0.5) * 0.35;
  rays /= 1.95;
  float fall = exp(-(x - 1.0) * 2.6);
  float inner = exp(-(x - 1.0) * 14.0);
  float streak = pow(rays, 2.4) * exp(-(x - 1.0) * (1.2 + (1.0 - rays) * 2.5));
  vec3 col = vec3(1.0, 0.4, 0.6) * fall * 0.16 + vec3(1.0, 0.72, 0.6) * inner * 0.9 + vec3(1.0, 0.5, 0.58) * streak * 0.55;
  float edge = smoothstep(uSize * 0.5, uSize * 0.32, r);
  gl_FragColor = vec4(col * edge, 1.0);
  ${OUT}
}`;

type Flare = { sprite: THREE.Sprite; at: number; size: number; base: number };

export function makeSun(phone: boolean) {
  const group = new THREE.Group();
  const sunMat = new THREE.ShaderMaterial({ vertexShader: SUN_VERT, fragmentShader: SUN_FRAG, uniforms: { uTime: { value: 0 } } });
  const sun = new THREE.Mesh(new THREE.SphereGeometry(SUN_R, phone ? 64 : 96, phone ? 48 : 72), sunMat);
  group.add(sun);

  const size = SUN_R * 7;
  const coronaMat = new THREE.ShaderMaterial({
    vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: CORONA_FRAG,
    uniforms: { uTime: { value: 0 }, uR: { value: SUN_R }, uSize: { value: size } },
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const corona = new THREE.Mesh(new THREE.PlaneGeometry(size, size), coronaMat);
  group.add(corona);

  // Wide soft glow: a magenta outer haze over a warm inner bloom.
  const glowTex = canvasTex(256, 256, (g) => {
    const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.12, 'rgba(255,255,255,0.45)');
    grd.addColorStop(0.35, 'rgba(255,255,255,0.1)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 256, 256);
  });
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(1.0, 0.25, 0.55), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.16 }));
  halo.scale.setScalar(SUN_R * 13);
  const warm = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(1.0, 0.7, 0.55), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.22 }));
  warm.scale.setScalar(SUN_R * 5);
  group.add(halo, warm);

  // Lens flare: ghosts along the sun-to-centre axis plus an anamorphic streak.
  const ringTex = canvasTex(128, 128, (g) => {
    const grd = g.createRadialGradient(64, 64, 40, 64, 64, 62);
    grd.addColorStop(0, 'rgba(255,255,255,0)');
    grd.addColorStop(0.75, 'rgba(255,255,255,0.35)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
  });
  const hexTex = canvasTex(128, 128, (g) => {
    g.translate(64, 64);
    g.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
      g.lineTo(Math.cos(a) * 56, Math.sin(a) * 56);
    }
    g.closePath();
    const grd = g.createRadialGradient(0, 0, 0, 0, 0, 58);
    grd.addColorStop(0, 'rgba(255,255,255,0.15)');
    grd.addColorStop(0.85, 'rgba(255,255,255,0.35)');
    grd.addColorStop(1, 'rgba(255,255,255,0.05)');
    g.fillStyle = grd;
    g.fill();
  });
  const streakTex = canvasTex(256, 32, (g) => {
    const grd = g.createLinearGradient(0, 0, 256, 0);
    grd.addColorStop(0, 'rgba(255,255,255,0)');
    grd.addColorStop(0.5, 'rgba(255,255,255,1)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 256, 32);
    g.globalCompositeOperation = 'destination-in';
    const v = g.createLinearGradient(0, 0, 0, 32);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(0.5, 'rgba(0,0,0,1)');
    v.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = v;
    g.fillRect(0, 0, 256, 32);
  });
  const mk = (map: THREE.Texture, color: THREE.ColorRepresentation) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map, color, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, transparent: true, opacity: 0 }));
    s.renderOrder = 10;
    s.frustumCulled = false;
    return s;
  };
  const flares: Flare[] = [
    { sprite: mk(streakTex, 0xff8fb8), at: 0, size: 1.3, base: 0.16 },
    { sprite: mk(hexTex, 0xff5aa0), at: 0.35, size: 0.06, base: 0.25 },
    { sprite: mk(ringTex, 0x7fb8ff), at: 0.62, size: 0.16, base: 0.22 },
    { sprite: mk(hexTex, 0xffb070), at: 0.9, size: 0.035, base: 0.35 },
    { sprite: mk(hexTex, 0x9b7bff), at: 1.25, size: 0.09, base: 0.18 },
    { sprite: mk(ringTex, 0xff7ab0), at: 1.6, size: 0.28, base: 0.12 },
  ];
  const flareGroup = new THREE.Group();
  flares.forEach((f) => flareGroup.add(f.sprite));

  const sunNdc = new THREE.Vector3();
  const tmp = new THREE.Vector3();
  const dir = new THREE.Vector3();
  let vis = 0;
  // Test-only readout (?hjdebug): the flare's visibility and what drives it.
  const dbg: Record<string, unknown> | null = /[?&]hjdebug\b/.test(location.search) ? {} : null;

  return {
    group,
    flareGroup,
    dbg,
    /** occluders: world centres + radii of anything that can pass in front of the sun. */
    update(t: number, camera: THREE.PerspectiveCamera, occluders: { c: THREE.Vector3; r: number }[], dt = 1 / 60) {
      sunMat.uniforms.uTime.value = t;
      coronaMat.uniforms.uTime.value = t;
      corona.quaternion.copy(camera.quaternion);
      sun.rotation.y = t * 0.01;

      // How visible is the sun? (on screen and not hidden behind a planet)
      sunNdc.set(0, 0, 0).project(camera);
      const onScreen = sunNdc.z < 1 ? 1 - THREE.MathUtils.smoothstep(Math.max(Math.abs(sunNdc.x), Math.abs(sunNdc.y)), 0.85, 1.25) : 0;
      dir.set(0, 0, 0).sub(camera.position);
      const dist = dir.length();
      dir.normalize();
      let occl = 1;
      for (const o of occluders) {
        tmp.copy(o.c).sub(camera.position);
        const along = tmp.dot(dir);
        if (along <= 0 || along > dist) continue;
        const perp = Math.sqrt(Math.max(0, tmp.lengthSq() - along * along));
        // angular overlap of planet disc against the sun disc
        const k = THREE.MathUtils.clamp((perp - o.r) / (SUN_R * (along / dist)) + 0.5, 0, 1);
        occl = Math.min(occl, k);
      }
      const target = onScreen * occl;
      // Ease toward the target in time (frame-rate independent), not per frame.
      vis += (target - vis) * (1 - Math.exp(-9.75 * Math.min(dt, 0.1)));
      if (dbg) {
        dbg.vis = vis;
        dbg.target = target;
        dbg.onScreen = onScreen;
        dbg.occl = occl;
        dbg.ndc = [sunNdc.x, sunNdc.y, sunNdc.z];
      }

      for (const f of flares) {
        const k = 1 - f.at;
        tmp.set(sunNdc.x * k, sunNdc.y * k, 0.5).unproject(camera);
        tmp.sub(camera.position).normalize().multiplyScalar(4).add(camera.position);
        f.sprite.position.copy(tmp);
        const s = f.size * 4 * (f.at === 0 ? 1 : 1);
        if (f.at === 0) f.sprite.scale.set(s * 2.2, s * 0.025, 1);
        else f.sprite.scale.setScalar(s);
        f.sprite.material.opacity = f.base * vis * (f.at === 0 ? 1 : 0.8 + 0.2 * Math.sin(t * 0.7 + f.at * 5));
      }
      // Fully faded before it is skipped, so switching it off is never visible.
      flareGroup.visible = vis > 0.002;
    },
  };
}
