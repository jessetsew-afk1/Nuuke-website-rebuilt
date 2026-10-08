// Cheap check, before loading Three.js, that WebGL runs on a real GPU.
// Software rasterisers (no GPU) take seconds to compile our shaders, so we skip heavy 3D there.
let cached: boolean | null = null;

// A graphics driver reset (the browser loses the WebGL context) is remembered for a few days:
// after one the 3D runs at a lighter quality, after two the site uses its static version.
const LOST_KEY = 'nuuke:gl-lost';
const LOST_TTL = 3 * 864e5;
export function glLostCount(): number {
  try {
    const r = JSON.parse(localStorage.getItem(LOST_KEY) || 'null') as { n: number; t: number } | null;
    return r && Date.now() - r.t < LOST_TTL ? r.n : 0;
  } catch {
    return 0;
  }
}
export function noteGlLost() {
  try {
    localStorage.setItem(LOST_KEY, JSON.stringify({ n: glLostCount() + 1, t: Date.now() }));
  } catch {
    /* storage blocked */
  }
}

export function hasHardwareGL(): boolean {
  if (cached !== null) return cached;
  // ?gl=force (testing on machines without a GPU)
  if (/[?&]gl=force\b/.test(location.search)) return (cached = true);
  if (glLostCount() >= 2) return (cached = false);
  // An inline check earlier on the page may already have probed the GPU.
  const pre = (window as Window & { __nuukeHW?: boolean }).__nuukeHW;
  if (typeof pre === 'boolean') return (cached = pre);
  try {
    const c = document.createElement('canvas');
    const gl = (c.getContext('webgl2') || c.getContext('webgl')) as WebGLRenderingContext | null;
    if (!gl) return (cached = false);
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const name = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '';
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    cached = !/swiftshader|llvmpipe|softpipe|software|basic render/i.test(name);
  } catch {
    cached = false;
  }
  return cached;
}
