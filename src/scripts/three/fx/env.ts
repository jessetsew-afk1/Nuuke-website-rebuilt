// Environment maps for physically based reflections, generated from small procedural
// scenes (gradient sky + emissive softboxes) through PMREM. 'dusk' = launch pad at
// sunset, 'space' = studio-lit deep space for the flight through the page.
import { THREE } from '../core';

type Kind = 'dusk' | 'space';

const SKY_VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const SKY_FRAG = /* glsl */ `
uniform vec3 uTop;
uniform vec3 uMid;
uniform vec3 uHorizon;
uniform vec3 uGround;
uniform vec3 uSunDir;
uniform vec3 uSunCol;
varying vec3 vDir;
void main() {
  vec3 d = normalize(vDir);
  float e = d.y;
  vec3 c = e > 0.0 ? mix(uHorizon, uMid, smoothstep(0.0, 0.25, e)) : mix(uHorizon, uGround, smoothstep(0.0, 0.12, -e));
  if (e > 0.25) c = mix(uMid, uTop, smoothstep(0.25, 0.9, e));
  float s = max(dot(d, normalize(uSunDir)), 0.0);
  c += uSunCol * (pow(s, 6.0) * 0.6 + pow(s, 120.0) * 6.0);
  gl_FragColor = vec4(c, 1.0);
}`;

function box(w: number, h: number, color: THREE.ColorRepresentation, k: number, pos: [number, number, number], look: [number, number, number] = [0, 0, 0]) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), side: THREE.DoubleSide }));
  m.position.set(...pos);
  m.lookAt(...look);
  return m;
}

export function makeEnv(renderer: THREE.WebGLRenderer, kind: Kind) {
  const scene = new THREE.Scene();
  const dusk = kind === 'dusk';
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(50, 48, 24),
    new THREE.ShaderMaterial({
      vertexShader: SKY_VERT,
      fragmentShader: SKY_FRAG,
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: dusk
        ? {
            uTop: { value: new THREE.Color(0.01, 0.02, 0.06) },
            uMid: { value: new THREE.Color(0.04, 0.08, 0.2) },
            uHorizon: { value: new THREE.Color(0.9, 0.38, 0.16) },
            uGround: { value: new THREE.Color(0.04, 0.035, 0.04) },
            uSunDir: { value: new THREE.Vector3(-0.5, 0.06, -1) },
            uSunCol: { value: new THREE.Color(3.0, 1.5, 0.6) },
          }
        : {
            uTop: { value: new THREE.Color(0.02, 0.02, 0.05) },
            uMid: { value: new THREE.Color(0.04, 0.035, 0.09) },
            uHorizon: { value: new THREE.Color(0.12, 0.06, 0.16) },
            uGround: { value: new THREE.Color(0.01, 0.01, 0.02) },
            uSunDir: { value: new THREE.Vector3(0.55, 0.3, -1) },
            uSunCol: { value: new THREE.Color(2.4, 2.2, 2.0) },
          },
    }),
  );
  scene.add(sky);
  if (dusk) {
    // Floodlights in front of the pad, a cool sky fill above, warm bounce from the sunset.
    scene.add(box(3, 1.5, 0xf4f1ea, 1.6, [10, 16, 20]));
    scene.add(box(8, 3, 0xbcd0ff, 0.7, [-14, 18, 6]));
    scene.add(box(24, 2, 0xff9a52, 1.4, [-10, 1.5, -26]));
    scene.add(box(2.5, 14, 0xffffff, 1.1, [22, 6, -4]));
    scene.add(box(2.5, 14, 0xffd8b0, 0.8, [-22, 6, 8]));
  } else {
    // Studio in space: big warm key top-left, cool rim right, magenta kicker from below.
    scene.add(box(16, 10, 0xfff1e0, 2.4, [-14, 16, 12]));
    scene.add(box(4, 22, 0x9ab4ff, 2.2, [22, 2, -6]));
    scene.add(box(14, 3, 0xff2e88, 1.6, [6, -16, 8]));
    scene.add(box(20, 2, 0xffffff, 0.9, [0, 3, 26]));
  }
  const pmrem = new THREE.PMREMGenerator(renderer);
  const rt = pmrem.fromScene(scene, 0.02);
  pmrem.dispose();
  scene.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) {
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
    }
  });
  return rt.texture;
}
