// Fishwife concept, the "Tin O'Clock" hero tin.
// A procedural rounded-rectangle tin with an original illustrated wrap label
// (CanvasTexture), a pull-ring lid that peels back as you scroll, drag-to-spin,
// and a flavour switcher that redraws the label and swaps what's inside.
import { createStage, THREE } from './core';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { flavours, fish, FW, type Flavour } from '../../data/cases/fishwife';

gsap.registerPlugin(ScrollTrigger);

// Tin dimensions (world units): length × depth × height, corner radius.
const W = 3.4;
const D = 2.2;
const H = 0.82;
const R = 0.46;
const LW = W - 0.05;
const LD = D - 0.05;

function rounded(w: number, d: number, r: number, fromBack = false) {
  const s = new THREE.Shape();
  const x = w / 2;
  const y = d / 2;
  if (fromBack) {
    // Start at the back-middle so the label seam hides at the back.
    s.moveTo(0, -y);
    s.lineTo(x - r, -y);
    s.quadraticCurveTo(x, -y, x, -y + r);
    s.lineTo(x, y - r);
    s.quadraticCurveTo(x, y, x - r, y);
    s.lineTo(-x + r, y);
    s.quadraticCurveTo(-x, y, -x, y - r);
    s.lineTo(-x, -y + r);
    s.quadraticCurveTo(-x, -y, -x + r, -y);
    s.lineTo(0, -y);
  } else {
    s.moveTo(-x + r, -y);
    s.lineTo(x - r, -y);
    s.quadraticCurveTo(x, -y, x, -y + r);
    s.lineTo(x, y - r);
    s.quadraticCurveTo(x, y, x - r, y);
    s.lineTo(-x + r, y);
    s.quadraticCurveTo(-x, y, -x, y - r);
    s.lineTo(-x, -y + r);
    s.quadraticCurveTo(-x, -y, -x + r, -y);
  }
  return s;
}

/** The wrap band: a strip around the rounded-rect perimeter with arc-length UVs. */
function bandGeometry(n = 220) {
  const pts = rounded(W, D, R, true).getSpacedPoints(n);
  const pos: number[] = [];
  const nor: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= n; i++) {
    const p = pts[i % n];
    const a = pts[(i - 1 + n) % n];
    const b = pts[(i + 1) % n];
    const tx = b.x - a.x;
    const tz = b.y - a.y;
    const len = Math.hypot(tx, tz) || 1;
    const nx = tz / len;
    const nz = -tx / len;
    const u = 1 - i / n;
    pos.push(p.x, 0, p.y, p.x, H, p.y);
    nor.push(nx, 0, nz, nx, 0, nz);
    uv.push(u, 0, u, 1);
  }
  for (let i = 0; i < n; i++) {
    const a = i * 2;
    idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

function rim(grow: number, inset: number, depth: number) {
  const s = rounded(W + grow, D + grow, R + grow / 2);
  s.holes.push(rounded(W - inset, D - inset, Math.max(0.05, R - inset / 2)));
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 2, curveSegments: 20 });
  g.rotateX(-Math.PI / 2);
  return g;
}

/* ---------------- Canvas art: original folk-style label ---------------- */
const fishPaths = {
  body: new Path2D(fish.body),
  finTop: new Path2D(fish.finTop),
  finLow: new Path2D(fish.finLow),
  gill: new Path2D(fish.gill),
  scales: new Path2D(fish.scales),
  tail: new Path2D(fish.tailLines),
  mouth: new Path2D(fish.mouth),
};

