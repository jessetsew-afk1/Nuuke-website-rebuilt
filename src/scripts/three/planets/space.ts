// Deep space around the system: a baked nebula sky, layered parallax starfields,
// a distant spiral galaxy, an instanced asteroid belt and drifting near-camera dust.
import { THREE } from '../core';
import { Baker } from './bake';
import { OUT } from './glsl';
import { canvasTex, type Quality } from './worlds';

const SKY_BAKE = /* glsl */ `
void main() {
  vec3 d = uvToDir(vUv);
  vec3 gN = normalize(vec3(0.32, 0.86, 0.4));
  float gl = dot(d, gN);
  float band = exp(-pow(gl / 0.3, 2.0));
  vec3 w = vec3(fbm(d * 2.0 + 1.0, 4), fbm(d * 2.0 + 5.0, 4), fbm(d * 2.0 + 9.0, 4));
  float n1 = fbm(d * 2.4 + w * 0.9, 7) * 0.5 + 0.5;
  float n2 = fbm(d * 5.0 + w * 1.4 + 3.0, 6) * 0.5 + 0.5;
  float lanes = smoothstep(0.45, 0.75, fbm(d * 7.0 + w * 2.0 + 11.0, 6) * 0.5 + 0.5);
  vec3 col = vec3(0.0025, 0.0022, 0.0045);
  // milky band glow
  col += vec3(0.05, 0.035, 0.06) * band * (0.4 + 0.8 * n2);
  // nebula: magenta and violet clouds, teal wisps, warm knots
  float neb = pow(n1, 3.2) * (0.35 + 0.9 * band);
  vec3 nc = mix(vec3(0.42, 0.06, 0.24), vec3(0.16, 0.07, 0.38), smoothstep(0.3, 0.7, n2));
  nc = mix(nc, vec3(0.03, 0.2, 0.24), smoothstep(0.62, 0.85, fbm(d * 3.0 + 40.0, 4) * 0.5 + 0.5) * 0.8);
  col += nc * neb * 0.55;
  col += vec3(0.5, 0.22, 0.12) * pow(n2, 8.0) * band * 0.6;
  // dark dust lanes cutting through the glow
  col *= 1.0 - lanes * band * 0.8;
  // a dense field of faint, unresolved stars
  vec3 cell = floor(d * 420.0);
  float h = hash13(cell);
  vec3 fp = hash33(cell) - 0.5;
  float sd = length(fract(d * 420.0) - 0.5 - fp * 0.6);
  float star = step(0.985 - band * 0.012, h) * smoothstep(0.32, 0.0, sd) * (0.15 + 0.85 * pow(fract(h * 37.0), 4.0));
  vec3 tint = mix(vec3(0.75, 0.82, 1.0), vec3(1.0, 0.85, 0.7), fract(h * 91.0));
  col += tint * star * 0.55;
  gl_FragColor = vec4(pow(clamp(col, 0.0, 1.0), vec3(1.0 / 2.2)), 1.0);
}`;

