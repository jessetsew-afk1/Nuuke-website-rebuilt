# nuuke.us

The NUUKE agency website, rebuilt from Webflow as a fast static site.
Stack: [Astro](https://astro.build) · TypeScript · Three.js (lazy-loaded) · GSAP + ScrollTrigger · Lenis smooth scroll.

## Run it

```bash
npm install
npm run dev       # http://localhost:4321
npm run build     # type-check + production build → dist/
npm run preview   # serve the production build
```

## Where things live

| What | Where |
| --- | --- |
| Contact details, address, nav, services list | `src/data/site.ts` |
| Case-study list (titles, colours, order) | `src/data/projects.ts` |
| Case-study pages | `src/pages/works/<slug>.astro` (+ `src/components/cases/<slug>/`, `src/data/cases/<slug>.ts`) |
| Shared case-study building blocks | `src/components/case/` — Brief, Personas, JourneyMap, FlowMap, ScreenStack (3D layers), Prototype (tappable phone with Sketch / Wireframe / Hi-fi), DesignSystem, Metrics, Compare |
| Service page copy | `src/content/services/*.md` |
| Blog posts | `src/content/blog/*.md` (URL: `/blog-posts/<file-name>`) |
| Privacy policy | `src/content/privacy.md` |
| Design tokens (type scale, spacing, colours, motion) | `src/styles/global.css` |
| 3D scenes | `src/scripts/three/` |
| Logo, favicons, fonts, team photos | `public/` |

**Add a blog post:** drop a Markdown file in `src/content/blog/` with `title`, `category`, `excerpt` and `date` front matter.

**Add a case study:** add an entry to `src/data/projects.ts`, then create `src/pages/works/<slug>.astro` using `src/pages/works/rise-science.astro` as the template.

## Contact form

Set `PUBLIC_FORM_ENDPOINT` (Formspree, Basin, or a NUUKE-CRM webhook that accepts JSON) in your host's environment variables.
Without it, the form opens the visitor's email app pre-filled to hello@nuuke.us.

## Deploy

Any static host. `vercel.json` (Vercel) and `public/_redirects` + `public/_headers` (Netlify) add 301 redirects from the
retired Webflow case-study URLs to `/works`, plus long-term caching for fonts and scripts. Build command `npm run build`,
output directory `dist`.

## Performance budget

- First-load JavaScript ≈ 57 KB gzipped (motion + smooth scroll). Three.js (~145 KB gzipped) loads only when a 3D scene is near the viewport.
- Two self-hosted variable fonts (Montserrat, Inter), ~86 KB total, preloaded.
- No GIFs or autoplaying stock video. All 3D and cover art is generated in code.
- Respects `prefers-reduced-motion` everywhere.

## Concept case studies

The five case studies (RISE, Olio, Heirloom, Fellow, Fishwife) are NUUKE **concept projects**: independent explorations built on each
brand's public story, clearly labelled on every page, with sources listed. No results are claimed. Brand research and sources:
`research/brands.md`. Replace or supplement them with real client work as it becomes publishable.

## Open items for the owner

- Add Clutch / Trustpilot profile links if they exist (`site.reviews`).
- Add awards to `src/pages/about.astro` once each is confirmed with a link.
- Hook the contact form to an endpoint (see above).
- See `audit/REPORT.md` for the original site audit.