function drawFish(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, rot: number, fill: string, ink: string, fin: string, flip = false) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(flip ? -scale : scale, scale);
  ctx.translate(-60, -30);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = ink;
  ctx.lineWidth = 2.6;
  ctx.fillStyle = fin;
  ctx.fill(fishPaths.finTop);
  ctx.stroke(fishPaths.finTop);
  ctx.fill(fishPaths.finLow);
  ctx.stroke(fishPaths.finLow);
  ctx.fillStyle = fill;
  ctx.fill(fishPaths.body);
  ctx.stroke(fishPaths.body);
  ctx.lineWidth = 2;
  ctx.stroke(fishPaths.gill);
  ctx.stroke(fishPaths.scales);
  ctx.stroke(fishPaths.tail);
  ctx.stroke(fishPaths.mouth);
  ctx.beginPath();
  ctx.arc(fish.eye.cx, fish.eye.cy, fish.eye.r, 0, Math.PI * 2);
  ctx.fillStyle = '#fff';
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(fish.eye.cx + 1, fish.eye.cy, 2.2, 0, Math.PI * 2);
  ctx.fillStyle = ink;
  ctx.fill();
  ctx.restore();
}

/** Hand-lettered feel: per-letter wobble plus an offset "print" shadow. */
function folk(ctx: CanvasRenderingContext2D, text: string, cx: number, cy: number, size: number, fill: string, shadow: string, font = 'italic 700') {
  ctx.save();
  ctx.font = `${font} ${size}px Georgia, 'Times New Roman', serif`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  const track = size * 0.02;
  const widths = [...text].map((c) => ctx.measureText(c).width + track);
  const total = widths.reduce((a, b) => a + b, 0);
  let x = cx - total / 2;
  [...text].forEach((c, i) => {
    const r = Math.sin(i * 2.3 + 1) * 0.07;
    const dy = Math.sin(i * 1.7) * size * 0.04;
    ctx.save();
    ctx.translate(x + widths[i] / 2, cy + dy);
    ctx.rotate(r);
    ctx.fillStyle = shadow;
    ctx.fillText(c, -widths[i] / 2 + size * 0.06, size * 0.06);
    ctx.fillStyle = fill;
    ctx.fillText(c, -widths[i] / 2, 0);
    ctx.restore();
    x += widths[i];
  });
  ctx.restore();
  return total;
}

function clock(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, face: string, ink: string, pop: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = face;
  ctx.strokeStyle = ink;
  ctx.lineWidth = r * 0.07;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(Math.sin(a) * r * 0.78, -Math.cos(a) * r * 0.78, r * (i % 3 === 0 ? 0.07 : 0.04), 0, Math.PI * 2);
    ctx.fillStyle = ink;
    ctx.fill();
  }
  ctx.lineCap = 'round';
  // 12:30, hour hand halfway to 1, minute hand on 6.
  const hand = (a: number, len: number, w: number, c: string) => {
    ctx.strokeStyle = c;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.sin(a) * len, -Math.cos(a) * len);
    ctx.stroke();
  };
  hand((0.5 / 12) * Math.PI * 2, r * 0.48, r * 0.11, ink);
  hand(Math.PI, r * 0.68, r * 0.08, pop);
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.09, 0, Math.PI * 2);
  ctx.fillStyle = pop;
  ctx.fill();
  ctx.restore();
}

function sparkle(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, c: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = c;
  ctx.beginPath();
  ctx.moveTo(0, -s);
  ctx.quadraticCurveTo(0, 0, s, 0);
  ctx.quadraticCurveTo(0, 0, 0, s);
  ctx.quadraticCurveTo(0, 0, -s, 0);
  ctx.quadraticCurveTo(0, 0, 0, -s);
  ctx.fill();
  ctx.restore();
}

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function fitFont(ctx: CanvasRenderingContext2D, text: string, maxW: number, start: number, weight = '800', family = 'Montserrat, Arial, sans-serif') {
  let s = start;
  do {
    ctx.font = `${weight} ${s}px ${family}`;
    s -= 2;
  } while (ctx.measureText(text).width > maxW && s > 10);
  return s + 2;
}

