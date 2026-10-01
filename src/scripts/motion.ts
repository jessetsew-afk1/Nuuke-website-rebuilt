// Smooth scroll + scroll-driven reveals shared by every page.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger, SplitText);

export { gsap, ScrollTrigger, SplitText };
export const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export let lenis: Lenis | null = null;

let started = false;

export function initMotion() {
  if (started) return;
  started = true;

  if (!reducedMotion) {
    lenis = new Lenis({ duration: 1.15, smoothWheel: true, wheelMultiplier: 0.95, touchMultiplier: 1.4 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis?.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    window.addEventListener('nuuke:lock', (e) => {
      (e as CustomEvent<boolean>).detail ? lenis?.stop() : lenis?.start();
    });
    // Anchor links scroll smoothly too.
    document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((a) =>
      a.addEventListener('click', (ev) => {
        const id = a.getAttribute('href');
        if (!id || id === '#') return;
        const target = document.querySelector<HTMLElement>(id);
        if (target) {
          ev.preventDefault();
          lenis?.scrollTo(target, { offset: -80 });
        }
      }),
    );
  }

  initReveals();
  initSplits();
  initCounters();
  initParallax();
  initMagnetic();

  // Fonts change line breaks; recalc trigger positions once they land.
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
  window.addEventListener('load', () => ScrollTrigger.refresh());
}

/** Fade/blur/slide in anything marked [data-reveal]. Children of [data-stagger] cascade. */
function initReveals() {
  document.querySelectorAll<HTMLElement>('[data-stagger]').forEach((group) => {
    const step = parseFloat(group.dataset.stagger || '0.08');
    [...group.children].forEach((child, i) => {
      const el = child as HTMLElement;
      if (!el.hasAttribute('data-reveal')) el.setAttribute('data-reveal', '');
      el.style.setProperty('--delay', `${i * step}s`);
    });
  });
  const els = document.querySelectorAll<HTMLElement>('[data-reveal]');
  if (reducedMotion) {
    els.forEach((el) => el.classList.add('is-in'));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        }
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.05 },
  );
  els.forEach((el) => io.observe(el));
}

/** Character / word blur-stagger on headings marked [data-split]. */
function initSplits() {
  const els = document.querySelectorAll<HTMLElement>('[data-split]');
  if (reducedMotion || !els.length) return;
  els.forEach((el) => {
    const mode = el.dataset.split === 'words' ? 'words' : 'chars';
    const split = SplitText.create(el, { type: mode === 'chars' ? 'words,chars' : 'words', wordsClass: 'split-word', charsClass: 'split-char', aria: 'auto' });
    const targets = mode === 'chars' ? split.chars : split.words;
    const scrub = el.dataset.scrub !== undefined;
    gsap.fromTo(
      targets,
      { yPercent: mode === 'chars' ? 60 : 30, opacity: 0, filter: 'blur(6px)' },
      {
        yPercent: 0,
        opacity: 1,
        filter: 'blur(0px)',
        ease: 'expo.out',
        duration: 1.1,
        stagger: mode === 'chars' ? 0.025 : scrub ? 0.4 : 0.05,
        scrollTrigger: scrub
          ? { trigger: el, start: 'top 85%', end: 'bottom 45%', scrub: 0.6 }
          : { trigger: el, start: 'top 88%', once: true },
      },
    );
  });
}

/** Odometer-style counters: <span data-count="48" data-suffix="+">0</span> */
function initCounters() {
  document.querySelectorAll<HTMLElement>('[data-count]').forEach((el) => {
    const end = parseFloat(el.dataset.count || '0');
    const suffix = el.dataset.suffix || '';
    const decimals = (el.dataset.count || '').split('.')[1]?.length || 0;
    const fmt = (v: number) => v.toFixed(decimals) + suffix;
    if (reducedMotion) {
      el.textContent = fmt(end);
      return;
    }
    el.textContent = fmt(0);
    const obj = { v: 0 };
    ScrollTrigger.create({
      trigger: el,
      start: 'top 90%',
      once: true,
      onEnter: () => gsap.to(obj, { v: end, duration: 2, ease: 'power3.out', onUpdate: () => (el.textContent = fmt(obj.v)) }),
    });
  });
}

/** [data-parallax="0.2"] moves the element at a fraction of scroll speed. */
function initParallax() {
  if (reducedMotion) return;
  document.querySelectorAll<HTMLElement>('[data-parallax]').forEach((el) => {
    const amt = parseFloat(el.dataset.parallax || '0.15');
    gsap.fromTo(el, { yPercent: -amt * 100 }, { yPercent: amt * 100, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } });
  });
}

/** Buttons drift slightly toward the cursor. */
function initMagnetic() {
  if (reducedMotion || window.matchMedia('(hover: none)').matches) return;
  document.querySelectorAll<HTMLElement>('.btn, [data-magnetic]').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left - r.width / 2) * 0.18;
      const y = (e.clientY - r.top - r.height / 2) * 0.25;
      el.style.transform = `translate(${x}px, ${y}px)`;
    });
    el.addEventListener('pointerleave', () => (el.style.transform = ''));
  });
}

/** Run `fn` once `el` is near the viewport (used to lazy-load WebGL). */
export function whenNear(el: Element, fn: () => void, margin = '400px') {
  const io = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        io.disconnect();
        fn();
      }
    },
    { rootMargin: margin },
  );
  io.observe(el);
}