export function makeSpace(baker: Baker, q: Quality) {
  const group = new THREE.Group();

  // Sky dome (follows the camera, so it reads as infinitely far away).
  const skyTex = baker.bake(SKY_BAKE, q.phone ? 1024 : 2048, q.phone ? 512 : 1024, {}, { mips: false });
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(900, 64, 32),
    new THREE.ShaderMaterial({
      vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform sampler2D map; uniform float uK; varying vec2 vUv; void main() { vec3 c = pow(texture2D(map, vUv).rgb, vec3(2.2)) * uK; gl_FragColor = vec4(c, 1.0); ${OUT} }`,
      uniforms: { map: { value: skyTex }, uK: { value: 0.85 } },
      side: THREE.BackSide,
      depthWrite: false,
    }),
  );
  sky.renderOrder = -10;
  sky.frustumCulled = false;
  group.add(sky);

  // Two star shells at different depths: the near one slides against the far one as the camera moves.
  const starMat = new THREE.ShaderMaterial({
    vertexShader: /* glsl */ `
      attribute float aSize; attribute vec3 aColor; uniform float uTime; uniform float uPR; varying vec3 vC;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        float tw = 0.8 + 0.2 * sin(uTime * (0.6 + fract(aSize * 13.0) * 2.0) + aSize * 50.0);
        vC = aColor * tw;
        gl_PointSize = aSize * uPR;
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vC;
      void main() { float d = length(gl_PointCoord - 0.5); float a = exp(-d * d * 30.0) + exp(-d * d * 120.0); gl_FragColor = vec4(vC * a, 1.0); }`,
    uniforms: { uTime: { value: 0 }, uPR: { value: Math.min(window.devicePixelRatio || 1, 1.75) } },
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const temps = [new THREE.Color(0.7, 0.8, 1.0), new THREE.Color(1, 1, 1), new THREE.Color(1.0, 0.9, 0.75), new THREE.Color(1.0, 0.72, 0.6), new THREE.Color(1.0, 0.6, 0.8)];
  const shell = (count: number, rMin: number, rMax: number, sizeK: number) => {
    const pos = new Float32Array(count * 3);
    const size = new Float32Array(count);
    const col = new Float32Array(count * 3);
    const v = new THREE.Vector3();
    for (let i = 0; i < count; i++) {
      v.randomDirection().multiplyScalar(THREE.MathUtils.lerp(rMin, rMax, Math.random()));
      pos.set([v.x, v.y, v.z], i * 3);
      const m = Math.pow(Math.random(), 7);
      size[i] = (1.2 + m * 5.5) * sizeK;
      const c = temps[Math.floor(Math.random() * temps.length)];
      const b = 0.25 + m * 2.6;
      col.set([c.r * b, c.g * b, c.b * b], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    const p = new THREE.Points(g, starMat);
    p.frustumCulled = false;
    return p;
  };
  const starsNear = shell(Math.round(1400 * q.particles), 70, 130, 1);
  const starsFar = shell(Math.round(3200 * q.particles), 220, 420, 0.85);
  group.add(starsNear, starsFar);

  // Distant spiral galaxy.
  const galTex = canvasTex(512, 512, (g) => {
    g.fillStyle = '#000';
    g.fillRect(0, 0, 512, 512);
    g.globalCompositeOperation = 'lighter';
    const core = g.createRadialGradient(256, 256, 0, 256, 256, 120);
    core.addColorStop(0, 'rgba(255,236,210,0.95)');
    core.addColorStop(0.2, 'rgba(255,190,160,0.35)');
    core.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = core;
    g.fillRect(0, 0, 512, 512);
    for (let arm = 0; arm < 2; arm++) {
      for (let i = 0; i < 2600; i++) {
        const k = Math.random();
        const a = arm * Math.PI + k * Math.PI * 3.2;
        const r = 18 + k * 210;
        const sc = (1 - k * 0.5) * 22 * Math.random();
        const x = 256 + Math.cos(a) * r + (Math.random() - 0.5) * sc * 2;
        const y = 256 + Math.sin(a) * r + (Math.random() - 0.5) * sc * 2;
        const blue = Math.random() < 0.6;
        g.fillStyle = blue ? `rgba(150,170,255,${0.05 + Math.random() * 0.12})` : `rgba(255,140,190,${0.04 + Math.random() * 0.1})`;
        g.beginPath();
        g.arc(x, y, 1 + Math.random() * 3.5 * (1 - k * 0.6), 0, Math.PI * 2);
        g.fill();
      }
    }
    g.globalCompositeOperation = 'destination-in';
    const fade = g.createRadialGradient(256, 256, 150, 256, 256, 256);
    fade.addColorStop(0, 'rgba(0,0,0,1)');
    fade.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = fade;
    g.fillRect(0, 0, 512, 512);
  });
  const galaxy = new THREE.Mesh(
    new THREE.PlaneGeometry(150, 150),
    new THREE.MeshBasicMaterial({ map: galTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.5, color: 0xffe8f2 }),
  );
  galaxy.position.set(260, -40, -560);
  galaxy.lookAt(0, 0, 0);
  galaxy.rotateX(1.05);
  galaxy.rotateZ(0.6);
  group.add(galaxy);

  return {
    group,
    update(t: number, camera: THREE.Camera) {
      sky.position.copy(camera.position);
      starMat.uniforms.uTime.value = t;
      starsFar.position.copy(camera.position).multiplyScalar(0.85);
    },
  };
}

/** Rocky asteroid belt: a few displaced rock shapes, instanced thousands of times, plus fine dust. */
export function makeBelt(q: Quality, radius: number, width: number) {
  const group = new THREE.Group();
  // Lumpy rocks: layered sine noise on a subdivided sphere, smooth-shaded, with a speckled rock texture.
  const rockGeo = (seed: number) => {
    const g = new THREE.IcosahedronGeometry(1, q.phone ? 1 : 2);
    const p = g.attributes.position;
    const v = new THREE.Vector3();
    const n3 = (x: number, y: number, z: number, f: number, o: number) => Math.sin(x * f + o) * Math.sin(y * f * 1.3 + o * 2.1) * Math.sin(z * f * 0.9 + o * 0.7);
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const d =
        1 +
        n3(v.x, v.y, v.z, 1.6, seed * 3.1) * 0.32 +
        n3(v.x, v.y, v.z, 3.7, seed * 5.3) * 0.12 +
        n3(v.x, v.y, v.z, 8.3, seed * 1.7) * 0.05 +
        Math.abs(n3(v.x, v.y, v.z, 15, seed)) * -0.04;
      v.multiplyScalar(d);
      p.setXYZ(i, v.x * (1 + seed * 0.15), v.y * (0.72 + seed * 0.08), v.z);
    }
    g.computeVertexNormals();
    return g;
  };
  const rockTex = canvasTex(256, 256, (g) => {
    g.fillStyle = '#8a8076';
    g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 900; i++) {
      const v = 70 + Math.random() * 110;
      g.fillStyle = `rgba(${v},${v * 0.93},${v * 0.86},${0.15 + Math.random() * 0.3})`;
      g.beginPath();
      g.arc(Math.random() * 256, Math.random() * 256, 0.5 + Math.random() * 5, 0, Math.PI * 2);
      g.fill();
    }
    for (let i = 0; i < 40; i++) {
      g.strokeStyle = `rgba(30,26,22,${Math.random() * 0.4})`;
      g.lineWidth = 1 + Math.random() * 2;
      g.beginPath();
      g.arc(Math.random() * 256, Math.random() * 256, 3 + Math.random() * 14, 0, Math.PI * 2);
      g.stroke();
    }
  });
  rockTex.wrapS = rockTex.wrapT = THREE.RepeatWrapping;
  const mat = new THREE.MeshStandardMaterial({ color: 0xb0a598, map: rockTex, bumpMap: rockTex, bumpScale: 3, roughness: 0.92, metalness: 0.04 });
  const total = Math.round(1500 * q.particles);
  const m = new THREE.Matrix4();
  const qn = new THREE.Quaternion();
  const e = new THREE.Euler();
  const pos = new THREE.Vector3();
  const sc = new THREE.Vector3();
  const tint = new THREE.Color();
  const meshes: THREE.InstancedMesh[] = [];
  for (let k = 0; k < 3; k++) {
    const n = Math.round(total / 3);
    const im = new THREE.InstancedMesh(rockGeo(k), mat, n);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const g = (Math.random() + Math.random() + Math.random()) / 3 - 0.5;
      const r = radius + g * width * 2;
      pos.set(Math.cos(a) * r, (Math.random() - 0.5) * width * 0.35 * (1 - Math.abs(g)), Math.sin(a) * r);
      e.set(Math.random() * 6.3, Math.random() * 6.3, Math.random() * 6.3);
      qn.setFromEuler(e);
      const s = 0.012 + Math.pow(Math.random(), 5) * 0.16;
      sc.set(s * (0.8 + Math.random() * 0.5), s * (0.7 + Math.random() * 0.4), s * (0.8 + Math.random() * 0.5));
      m.compose(pos, qn, sc);
      im.setMatrixAt(i, m);
      const b = 0.5 + Math.random() * 0.6;
      tint.setRGB(b * (0.95 + Math.random() * 0.1), b * 0.92, b * (0.82 + Math.random() * 0.12));
      im.setColorAt(i, tint);
    }
    meshes.push(im);
    group.add(im);
  }
  // fine belt dust
  const dn = Math.round(3000 * q.particles);
  const dp = new Float32Array(dn * 3);
  const ds = new Float32Array(dn);
  for (let i = 0; i < dn; i++) {
    const a = Math.random() * Math.PI * 2;
    const g = (Math.random() + Math.random()) / 2 - 0.5;
    const r = radius + g * width * 2.4;
    dp.set([Math.cos(a) * r, (Math.random() - 0.5) * width * 0.4, Math.sin(a) * r], i * 3);
    ds[i] = Math.random();
  }
  const dustGeo = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(dp, 3)).setAttribute('aS', new THREE.BufferAttribute(ds, 1));
  return { group, meshes, dustGeo };
}

/** Out-of-focus motes near the lens: they wrap around the camera so there are always some in view. */
export function makeNearDust(q: Quality) {
  const n = Math.round(160 * q.particles);
  const pos = new Float32Array(n * 3);
  const seed = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    pos.set([Math.random() * 16, Math.random() * 16, Math.random() * 16], i * 3);
    seed[i] = Math.random();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aS', new THREE.BufferAttribute(seed, 1));
  const mat = new THREE.ShaderMaterial({
    vertexShader: /* glsl */ `
      attribute float aS; uniform vec3 uCam; uniform float uTime; uniform float uPR; uniform float uBox; varying float vA;
      void main() {
        vec3 p = position + vec3(sin(uTime * 0.1 + aS * 6.0), cos(uTime * 0.13 + aS * 4.0), sin(uTime * 0.08 + aS * 9.0)) * 0.6;
        p = mod(p - uCam, uBox) - uBox * 0.5 + uCam;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        float z = -mv.z;
        vA = smoothstep(0.4, 1.5, z) * (1.0 - smoothstep(4.0, 8.0, z)) * (0.25 + 0.75 * aS);
        gl_PointSize = uPR * (10.0 + aS * 30.0) * (2.0 / max(z, 0.4));
      }`,
    fragmentShader: /* glsl */ `
      varying float vA;
      void main() { float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.15, d) * (0.75 + 0.25 * smoothstep(0.3, 0.45, d)); gl_FragColor = vec4(vec3(1.0, 0.85, 0.9) * a * vA * 0.2, 1.0); }`,
    uniforms: { uCam: { value: new THREE.Vector3() }, uTime: { value: 0 }, uPR: { value: Math.min(window.devicePixelRatio || 1, 1.75) }, uBox: { value: 16 } },
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  pts.renderOrder = 5;
  return {
    points: pts,
    update(t: number, cam: THREE.Vector3) {
      mat.uniforms.uTime.value = t;
      mat.uniforms.uCam.value.copy(cam);
    },
  };
}
