# NUUKE website rebuild: plan

Goal: move nuuke.us off Webflow onto a codebase we own. Keep the message, concept and animation feel
the same, fix the existing gaps, fonts, inconsistencies and load-time problems, and rebuild the
Projects and Case Studies section so each case study shows the actual process step by step and in 3D.

> Status: this is a plan only. No site code has been written yet.

---

## Phase 0: Audit the live site (blocked, needs access)

This session's network policy blocks `nuuke.us`, so the live site has not been audited yet. As soon as
the site can be reached (see "What I need from you" below), the audit will cover:

| Area | How | What gets reported |
| --- | --- | --- |
| Content inventory | Crawl every page with Playwright | Every page, section, heading, line of copy, CTA, link, image and embed, written to `audit/inventory.md` |
| Visual snapshots | Full-page screenshots at 390 / 768 / 1280 / 1920px | Baseline we match against, plus layout breaks, overflow and gaps at each size |
| Typography | Gather computed `font-family`, `font-size`, `line-height` and `letter-spacing` from every text node | Every font and size actually in use, with stray fonts and one-off sizes flagged |
| Spacing and colour | Gather computed margins, paddings and colours | Values off the scale (e.g. 37px next to 40px), near-duplicate colours |
| Performance | Lighthouse (mobile and desktop) and a network waterfall | LCP, CLS, INP, total weight, render-blocking scripts, heavy Spline/Lottie/video embeds, uncompressed images, unused Webflow JS/CSS |
| Animation | Record each Webflow interaction (scroll, hover, load) | Spec for each interaction to rebuild (trigger, easing, duration), plus any jank |
| Accessibility and SEO | axe-core, meta tags, heading order, alt text | Missing alt text, contrast failures, heading skips, missing OG/meta tags |
| Broken things | Link checker and console errors | 404s, dead buttons, JS errors |

Output: `audit/REPORT.md` with every issue ranked, plus the screenshot baseline. You review it before
the build starts.

What's already known from public sources: positioning ("a specialized unit for market domination, not a
vendor"), the services (Mobile App Dev, Digital Marketing, 2D/3D Animation, AI systems), the team (Jesse
Lane, Jordan "JB" Bree, Harris Smith), the awards strip (Mobile Excellence, Webby, Awwwards, CSSDA,
FWA), the Sheridan WY address, and the projects Prometheus Fuels, RoboTaxi and Etihad.

---

## Phase 1: Foundations

**Proposed stack:**

- **Astro**: static HTML by default and zero JS on pages that don't need it. Interactive and 3D parts
  load as "islands" only when they scroll into view. This is the main fix for the load-time problems.
- **Three.js** (via a small custom wrapper): 3D scenes, phone models and wireframe toggles. Lazy-loaded.
  Models are GLB with Draco/Meshopt compression and KTX2 textures.
- **GSAP + ScrollTrigger + Lenis**: rebuild the Webflow interactions (smooth scroll, reveals, pinned
  scroll sections) one for one.
- **TypeScript** throughout. Content lives in typed files (`src/content/`) so case studies are data, not
  hand-built pages.
- **Hosting**: Vercel or Netlify (static), with image optimisation at build time (AVIF/WebP, responsive
  `srcset`).

**Design system (fixes the inconsistencies):**

- Design tokens in one file: type scale, spacing scale (4/8-based), colours, radii, easing curves and
  durations.
- **Two font families at most**, self-hosted, subset, preloaded and `font-display: swap`. No more mixed
  fonts. Which two gets confirmed after the audit.
- Shared components: Nav, Footer, Button, Section heading, Card, Marquee, Award strip, CTA block.
  Pages are built only from these.

**Performance budget (enforced in CI):**

| Metric | Target |
| --- | --- |
| LCP (mobile, 4G) | < 2.0 s |
| CLS | < 0.05 |
| JS on first load (home) | < 120 KB gzip, before 3D islands |
| Each 3D model | < 1.5 MB, loaded only when near the viewport |
| Lighthouse Performance | ≥ 90 mobile |

Also: honour `prefers-reduced-motion`, and show a static poster frame on low-power devices or when
WebGL is unavailable.

---

## Phase 2: Rebuild the existing pages (same look, same message)

Recreate every page from the Phase 0 inventory against the screenshot baseline, then fix the audit
issues as we go:

1. Home (hero, services, selected work, awards, team, CTA)
2. About
3. Services, one page per service: Mobile App Dev, Digital Marketing, 2D/3D Animation, AI
4. Projects index
5. Contact (form wired to email or your NUUKE-CRM)
6. 404, privacy, terms

