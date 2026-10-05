// Procedural textures for the homepage journey. Everything is drawn on canvases at runtime
// (no downloads) and cached, so several rockets / scenes share the same GPU textures.
import { THREE } from '../core';

const cache = new Map<string, unknown>();
function once<T>(key: string, make: () => T): T {
  if (!cache.has(key)) cache.set(key, make());
  return cache.get(key) as T;
}

/** Free the launch-pad-only textures (GPU copies and canvases) once the pad is gone. */
export function releasePadTextures() {
  for (const key of ['concretetrue', 'concretefalse', 'scorch', 'groundFade']) {
    const v = cache.get(key) as THREE.Texture | { map: THREE.Texture; rough: THREE.Texture } | undefined;
    if (!v) continue;
    const list = v instanceof THREE.Texture ? [v] : [v.map, v.rough];
    for (const t of list) t.dispose();
    cache.delete(key);
  }
}

// ---------- tiny JS noise ----------
function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}

/** Tileable 2D value noise on a gx * gy lattice, returns 0..1. */
function lattice(gx: number, gy: number, seed: number) {
  const r = rng(seed);
  const g = new Float32Array(gx * gy);
  for (let i = 0; i < g.length; i++) g[i] = r();
  return (x: number, y: number) => {
    // x, y in lattice units (wraps)
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const fx = x - xi;
    const fy = y - yi;
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);
    const x0 = ((xi % gx) + gx) % gx;
    const y0 = ((yi % gy) + gy) % gy;
    const x1 = (x0 + 1) % gx;
    const y1 = (y0 + 1) % gy;
    const a = g[y0 * gx + x0];
    const b = g[y0 * gx + x1];
    const c = g[y1 * gx + x0];
    const d = g[y1 * gx + x1];
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  };
}

/** Tileable fbm over a w x h pixel canvas; `cells` = lattice cells across the base octave. */
function fbmField(w: number, h: number, cellsX: number, cellsY: number, octaves: number, seed: number) {
  const layers = Array.from({ length: octaves }, (_, o) => lattice(cellsX << o, cellsY << o, seed + o * 101));
  return (px: number, py: number) => {
    let s = 0;
    let a = 0.5;
    let n = 0;
    for (let o = 0; o < octaves; o++) {
      s += a * layers[o]((px / w) * (cellsX << o), (py / h) * (cellsY << o));
      n += a;
      a *= 0.5;
    }
    return s / n;
  };
}

function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function tex(c: HTMLCanvasElement, srgb: boolean, repeat = false) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  else t.wrapS = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

