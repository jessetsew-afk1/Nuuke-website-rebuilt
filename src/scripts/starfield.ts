// Full-screen twinkling starfield in raw WebGL (~2 KB, no Three.js), with depth parallax on scroll.

const VERT = `
attribute vec3 a_pos;      // x,y in [-1,1], z = depth 0..1
attribute float a_seed;
uniform float u_time;
uniform float u_scroll;
uniform vec2 u_res;
uniform float u_dpr;
varying float v_alpha;
void main() {
  float depth = a_pos.z;
  float y = a_pos.y + u_scroll * (0.05 + depth * 0.35);
  y = mod(y + 1.0, 2.0) - 1.0;
  float x = a_pos.x + sin(u_time * 0.02 + a_seed * 6.28) * 0.004 * depth;
  gl_Position = vec4(x, y, 0.0, 1.0);
  float tw = 0.55 + 0.45 * sin(u_time * (0.6 + a_seed * 1.8) + a_seed * 40.0);
  v_alpha = (0.25 + depth * 0.75) * tw;
  gl_PointSize = (0.6 + depth * depth * 2.2) * u_dpr;
}`;

const FRAG = `
precision mediump float;
varying float v_alpha;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  float a = smoothstep(0.5, 0.0, d) * v_alpha;
  gl_FragColor = vec4(vec3(1.0), a);
}`;

export function initStarfield(canvas: HTMLCanvasElement | null) {
  if (!canvas) return;
  const gl = canvas.getContext('webgl', { alpha: true, antialias: false, premultipliedAlpha: false, powerPreference: 'low-power' });
  if (!gl) return;
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  const software = ext ? /swiftshader|llvmpipe|softpipe|software|basic render/i.test(String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL))) : false;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches || software;

  const compile = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  };
  const prog = gl.createProgram()!;
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  gl.useProgram(prog);

  const isSmall = window.innerWidth < 700;
  const COUNT = isSmall ? 650 : 1400;
  const data = new Float32Array(COUNT * 4);
  for (let i = 0; i < COUNT; i++) {
    data[i * 4] = Math.random() * 2 - 1;
    data[i * 4 + 1] = Math.random() * 2 - 1;
    data[i * 4 + 2] = Math.pow(Math.random(), 2.2);
    data[i * 4 + 3] = Math.random();
  }
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, 'a_pos');
  const aSeed = gl.getAttribLocation(prog, 'a_seed');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 16, 0);
  gl.enableVertexAttribArray(aSeed);
  gl.vertexAttribPointer(aSeed, 1, gl.FLOAT, false, 16, 12);
  const uTime = gl.getUniformLocation(prog, 'u_time');
  const uScroll = gl.getUniformLocation(prog, 'u_scroll');
  const uRes = gl.getUniformLocation(prog, 'u_res');
  const uDpr = gl.getUniformLocation(prog, 'u_dpr');
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  const resize = () => {
    canvas.width = Math.round(window.innerWidth * dpr);
    canvas.height = Math.round(window.innerHeight * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uDpr, dpr);
  };
  resize();
  window.addEventListener('resize', resize);

  let scroll = 0;
  let running = true;
  const t0 = performance.now();
  const draw = () => {
    const target = window.scrollY / window.innerHeight;
    scroll += (target - scroll) * 0.08;
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform1f(uTime, (performance.now() - t0) / 1000);
    gl.uniform1f(uScroll, scroll);
    gl.drawArrays(gl.POINTS, 0, COUNT);
  };
  let last = 0;
  let retired = false;
  const loop = (now = performance.now()) => {
    if (!running || retired) return;
    // The homepage journey draws its own space; stop this loop once it takes over and give the
    // WebGL context back (one less context alive on the page).
    if (document.documentElement.classList.contains('hj-gl')) {
      retired = true;
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return;
    }
    // At most 60 draws a second, also on 120/144 Hz screens.
    if (now - last >= 15) {
      last = now;
      draw();
    }
    requestAnimationFrame(loop);
  };
  if (reduced) {
    draw();
    let lastDraw = 0;
    window.addEventListener(
      'scroll',
      () => {
        // Hidden under the homepage journey: nothing to redraw.
        if (document.documentElement.classList.contains('hj-gl')) return;
        const now = performance.now();
        if (now - lastDraw > 250) {
          lastDraw = now;
          requestAnimationFrame(draw);
        }
      },
      { passive: true },
    );
  } else {
    loop();
    document.addEventListener('visibilitychange', () => {
      const wasRunning = running;
      running = !document.hidden;
      if (running && !wasRunning) loop();
    });
  }
}