Acceptance check for each page: visual diff against the Webflow screenshot at four breakpoints, with
intentional fixes listed and approved by you.

---

## Phase 3: Case studies, redesigned

Each case study becomes a scroll-driven story. Every case study shares this structure, and each
discipline adds its own interactive modules.

**Shared structure:**

1. **Hero**: the 3D object or device, brand colours, one-line outcome
2. **The brief**: client, problem, constraints, timeline, team
3. **Process timeline**: a sticky progress rail (Discover → Define → Design → Build → Launch) that
   follows the scroll
4. **Discipline modules** (below)
5. **Results**: real metrics only, with counters
6. **Next project**: pulls you into the next case study

### Mobile app case studies

| Module | What the client sees |
| --- | --- |
| Research board | Personas, user-journey map and competitor grid, revealed as cards |
| User-flow map | Interactive node graph of the app's screens. Hover a node to preview that screen |
| **3D wireframe phone** | A 3D phone that rotates as you scroll. Its screen morphs **sketch → low-fi wireframe → hi-fi UI**, and a toggle switches it to a wireframe/x-ray mode |
| Wireframe ↔ final slider | Drag to compare the wireframe and the shipped screen |
| Exploded screen stack | Screens fanned out in 3D depth to show a whole flow at once |
| Clickable prototype | A playable prototype inside a phone frame (Figma embed or our own) |
| Design system | Colours, type and components, laid out like a spec sheet |
| Build and launch | Tech stack, sprint timeline, App Store screenshots |

### 3D animation case studies

| Module | What the client sees |
| --- | --- |
| Concept and moodboard | Reference images and sketches on a tilted, draggable board |
| Storyboard strip | Frames that scrub with scroll, plus an animatic clip |
| **Pipeline turntable** | One interactive 3D model with a stage switcher: **blockout → wireframe → clay → textured → lit → final render**. Drag to rotate |
| Before/after render slider | Raw viewport against the final composited frame |
| Breakdown video | Layered render passes (beauty, AO, lighting, FX), scroll-scrubbed |
| Final film | Full-quality video, lazy-loaded with a poster frame |

### Digital marketing case studies

| Module | What the client sees |
| --- | --- |
| Strategy map | Audience segments, channels and funnel stages as an interactive 3D funnel |
| Creative concepts | Ad concepts and variants, with A/B test winners highlighted |
| Content calendar | Campaign timeline you can scrub through |
| Ad mockups | Feed, story and reel placements shown on 3D phones |
| Results dashboard | Animated charts (reach, CTR, CPA, ROAS), real numbers only |

**Content sources:** your own project files (Figma, Blender/C4D renders, ad accounts) come first.
Public research (each brand's site, press releases, App Store listings) fills in brand facts and
context. **Metrics, quotes and deliverables must come from work NUUKE actually did.** I won't invent
results or present work as NUUKE's when it wasn't. Where we don't have real material yet, the page
gets a clearly marked placeholder for you to fill in.

---

## Phase 4: QA and launch

- Cross-browser and device testing (Safari iOS, Chrome Android, desktop Chrome/Safari/Firefox/Edge)
- Lighthouse CI and visual-regression tests on every PR
- 301 redirects from every old Webflow URL, sitemap, robots.txt, OG images, analytics
- Swap DNS from Webflow to the new host, then monitor Core Web Vitals for the first week

---

## Suggested order of work

1. Get access → run the Phase 0 audit → you review the report
2. Foundations and design tokens → Home page → you review
3. Remaining existing pages
4. Case-study engine, then one flagship case study per discipline (mobile, 3D, marketing) → you review
5. Remaining case studies → QA → launch

---

## What I need from you

1. **Access to the live site.** Add `nuuke.us` and `www.nuuke.us` to this environment's allowed
   domains (environment settings → Network access). Alternatively, send a Webflow code export
   (Site settings → Export code), which is the fastest route to an exact match and includes all
   images.
2. **Original assets**: 3D files (GLB/FBX/Blend), renders, videos, Figma files and brand fonts, rather
   than copies pulled from the Webflow CDN.
3. **Case-study material**: for each project, what NUUKE actually delivered and any real results we can
   publish, plus client permission where needed.
4. **Decisions**: which fonts to keep, hosting (Vercel or Netlify), and where the contact form should
   send (email or NUUKE-CRM).

---

## Note on the `nuuke.marketing` repo

Your `nuuke.marketing` repo is a different concept: a social-first UGC/ads studio with a pink plaster
room. Its stack (Vite, Three.js, GSAP, Lenis) and some techniques (scene transitions, case-study
modules, lazy model loading) can be reused here, but its content and look are not nuuke.us. This
rebuild follows the live nuuke.us site.