/** Turn a height field into a tangent-space normal map. */
function normalCanvas(hgt: Float32Array, w: number, h: number, strength: number, wrapY = false) {
  const c = canvas(w, h);
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(w, h);
  const at = (x: number, y: number) => {
    x = (x + w) % w;
    y = wrapY ? (y + h) % h : Math.min(h - 1, Math.max(0, y));
    return hgt[y * w + x];
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
      // canvas rows grow downward, texture v grows upward
      const dy = (at(x, y - 1) - at(x, y + 1)) * strength;
      const l = Math.hypot(dx, dy, 1);
      const i = (y * w + x) * 4;
      img.data[i] = ((-dx / l) * 0.5 + 0.5) * 255;
      img.data[i + 1] = ((-dy / l) * 0.5 + 0.5) * 255;
      img.data[i + 2] = ((1 / l) * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const sstep = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

// ---------- Rocket hull: brushed, riveted, panelled, sooty near the engine ----------
export const HULL_TOP = 1.9; // hull height in model units (texture v = y / HULL_TOP)

export function hullMaps(lite: boolean) {
  return once('hull' + lite, () => {
    const W = lite ? 512 : 1024;
    const H = lite ? 256 : 512;
    const k = W / 1024;
    const col = canvas(W, H);
    const orm = canvas(W, H);
    const hgt = new Float32Array(W * H).fill(0.5);
    const seamMask = new Float32Array(W * H);
    const rowOf = (y: number) => Math.round((1 - y / HULL_TOP) * H);

    // Panel seams (6 panels around, seams avoid the porthole at u = 0) and rivet rows.
    const vSeams = [0, 1, 2, 3, 4, 5].map((i) => ((i + 0.5) / 6) * W);
    const hSeams = [0.55, 1.62].map(rowOf);
    const groove = (x: number, y: number, depth: number) => {
      if (y < 0 || y >= H) return;
      const xi = ((Math.round(x) % W) + W) % W;
      hgt[y * W + xi] -= depth;
      seamMask[y * W + xi] = Math.max(seamMask[y * W + xi], depth * 2);
    };
    vSeams.forEach((sx) => {
      for (let y = 0; y < H; y++) {
        groove(sx, y, 0.5);
        groove(sx - 1, y, 0.22);
        groove(sx + 1, y, 0.22);
      }
    });
    hSeams.forEach((sy) => {
      for (let x = 0; x < W; x++) {
        groove(x, sy, 0.5);
        groove(x, sy - 1, 0.22);
        groove(x, sy + 1, 0.22);
      }
    });
    const rivets: [number, number][] = [];
    const pitch = Math.max(5, 9 * k);
    vSeams.forEach((sx) => {
      for (let y = pitch; y < H - pitch * 0.5; y += pitch) {
        rivets.push([sx - 6 * k, y], [sx + 6 * k, y]);
      }
    });
    hSeams.forEach((sy) => {
      for (let x = pitch * 0.5; x < W; x += pitch) {
        if (vSeams.some((sx) => Math.abs(sx - x) < 10 * k)) continue;
        rivets.push([x, sy - 6 * k], [x, sy + 6 * k]);
      }
    });
    const rr = Math.max(1.6, 2.4 * k);
    rivets.forEach(([cx, cy]) => {
      for (let y = Math.floor(cy - rr - 1); y <= cy + rr + 1; y++) {
        if (y < 0 || y >= H) continue;
        for (let x = Math.floor(cx - rr - 1); x <= cx + rr + 1; x++) {
          const d = Math.hypot(x - cx, y - cy) / rr;
          if (d > 1.35) continue;
          const xi = ((x % W) + W) % W;
          if (d <= 1) hgt[y * W + xi] += 0.55 * (1 - d * d);
          else hgt[y * W + xi] -= 0.12;
        }
      }
    });

    // Subtle hand-built dents
    const r = rng(7);
    for (let n = 0; n < 26; n++) {
      const cx = r() * W;
      const cy = r() * H;
      const rad = (18 + r() * 40) * k;
      const depth = 0.03 + r() * 0.05;
      for (let y = Math.max(0, Math.floor(cy - rad * 2)); y < Math.min(H, cy + rad * 2); y++) {
        for (let x = Math.floor(cx - rad * 2); x < cx + rad * 2; x++) {
          const d2 = ((x - cx) ** 2 + (y - cy) ** 2) / (rad * rad);
          const xi = ((x % W) + W) % W;
          hgt[y * W + xi] -= depth * Math.exp(-d2 * 2);
        }
      }
    }

    const brush = lattice(Math.round(10 * Math.max(1, k * 2)), Math.round(H * 0.9), 3);
    const large = fbmField(W, H, 6, 3, 4, 11);
    const streak = fbmField(W, H, 48, 3, 3, 23);
    const panelTint = [0.012, -0.018, 0.006, -0.01, 0.02, -0.004];
    const cctx = col.getContext('2d')!;
    const octx = orm.getContext('2d')!;
    const cimg = cctx.createImageData(W, H);
    const oimg = octx.createImageData(W, H);
    for (let y = 0; y < H; y++) {
      const v = 1 - y / H; // 0 at the engine, 1 under the nose
      const yy = v * HULL_TOP;
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        const b = brush((x / W) * 10 * Math.max(1, k * 2), y * 0.9) - 0.5;
        const lg = large(x, y) - 0.5;
        const panel = panelTint[Math.floor(((x / W) * 6 + 0.5) % 6)];
        const soot = sstep(0.42, 0.0, yy) * (0.45 + 0.75 * streak(x, y));
        const grime = sstep(0.75, 0.15, yy) * clamp01(0.5 + lg * 2) * 0.35;
        const seam = clamp01(seamMask[i]);
        let lum = 0.78 + b * 0.09 + lg * 0.06 + panel;
        lum *= 1 - seam * 0.45;
        lum *= 1 - grime * 0.25;
        let cr = lum;
        let cg = lum * 0.985;
        let cb = lum * 0.965;
        // Heat tint just above the engine collar: straw -> bronze -> blue
        const ht = sstep(0.16, 0.02, yy);
        if (ht > 0) {
          const s = clamp01(yy / 0.16);
          const tr = s > 0.5 ? 0.86 : 0.48 + s * 0.6;
          const tg = s > 0.5 ? 0.72 : 0.45 + s * 0.45;
          const tb = s > 0.5 ? 0.5 : 0.7 - s * 0.3;
          cr += (tr * lum - cr) * ht * 0.7;
          cg += (tg * lum - cg) * ht * 0.7;
          cb += (tb * lum - cb) * ht * 0.7;
        }
        const sd = clamp01(soot);
        cr *= 1 - sd * 0.78;
        cg *= 1 - sd * 0.8;
        cb *= 1 - sd * 0.82;
        const j = i * 4;
        cimg.data[j] = clamp01(cr) * 255;
        cimg.data[j + 1] = clamp01(cg) * 255;
        cimg.data[j + 2] = clamp01(cb) * 255;
        cimg.data[j + 3] = 255;
        const rough = 0.27 + Math.abs(b) * 0.16 + grime * 0.3 + sd * 0.5 + seam * 0.25 + Math.max(0, lg) * 0.08;
        const metal = 1 - sd * 0.45;
        oimg.data[j] = 255;
        oimg.data[j + 1] = clamp01(rough) * 255;
        oimg.data[j + 2] = clamp01(metal) * 255;
        oimg.data[j + 3] = 255;
        hgt[i] += b * 0.025;
      }
    }
    cctx.putImageData(cimg, 0, 0);
    octx.putImageData(oimg, 0, 0);

    // Scuffs and fine scratches: brighter + glossier in colour, varied roughness.
    for (let n = 0; n < (lite ? 140 : 320); n++) {
      const x = r() * W;
      const y = H * (0.15 + r() * 0.85);
      const len = (6 + r() * 40) * k;
      const a = (r() - 0.5) * 0.9 + (r() < 0.5 ? 0 : Math.PI);
      cctx.strokeStyle = `rgba(255,255,255,${0.05 + r() * 0.12})`;
      cctx.lineWidth = 0.6 + r() * 0.8;
      cctx.beginPath();
      cctx.moveTo(x, y);
      cctx.quadraticCurveTo(x + Math.cos(a) * len * 0.5, y + Math.sin(a) * len * 0.5 + (r() - 0.5) * 4, x + Math.cos(a) * len, y + Math.sin(a) * len);
      cctx.stroke();
      octx.strokeStyle = `rgba(255,${r() < 0.5 ? 20 : 150},255,${0.25 + r() * 0.3})`;
      octx.lineWidth = 1;
      octx.stroke();
    }
    // Soot streaks licking up from the engine
    for (let n = 0; n < (lite ? 30 : 70); n++) {
      const x = r() * W;
      const len = H * (0.05 + r() * 0.22);
      const g = cctx.createLinearGradient(0, H, 0, H - len);
      g.addColorStop(0, `rgba(18,14,12,${0.25 + r() * 0.35})`);
      g.addColorStop(1, 'rgba(18,14,12,0)');
      cctx.fillStyle = g;
      cctx.fillRect(x, H - len, (2 + r() * 8) * k, len);
    }

    const map = tex(col, true);
    const ormT = tex(orm, false);
    const normal = tex(normalCanvas(hgt, W, H, lite ? 2.2 : 3.2), false);
    return { map, orm: ormT, normal };
  });
}

// ---------- Lacquered red paint: tileable roughness / clearcoat variation ----------
export function paintMaps(lite: boolean) {
  return once('paint' + lite, () => {
    const S = lite ? 256 : 512;
    const col = canvas(S, S);
    const rough = canvas(S, S);
    const f = fbmField(S, S, 8, 8, 4, 41);
    const fine = fbmField(S, S, 64, 64, 2, 43);
    const cctx = col.getContext('2d')!;
    const rctx = rough.getContext('2d')!;
    const ci = cctx.createImageData(S, S);
    const ri = rctx.createImageData(S, S);
    for (let y = 0; y < S; y++)
      for (let x = 0; x < S; x++) {
        const j = (y * S + x) * 4;
        const n = f(x, y);
        const m = fine(x, y);
        const lum = 0.9 + (n - 0.5) * 0.12 + (m - 0.5) * 0.04;
        ci.data[j] = ci.data[j + 1] = ci.data[j + 2] = clamp01(lum) * 255;
        ci.data[j + 3] = 255;
        const rg = 0.32 + (n - 0.5) * 0.22 + (m - 0.5) * 0.08;
        ri.data[j] = 255;
        ri.data[j + 1] = clamp01(rg) * 255;
        ri.data[j + 2] = 0;
        ri.data[j + 3] = 255;
      }
    cctx.putImageData(ci, 0, 0);
    rctx.putImageData(ri, 0, 0);
    const r = rng(5);
    for (let n = 0; n < (lite ? 60 : 140); n++) {
      const x = r() * S;
      const y = r() * S;
      const len = 4 + r() * 22;
      const a = r() * Math.PI;
      rctx.strokeStyle = `rgba(255,${120 + r() * 120},0,${0.3 + r() * 0.4})`;
      rctx.lineWidth = 0.7;
      rctx.beginPath();
      rctx.moveTo(x, y);
      rctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
      rctx.stroke();
      cctx.strokeStyle = `rgba(255,255,255,${0.04 + r() * 0.08})`;
      cctx.stroke();
    }
    return { map: tex(col, true, true), rough: tex(rough, false, true) };
  });
}

// ---------- Engine bell: regeneratively cooled tube wall with heat tint ----------
export function bellMaps(lite: boolean) {
  return once('bell' + lite, () => {
    const W = lite ? 256 : 512;
    const H = lite ? 64 : 128;
    const tubes = lite ? 72 : 120;
    const col = canvas(W, H);
    const hgt = new Float32Array(W * H);
    const ctx = col.getContext('2d')!;
    const img = ctx.createImageData(W, H);
    const st = fbmField(W, H, 40, 2, 3, 61);
    const stops: [number, number, number, number][] = [
      [0.0, 0.2, 0.18, 0.3],
      [0.25, 0.3, 0.36, 0.58],
      [0.5, 0.62, 0.42, 0.26],
      [0.75, 0.82, 0.68, 0.46],
      [1.0, 0.62, 0.6, 0.6],
    ];
    const tint = (v: number) => {
      for (let i = 1; i < stops.length; i++)
        if (v <= stops[i][0]) {
          const a = stops[i - 1];
          const b = stops[i];
          const t = (v - a[0]) / (b[0] - a[0]);
          return [a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, a[3] + (b[3] - a[3]) * t];
        }
      return [stops[4][1], stops[4][2], stops[4][3]];
    };
    for (let y = 0; y < H; y++) {
      const v = 1 - y / H;
      const c = tint(v);
      for (let x = 0; x < W; x++) {
        const ph = ((x / W) * tubes) % 1;
        const tube = Math.sin(ph * Math.PI);
        hgt[y * W + x] = tube;
        const s = 0.75 + st(x, y) * 0.4;
        const sh = 0.55 + tube * 0.45;
        const j = (y * W + x) * 4;
        img.data[j] = clamp01(c[0] * s * sh) * 255;
        img.data[j + 1] = clamp01(c[1] * s * sh) * 255;
        img.data[j + 2] = clamp01(c[2] * s * sh) * 255;
        img.data[j + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return { map: tex(col, true), normal: tex(normalCanvas(hgt, W, H, 1.6), false) };
  });
}

// ---------- Warm cabin glow seen through the porthole ----------
export function cabinTexture() {
  return once('cabin', () => {
    const S = 256;
    const c = canvas(S, S);
    const g = c.getContext('2d')!;
    const bg = g.createRadialGradient(S * 0.5, S * 0.42, 4, S * 0.5, S * 0.5, S * 0.55);
    bg.addColorStop(0, '#ffd7a0');
    bg.addColorStop(0.35, '#f08a3c');
    bg.addColorStop(0.75, '#5a1e14');
    bg.addColorStop(1, '#140608');
    g.fillStyle = bg;
    g.fillRect(0, 0, S, S);
    // Console silhouette with indicator lights
    g.fillStyle = 'rgba(20,8,10,0.85)';
    g.beginPath();
    g.moveTo(0, S * 0.78);
    g.quadraticCurveTo(S * 0.5, S * 0.62, S, S * 0.78);
    g.lineTo(S, S);
    g.lineTo(0, S);
    g.fill();
    const lights = ['#5cf2ff', '#ff2e88', '#ffe066', '#7dff9a', '#5cf2ff', '#ff8a3c'];
    lights.forEach((cl, i) => {
      g.fillStyle = cl;
      g.beginPath();
      g.arc(S * (0.28 + i * 0.09), S * (0.78 - Math.sin((i / 5) * Math.PI) * 0.035), 3.2, 0, Math.PI * 2);
      g.fill();
    });
    // Seat back silhouette
    g.fillStyle = 'rgba(30,10,12,0.55)';
    g.beginPath();
    g.ellipse(S * 0.5, S * 0.6, S * 0.13, S * 0.2, 0, Math.PI, 0);
    g.fill();
    return tex(c, true);
  });
}

// ---------- Smoke puff atlas (2 x 2 cells), red channel = density ----------
export function smokeAtlas(lite: boolean) {
  return once('smoke' + lite, () => {
    const C = lite ? 128 : 256;
    const S = C * 2;
    const c = canvas(S, S);
    const ctx = c.getContext('2d')!;
    const img = ctx.createImageData(S, S);
    const r = rng(99);
    for (let cell = 0; cell < 4; cell++) {
      const ox = (cell % 2) * C;
      const oy = Math.floor(cell / 2) * C;
      const dens = new Float32Array(C * C);
      const blobs = Array.from({ length: 14 + Math.floor(r() * 8) }, () => {
        const a = r() * Math.PI * 2;
        const d = r() * 0.2;
        return { x: 0.5 + Math.cos(a) * d, y: 0.5 + Math.sin(a) * d * 0.85, r: 0.09 + r() * 0.16, w: 0.5 + r() * 0.6 };
      });
      const det = fbmField(C, C, 5, 5, 4, 300 + cell * 17);
      let max = 0;
      for (let y = 0; y < C; y++)
        for (let x = 0; x < C; x++) {
          const u = x / C;
          const v = y / C;
          let s = 0;
          for (const b of blobs) {
            const d2 = ((u - b.x) ** 2 + (v - b.y) ** 2) / (b.r * b.r);
            if (d2 < 4) s += b.w * Math.exp(-d2 * 1.6);
          }
          const rad = Math.hypot(u - 0.5, v - 0.5);
          s *= sstep(0.5, 0.28, rad);
          s *= 0.55 + det(x, y) * 0.9;
          dens[y * C + x] = s;
          if (s > max) max = s;
        }
      for (let y = 0; y < C; y++)
        for (let x = 0; x < C; x++) {
          const d = clamp01(dens[y * C + x] / max);
          const j = ((oy + y) * S + ox + x) * 4;
          const vv = Math.pow(d, 1.1) * 255;
          img.data[j] = vv;
          img.data[j + 1] = vv;
          img.data[j + 2] = vv;
          img.data[j + 3] = 255;
        }
    }
    ctx.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.NoColorSpace;
    return t;
  });
}

// ---------- Concrete (tileable) for the pad and ground ----------
export function concreteMaps(lite: boolean) {
  return once('concrete' + lite, () => {
    const S = lite ? 256 : 512;
    const col = canvas(S, S);
    const rough = canvas(S, S);
    const f = fbmField(S, S, 6, 6, 5, 501);
    const sp = fbmField(S, S, 96, 96, 1, 503);
    const ctx = col.getContext('2d')!;
    const rctx = rough.getContext('2d')!;
    const ci = ctx.createImageData(S, S);
    const ri = rctx.createImageData(S, S);
    const joint = S / 2;
    for (let y = 0; y < S; y++)
      for (let x = 0; x < S; x++) {
        const j = (y * S + x) * 4;
        const n = f(x, y);
        const s = sp(x, y);
        const jx = Math.min(x % joint, joint - (x % joint));
        const jy = Math.min(y % joint, joint - (y % joint));
        const jn = Math.min(jx, jy) < 1.2 ? 0.45 : 1;
        let lum = (0.34 + (n - 0.5) * 0.22 + (s > 0.78 ? 0.06 : s < 0.22 ? -0.05 : 0)) * jn;
        lum = clamp01(lum);
        ci.data[j] = lum * 255 * 1.0;
        ci.data[j + 1] = lum * 255 * 0.98;
        ci.data[j + 2] = lum * 255 * 0.95;
        ci.data[j + 3] = 255;
        ri.data[j] = 255;
        ri.data[j + 1] = clamp01(0.82 + (n - 0.5) * 0.2) * 255;
        ri.data[j + 2] = 0;
        ri.data[j + 3] = 255;
      }
    ctx.putImageData(ci, 0, 0);
    rctx.putImageData(ri, 0, 0);
    return { map: tex(col, true, true), rough: tex(rough, false, true) };
  });
}

/** Scorched pad centre: radial soot burn (multiplied over the deck). */
export function scorchTexture() {
  return once('scorch', () => {
    const S = 256;
    const c = canvas(S, S);
    const g = c.getContext('2d')!;
    g.fillStyle = '#fff';
    g.fillRect(0, 0, S, S);
    const r = rng(77);
    for (let i = 0; i < 90; i++) {
      const a = r() * Math.PI * 2;
      const d = r() * S * 0.3;
      const x = S / 2 + Math.cos(a) * d;
      const y = S / 2 + Math.sin(a) * d;
      const rad = 10 + r() * 40;
      const gr = g.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, `rgba(25,18,14,${0.12 + r() * 0.16})`);
      gr.addColorStop(1, 'rgba(25,18,14,0)');
      g.fillStyle = gr;
      g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    return tex(c, true);
  });
}

/** Soft radial glow (white centre to transparent) for sprites and lamp halos. */
export function glowTexture() {
  return once('glow', () => {
    const S = 128;
    const c = canvas(S, S);
    const g = c.getContext('2d')!;
    const gr = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.15, 'rgba(255,255,255,0.55)');
    gr.addColorStop(0.45, 'rgba(255,255,255,0.12)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, S, S);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  });
}

/** Radial alpha fade for the ground disc so it melts into the horizon. */
export function groundFade() {
  return once('groundFade', () => {
    const S = 256;
    const c = canvas(S, S);
    const g = c.getContext('2d')!;
    const gr = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    gr.addColorStop(0, '#fff');
    gr.addColorStop(0.35, '#fff');
    gr.addColorStop(1, '#000');
    g.fillStyle = gr;
    g.fillRect(0, 0, S, S);
    return tex(c, false);
  });
}
