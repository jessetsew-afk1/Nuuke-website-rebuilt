# NUUKE concept case studies: brand research briefs

Each project is an independent concept, labelled "Concept – not commissioned by the brand". The facts below come from public sources and are cited per section.

**Method and caveats (read first)**
- Research date: 1 Oct 2026. Web *search* worked, but the research environment blocked direct page fetches. That included the brands' own sites, the App Store and Wikipedia. So every fact here comes from search-engine excerpts of the cited pages, not from a full read of each page. **Before publishing, re-check every number and quote against the primary URL.**
- I could not open the brand websites, so **no hex value below was sampled from a brand asset**. Where hex codes appear, they are marked *working approximation (our inference)*. Eyedrop them from the live site or app before use.
- Personas and "design problems" are **NUUKE assumptions and framing**, not brand statements.
- `[unverified]` marks something that only one weak source claimed, or that sources disagree on.
- I kept all five brands. None was too thin to brief, so I didn't need a substitute.

---

## 1. Rise Science: RISE sleep & energy app (Category: mobile app)

### Company summary
Rise Science is a Chicago-based company. Jeff Kahn (CEO) and Leon Sasson (CTO) co-founded it while studying engineering at Northwestern University. Northwestern's McCormick magazine also names Jacob Kelter as a co-founder. Sources date the founding to 2015, but the work started in 2014 with sleep coaching for pro sports teams. Teams named in sources include the Chicago Bulls, Miami Dolphins, Jacksonville Jaguars and New England Patriots. IDEO helped design that athlete sleep system. Around 2018 the company moved to consumers. In June 2021 it launched the RISE app and announced $15.5M raised in total: a $10M Series A led by Goodwater Capital, plus an earlier $5.5M seed from Freestyle Capital, High Alpha and True Ventures. Business model: subscription app with a 7-day trial. Rise's own review page lists **$69.99/yr**. At launch in 2021, Crunchbase News reported **$60/yr**.

### Mission / positioning (their words)
- Product tagline: **"The power behind your next best day."** (Product Hunt listing)
- Built on "the two most powerful levers for improving your energy, focus, and performance: **sleep debt and circadian rhythm**" (Rise Science site/App Store copy, via search)
- Shows "when you're primed for deep work, when to take it slower" (same)
- Scientific basis: the **two-process model of sleep regulation** (Crunchbase News)
- Positioning in short: it presents itself as an *energy* app that uses sleep science, not a sleep score tracker.

### Target audience and personas (our assumptions)
Audience: knowledge workers, students, parents and performance-minded people who want more daytime energy. It grew out of elite sport.
1. **"Deep-work Dana", 31, product manager.** She wants to schedule hard work into her energy peaks and stop the 3pm crash.
2. **"New-parent Marcus", 36.** Sleep is broken. He wants to manage sleep debt realistically, not chase "8 hours".
3. **"Night-owl Priya", 22, grad student.** She wants to shift her late body clock without beating herself up.

### Brand look
- **Colours:** not found in sources. *Working approximation (our inference, verify from App Store screenshots):* a dark night UI (deep navy/indigo, ~`#14122B`) with a violet/purple accent (~`#7B61FF`) and warm peach/amber for energy peaks (~`#FFB27A`).
- **Typography:** not found. The UI reads as a clean geometric/grotesk sans *(inference)*.
- **Tone of voice:** calm, science-backed, non-judgemental. They say zero sleep debt is unrealistic and advise keeping it **under 5 hours** (Bustle/Marie Claire reviews). The vocabulary is coined and ownable: *Sleep Debt, Melatonin Window, Energy Peaks/Dips, grogginess window*.

### Traction
- **Apple Design Awards 2023 finalist, Innovation category** (Apple Developer ADA 2023 page).
- Described as a frequent App of the Day and App Store **Editors' Choice** (Rise About page, via search).
- Users: Rise says **"over 10 million users"** (About page, via search). Third-party app trackers report **10M+ downloads by July 2025** `[unverified, aggregator data]`.
- App Store rating about **4.7 from ~70K ratings** `[snapshot from search excerpt; re-check]`.
- Claim from the earlier B2B work: in their trials, athletes got **"54 more minutes of sleep a night"** (Kahn, Northwestern magazine).
- A search excerpt claimed "Apple Best Apps of 2026". **Omitted as unverified.**

### Core user journeys and real features
Real features, per reviews and Rise's own copy:
- Onboarding questionnaire covering sleep habits, movement and energy.
- **Personal sleep need**, estimated from phone usage data (~1 year where available).
- **14-night sleep debt** in hours.
- A circadian **energy schedule** showing peaks, dips, a morning grogginess window (~90 min after waking), a wake zone and the **Melatonin Window** (ideal bedtime, ~1 hr).
- **20+ timed habit reminders**: last caffeine (~12 h before bed), morning light (≥10 min), dim the lights (~90 min before bed), wind-down (1–2 h before bed).
- Smart/gentle alarm, sleep sounds, meditations, widgets, calendar integration, a "Learn" library.
- Progress charts: sleep/wake times, sleep debt, sleep quality.
- Navigation: reviews describe 4–5 bottom tabs. Older builds: *Sleep, Energy, Progress, Learn*. Newer: *Sleep, Energy, Tools, Progress, Learn* (or a Home tab).

