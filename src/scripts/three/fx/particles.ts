// Particle systems for the journey: lit volumetric-looking smoke / steam / cloud billows
// (camera-facing instanced quads with a noise puff atlas, self-shadowing and fire light),
// and hot sparks rendered as velocity-stretched streaks.
import { THREE } from '../core';
import { smokeAtlas } from './textures';

const SMOKE_VERT = /* glsl */ `
attribute vec3 iPos;
attribute vec4 iA; // life (1 -> 0), size, rotation, seed
attribute vec4 iB; // heat, tone, alpha, unused
uniform vec3 uFlamePos;
uniform float uFlamePow;
uniform vec2 uSunView;
uniform float uOpacity;
uniform float uMaxSize; // cap on a puff's height in NDC units (2 = full viewport); large = off
varying vec2 vUv;
varying vec4 vA;
varying vec4 vB;
varying vec2 vLight;
varying float vGlow;
varying float vFade;
void main() {
  vA = iA;
  vB = iB;
  if (iA.x <= 0.0) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
  vec4 mv = viewMatrix * vec4(iPos, 1.0);
  vFade = smoothstep(0.15, 1.6 + iA.y * 0.25, -mv.z);
  // Skip puffs that would draw nothing (fully faded in / out, behind or at the lens):
  // saves the fill rate of large transparent quads.
  float life = iA.x;
  float fadeOut = smoothstep(0.0, 0.4, life) * vFade * uOpacity;
  float seen = max((1.0 - smoothstep(0.88, 1.0, life)) * iB.z, iB.x * life * life * life * 2.0) * fadeOut;
  if (seen < 0.002 || -mv.z < 0.05) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
  float c = cos(iA.z);
  float s = sin(iA.z);
  vec2 k = position.xy;
  float size = iA.y * min(1.0, uMaxSize / max(iA.y * projectionMatrix[1][1] / -mv.z, 1e-4));
  mv.xy += vec2(c * k.x - s * k.y, s * k.x + c * k.y) * size;
  gl_Position = projectionMatrix * mv;
  vUv = uv;
  vLight = vec2(c * uSunView.x + s * uSunView.y, -s * uSunView.x + c * uSunView.y);
  float d = distance(iPos, uFlamePos);
  vGlow = uFlamePow / (1.0 + d * d * 0.35);
}`;

const SMOKE_FRAG = /* glsl */ `
uniform sampler2D uTex;
uniform vec3 uSunCol;
uniform vec3 uAmbTop;
uniform vec3 uAmbBot;
uniform float uOpacity;
uniform float uBack;
uniform float uContrast;
uniform float uCrisp;
varying vec2 vUv;
varying vec4 vA;
varying vec4 vB;
varying vec2 vLight;
varying float vGlow;
varying float vFade;
void main() {
  float cell = floor(fract(vA.w) * 3.999);
  vec2 off = vec2(mod(cell, 2.0), floor(cell / 2.0)) * 0.5;
  float d = texture2D(uTex, vUv * 0.5 + off).r;
  float d2 = texture2D(uTex, clamp(vUv + vLight * 0.08, 0.0, 1.0) * 0.5 + off).r;
  d = mix(d, smoothstep(0.12, 0.55, d), uCrisp);
  d2 = mix(d2, smoothstep(0.12, 0.55, d2), uCrisp);
  if (d < 0.015) discard;
  float shade = clamp(0.5 + (d - d2) * uContrast, 0.0, 1.25);
  float life = vA.x;
  float heat = vB.x;
  float tone = vB.y;
  vec3 base = mix(vec3(0.3, 0.29, 0.31), vec3(0.96, 0.96, 0.98), tone);
  vec3 amb = mix(uAmbBot, uAmbTop, vUv.y) * (0.6 + 0.4 * (1.0 - d));
  vec3 col = base * (amb + uSunCol * shade);
  // Light leaking through the thin edges when the sun / floodlights are behind
  col += uSunCol * pow(1.0 - d, 3.0) * uBack * 0.9;
  col += vec3(1.0, 0.42, 0.1) * vGlow * (0.3 + 0.7 * (1.0 - vUv.y)) * (0.3 + d * 0.7);
  float h = heat * life * life * life;
  vec3 emit = mix(vec3(1.0, 0.3, 0.05), vec3(2.0, 1.3, 0.55), h) * h * 1.4;
  float fadeIn = 1.0 - smoothstep(0.88, 1.0, life);
  float fadeOut = smoothstep(0.0, 0.4, life);
  float a = clamp(d * vB.z * fadeIn * fadeOut * vFade * uOpacity, 0.0, 1.0);
  gl_FragColor = vec4(col * a + emit * d * fadeOut * vFade * uOpacity, a * (1.0 - h * 0.7));
}`;

