// Cheap check, before loading Three.js, that WebGL runs on a real GPU.
// Software rasterisers (no GPU) take seconds to compile our shaders, so we skip heavy 3D there.
let cached: boolean | null = null;

export function hasHardwareGL(): boolean {
  if (cached !== null) return cached;
  // ?gl=force (testing on machines without a GPU)
  if (/[?&]gl=force\b/.test(location.search)) return (cached = true);
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