function drawLid(c: HTMLCanvasElement, f: Flavour) {
  const ctx = c.getContext('2d')!;
  const w = c.width;
  const h = c.height;
  const k = w / 1280;
  ctx.clearRect(0, 0, w, h);
  ctx.save();
  ctx.scale(k, k);
  const cw = 1280;
  const ch = 1280 * (h / w);
  const rad = (R / LW) * cw;
  rr(ctx, 0, 0, cw, ch, rad);
  ctx.fillStyle = f.bg;
  ctx.fill();
  ctx.clip();
  // Pressed rim line + dotted inner border.
  ctx.strokeStyle = f.ink;
  ctx.lineWidth = 7;
  rr(ctx, 30, 30, cw - 60, ch - 60, rad - 26);
  ctx.stroke();
  ctx.setLineDash([2, 16]);
  ctx.lineCap = 'round';
  ctx.lineWidth = 7;
  rr(ctx, 52, 52, cw - 104, ch - 104, rad - 46);
  ctx.stroke();
  ctx.setLineDash([]);
  // Scallop rows.
  ctx.fillStyle = f.ink;
  for (let x = 90; x < cw - 80; x += 44) {
    ctx.beginPath();
    ctx.arc(x, 78, 12, 0, Math.PI);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, ch - 78, 12, Math.PI, 0);
    ctx.fill();
  }
  // Sun-ray wedges behind the fish.
  ctx.save();
  ctx.translate(cw * 0.42, ch * 0.56);
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = f.ink;
  for (let i = 0; i < 18; i++) {
    ctx.rotate((Math.PI * 2) / 18);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(560, -40);
    ctx.lineTo(560, 40);
    ctx.fill();
  }
  ctx.restore();
  // Big fish + a little one.
  drawFish(ctx, cw * 0.42, ch * 0.57, 4.2, -0.12, f.fishFill, f.ink, f.pop);
  drawFish(ctx, cw * 0.17, ch * 0.33, 1.25, 0.25, f.pop, f.ink, f.fishFill, true);
  // Clock badge.
  clock(ctx, cw * 0.82, ch * 0.36, 118, FW.cream, f.ink, f.pop);
  ctx.save();
  ctx.font = `800 26px Montserrat, Arial, sans-serif`;
  ctx.fillStyle = f.ink;
  ctx.textAlign = 'center';
  ctx.fillText('WEEKDAYS', cw * 0.82, ch * 0.36 + 162);
  ctx.restore();
  // Lettering.
  folk(ctx, 'Tin O’Clock', cw * 0.4, ch * 0.22, 138, f.ink, f.pop);
  // Flavour ribbon.
  const rw = cw * 0.72;
  const rx = (cw - rw) / 2;
  const ry = ch - 196;
  ctx.fillStyle = f.ink;
  ctx.beginPath();
  ctx.moveTo(rx - 40, ry + 6);
  ctx.lineTo(rx, ry + 42);
  ctx.lineTo(rx - 40, ry + 78);
  ctx.lineTo(rx + rw + 40, ry + 78);
  ctx.lineTo(rx + rw, ry + 42);
  ctx.lineTo(rx + rw + 40, ry + 6);
  ctx.closePath();
  ctx.fill();
  const label = f.name.toUpperCase();
  fitFont(ctx, label, rw - 40, 36);
  ctx.fillStyle = f.bg;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, cw / 2, ry + 44);
  sparkle(ctx, cw * 0.66, ch * 0.2, 22, f.pop);
  sparkle(ctx, cw * 0.1, ch * 0.62, 18, f.ink);
  sparkle(ctx, cw * 0.72, ch * 0.62, 16, f.pop);
  ctx.restore();
}