export type EmitOpts = {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  spread?: number; // random velocity added (units/s)
  jitter?: number; // random position offset
  n?: number;
  size?: number; // start size
  grow?: number; // end size multiplier
  life?: number; // seconds
  heat?: number;
  tone?: number; // 0 dark smoke .. 1 white steam / cloud
  alpha?: number;
  drag?: number;
  buoy?: number; // upward acceleration
  static?: boolean;
};

export class Smoke {
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  N: number;
  private geo: THREE.InstancedBufferGeometry;
  private pos: Float32Array;
  private a: Float32Array;
  private b: Float32Array;
  private vel: Float32Array;
  private age: Float32Array;
  private max: Float32Array;
  private s0: Float32Array;
  private s1: Float32Array;
  private rotV: Float32Array;
  private drag: Float32Array;
  private buoy: Float32Array;
  private head = 0;
  /** Ring size actually used (quality budget); <= N. */
  private limit: number;
  /** One past the highest slot that may hold a live particle. */
  private hi = 0;
  groundY = -1e9;
  alive = 0;

  constructor(N: number, lite: boolean) {
    this.N = N;
    this.limit = N;
    const g = new THREE.InstancedBufferGeometry();
    const quad = new THREE.PlaneGeometry(1, 1);
    g.index = quad.index;
    g.setAttribute('position', quad.attributes.position);
    g.setAttribute('uv', quad.attributes.uv);
    this.pos = new Float32Array(N * 3);
    this.a = new Float32Array(N * 4);
    this.b = new Float32Array(N * 4);
    g.setAttribute('iPos', new THREE.InstancedBufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('iA', new THREE.InstancedBufferAttribute(this.a, 4).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('iB', new THREE.InstancedBufferAttribute(this.b, 4).setUsage(THREE.DynamicDrawUsage));
    g.instanceCount = 0;
    this.geo = g;
    this.vel = new Float32Array(N * 3);
    this.age = new Float32Array(N);
    this.max = new Float32Array(N);
    this.s0 = new Float32Array(N);
    this.s1 = new Float32Array(N);
    this.rotV = new Float32Array(N);
    this.drag = new Float32Array(N);
    this.buoy = new Float32Array(N);
    this.mat = new THREE.ShaderMaterial({
      vertexShader: SMOKE_VERT,
      fragmentShader: SMOKE_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
      uniforms: {
        uTex: { value: smokeAtlas(lite) },
        uFlamePos: { value: new THREE.Vector3() },
        uFlamePow: { value: 0 },
        uSunView: { value: new THREE.Vector2(0.5, 0.6) },
        uSunCol: { value: new THREE.Color(0.55, 0.36, 0.26) },
        uAmbTop: { value: new THREE.Color(0.2, 0.22, 0.32) },
        uAmbBot: { value: new THREE.Color(0.07, 0.06, 0.07) },
        uOpacity: { value: 1 },
        uMaxSize: { value: 1e4 },
        uBack: { value: 0.6 },
        uContrast: { value: 2.6 },
        uCrisp: { value: 0 },
      },
    });
    this.mesh = new THREE.Mesh(g, this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 8;
    this.mesh.visible = false;
  }

  /** Scale the particle budget (quality tier). Live particles beyond it just finish their life. */
  setBudget(k: number) {
    this.limit = Math.max(8, Math.min(this.N, Math.round(this.N * k)));
    if (this.head >= this.limit) this.head = 0;
  }

  emit(o: EmitOpts) {
    const n = o.n ?? 1;
    const sp = o.spread ?? 0.3;
    const jt = o.jitter ?? 0.1;
    for (let k = 0; k < n; k++) {
      const i = this.head;
      this.head = (this.head + 1) % this.limit;
      if (i >= this.hi) this.hi = i + 1;
      const i3 = i * 3;
      const i4 = i * 4;
      this.pos[i3] = o.pos.x + (Math.random() - 0.5) * jt;
      this.pos[i3 + 1] = o.pos.y + (Math.random() - 0.5) * jt;
      this.pos[i3 + 2] = o.pos.z + (Math.random() - 0.5) * jt;
      this.vel[i3] = o.vel.x + (Math.random() - 0.5) * sp;
      this.vel[i3 + 1] = o.vel.y + (Math.random() - 0.5) * sp;
      this.vel[i3 + 2] = o.vel.z + (Math.random() - 0.5) * sp;
      const size = (o.size ?? 1) * (0.7 + Math.random() * 0.6);
      this.s0[i] = size;
      this.s1[i] = size * (o.grow ?? 3);
      this.age[i] = 0;
      this.max[i] = o.static ? Infinity : (o.life ?? 3) * (0.75 + Math.random() * 0.5);
      this.rotV[i] = (Math.random() - 0.5) * 0.6;
      this.drag[i] = o.drag ?? 1;
      this.buoy[i] = o.buoy ?? 0.2;
      this.a[i4] = o.static ? 0.9 : 1;
      this.a[i4 + 1] = size;
      this.a[i4 + 2] = Math.random() * Math.PI * 2;
      this.a[i4 + 3] = Math.random();
      this.b[i4] = o.heat ?? 0;
      this.b[i4 + 1] = o.tone ?? 0.4;
      this.b[i4 + 2] = o.alpha ?? 0.6;
    }
  }

  /** Push particles horizontally away from a vertical line through `c` (cloud punch). */
  repel(c: THREE.Vector3, radius: number, strength: number, dy = 5) {
    for (let i = 0; i < this.hi; i++) {
      if (this.a[i * 4] <= 0) continue;
      const i3 = i * 3;
      const dx = this.pos[i3] - c.x;
      const dz = this.pos[i3 + 2] - c.z;
      const yy = Math.abs(this.pos[i3 + 1] - c.y);
      if (yy > dy) continue;
      const d = Math.hypot(dx, dz) || 0.001;
      if (d > radius) continue;
      const f = (1 - d / radius) * strength * (1 - yy / dy);
      this.vel[i3] += (dx / d) * f;
      this.vel[i3 + 2] += (dz / d) * f;
      this.vel[i3 + 1] += f * 0.3;
      this.drag[i] = Math.max(this.drag[i], 0.8);
    }
  }

  /** Move every live particle (scroll drift in flight). */
  shift(dx: number, dy: number, dz = 0) {
    if (!this.alive) return;
    for (let i = 0; i < this.hi; i++) {
      if (this.a[i * 4] <= 0) continue;
      this.pos[i * 3] += dx;
      this.pos[i * 3 + 1] += dy;
      this.pos[i * 3 + 2] += dz;
    }
  }

  clear() {
    for (let i = 0; i < this.hi; i++) this.a[i * 4] = 0;
    this.alive = 0;
    this.hi = 0;
    this.head = 0;
    this.geo.instanceCount = 0;
    this.mesh.visible = false;
  }

  update(dt: number, wind = 0) {
    if (this.hi === 0) return;
    let alive = 0;
    let top = 0;
    for (let i = 0; i < this.hi; i++) {
      const i4 = i * 4;
      if (this.a[i4] <= 0) continue;
      const i3 = i * 3;
      const isStatic = this.max[i] === Infinity;
      if (!isStatic) {
        this.age[i] += dt;
        const life = 1 - this.age[i] / this.max[i];
        if (life <= 0) {
          this.a[i4] = 0;
          continue;
        }
        this.a[i4] = life;
        const g = 1 - life;
        this.a[i4 + 1] = this.s0[i] + (this.s1[i] - this.s0[i]) * Math.pow(g, 0.55);
      }
      alive++;
      top = i + 1;
      const dr = Math.exp(-this.drag[i] * dt);
      this.vel[i3] = this.vel[i3] * dr + wind * dt;
      this.vel[i3 + 1] = this.vel[i3 + 1] * dr + this.buoy[i] * dt;
      this.vel[i3 + 2] *= dr;
      this.pos[i3] += this.vel[i3] * dt;
      this.pos[i3 + 1] += this.vel[i3 + 1] * dt;
      this.pos[i3 + 2] += this.vel[i3 + 2] * dt;
      // Roll along the ground instead of sinking through it
      const floor = this.groundY + this.a[i4 + 1] * 0.22;
      if (this.pos[i3 + 1] < floor) {
        this.pos[i3 + 1] = floor;
        if (this.vel[i3 + 1] < 0) {
          const v = -this.vel[i3 + 1] * 0.6;
          const hx = this.vel[i3];
          const hz = this.vel[i3 + 2];
          const hl = Math.hypot(hx, hz) || 1;
          this.vel[i3] += (hx / hl) * v;
          this.vel[i3 + 2] += (hz / hl) * v;
          this.vel[i3 + 1] = 0;
        }
      }
      this.a[i4 + 2] += this.rotV[i] * dt;
    }
    this.alive = alive;
    // Upload and draw only the slots that can hold live particles.
    const n = top;
    this.hi = top;
    this.geo.instanceCount = n;
    this.mesh.visible = alive > 0;
    if (!alive) return;
    upload(this.geo.attributes.iPos as THREE.BufferAttribute, n * 3);
    upload(this.geo.attributes.iA as THREE.BufferAttribute, n * 4);
    upload(this.geo.attributes.iB as THREE.BufferAttribute, n * 4);
  }

  dispose() {
    this.geo.dispose();
    this.mat.dispose();
  }
}

function upload(attr: THREE.BufferAttribute, count: number) {
  attr.clearUpdateRanges();
  attr.addUpdateRange(0, count);
  attr.needsUpdate = true;
}

// ---------- Sparks / embers as velocity streaks ----------
const SPARK_VERT = /* glsl */ `
attribute vec3 iPos;
attribute vec3 iVel;
attribute vec2 iL; // life (1 -> 0), seed
uniform vec2 uRes;
uniform float uStreak;
uniform float uWidth;
varying vec2 vUv;
varying float vLife;
varying float vSeed;
void main() {
  vLife = iL.x;
  vSeed = iL.y;
  if (iL.x <= 0.0) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
  mat4 vp = projectionMatrix * viewMatrix;
  vec4 h = vp * vec4(iPos, 1.0);
  vec4 t = vp * vec4(iPos - iVel * uStreak, 1.0);
  vec2 dir = (h.xy / h.w - t.xy / t.w) * uRes;
  float len = length(dir);
  dir = len > 0.0001 ? dir / len : vec2(0.0, 1.0);
  vec2 nrm = vec2(-dir.y, dir.x);
  float along = position.y + 0.5;
  vec4 p = mix(t, h, along);
  float w = uWidth * (0.6 + iL.x * 0.8);
  p.xy += (nrm * position.x * w + dir * position.y * w) / uRes * 2.0 * p.w;
  gl_Position = p;
  vUv = position.xy + 0.5;
}`;
const SPARK_FRAG = /* glsl */ `
uniform float uOpacity;
varying vec2 vUv;
varying float vLife;
varying float vSeed;
void main() {
  float across = 1.0 - abs(vUv.x - 0.5) * 2.0;
  float a = pow(across, 1.6) * smoothstep(0.0, 0.25, vUv.y);
  vec3 hot = mix(vec3(1.6, 0.35, 0.06), vec3(3.2, 2.4, 1.3), smoothstep(0.35, 1.0, vLife));
  gl_FragColor = vec4(hot * a * vLife * uOpacity * (0.7 + vSeed * 0.6), 1.0);
}`;

export class Sparks {
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  N: number;
  groundY = -1e9;
  private geo: THREE.InstancedBufferGeometry;
  private pos: Float32Array;
  private vel: Float32Array;
  private l: Float32Array;
  private max: Float32Array;
  private head = 0;
  private limit: number;
  private hi = 0;
  private alive = 0;

  constructor(N: number) {
    this.N = N;
    this.limit = N;
    const g = new THREE.InstancedBufferGeometry();
    const quad = new THREE.PlaneGeometry(1, 1);
    g.index = quad.index;
    g.setAttribute('position', quad.attributes.position);
    this.pos = new Float32Array(N * 3);
    this.vel = new Float32Array(N * 3);
    this.l = new Float32Array(N * 2);
    this.max = new Float32Array(N);
    g.setAttribute('iPos', new THREE.InstancedBufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('iVel', new THREE.InstancedBufferAttribute(this.vel, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('iL', new THREE.InstancedBufferAttribute(this.l, 2).setUsage(THREE.DynamicDrawUsage));
    g.instanceCount = 0;
    this.geo = g;
    this.mat = new THREE.ShaderMaterial({
      vertexShader: SPARK_VERT,
      fragmentShader: SPARK_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uRes: { value: new THREE.Vector2(1, 1) }, uStreak: { value: 0.045 }, uWidth: { value: 2.2 }, uOpacity: { value: 1 } },
    });
    this.mesh = new THREE.Mesh(g, this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 9;
    this.mesh.visible = false;
  }

  setBudget(k: number) {
    this.limit = Math.max(8, Math.min(this.N, Math.round(this.N * k)));
    if (this.head >= this.limit) this.head = 0;
  }

  emit(p: THREE.Vector3, v: THREE.Vector3, n: number, spread: number, life = 1.2) {
    for (let k = 0; k < n; k++) {
      const i = this.head;
      this.head = (this.head + 1) % this.limit;
      if (i >= this.hi) this.hi = i + 1;
      this.pos[i * 3] = p.x + (Math.random() - 0.5) * 0.15;
      this.pos[i * 3 + 1] = p.y + (Math.random() - 0.5) * 0.1;
      this.pos[i * 3 + 2] = p.z + (Math.random() - 0.5) * 0.15;
      this.vel[i * 3] = v.x + (Math.random() - 0.5) * spread;
      this.vel[i * 3 + 1] = v.y + (Math.random() - 0.5) * spread;
      this.vel[i * 3 + 2] = v.z + (Math.random() - 0.5) * spread;
      this.l[i * 2] = 1;
      this.l[i * 2 + 1] = Math.random();
      this.max[i] = life * (0.4 + Math.random() * 0.8);
    }
  }

  shift(dx: number, dy: number) {
    if (!this.alive) return;
    for (let i = 0; i < this.hi; i++) {
      if (this.l[i * 2] <= 0) continue;
      this.pos[i * 3] += dx;
      this.pos[i * 3 + 1] += dy;
    }
  }

  update(dt: number, gravity = -6) {
    if (this.hi === 0) return;
    let alive = 0;
    let top = 0;
    const dr = Math.exp(-0.8 * dt);
    for (let i = 0; i < this.hi; i++) {
      if (this.l[i * 2] <= 0) continue;
      this.l[i * 2] -= dt / this.max[i];
      if (this.l[i * 2] > 0) {
        alive++;
        top = i + 1;
      }
      const i3 = i * 3;
      this.vel[i3 + 1] += gravity * dt;
      this.vel[i3] *= dr;
      this.vel[i3 + 2] *= dr;
      this.pos[i3] += this.vel[i3] * dt;
      this.pos[i3 + 1] += this.vel[i3 + 1] * dt;
      this.pos[i3 + 2] += this.vel[i3 + 2] * dt;
      if (this.pos[i3 + 1] < this.groundY && this.vel[i3 + 1] < 0) {
        this.pos[i3 + 1] = this.groundY;
        this.vel[i3 + 1] *= -0.35;
        this.vel[i3] *= 1.2;
        this.vel[i3 + 2] *= 1.2;
      }
    }
    this.alive = alive;
    this.hi = top;
    this.geo.instanceCount = top;
    this.mesh.visible = alive > 0;
    if (!alive) return;
    upload(this.geo.attributes.iPos as THREE.BufferAttribute, top * 3);
    upload(this.geo.attributes.iVel as THREE.BufferAttribute, top * 3);
    upload(this.geo.attributes.iL as THREE.BufferAttribute, top * 2);
  }

  dispose() {
    this.geo.dispose();
    this.mat.dispose();
  }
}