Prototype screens (6–10):
1. **Welcome/value prop.** "Know your energy, not just your sleep." CTA: Get started.
2. **Onboarding quiz.** Typical bed/wake times, chronotype-style questions, current energy rating. Progress bar.
3. **Permissions.** Health/phone-usage access, with the reason it is needed ("to estimate your sleep need").
4. **Your sleep need reveal.** For example, "8h 10m". Explains why it isn't 8h for everyone.
5. **Home / Sleep Debt.** Big sleep-debt number (hours) against the <5h target, a 14-night bar chart, last-night summary, a "how did you feel?" rating.
6. **Energy schedule (hero screen).** A 24-hour curve with grogginess window, peaks, afternoon dip, Melatonin Window. "Now" marker; tap a segment for advice.
7. **Habits / reminders.** Toggle list with personalised times: Caffeine cutoff 2:15pm, Light exposure 7:40am, Dim lights 9:30pm, Wind-down 10:00pm.
8. **Melatonin Window / bedtime.** Countdown, wind-down tools (sounds, meditation), set smart alarm.
9. **Progress.** Toggle between sleep/wake times, debt and quality over weeks.
10. **Learn.** Short science cards linked to today's state ("Why your 3pm dip happens").

### Design problems we could tackle (our framing)
1. **Make an invisible biology legible at a glance.** The energy curve is the product. It should read in under 2 seconds on a lock-screen widget, a watch or the home screen.
2. **Debt without guilt.** Show "sleep debt" so it motivates rather than shames, especially for users who can't control their sleep (parents, shift workers).
3. **From insight to action.** Turn 20+ reminders into a calm daily plan. Fewer notifications, better timing, one "next best action".

### Sources
- https://www.builtinchicago.org/articles/rise-science-app-launch-15m-funding
- https://news.crunchbase.com/health-wellness-biotech/get-out-of-sleep-debt-rise-science-secures-15-5m-for-app-to-boost-energy-levels/
- https://www.highalpha.com/news/rise-science-app-launch
- https://www.mccormick.northwestern.edu/magazine/fall-2021/rise-shine/
- https://www.risescience.com/about-us
- https://www.risescience.com/blog/rise-app-review
- https://www.producthunt.com/products/rise-science
- https://developer.apple.com/design/awards/2023/
- https://apps.apple.com/us/app/rise-sleep-tracker/id1453884781
- https://www.bustle.com/wellness/rise-sleep-tracking-app-review
- https://www.marieclaire.co.uk/life/health-fitness/rise-app-review
- https://www.ideo.com/works/a-game-changing-approach-to-sleep-for-athletes
- https://www.fastcompany.com/90129191/ideo-designs-a-sleep-system-to-help-athletes-get-more-shut-eye

---

## 2. Olio: local sharing app, UK (Category: mobile app)

### Company summary
Olio was founded in London. Tessa Clarke and Saasha Celestial-One, friends from business school, incorporated it on **9 Feb 2015** and launched the app in July 2015. Before launch they tested the idea in a 12-person WhatsApp group, then signed up about 2,000 people in north London. The idea came from Clarke failing to give away good food on moving day in 2014. The app lets neighbours give away, request, borrow and lend food and household items, mostly for free. Business model:
- **B2B "Food Waste Heroes" programme.** Businesses pay Olio. Trained volunteers collect unsold food from stores and list it in the app. Tesco has been a partner since 2020; Iceland, Asda, Boots, Amazon Fresh, Holland & Barrett and Compass are also named.
- **Consumer freemium.** "Supporter" tiers from about **£1.99/month** add ad-free use, map view, faster notifications and a badge.
- Funding: £/$6M Series A (2018, TechCrunch). **$43M Series B** (Sept 2021), led by VNV Global and Luxor/Lugard Road, with Accel, Octopus Ventures and DX Ventures among the backers.