function drawBand(c: HTMLCanvasElement, f: Flavour) {
  const ctx = c.getContext('2d')!;
  const w = c.width;
  const h = c.height;
  ctx.fillStyle = f.bg;
  ctx.fillRect(0, 0, w, h);
  // Checker stripes top & bottom.
  const sq = 18;
  for (let x = 0; x < w; x += sq) {
    const on = (x / sq) % 2 === 0;
    ctx.fillStyle = on ? f.ink : FW.cream;
    ctx.fillRect(x, 0, sq, sq);
    ctx.fillRect(x, h - sq, sq, sq);
    ctx.fillStyle = on ? FW.cream : f.ink;
    ctx.fillRect(x, sq, sq, sq * 0.5);
    ctx.fillRect(x, h - sq * 1.5, sq, sq * 0.5);
  }
  // Wave line.
  ctx.strokeStyle = f.ink;
  ctx.globalAlpha = 0.25;
  ctx.lineWidth = 4;
  ctx.beginPath();
  for (let x = 0; x <= w; x += 8) ctx.lineTo(x, h * 0.78 + Math.sin(x / 26) * 6);
  ctx.stroke();
  ctx.globalAlpha = 1;
  const at = (u: number) => u * w;
  // Front: lettering flanked by fish.
  folk(ctx, 'TIN O’CLOCK', at(0.5), h * 0.47, 84, f.ink, f.pop, '700');
  drawFish(ctx, at(0.37), h * 0.48, 0.95, 0.06, f.fishFill, f.ink, f.pop, true);
  drawFish(ctx, at(0.63), h * 0.48, 0.95, -0.06, f.fishFill, f.ink, f.pop);
  // Sides: clocks.
  clock(ctx, at(0.25), h * 0.48, 66, FW.cream, f.ink, f.pop);
  clock(ctx, at(0.75), h * 0.48, 66, FW.cream, f.ink, f.pop);
  // Back: flavour + concept credit.
  ctx.fillStyle = f.ink;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  fitFont(ctx, f.short.toUpperCase(), w * 0.14, 40);
  ctx.fillText(f.short.toUpperCase(), at(0.08), h * 0.42);
  ctx.font = `600 22px Inter, Arial, sans-serif`;
  ctx.fillText('weekdays · 12:30', at(0.08), h * 0.62);
  fitFont(ctx, 'A NUUKE CONCEPT LABEL', w * 0.12, 26, '700', 'Inter, Arial, sans-serif');
  ctx.fillText('A NUUKE CONCEPT LABEL', at(0.92), h * 0.48);
  for (const u of [0.16, 0.31, 0.44, 0.56, 0.69, 0.84]) sparkle(ctx, at(u), h * 0.5, 14, f.pop);
}

function alphaCanvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#fff';
  rr(ctx, 0, 0, w, h, (R / LW) * w);
  ctx.fill();
  return c;
}

function stripesTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, 256, 256);
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#fff';
  for (let y = -256; y < 512; y += 30) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(256, y + 90);
    ctx.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(2, 3);
  return t;
}

function blobTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(128, 128, 10, 128, 128, 128);
  g.addColorStop(0, 'rgba(0,0,0,0.55)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

/* ---------------- Scene ---------------- */
export async function init(root: HTMLElement) {
  const canvas = root.querySelector<HTMLCanvasElement>('[data-fw-canvas]')!;
  const stage = createStage(canvas, { fov: 30, z: 10 });
  const { scene, camera, pointer, reduced } = stage;
  const metal = new THREE.MeshStandardMaterial({ color: 0xd8dbe0, metalness: 1, roughness: 0.28 });
  const darkMetal = new THREE.MeshStandardMaterial({ color: 0xaeb3ba, metalness: 1, roughness: 0.4, side: THREE.BackSide });

  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const key = new THREE.DirectionalLight(0xffffff, 2.3);
  key.position.set(3, 7, 5);
  scene.add(key);
  const glow = new THREE.PointLight(new THREE.Color(FW.red), 22, 14);
  glow.position.set(-4, 2, 3);
  scene.add(glow);

  const rig = new THREE.Group();
  scene.add(rig);
  const tin = new THREE.Group();
  tin.position.y = -H / 2;
  rig.add(tin);

  // Label textures.
  const lidCanvas = document.createElement('canvas');
  lidCanvas.width = 1280;
  lidCanvas.height = Math.round(1280 * (LD / LW));
  const bandCanvas = document.createElement('canvas');
  bandCanvas.width = 3072;
  bandCanvas.height = 248;
  const lidTex = new THREE.CanvasTexture(lidCanvas);
  const bandTex = new THREE.CanvasTexture(bandCanvas);
  for (const t of [lidTex, bandTex]) {
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
  }
  const alphaTex = new THREE.CanvasTexture(alphaCanvas(512, Math.round(512 * (LD / LW))));

  // Body: label band (outside), metal (inside), rims, bottom.
  const band = bandGeometry();
  const label = new THREE.Mesh(band, new THREE.MeshStandardMaterial({ map: bandTex, roughness: 0.5, metalness: 0.05 }));
  tin.add(label);
  const inner = new THREE.Mesh(band, darkMetal);
  inner.scale.set(0.985, 1, 0.98);
  tin.add(inner);
  const topRim = new THREE.Mesh(rim(0.07, 0.1, 0.06), metal);
  topRim.position.y = H - 0.03;
  tin.add(topRim);
  const botRim = new THREE.Mesh(rim(0.07, 0.6, 0.07), metal);
  botRim.position.y = -0.04;
  tin.add(botRim);
  const bottom = new THREE.Mesh(new THREE.ShapeGeometry(rounded(W, D, R), 20), metal);
  bottom.geometry.rotateX(Math.PI / 2);
  tin.add(bottom);

  // Contents: oil + fish + garnish variants.
  const oilY = H - 0.26;
  const oil = new THREE.Mesh(new THREE.ShapeGeometry(rounded(W - 0.04, D - 0.04, R - 0.02), 20), new THREE.MeshPhysicalMaterial({ color: 0xb9862c, roughness: 0.12, clearcoat: 1, metalness: 0.1 }));
  oil.geometry.rotateX(-Math.PI / 2);
  oil.position.y = oilY;
  tin.add(oil);

  const fishMat = new THREE.MeshStandardMaterial({ color: 0xef8a5c, roughness: 0.5 });
  const stripeTex = stripesTexture();
  const filletMat = new THREE.MeshStandardMaterial({ color: 0xef8a5c, roughness: 0.45, emissive: 0x6a4436, emissiveMap: stripeTex });
  const kinds: Record<'fillet' | 'sardine' | 'chunk', THREE.Group> = { fillet: new THREE.Group(), sardine: new THREE.Group(), chunk: new THREE.Group() };
  [-0.62, 0, 0.62].forEach((z, i) => {
    const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.29, 2.15, 6, 20), filletMat);
    m.rotation.set(0, (i - 1) * 0.05, Math.PI / 2);
    m.scale.set(0.36, 1, 1);
    m.position.set(i === 1 ? 0.1 : -0.05, oilY + 0.04, z);
    kinds.fillet.add(m);
  });
  const sardMat = new THREE.MeshStandardMaterial({ color: 0x8e9cab, roughness: 0.25, metalness: 0.55 });
  [-0.76, -0.38, 0, 0.38, 0.76].forEach((z, i) => {
    const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 2.3, 6, 14), i % 2 ? fishMat : sardMat);
    m.rotation.z = Math.PI / 2;
    m.scale.set(0.6, 1, 1);
    m.position.set(i % 2 ? 0.12 : -0.12, oilY + 0.04, z);
    kinds.sardine.add(m);
  });
  for (let i = 0; i < 9; i++) {
    const m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.32, 0), fishMat);
    m.scale.set(1.2, 0.5, 0.9);
    m.position.set(-1.1 + (i % 3) * 1.1 + Math.sin(i * 3) * 0.12, oilY + 0.05, -0.62 + Math.floor(i / 3) * 0.62);
    m.rotation.set(i, i * 2, 0);
    kinds.chunk.add(m);
  }
  Object.values(kinds).forEach((g) => tin.add(g));

  const chili = new THREE.InstancedMesh(new THREE.BoxGeometry(0.05, 0.012, 0.035), new THREE.MeshStandardMaterial({ color: 0x8f1d12, roughness: 0.35 }), 140);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 140; i++) {
    const zz = Math.cos(i * 78.233) * 0.85;
    const lane = Math.round(zz / 0.62) * 0.62;
    dummy.position.set(Math.sin(i * 12.9898) * 1.3, oilY + 0.1 - Math.abs(zz - lane) * 0.12, zz);
    dummy.rotation.set(i, i * 0.7, i * 1.3);
    dummy.updateMatrix();
    chili.setMatrixAt(i, dummy.matrix);
  }
  tin.add(chili);
  const lemon = new THREE.Group();
  const lemonMat = new THREE.MeshStandardMaterial({ color: 0xf6d047, roughness: 0.45 });
  [[-1.05, 0.55, 0.4], [0.35, -0.5, 2.6], [1.15, 0.45, -0.6]].forEach(([x, z, r]) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.04, 22, 1, false, 0, Math.PI), lemonMat);
    m.position.set(x, oilY + 0.12, z);
    m.rotation.y = r;
    lemon.add(m);
  });
  tin.add(lemon);

  // Lid: subdivided plane we bend on the CPU.
  const lidGeo = new THREE.PlaneGeometry(LW, LD, 120, 2);
  lidGeo.rotateX(-Math.PI / 2);
  const lidPos = lidGeo.attributes.position as THREE.BufferAttribute;
  const baseX = Float32Array.from({ length: lidPos.count }, (_, i) => lidPos.getX(i));
  const lidTop = new THREE.Mesh(lidGeo, new THREE.MeshStandardMaterial({ map: lidTex, alphaMap: alphaTex, alphaTest: 0.5, roughness: 0.42, metalness: 0.12 }));
  const lidUnder = new THREE.Mesh(lidGeo, new THREE.MeshStandardMaterial({ color: 0xd2d6db, metalness: 1, roughness: 0.3, alphaMap: alphaTex, alphaTest: 0.5, side: THREE.BackSide }));
  tin.add(lidTop, lidUnder);

  // Pull ring, pivoting on its rivet.
  const ringAnchor = new THREE.Group();
  const ringPivot = new THREE.Group();
  ringAnchor.add(ringPivot);
  tin.add(ringAnchor);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.035, 10, 40), metal);
  ring.rotation.x = Math.PI / 2;
  ring.scale.set(1, 1.25, 1);
  ring.position.set(0.28, 0.03, 0);
  const tab = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.02, 0.16), metal);
  tab.position.set(0.08, 0.02, 0);
  const rivet = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.04, 16), metal);
  rivet.position.y = 0.01;
  ringPivot.add(ring, tab, rivet);
  const rivetX = LW / 2 - 0.62;

  // Contact shadow.
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(6, 4.4), new THREE.MeshBasicMaterial({ map: blobTexture(), transparent: true, depthWrite: false }));
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = -H / 2 - 0.07;
  rig.add(blob);

  // Curl model: everything past the fold line wraps a cylinder, then continues straight.
  const Rc = 0.36;
  const TMAX = 1.8;
  const lidY = H + 0.012;
  const curl = (x: number, x0: number): [number, number, number] => {
    const s = x - x0;
    if (s <= 0) return [x, lidY, 0];
    const arc = Rc * TMAX;
    if (s < arc) {
      const t = s / Rc;
      return [x0 + Rc * Math.sin(t), lidY + Rc * (1 - Math.cos(t)), t];
    }
    const bx = x0 + Rc * Math.sin(TMAX);
    const by = lidY + Rc * (1 - Math.cos(TMAX));
    return [bx + (s - arc) * Math.cos(TMAX), by + (s - arc) * Math.sin(TMAX), TMAX];
  };

  // State.
  const st = { p: 0, peel: 0, lift: 0, spin: -0.5, vel: 0, flavour: 0 };
  let lastPeel = -1;
  let down = false;
  let lx = 0;
  const steps = [...root.querySelectorAll<HTMLElement>('[data-step]')];
  const setStep = (p: number) => {
    const i = p < 0.18 ? 0 : p < 0.72 ? 1 : 2;
    steps.forEach((s, j) => s.classList.toggle('is-on', j === i));
  };
  setStep(0);

  const applyFlavour = (i: number) => {
    const f = flavours[i];
    st.flavour = i;
    drawLid(lidCanvas, f);
    drawBand(bandCanvas, f);
    lidTex.needsUpdate = true;
    bandTex.needsUpdate = true;
    fishMat.color.set(f.contents.color);
    filletMat.color.set(f.contents.color);
    (Object.keys(kinds) as (keyof typeof kinds)[]).forEach((k) => (kinds[k].visible = k === f.contents.fish));
    chili.visible = f.contents.garnish === 'chili';
    lemon.visible = f.contents.garnish === 'lemon';
    glow.color.set(f.pop === FW.cream ? f.bg : f.pop);
    root.style.setProperty('--fw-tin-bg', f.bg);
    root.querySelectorAll<HTMLButtonElement>('[data-flavour]').forEach((b, j) => b.setAttribute('aria-pressed', String(j === i)));
    const name = root.querySelector<HTMLElement>('[data-flavour-name]');
    if (name) name.textContent = f.name;
  };
  await document.fonts?.ready;
  applyFlavour(0);

  root.querySelectorAll<HTMLButtonElement>('[data-flavour]').forEach((b, i) =>
    b.addEventListener('click', () => {
      applyFlavour(i);
      if (!reduced) st.vel += 0.16;
      kick();
    }),
  );

  // Scroll: ring lifts, then the lid peels.
  ScrollTrigger.create({
    trigger: root,
    start: 'top top',
    end: 'bottom bottom',
    scrub: reduced ? false : 0.6,
    onUpdate: (s) => {
      st.p = s.progress;
      setStep(s.progress);
      kick();
    },
  });

  // Drag to spin (with inertia).
  canvas.addEventListener('pointerdown', (e) => {
    down = true;
    lx = e.clientX;
    canvas.setPointerCapture(e.pointerId);
    canvas.classList.add('is-grabbing');
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!down) return;
    const dx = (e.clientX - lx) * 0.01;
    lx = e.clientX;
    st.spin += dx;
    st.vel = dx;
    kick();
  });
  const up = () => {
    down = false;
    canvas.classList.remove('is-grabbing');
  };
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  // Keyboard: arrows spin when the stage is focused.
  canvas.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      st.spin += e.key === 'ArrowLeft' ? -0.3 : 0.3;
      e.preventDefault();
      kick();
    }
  });

  function update(t: number, dt: number) {
    const p = st.p;
    const liftT = Math.min(1, p / 0.16);
    const peelT = Math.min(1, Math.max(0, (p - 0.16) / 0.62));
    st.lift += (liftT - st.lift) * (reduced ? 1 : 0.15);
    st.peel += (peelT - st.peel) * (reduced ? 1 : 0.15);

    if (Math.abs(st.peel - lastPeel) > 0.0005) {
      lastPeel = st.peel;
      const x0 = LW / 2 + 0.02 - st.peel * (LW - 0.2);
      for (let i = 0; i < lidPos.count; i++) {
        const [x, y] = curl(baseX[i], x0);
        lidPos.setX(i, x);
        lidPos.setY(i, y);
      }
      lidPos.needsUpdate = true;
      lidGeo.computeVertexNormals();
      lidGeo.computeBoundingSphere();
      const [rx, ry, rt] = curl(rivetX, x0);
      ringAnchor.position.set(rx, ry, 0);
      ringAnchor.rotation.z = rt;
    }
    ringPivot.rotation.z = st.lift * 1.05 * (1 - Math.min(1, st.peel * 3) * 0.5);

    if (!down && !reduced) {
      st.vel *= 0.94;
      st.spin += st.vel + dt * 0.12 * (1 - st.peel * 0.6);
    }
    rig.rotation.y = st.spin + pointer.x * 0.12;
    rig.rotation.x = -pointer.y * 0.05;
    rig.position.y = reduced ? 0 : Math.sin(t * 1.2) * 0.04;

    // Fit the tin to the canvas, and lean in as the lid opens.
    const vfov = (camera.fov * Math.PI) / 180;
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect);
    const wide = 5.4 + st.peel * 0.6;
    const tall = 3.2 + st.peel * 3.4;
    const dist = Math.max(wide / 2 / Math.tan(hfov / 2), tall / 2 / Math.tan(vfov / 2));
    const elev = 0.62 - st.peel * 0.12;
    camera.position.set(0, Math.sin(elev) * dist, Math.cos(elev) * dist);
    camera.lookAt(0, st.peel * 1.25, 0);
  }
  function kick() {
    if (reduced) {
      update(0, 0);
      stage.render();
    }
  }
  stage.onFrame(update);
  kick();
  root.classList.add('is-ready');
}
