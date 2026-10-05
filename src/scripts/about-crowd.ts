// "The crowd": a lattice of identical grey dots that sway in unison — everything
// that blends in. The rocket (and your pointer / taps) part the crowd and tint
// it pink. Plain 2D canvas, so it runs everywhere; static when motion is reduced.

type Ripple = { x: number; y: number; t0: number };
type Spark = { x: number; y: number; vx: number; vy: number; life: number; max: number };

export function initCrowd(canvas: HTMLCanvasElement, root: HTMLElement, anchor: HTMLElement, reduced: boolean) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  let w = 0;
  let h = 0;
  let dpr = 1;
  let pts: Float32Array = new Float32Array(0);
  const pointer = { x: -9999, y: -9999, tx: -9999, ty: -9999, on: false };
  const ripples: Ripple[] = [];
  const sparks: Spark[] = [];

  const build = () => {
    const r = root.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = r.width;
    h = r.height;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const s = w < 700 ? 19 : 25;
    const cols = Math.ceil(w / s) + 1;
    const rows = Math.ceil(h / s) + 1;
    const ox = (w - (cols - 1) * s) / 2;
    const oy = (h - (rows - 1) * s) / 2;
    pts = new Float32Array(cols * rows * 2);
    let k = 0;
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < cols; x++) {
        pts[k++] = ox + x * s;
        pts[k++] = oy + y * s;
      }
  };

  const rocket = () => {
    const a = anchor.getBoundingClientRect();
    const r = root.getBoundingClientRect();
    // centre of the hull (upper ~45% of the drawing), radius scaled to the drawing size
    // the drawing is tilted ~18° clockwise around (50%, 45%), so the nozzle sits down-left of centre
    const cx = a.left - r.left + a.width / 2;
    const cy = a.top - r.top + a.height * 0.45;
    return { x: cx + a.height * 0.02, y: cy - a.height * 0.06, R: Math.max(90, a.height * 0.42), nx: cx - a.height * 0.1, ny: cy + a.height * 0.31 };
  };

  const draw = (t: number) => {
    const rk = rocket();
    pointer.x += (pointer.tx - pointer.x) * 0.12;
    pointer.y += (pointer.ty - pointer.y) * 0.12;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const now = performance.now();
    for (let i = ripples.length - 1; i >= 0; i--) if (now - ripples[i].t0 > 1400) ripples.splice(i, 1);

    ctx.fillStyle = 'rgba(205, 205, 222, 0.2)';
    const hot: number[] = [];
    for (let i = 0; i < pts.length; i += 2) {
      const bx = pts[i];
      const by = pts[i + 1];
      // everyone sways together
      let x = bx + Math.sin(t * 0.7 + by * 0.011) * 2.2;
      let y = by + Math.cos(t * 0.55 + bx * 0.009) * 2.2;
      let heat = 0;
      // the rocket parts the crowd
      let dx = x - rk.x;
      let dy = (y - rk.y) * 0.62;
      let d = Math.hypot(dx, dy) || 1;
      if (d < rk.R * 1.35) {
        const f = Math.pow(1 - d / (rk.R * 1.35), 2);
        x += (dx / d) * f * rk.R * 0.42;
        y += (dy / d) * f * rk.R * 0.3;
        heat = Math.max(heat, f * 1.4);
      }
      // so does the pointer
      if (pointer.on) {
        dx = x - pointer.x;
        dy = y - pointer.y;
        d = Math.hypot(dx, dy) || 1;
        if (d < 130) {
          const f = Math.pow(1 - d / 130, 2);
          x += (dx / d) * f * 34;
          y += (dy / d) * f * 34;
          heat = Math.max(heat, f * 1.2);
        }
      }
      for (const rp of ripples) {
        const age = (now - rp.t0) / 1400;
        const rad = age * 420;
        dx = x - rp.x;
        dy = y - rp.y;
        d = Math.hypot(dx, dy) || 1;
        const band = 1 - Math.min(1, Math.abs(d - rad) / 46);
        if (band > 0) {
          const f = band * (1 - age);
          x += (dx / d) * f * 18;
          y += (dy / d) * f * 18;
          heat = Math.max(heat, f);
        }
      }
      if (heat > 0.04) hot.push(x, y, Math.min(1, heat));
      else ctx.fillRect(x - 0.9, y - 0.9, 1.8, 1.8);
    }
    for (let i = 0; i < hot.length; i += 3) {
      const f = hot[i + 2];
      const s = 1.8 + f * 2.6;
      ctx.fillStyle = `rgba(255, ${Math.round(150 - f * 104)}, ${Math.round(200 - f * 64)}, ${0.25 + f * 0.7})`;
      ctx.fillRect(hot[i] - s / 2, hot[i + 1] - s / 2, s, s);
    }

    // exhaust sparks drifting from the nozzle
    if (!reduced && sparks.length < 70) {
      const sp = 1.6 + Math.random() * 2.2;
      const ang = 0.31 + (Math.random() - 0.5) * 0.5; // along the hull axis, slightly fanned
      sparks.push({ x: rk.nx + (Math.random() - 0.5) * rk.R * 0.15, y: rk.ny, vx: -Math.sin(ang) * sp, vy: Math.cos(ang) * sp, life: 0, max: 50 + Math.random() * 60 });
    }
    for (let i = sparks.length - 1; i >= 0; i--) {
      const p = sparks[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.99;
      p.life++;
      if (p.life > p.max) {
        sparks.splice(i, 1);
        continue;
      }
      const a = 1 - p.life / p.max;
      ctx.fillStyle = `rgba(255, ${Math.round(46 + a * 150)}, ${Math.round(136 + a * 40)}, ${a * 0.85})`;
      const s = 1 + a * 2.4;
      ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
    }
  };

  build();
  const ro = new ResizeObserver(() => {
    build();
    if (reduced) draw(0);
  });
  ro.observe(root);

  if (reduced) {
    draw(0);
    // the rocket anchor can move on resize/font load; repaint once things settle
    window.addEventListener('load', () => draw(0));
    return;
  }

  root.addEventListener('pointermove', (e) => {
    const r = root.getBoundingClientRect();
    pointer.tx = e.clientX - r.left;
    pointer.ty = e.clientY - r.top;
    if (!pointer.on) {
      pointer.x = pointer.tx;
      pointer.y = pointer.ty;
    }
    pointer.on = e.pointerType === 'mouse';
  });
  root.addEventListener('pointerleave', () => (pointer.on = false));
  root.addEventListener('pointerdown', (e) => {
    const r = root.getBoundingClientRect();
    ripples.push({ x: e.clientX - r.left, y: e.clientY - r.top, t0: performance.now() });
  });

  let visible = true;
  let raf = 0;
  const t0 = performance.now();
  const loop = () => {
    raf = 0;
    if (!visible || document.hidden) return;
    draw((performance.now() - t0) / 1000);
    raf = requestAnimationFrame(loop);
  };
  const io = new IntersectionObserver((e) => {
    visible = e[0]?.isIntersecting ?? true;
    if (visible && !raf) raf = requestAnimationFrame(loop);
  });
  io.observe(root);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && visible && !raf) raf = requestAnimationFrame(loop);
  });
}