### Mission / positioning (their words)
- **"Share More, Waste Less"** (official LinkedIn name and app listing)
- Mission: "to create a world in which **nothing of value goes to waste**" (via Olio press and profile copy)
- "Your local sharing app" (olioapp.com page title)
- Rebrand idea: "**urgent optimism**", moving "from despair to hope". Olio "consciously moved away from green" because it is "more than just a sustainability app" (Olio's "Meet the new look Olio" post, via search)

### Target audience and personas (our assumptions)
Audience: UK urban and suburban households (4.5M UK users), cost-of-living-conscious people, eco-minded sharers, volunteers.
1. **"Saver Sam", 27, Manchester renter.** Uses Olio to stretch the food budget. Wants to see what's nearby *now* and get there first.
2. **"Declutter Diane", 54, Bristol.** Gives things away. Wants listing to be quick: snap a photo, set a pickup time, done.
3. **"Hero Hamid", 40, volunteer Food Waste Hero.** Collects a Tesco bag each evening. Needs fast batch listing and simple pickup coordination.

### Brand look
- **Colours:** in the 2023 rebrand (Wholegrain Digital built the low-carbon site) Olio dropped green for a **warm, optimistic palette**. The in-app "Add" button is described as **purple** (Olio help centre). *Working approximation (our inference, verify):* purple ~`#6E3BD9`, plus warm accents (coral/orange/yellow) on an off-white base.
- **Logo/type:** bold **lower-case wordmark**. Its stated symbolism: a "handover" between the i and l (sharing); the i's dot lifted from the o (reuse); begins and ends with a circle (circular economy). Typeface name not found.
- **Tone of voice:** friendly, neighbourly, hopeful and lightly playful. A past campaign line was "It feels good to share."

### Traction
- At its 10th anniversary (July 2025): **8.8M users**, **60 countries**, **4.5M in the UK**, **120M meals** shared, **270k tonnes CO₂e** avoided (The Grocer; Olio blog)
- **150,000 food-safety-trained volunteers** collecting from **8,500 locations a month** (The Grocer)
- Tesco partnership passed **30M meals** (Feb 2023), then **100M meals** (The Grocer)
- Earlier user counts: ~5M (2021), ~7M registered (May 2023)
- Beazley **Designs of the Year 2019** nominee, Design Museum (digital)
- Funding: Series A (2018) and $43M Series B (2021), as above

### Core user journeys and real features
Real features, per Olio's help centre and guides:
- Listing flow: purple **Add** button → choose Free (and other types) → category Food/Non-food → up to **10 photos** → **"AI-ify"** auto-fills title and description from the photo → pickup times and instructions.
- **Request** → in-app **messaging** → giver confirms → **collect**.
- **Wanted** listings, **Borrow/lend**, **Made** (buy and sell homemade food and handmade crafts), Lucky Dip, Reduced food, Forum, incentives (points and badges).
- **Map view** (a Supporter perk).
- Food Waste Hero **"Add Collection"** batch-listing from photos.

Prototype screens (6–10):
1. **Onboarding.** Postcode or location, then "What do you want to do?" (Get / Give / Volunteer). Notification opt-in.
2. **Home feed.** Nearby listings as cards: photo, title, distance, "added 12 min ago", Food/Non-food filter chips.
3. **Map view.** Pins clustered by distance, with a Supporter upsell for free users.
4. **Listing detail.** Photo carousel, description, pickup window, giver profile and rating, **Request** CTA.
5. **Chat.** Request thread with quick replies ("I can come at 6pm") and a **Confirm pickup** button.
6. **Add listing.** Camera → AI-ify draft → category → pickup times → Publish.
7. **Wanted / Borrow.** Post a request ("Need a drill this weekend").
8. **Volunteer (Food Waste Hero) dashboard.** Today's collection slot, store, **Add Collection** batch upload.
9. **Impact / profile.** Items shared, meals saved, CO₂ avoided, badges.
10. **Supporter paywall.** Ad-free, map, faster alerts, tier picker.

### Design problems we could tackle (our framing)
1. **Speed is the product.** Good food goes in minutes. Redesign discovery and alerts so local, time-critical items surface fairly, without notification overload.
2. **Trust between strangers.** Make the doorstep handover feel safe and polite: verification, ratings, clear pickup etiquette.
3. **Make the volunteer engine scale.** Turn Food Waste Hero collections (batches of 10–40 items) into a 60-second listing job, and show businesses the impact they pay for.

### Sources
- https://www.thegrocer.co.uk/news/olio-food-waste-app-marks-10th-anniversary-with-120-million-meal-landmark/707257.article
- https://olioapp.com/business/2025/07/16/looking-back-at-10-years-of-olio-and-120-million-meals-rescued/
- https://techcrunch.com/2021/09/05/food-sharing-app-olio-raises-43m-series-b-as-the-world-switches-on-to-the-food-waste-crisis/
- https://techcrunch.com/2018/07/11/olio
- https://www.grocerygazette.co.uk/2023/02/08/tesco-save-meals-with-olio-app/
- https://www.thegrocer.co.uk/news/tescos-olio-food-waste-partnership-hits-100-million-meals/723887.article
- https://olioapp.com/en/olio-updates/meet-the-new-look-olio/
- https://www.wholegraindigital.com/blog/olio-sustainable-site/
- https://help.olioapp.com/en/articles/12158761-how-do-i-add-edit-and-remove-my-listings
- https://help.olioapp.com/en/articles/12140082-becoming-an-olio-supporter
- https://help.olioapp.com/article/23-wanted
- https://www.linkedin.com/company/olio-share-more-waste-less
- https://designmuseum.org/exhibitions/beazley-designs-of-the-year/digital-2019/olio-the-food-sharing-app
- https://www.aboutamazon.co.uk/news/aws/olios-tessa-clarke-tackling-food-waste-with-hyper-local-community-sharing-app
- https://en.wikipedia.org/wiki/Olio_(app)

---

## 3. Heirloom: limestone direct air capture (Category: immersive 3D website)

### Company summary
Heirloom Carbon Technologies was founded in **2020** by **Shashank Samala** and **Noah McQueen**. It is headquartered in **Brisbane, California** (Bay Area) and has about 150–180 staff, per data providers `[unverified]`. It builds **direct air capture (DAC)** plants that use limestone to pull CO₂ from the air. The CO₂ is then stored permanently. Business model: it sells **carbon-removal credits** to corporate buyers. Funding: **$53M Series A** (2022), co-led by Carbon Direct Capital, Ahren Innovation Capital and Breakthrough Energy Ventures, with the Microsoft Climate Innovation Fund. **$150M Series B** (Dec 2024), led by Future Positive and Lowercarbon Capital, with Breakthrough Energy Ventures, Mitsubishi Corp. (Americas), Siemens Financial Services, Japan Airlines and Mitsui.

### Mission / positioning (their words)
- "**Restoring balance to our atmosphere**" (heirloomcarbon.com tagline, via search)
- Goal: remove **1 billion tons of CO₂ by 2035** (company copy)
- Uses "natural processes to engineer the world's most cost-effective Direct Air Capture". Limestone "captures CO₂ from the air over years… our technology accelerates this natural process to just days" (company copy, via search)

### Target audience and personas (our assumptions)
Audiences: corporate carbon-removal buyers, investors and policymakers, host communities (Louisiana), climate-literate public, recruits.
1. **"Buyer Beth", 44, Head of Carbon Removal at a tech company.** Needs proof of permanence, measurement and delivery timelines.
2. **"Councillor Ray", 58, Caddo Parish.** Wants to know about jobs, safety and what the plant looks like next door.
3. **"Engineer Lin", 29, prospective hire.** Wants to grasp the chemistry and scale in 3 minutes.

### Brand look
- **Not verified** (I couldn't open the site, and no brand case study was found). Note: "Heirloom Agency" in San Francisco is a *different*, unrelated company.
- *Imagery from press (observed in coverage):* white mineral powder, silver/metal trays stacked 40 ft high, warehouse-scale robotics, industrial-clean.
- *Working approximation (our inference):* limestone off-white `#F2EFE8`, mineral grey `#8C8A85`, deep charcoal `#1E1E1C`, one earthy accent such as ochre or kiln-orange `#D2691E` for heat. Tone: sober, scientific, quietly confident, "nature, accelerated".

### Traction
- **Nov 2023:** opened what it calls **America's first commercial DAC facility** in **Tracy, California**. Capacity up to **1,000 t CO₂/yr**. Runs on renewable power from **Ava Community Energy**. Opened with US Energy Secretary Granholm in attendance.
- **Microsoft:** an early credit purchase (2022), then a deal for **up to 315,000 t** of CO₂ removal over about 10 years (reported at ~$200M by The Hill).
- Other buyers named in coverage: Stripe, Shopify, Meta, JPMorgan, United Airlines Ventures `[list from secondary coverage]`.
- **Louisiana (Port of Caddo-Bossier, Shreveport):** a planned 17,000 t/yr plant (originally targeted for 2026), and a larger plant as Heirloom's part of **Project Cypress**, a DOE regional DAC hub with Climeworks and Battelle (up to $600M federal). That plant was targeted at 100,000 t/yr from 2027, rising to ~300,000 t/yr. Total investment was announced at more than $1B.
- **Policy risk:** in Oct 2025 a leaked DOE list marked Cypress "terminate", and Heirloom made layoffs (MIT Tech Review). In **April 2026** Project Cypress appeared on the administration's list of **preserved** awards (Swissinfo/Carbon Herald). The final EIS came in March 2026 and the Record of Decision in April 2026 (DOE). **Current build timelines are not confirmed.** Use "planned" language.

### How the technology works (for a scroll-driven 3D explainer)
Heirloom's process is a closed **calcium loop**:
1. **Limestone (CaCO₃) feedstock.** Abundant, cheap rock. In nature it absorbs CO₂ over *years*.
2. **Electric kiln (calcination).** Limestone is heated to about **900 °C** (one report says **~1,650 °F**) in a kiln **powered by renewable electricity**. It splits into **calcium oxide (CaO)** and a **pure CO₂ stream**. A cement kiln vents that CO₂; Heirloom captures it. Future plants will use **Leilac/Calix electric kiln technology** under a global licence.
3. **CO₂ capture and storage.** The pure CO₂ goes to a tank, then to permanent storage. In Tracy it goes into **concrete with CarbonCure**, which mineralises it; this was billed as the world's first DAC-to-concrete storage. Louisiana plans call for **geologic storage**.
4. **Hydration.** The CaO is hydrated with water to make **calcium hydroxide, Ca(OH)₂**. Coverage describes it as "thirsty" for CO₂.
5. **Spreading on trays.** The white powder is spread thin on **hundreds of flat trays** stacked on **~40-ft (12 m) vertical racks**, open to ambient air. Coverage notes the system needs fewer energy-hungry fans than other DAC designs.
6. **Accelerated carbonation (~3 days).** The material soaks up CO₂ from passing air like a sponge and turns back into CaCO₃ in about **3 days**, versus months or years in nature.
7. **Robotic monitoring.** **Robots** move up and down the stacks. Software models the reaction to know where each tray is in its cycle. Robots move finished trays back to the kiln.
8. **Loop.** The regenerated limestone re-enters the kiln, and the same material is reused cycle after cycle.

Suggested 3D scroll beats: rock → kiln glow (heat) → CO₂ split as a particle stream → tank → concrete truck → powder hydrates → trays rise into a 40-ft tower → air flows through (time-lapse "Day 1 / 2 / 3") → robot lifts tray → back to kiln → zoom out to Tracy, then the Louisiana scale-up.

**Facilities and partners:** Tracy, CA (operating since 2023). Shreveport/Caddo Parish, LA (planned). Ava Community Energy (power). CarbonCure (concrete storage). Leilac/Calix (kilns). Climeworks and Battelle (Project Cypress). Microsoft (buyer and investor).

### Design problems we could tackle (our framing)
1. **Make chemistry feel like nature, not a factory.** Explain a 900 °C, robotic, industrial loop so it reads as "rock breathing in", without hiding the industry.
2. **Prove it's real.** Show tonnes removed, permanence and verification visually, for sceptical buyers and journalists.
3. **Be a good neighbour.** Design a community-facing layer for Louisiana: jobs, safety, a "what will I see" plant visualiser.

### Sources
- https://www.heirloomcarbon.com/technology
- https://www.heirloomcarbon.com/news/heirloom-unveils-americas-first-commercial-direct-air-capture-facility
- https://www.heirloomcarbon.com/news/two-direct-air-capture-facilities-in-northwest-louisiana
- https://www.heirloomcarbon.com/news/heirloom-and-microsoft-sign-permanent-co2-removal-deal
- https://www.heirloomcarbon.com/news/leilac-and-heirloom-sign-agreement-to-employ-electric-kiln-technology
- https://calix.global/news/leilac-heirloom-sign-collaboration-agreements/
- https://www.businesswire.com/news/home/20241204489244/en/Heirloom-Raises-150-Million-Series-B-to-Rapidly-Scale-Commercial-Direct-Air-Capture
- https://www.prnewswire.com/news-releases/direct-air-capture-startup-heirloom-raises-53mm-series-a-among-the-largest-investments-in-new-carbon-removal-technologies-301505399.html
- https://www.canarymedia.com/articles/carbon-capture/americas-first-commercial-direct-air-capture-plant-just-got-going
- https://www.latitudemedia.com/news/heirloom-commercial-scale-california/
- https://www.frontiersin.org/journals/climate/articles/10.3389/fclim.2024.1415642/full
- https://www.fastcompany.com/90845600/this-bay-area-startup-uses-rocks-to-suck-carbon-out-of-the-air
- https://www.dezeen.com/2023/11/15/heirloom-opens-first-large-scale-commercial-carbon-capture-plant-in-us/
- https://thehill.com/business/4193168-microsoft-funding-new-approach-for-carbon-removal/
- https://www.technologyreview.com/2025/10/07/1125207/the-us-is-set-to-cancel-funding-for-two-major-direct-air-capture-plants/
- https://www.swissinfo.ch/eng/climate-solutions/climeworks-receives-surprising-green-light-for-plant-in-louisiana/91326278
- https://www.energy.gov/nepa/doeeis-0567-project-cypress-regional-direct-air-capture-dac-hub-calcasieu-parish-and-caddo
- https://en.wikipedia.org/wiki/Heirloom_Carbon_Technologies

---

## 4. Fellow: Stagg EKG kettle and Ode grinder (Category: 3D product animation film)

### Company summary
Fellow (Fellow Industries / Fellow Products) is a **San Francisco** design-led coffee-equipment brand. **Jake Miller** founded it in **2013**. He fell for coffee working in a Minnesota coffee shop before Stanford. Its first product, the **Duo Coffee Steeper**, raised **$193,402 from 2,712 backers on Kickstarter** (goal $50k, late 2013). Miller has said the first product "flopped". Then came the **Stagg pour-over kettle** and the **Stagg EKG** electric kettle. Sources give 2014 vs 2016 for the Stagg and 2016 vs 2017 for the EKG `[dates disputed]`. Today's range includes kettles, grinders (Ode, Opus), the Aiden brewer, mugs and canisters. In **2026** it launched the **Espresso Series 1** (~$1,500). It sells direct-to-consumer and through retail and specialty cafés. Funding: **$7.6M Series A from angels** (2021) and a **$30M Series B** (June 2022) led by NextWorld Evergreen. Forbes (May 2026) reports about **100 employees**, sales in **40+ countries**, and **73 investor rejections** along the way.

### Mission / positioning (their words)
- Tagline: **"Everyday Magic.™"** "When the simple motions of life become small moments of joy, that's Everyday Magic." (fellowproducts.com, via search)
- "Beautifully functional tools… designed in San Francisco and used around the world." (Fellow copy, via search)

### Target audience and personas (our assumptions)
Audience: specialty-coffee home brewers, design-conscious gift buyers, baristas, tea drinkers.
1. **"Pour-over Paolo", 34, software engineer.** Weighs his beans. Wants precision and repeatability.
2. **"Aesthetic Anya", 29, designer.** Buys objects that look good on the counter. Colour and finish matter.
3. **"Tea-first Tomás", 45.** Needs exact temperatures for green and white teas.

### Brand look
- **Product colourways (sourced):** EKG in **Matte Black, Matte White, Polished Copper, Polished Steel**. EKG Pro adds **Stone Blue with Walnut**, **Matte Black with Walnut**, **Matte White with Maple** (Crate & Barrel, retailers).
- *Working approximation for film grading (our inference):* matte black `#1C1C1C`, matte white `#EDEBE6`, copper `#B87333`, stone blue `#7E93A3`, walnut `#5C4033`.
- **Brand typography:** not verified. Fellow's web style reads as minimal sans with generous whitespace and studio product photography *(inference)*.
- **Tone:** warm, crafted, quietly witty, "magic in the ritual".

### Traction
- **Red Dot Design Award 2018** for the Stagg EKG. **IDSA IDEA** gallery entry. Fellow cites **SCA awards** and **Dezeen Awards** across its range.
- **Stagg EKG Pro** named one of **Oprah's Favorite Things 2023** (PRWeb).
- $30M Series B (2022). About 100 staff and 40+ countries (Forbes 2026). An Entrepreneur.com first-person piece describes a "9-figure business" `[self-reported, no figure]`.

### Product design details (Stagg EKG, for the 3D model)
- **Form:** squat cylindrical body with a **flat-top lid** and knob. Red Dot says its "form [is] reminiscent of traditional porcelain cans". Long, narrow **gooseneck spout** with a slight curve and a pointed tip, for a precise stream (~1–2 g/s trickle per one review).
- **Counterbalanced handle:** it puts the centre of mass over the base, not the spout, so the kettle doesn't "nose-dive" when tipped. That encourages a slow, controlled pour. Handle options: plastic, or walnut/maple wood.
- **Materials:** **304 stainless steel** body and lid; plastic base on EKG and EKG Pro. **Pro Studio Edition** base is **metal and glass**.
- **Capacity/power:** **0.9 L**, **1200 W** (US).
- **Temperature control:** variable to the degree. Fellow/retail spec: **135–212 °F (57–100 °C)**. Older sources and Red Dot copy cite 104 °F / 40 °C as the minimum `[varies by model/version]`. **Hold mode** up to **60 min**. **Brew stopwatch**.
- **Base (EKG):** square, minimal. Small **LCD** in one corner showing **Set Temp** and **Real-Time Temp**. One round **knob** that is both power and temperature dial (press/hold for stopwatch). **Rear switches** for Hold and °F/°C. Dimensions **292 × 171 × 203 mm**, 1,274 g with base.
- **EKG Pro (Oct 2023):** full-colour hi-res screen, clock and **scheduling**, **altitude** adjustment, pre-boil, chime, hold 15/30/45/60 min, guide mode. From $195 (Studio from $225).
- **Ode Brew Grinder Gen 2 (alt hero):** **64 mm** stainless flat burrs, **31** stepped settings, **single-dose** load bin, Smart Speed **PID motor ~1,400 RPM**, **auto-stop** when empty, anti-static tech, **built-in knocker**, 239 × 105 × 248 mm.

### Animation storyboard (EKG, ~45–60 s)
1. Black void. Rim light traces the gooseneck silhouette. Title: "Everyday Magic."
2. Macro on brushed 304 steel; the lid lifts and a water fill is seen from inside.
3. Kettle lands on its base; the LCD wakes and shows SET 205°F / NOW 68°F.
4. Knob turn (sound design: detents); the temperature number spins.
5. Cutaway X-ray: the heating element glows and convection currents rise; the number climbs.
6. "HOLD" switch flicks; a 60-min ring animates.
7. Physics beat: the centre-of-mass marker sits over the handle; the kettle tilts without nose-diving.
8. Slow-mo pour: a thin, unbroken stream into a pour-over cone, then the bloom.
9. Colourway carousel: black → white → copper → stone blue/walnut, each a 1-second hero turn.
10. End card: product name, "Concept – not commissioned by Fellow".

### Design problems we could tackle (our framing)
1. **Make precision visible.** Temperature, flow and balance are invisible benefits. Find a visual language that shows them.
2. **One hero object, many finishes.** A modular CGI pipeline (shaders, wood grain, steel) so every colourway and launch is consistent and fast.
3. **From kettle brand to system.** Show the EKG, Ode, Aiden and Espresso Series 1 as one ritual without diluting the iconic kettle.

### Sources
- https://www.red-dot.org/project/stagg-ekg-22494-22493
- https://www.idsa.org/awards-recognition/idea/idea-gallery/stagg-ekg-electric-water-kettle/
- https://fellowproducts.com/products/stagg-ekg-electric-pour-over-kettle
- https://fellowproducts.com/products/ode-brew-grinder-gen-2
- https://fellowproducts.com/
- https://help.fellowproducts.com/hc/en-us/articles/115001707611-Stagg-EKG-Electric-Kettle-Safety-Troubleshooting-and-Instructions
- https://www.amazon.com/Fellow-Electric-Pour-over-Temperature-Stopwatch/dp/B077JBQZPX
- https://northernteaist.com/2019/11/11/fellow-stagg-ekg-kettle/
- https://www.techgearlab.com/reviews/kitchen/electric-kettle/fellow-stagg-ekg
- https://sprudge.com/fellow-stagg-ekg-kettles-get-an-update-with-the-new-pro-series-192756.html
- https://www.gearpatrol.com/food/drinks/a41501785/fellow-stagg-ekg-pro/
- https://www.prweb.com/releases/fellow-stagg-ekg-pro-electric-kettle-selected-as-one-of-oprahs-favorite-things-2023-301974645.html
- https://www.crateandbarrel.com/fellow-stagg-ekg-pro-electric-tea-kettle-in-stone-blue-with-walnut-accents/s681646
- https://prima-coffee.com/equipment/fellow-products/d1211mb-us-sb-fe-pr-pp
- https://dailycoffeenews.com/2022/06/15/coffee-equipment-maker-fellow-raises-30-million-in-series-b-round/
- https://www.entrepreneur.com/building-a-business/my-business-idea-brought-in-200k-on-kickstarter-then-grew-to-9-figures
- https://www.forbes.com/sites/eshachhabra/2026/05/27/how-73-rejections-shaped-fellows-trajectory-and-now-a-new-espresso-machine/
- https://www.prnewswire.com/news-releases/fellow-introduces-espresso-series-1-a-new-era-of-home-espresso-begins-302434304.html
- https://blog.housewares.org/2017/02/19/discovering-design-meet-fellow/

---

## 5. Fishwife: tinned seafood (Category: digital/social marketing campaign)

### Company summary
Fishwife Tinned Seafood Co. is a **Los Angeles** brand. **Becca Millstein**, previously a music-business marketer, and **Caroline Goldfarb**, a writer and podcaster, founded it in **2020** and launched it in **December 2020**. Goldfarb has since left; Millstein is CEO. A 2023 dispute between the founders was reported as settled. Fishwife sells premium, responsibly sourced tinned fish in **illustrated tins**. It started direct-to-consumer and now also sells through retail: Whole Foods nationwide from April 2024, and coverage also lists Target, Kroger banners, Wegmans, Publix, Sprouts and Costco `[retailer list from secondary sources]`. Products come from **six canneries in Washington State, Spain, Denmark and Scotland**. Fish comes from **MSC/ASC-certified** fisheries and farms or Fishery Improvement Projects. Its salmon comes from **Kvarøy Arctic**, which Fishwife describes as 100% traceable. In **Shark Tank** Season 15, Episode 10 (aired **12 Jan 2024**), Fishwife closed **$350k for 6% plus 2% advisory shares** with Lori Greiner and Candace Nelson.

### Mission / positioning (their words)
- "To make **premium, sustainably sourced, and delicious tinned seafood a staple in every cupboard**" (eatfishwife.com Our Story, via search)
- "Bring the vibrance of European **conservas** culture to the North American table" (Fishwife copy, via search)
- Press framing: Fishwife made tinned fish a "**hot girl food**" (Spoon University / FemFounded). Fortune frames it as a challenger to the "dusty" category dominated by StarKist and Bumble Bee.

### Target audience and personas (our assumptions)
Audience: food-curious millennials and Gen Z (often women), "girl dinner" and snack-plate culture, health and protein seekers, gift buyers.
1. **"Snack-plate Sofia", 27, Brooklyn.** Builds tinned-fish board dinners for friends. Shares them on TikTok.
2. **"Protein Pete", 33.** Wants high-protein, clean-label lunches. Shops at Whole Foods.
3. **"Gifting Grace", 41.** Buys pretty tins and merch as hostess gifts.

### Brand look
- **Illustration:** in-house illustrator **Danny (Daniel) Miller**, his first packaging job. Hand-drawn lettering, a growing cast of fish, people and motifs, drawn from the folk "fishwife" figure. "Traditional bold colours of classic European conservas" with a modern twist (Creative Review, Dieline).
- **Colour:** saturated and confident, with one colour family per SKU. No official hex found. *Working approximation (our inference):* tomato red `#E8452C`, sunflower yellow `#F6C343`, cobalt `#2747A8`, pink `#F4A6B8`, mint `#9ED6C2` on cream `#FFF6E5`.
- **Typography:** a **serif + sans pairing** that "feels retro yet modern" (Dropmark analysis).
- **Tone of voice:** cheeky, warm, maximalist, food-nerdy. The 2024 billboard and the cookbook borrow a **vintage greeting-postcard** aesthetic.

### Traction
- Revenue disclosed on Shark Tank: **$750k (2021)**, **$2.6M (2022)**, **~$5.8M projected (2023)**. 2023 was later reported at ~$6M and 2024 at ~$7.6M `[2024 figure from secondary Shark Tank update sites, unverified]`.
- Whole Foods national launch (2024); reported in **3,200+ stores** `[secondary]`.
- **NOSH Best of 2024: Best Marketing Campaign.**
- **The Fishwife Cookbook** (Harvest/HarperCollins, **25 Feb 2025**, 80 recipes), on Eater and LA Times spring 2025 best-cookbook lists.
- Press: Fortune (Apr 2024), Food Dive, Forbes, Vogue/NYT mentions.

### Product range (as reported)
Smoked Atlantic Salmon; **Smoked Salmon with Fly By Jing Sichuan Chili Crisp** (bestselling collab); Smoked Rainbow Trout (beechwood-smoked, Denmark micro-cannery); Smoked Rainbow Trout with Red Chimichurri; **Slow Smoked Mackerel with Chili Flakes** (Scotland); **Albacore Tuna with Spanish Lemon**; Albacore in Spicy Olive Oil; Sardines with Preserved Lemon; Sardines with Hot Pepper; **Cantabrian Anchovies** in EVOO; starter packs and gift sets; merch (totes, hats, serving sets).

### Marketing style, channels, notable campaigns
- **Channels:** own Shopify DTC site, Instagram, **TikTok** (@eatfishwife), email, retail, pop-ups, a cookbook, merch.
- **Collabs:**
  - Fly By Jing (Sichuan chili crisp salmon, plus a gold-label "Sweet + Spicy Zhong" edition).
  - **Graza × Diaspora Co. "Campfire Cod"** (2023).
  - **Dieux Skin** eye masks with Danny Miller art (2025).
  - **Whole Foods tote** (2026).
  - **Sweetgreen** Summer Niçoise with a co-branded Albacore tin (11–24 Aug 2026).
- **Out-of-home and events:**
  - First LA **billboard** celebrating the Whole Foods expansion (2024).
  - NYC **immersive pop-up** (fall 2024) with aperitivo nights (Ghia, Via Carota), Pizza Friday (Rubirosa) and Apollo Bagels.
  - **"Fishwife Snack Bar & Shop"** with Wildair, **Capital One** and Hendrick's (Gilda martinis), 142 Orchard St, NYC, **17–19 Oct 2025**. Pintxos, caviar desserts, holiday-product preview, card-holder early access.
- **Shark Tank** moment, amplified on TikTok with a "Shark Tank bundle".

### Design problems we could tackle (our framing)
1. **Scale the illustrated world without diluting it.** A modular illustration/motion system so every SKU, collab and social post feels hand-made at retail volume.
2. **From cult to cupboard staple.** A campaign that moves Fishwife from a "special-occasion snack plate" to everyday lunch (e.g. "Tin O'Clock": a weekday ritual, recipe-in-a-tin shorts, a Whole Foods shelf takeover).
3. **Make sourcing sexy.** Turn traceability (Kvarøy, MSC/ASC, micro-canneries) into shareable story content, not just fine print.

### Sources
- https://eatfishwife.com/pages/our-story
- https://eatfishwife.com/
- https://www.fooddive.com/news/fishwife-success-tinned-fish/726922/
- https://www.retaildive.com/news/fishwife-dtc-success-tinned-fish/727643/
- https://fortune.com/2024/04/12/fishwife-founder-becca-millstein-tinned-fish/
- https://www.creativereview.co.uk/fishwife-illustrated-branding-tinned-fish-danny-miller/
- https://thedieline.com/daniel-miller-cracks-the-tin-open-on-illustrating-the-world-of-fishwife/
- https://www.dropmark.com/blog/reverse-engineered-fishwife/
- https://www.nosh.com/awards/2024/fishwife
- https://www.nosh.com/news/2025/marketing-fishwife-reels-in-new-yorkers-with-pop-up-snack-bar-shop/
- https://www.nycforfree.co/events/fishwife-snack-bar-shop
- https://www.thekitchn.com/fishwife-fly-by-jing-smoked-salmon-sichuan-chili-crisp-23318025
- https://www.thekitchn.com/graza-x-fishwife-campfire-cod-launch-23417162
- https://wwd.com/pop-culture/new-fashion-releases/dieux-fishwife-eye-mask-collaboration-1239244444/
- https://www.businesswire.com/news/home/20260811124941/en/Sweetgreen-and-Fishwife-Bring-Tinned-Fish-to-the-Menu-for-the-First-Time-with-Summer-Nioise
- https://www.seafoodsource.com/news/fishwife-whole-foods-tote-bag-collaboration-sees-immediate-success
- https://perishablenews.com/seafood/fishwife-launches-100-traceable-tinned-smoked-salmon-with-kvaroy-arctic/
- https://www.goodreads.com/en/book/show/213974037-the-fishwife-cookbook
- https://en.wikipedia.org/wiki/Shark_Tank_season_15
- https://spoonuniversity.com/lifestyle/fishwife-fly-by-jing-smoked-salmon-sichuan-chili-crisp/
- https://femfounded.org/case-studies/fishwife/
