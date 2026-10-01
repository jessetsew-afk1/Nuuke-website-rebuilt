// Client-side glue for the Fellow case study. One WebGL stage is shared by four
// chapters ("docks"): it moves into whichever dock is most on screen, and every
// chapter's controls talk to it through this tiny bus. Three.js loads lazily.
import { whenNear } from '../motion';
import type { Colourway, DockName, FellowApi, LightName, PipelineStage, TimeInfo } from './fellow';
import { shots, shotStarts, totalDuration } from '../../data/cases/fellow';

type Events = {
  time: TimeInfo;
  stage: PipelineStage;
  colour: Colourway;
  light: { name: LightName; on: boolean };
  dock: DockName;
  shot: number;
  ready: FellowApi;
  failed: true;
};
type Handlers = { [K in keyof Events]?: ((v: Events[K]) => void)[] };
const handlers: Handlers = {};

export function on<K extends keyof Events>(k: K, fn: (v: Events[K]) => void) {
  ((handlers[k] ??= []) as ((v: Events[K]) => void)[]).push(fn);
}
function fire<K extends keyof Events>(k: K, v: Events[K]) {
  (handlers[k] as ((v: Events[K]) => void)[] | undefined)?.forEach((fn) => fn(v));
}

export const ui = {
  stage: 'final' as PipelineStage,
  colour: 'black' as Colourway,
  lights: { key: true, fill: true, rim: true } as Record<LightName, boolean>,
  shot: 0,
  dock: 'story' as DockName,
  time: { t: 3, shot: 0, local: 0.6, playing: false, active: false } as TimeInfo,
  api: null as FellowApi | null,
};
export { shots, shotStarts, totalDuration };

const queue: ((a: FellowApi) => void)[] = [];
function withApi(fn: (a: FellowApi) => void) {
  if (ui.api) fn(ui.api);
  else queue.push(fn);
}

export function setStage(s: PipelineStage) {
  ui.stage = s;
  fire('stage', s);
  withApi((a) => a.setStage(s));
}
export function setColour(c: Colourway) {
  ui.colour = c;
  fire('colour', c);
  withApi((a) => a.setColour(c));
}
export function setLight(name: LightName, on: boolean) {
  ui.lights[name] = on;
  fire('light', { name, on });
  withApi((a) => a.setLight(name, on));
}
export function showShot(i: number) {
  ui.shot = i;
  fire('shot', i);
  withApi((a) => a.showShot(i));
}
export function play(from?: number) {
  withApi((a) => a.play(from));
}
export function pause() {
  withApi((a) => a.pause());
}
export function toggle() {
  withApi((a) => (a.playing() ? a.pause() : a.play()));
}
export function seek(t: number) {
  withApi((a) => a.seek(t));
}

/** 24 fps timecode, e.g. 00:00:12:05 */
export function timecode(t: number) {
  const f = Math.floor((t % 1) * 24);
  const s = Math.floor(t);
  const p = (n: number) => String(n).padStart(2, '0');
  return `00:${p(Math.floor(s / 60))}:${p(s % 60)}:${p(f)}`;
}

let booted = false;
export function boot() {
  if (booted) return;
  booted = true;
  const stageEl = document.querySelector<HTMLElement>('[data-fw-stage]');
  const canvas = stageEl?.querySelector<HTMLCanvasElement>('canvas');
  const docks = [...document.querySelectorAll<HTMLElement>('[data-fw-dock]')];
  if (!stageEl || !canvas || !docks.length) return;

  const applyDock = (d: DockName) => {
    withApi((a) => {
      // Keep a running animatic running if it simply moved into a viewing dock.
      if ((d === 'animatic' || d === 'story') && a.playing()) return a.setDock(d);
      a.pause();
      a.setDock(d);
      if (d === 'story') a.showShot(ui.shot);
      else if (d === 'animatic') a.seek(ui.time.t);
      else if (d === 'lighting') {
        ui.stage = 'lighting';
        fire('stage', 'lighting');
        a.setStage('lighting');
      } else a.setStage(ui.stage);
    });
  };
  const dockTo = (el: HTMLElement) => {
    if (stageEl.parentElement === el) return;
    el.appendChild(stageEl);
    docks.forEach((d) => d.classList.toggle('is-docked', d === el));
    ui.dock = el.dataset.fwDock as DockName;
    fire('dock', ui.dock);
    applyDock(ui.dock);
  };

  const ratios = new Map<Element, number>();
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => ratios.set(e.target, e.isIntersecting ? e.intersectionRatio : 0));
      let best: HTMLElement | null = null;
      let br = 0.15;
      ratios.forEach((r, el) => {
        if (r > br) {
          br = r;
          best = el as HTMLElement;
        }
      });
      if (best) dockTo(best);
    },
    { threshold: [0, 0.15, 0.3, 0.5, 0.7, 0.9, 1] },
  );
  docks.forEach((d) => io.observe(d));
  const initial = stageEl.closest<HTMLElement>('[data-fw-dock]');
  if (initial) {
    initial.classList.add('is-docked');
    ui.dock = initial.dataset.fwDock as DockName;
  }

  let loading = false;
  const load = () => {
    if (loading) return;
    loading = true;
    import('./fellow')
      .then((m) => {
        const accent = getComputedStyle(stageEl).getPropertyValue('--a').trim() || '#c98a4e';
        const api = m.init(canvas, {
          shots,
          stage: ui.stage,
          colour: ui.colour,
          lights: { ...ui.lights },
          accent,
          onTime: (info) => {
            ui.time = info;
            fire('time', info);
          },
        });
        ui.api = api;
        queue.splice(0).forEach((f) => f(api));
        applyDock(ui.dock);
        stageEl.classList.add('is-ready');
        fire('ready', api);
      })
      .catch((err) => {
        console.warn('Fellow 3D stage unavailable:', err);
        stageEl.classList.add('is-failed');
        fire('failed', true);
      });
  };
  docks.forEach((d) => whenNear(d, load, '600px'));
}
