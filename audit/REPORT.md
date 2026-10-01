# nuuke.us audit

Audited 1 October 2026 against the live Webflow site (last published 24 Sep 2026). 23 pages were each
loaded in a real browser on desktop (1440px) and phone (390px), scrolled top to bottom, and
measured. Google Lighthouse (mobile) was run on Home, About and the RoboTaxi case study.
Screenshots are in [`screens/`](screens/).

---

## The 10 things that matter most

1. **Some case studies describe other studios' work as NUUKE's** (Prometheus Fuels, Mars Express,
   Anodyne 2, and possibly others). This is the biggest risk on the site. [Details below](#1-credibility-and-content).
2. **The site is built on a Webflow template ("WARP") and still contains its leftovers.** 15 of 23
   pages are titled "WARP - Webflow HTML Website Template" in Google and browser tabs. The logo reads
   "Powered by Remote Ave" on every page.
3. **Pages are very heavy.** Home downloads 11.9 MB (16.5 MB per Lighthouse) and About downloads
   25–41 MB. Almost all of it is animated GIFs and stock video clips.
4. **The site is slow on phones.** Lighthouse mobile scores: Home **62**, About **38**, RoboTaxi
   **57**. About takes **20.6 s** to show its main content. Home leaves the browser unresponsive
   (busy decoding GIFs and running scripts) for **~7 s**.
5. **Fonts are inconsistent.** 3 font families and 28 font files are loaded; one family (Montserrat
   Alternates) is never used. Text appears in **53 different sizes** (in px, rem, vw and %) and
   39 different line heights.
6. **Elements overlap on almost every page.** The logo sits on top of headings, project titles cover
   the project images, the bottom navigation bar covers content, and the testimonial grid runs under
   the "Say Hello!" section.
7. **Case studies are walls of text.** RoboTaxi is about 10,000px of small grey text with one phone
   image at the top and three thumbnails at the end. There are no wireframes, flows, prototypes or
   process visuals.
8. **Placeholder and inconsistent business details.** Clutch and Trustpilot icons link to the
   instagram.com and facebook.com home pages. There are three office addresses, and Casper WY doesn't
   match the Sheridan WY address on Google. The copyright says © 2025. Blog authors are "John Smith"
   and "Dave".
9. **SEO basics are missing.** No sitemap (`/sitemap.xml` returns a 404 page), an empty
   `robots.txt`, no canonical tags, 0 to 12 H1 headings per page, and 60 counter digits marked up as
   headings.
10. **Accessibility.** Almost every image has empty alt text (57 of 67 on Home, all of them on case
    studies and blog posts), so screen readers skip project covers, logos and team photos entirely.
    Icon links have no labels. Body text is small and light grey.

---

## 1. Credibility and content

This is the most urgent section. Prospective clients, award juries and the brands themselves can
check every one of these claims in a few minutes.

| Case study | What the page claims | What's publicly on record |
| --- | --- | --- |
| **Prometheus Fuels**: "3D Website Design", client "Active Theory", 2021 | NUUKE built the immersive 3D site | The site was built by **Active Theory**. It won [Awwwards Site of the Month (May 2021)](https://www.awwwards.com/prometheus-by-active-theory-wins-site-of-the-month-may-2021.html) and FWA of the Year 2021 under their name. The page's images are from that site. |
| **Mars Express**: "3D Animation", client "Gebeka Films", 2023 | NUUKE did environment design, character modelling, animation, lighting and compositing | The film's [production credits](https://en.wikipedia.org/wiki/Mars_Express_(film)) list Je Suis Bien Content, with Gao Shan (3D), Borderline and Amopix. |
| **Anodyne 2: Return to Dust**: "Full Game Development", client "Unity", 24 months | NUUKE was the "Lead Creative & Technical Studio" | The game was made by [Analgesic Productions](https://en.wikipedia.org/wiki/Anodyne_2:_Return_to_Dust), a two-person indie team. Unity is the engine, not a client. |
| **RoboTaxi**: client "Tesla" | NUUKE designed Tesla's Robotaxi app | Please confirm. Tesla designs its apps in-house. |
| **Etihad**: client "Etihad Airways PJSC", dated 13 April 2016 | NUUKE designed the Etihad app | Please confirm. The date also predates the rest of the portfolio by years. |
| **Gymshark**: client "Gymshark Ltd" | NUUKE ran Gymshark's social strategy | Please confirm. |

If NUUKE did contribute to any of these (for example as a subcontractor), the case study should say
exactly which part NUUKE did. If it didn't, the case study needs to come down. Presenting another
studio's work as your own is the kind of thing that ends up on Twitter, and it puts the real work on
the site at risk too. **The new site won't republish these as they are.** The case-study section is
built so real projects can be added quickly.

**Other content that looks like template filler or stock material:**

- **Testimonials**: 12 named reviews (Jared Miles, Elena Farrow, Melissa Grant…) with no company,
  photo or link. Bark is the only review source that is actually linked.
- **Awards** (About): "Cube – Awwwards SOTD 2024", "Imagine – CSSDA Best UI 2024", "Concept – FWA
  2024", "Pulse App – Mobile Excellence 2024", "Studio Portfolio – Webby 2022". Please confirm each
  one and send the award-page link. Real awards should link to their proof.
- **Client logos**: Etihad, Oracle, Airbnb, GitHub, Gymshark, Lexus and IBM. Only list brands NUUKE
  has actually worked for.
- **Stats counters**: "Loyal clients / Projects completed / Team members". Confirm the real numbers.
- **Team**: AI-generated 3D avatar portraits. Fine as a style choice, but real photos build more
  trust.
- **About-page media**: stock-footage clips (file names like "professional-photographer-taking-pictures-of-model-2025-11-28") and a
  promo video for another company's app ("Qityol App promo video").
- **Homepage GIFs**: several are third-party GIPHY uploads (file names like "Loop Scifi GIF by
  IndieRocktopus", "scifispace GIF by Morena Daniela", "Artificial Intelligence Ai GIF by Emil
  Lindén", "advertising working GIF by Andrey S"). These belong to their creators.
- **Blog**: authors "John Smith", "Alex Rivera", "Maria Carter", "Jamie Parker", "Sarah Blake",
  "Dave". These look like placeholders.
- **Footer**: three addresses (Casper WY, "30 st mary axe 8th floor london ec3a 8bf", Paris), but
  Google lists **30 N Gould St Ste R, Sheridan, WY**. "© 2025". The Clutch icon links to
  instagram.com and the Trustpilot icon to facebook.com, not to NUUKE profiles.
- **Contact page**: loads an icon from a different Webflow site (`684b9fd4…`), left over from the
  template.

---

## 2. Performance

| Page | Weight (phone) | Of which GIF | Lighthouse (mobile) | Main content shown after |
| --- | --- | --- | --- | --- |
| Home | 11.8 MB, 84 requests | 9.2 MB | **62** | 2.2 s; browser unresponsive for **7.0 s** |
| About | **27.9 MB**, 94 requests | 1.6 MB, plus ~22 MB of stock video | **38** | **20.6 s** |
| Services | 7.4 MB | 6.4 MB | – | – |
| Digital Marketing service | 3.3 MB | 2.6 MB | – | – |
| Works | 2.2 MB | – | – | – |
| RoboTaxi case study | 0.7 MB | – | **57** | 7.3 s |
| Blog post (typical) | 0.7 MB | – | – | – |

**Causes:**

- **Animated GIFs as "3D animations".** The largest is 1.9 MB, and Home has 16 of them. Converted to
  MP4/WebM video they would be roughly 5–10× smaller. Rendering them live in WebGL would cost almost
  nothing.
- **Stock videos on About** (2–3 MB each, several downloaded in two formats) all start loading
  immediately.
- **Blocking font loader.** `webfont.js` from Google loads **28 font files** before text can render,
  including 18 styles of Montserrat and 5 of Montserrat Alternates, which is never used.
- **Scripts from 4 sources**: jQuery 3.5 (old), 4 Webflow chunks, GSAP + ScrollTrigger + SplitText,
  and Lenis from unpkg.com, plus ~150 KB of CSS with 606 classes.
- **Oversized images.** Arrow icons are 284×284 but shown at 15×15. Review-site logos are 225px but
  shown at 29px. The Etihad cover is a 662 KB PNG.
- **Layout jumps while scrolling.** Project titles and section containers resize as you scroll,
  shifting the page by up to a full screen. This is the "jumpy" feel on the Works section and
  further down Home.

---

## 3. Typography and design consistency

- **Font families:** headings in Montserrat 900, body in Montserrat 400/500, project titles and
  numbers in Inter, eyebrow labels in Inter 200. Inter 200 is never loaded, so the browser
  substitutes the nearest weight it has. The Privacy Policy page falls back to a **monospace**
  font.
- **Font sizes:** 53 distinct values in the stylesheet, mixing units: 13px, 14px, 17.6px, 12.8px,
  1rem, 2.5rem, 3rem, 3.5rem, 6.67vw, 14vw, 15vw, 18vw… Home alone uses 11 sizes on desktop.
  Headline sizes jump unevenly between breakpoints (96px → 70px → 64px → 39px).
- **Line heights:** 39 distinct values. **Colours:** 50 distinct values. **`!important`:** 40
  uses.
- **Breakpoints:** Webflow defaults (991 / 767 / 479px) with almost no tablet-specific styling.
- **Readability:** body copy on case studies and testimonials is light grey at ~13px. It passes
  automated contrast checks but is hard to read, especially next to 96px headlines.
- **Inconsistent case:** "Marketing HEad", "MarsExpress", "Anodyne2", "GymShark" vs "Gymshark", and a
  lowercase London address.

---

## 4. Layout and visual bugs

Frame numbers refer to the screenshots in `screens/`.

| Where | Problem | Evidence |
| --- | --- | --- |
| Every page | Fixed "nuuke / Powered by Remote Ave" logo overlaps headings ("WORKS", "Our Team", marquee titles) | home-desktop-1 (005), about-desktop (002) |
| Every page | Fixed bottom navigation bar covers content (award rows, footer divider and copyright line) | about-desktop (003), home-desktop-4 |
| Home → Works | Project titles (white Inter 96px marquee) run over the project image, so neither can be read | home-desktop-2 (007, 010, 011) |
| Home → Works | Prometheus cover image covers the full screen with a hard white edge at the top | home-desktop-2 (007–008) |
| Home | Long empty black stretches between sections | home-desktop-3 (014), home-desktop-4 (018–019) |
| Home → logo strip | Etihad logo cut off at the left. On phone only 2 tiny logos are visible | home-desktop-1 (004), home-mobile-1 (004) |
| Home → Services | Service titles overlap their images ("Mobile App Dev", "Digital Marketing") | home-desktop-3 (015–017) |
| Home → Services (phone) | Titles and copy cut off: "Mob App Dev", "Marketing" clipped, "Apps engineer to punch abov" | home-mobile-2 (014–016) |
| Home / About → stats | Counter digits stop half-rolled ("13 / 24", "08"). Paragraph fades out mid-sentence ("by increasing…") | home-desktop-4 (019), home-mobile-2 (018–019) |
| Home / About / Services → testimonials | Cards end up as a full-screen grid that sits **under** the "Say Hello!" heading and Contact button. Text is tiny and greyed out. On phone the names are cut off | home-desktop-4 (021–023), home-mobile-2 (021–023) |
| About | Award table text is ~11px and partly hidden behind the bottom nav | about-desktop (003) |
| About | Giant "ea" letters fill the screen with no context (the word scrolls past mid-animation) | about-desktop (004) |
| Services page | Four services as plain text with no images and no links, then straight into testimonials | services-desktop |
| Case studies | One hero image, ~10,000px of grey text, three thumbnails, then an empty black block before the footer | case-study-robotaxi |
| Privacy Policy (phone) | Page is **1,142px wide** on a 390px screen, so it scrolls sideways. Monospace font | crawl data |

---

## 5. SEO and accessibility

- **Page titles:** all 4 service pages, all 6 case studies and all 6 blog posts are titled "WARP -
  Webflow HTML Website Template". Only Home, About, Services, Works, Blog, Contact and Privacy have
  real titles.
- **H1 headings:** Home has 5, case studies have up to 12 (Mars Express), and service pages, blog
  posts and Contact have 0. Each marquee repeats its project name 16 times as H2s, and the counters
  add 60 single-digit H2s.
- **No canonical tags. No sitemap. Empty `robots.txt`.** The `lang`, meta description and Open Graph
  image are present.
- **Alt text** is empty on 57 of 67 images on Home and on every image on case studies, blog posts
  and service pages. Lighthouse doesn't flag empty alt text, but it hides meaningful images (project
  covers, client logos, team photos) from screen readers and from Google Images.
- **3 unlabeled icon links per page** (the review-site icons). Screen readers announce them as
  "link".
- **No reduced-motion support.** Every animation runs even when the visitor has asked their device
  to reduce motion.

---

## 6. What to keep: animation and concept inventory

The rebuild recreates these, built properly:

| Section | Behaviour today |
| --- | --- |
| Global | Black starfield background, Lenis smooth scroll, fixed centred logo, floating pill nav at the bottom (Home / About / Contact / More ▾) |
| Hero | Headline loops "BUILD" ↔ "BEYOND" with a blur-and-slide letter stagger. "We don't design for everyone. We design for winners." Floating tilted image tiles drift in 3D around the headline and fly toward the camera on scroll (z-depth, rotate, skew, blur, brightness) |
| Manifesto | "Our work doesn't just look good, it works hard…" revealed word by word with a blur stagger |
| 3D accent | Glowing pink extruded shape over a grid (currently a video) |
| Client strip | Infinite horizontal logo marquee |
| Works | "WORKS" title. Each project is a full-width marquee of its name with the cover image tilting and scaling in 3D through the text, plus a "View work" link |
| Services | Four cards (image + title + line + arrow) revealed on scroll |
| Stats | Rolling odometer counters |
| Testimonials | Cards fly in from 3D space and assemble into a grid |
| CTA | "Say Hello!" letters drop in one by one, Contact button |
| Footer | Big logo, tagline "Good work speaks. Ours doesn't shut up.", contact details, Explore links, review-site icons |
| Copy to keep | "Built for Market Leaders. Stop playing defense." · "We don't do 'pretty for the sake of pretty.'" · "Design isn't decoration, it's the engine that powers identity, emotion, and impact." · service taglines ("Apps engineered to punch above their weight", "Your brand deserves chaos, let's unleash it!", "World-class animation that transforms your vision into visual storytelling.", "Where automation meets intelligence, and your business begins to run itself.") |

## 7. Site map today

```
/                         Home
/about                    About (team, awards, stats, testimonials)
/services                 Services index
  /services/mobile-app
  /services/digitalmarketing
  /services/2d-3d-animation
  /services/applied-ai-automation-systems
/works                    Works index
  /works/etihad  /works/robotaxi  /works/prometheus-fuels
  /works/mars-express  /works/gymshark  /works/anodyne-2
/blog                     Blog index (6 posts under /blog-posts/…)
/contact                  Form (name, email, phone, details, service checkboxes) + FAQ
/privacy-policy
```

All of these URLs will either keep the same path or get a 301 redirect, so existing Google
rankings and shared links keep working.
