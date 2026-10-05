# NUUKE concept case studies: mobile app brand briefs

Each project is an independent concept, labelled **"Concept – not commissioned by the brand"**. The facts below come from public sources and are cited per brand.

**Method and caveats (read first)**
- Research date: 5 Oct 2026. Web search and page fetches both worked this time. Facts come from full reads of: the brands' own sites, App Store listings, Apple Developer "Behind the Design" articles, the Apple Design Awards pages, Wikipedia and named press. **Re-check numbers and quotes against the primary URL before publishing.** App Store ratings and prices are snapshots and change often.
- **No brand has published official hex colours.** Hex values marked *third-party sample* come from independent design teardowns that eyedropped screenshots. They are not brand specs. Values marked *our inference* are NUUKE approximations.
- Personas, design problems, prototype screens and cinematic openings are **NUUKE assumptions and ideas**, not brand claims.
- `[unverified]` marks a claim from one weak source, or a point where sources disagree.

---

## 1. Flighty: live flight tracker (iOS)

### Company summary
- **What it is:** a flight-tracking app that combines live flight data and FAA/air-traffic-control data. Its core promise is delay alerts that arrive faster than the airline's own.
- **Founded:** launched in **2019**. Mercury says August 2019, after 18 months of beta with frequent flyers and pilots. Simple Flying says September 2019 `[launch month unverified]`.
- **Founder:** **Ryan Jones**, CEO and former Apple operations employee. Apple calls him an "Austin-based developer".
- **Origin story:** a six-hour delay prompted Jones to tweet that he would build a solution himself, and his co-founders came from the replies. Mercury dates the delay to 2015. Simple Flying says January 2018 `[unverified]`.
- **Team:** about 10 people across seven countries. There is no marketing department. The company is bootstrapped, with no VC (Mercury).
- **Business model:** freemium. Your first flight gets Pro features free.
  - The App Store lists Pay-As-You-Go $4.99, Flexible Monthly $9.99, Pro Annual $59.99 and Lifetime $299.
  - Family plans cost $15.99–$449.
- **Platforms:** iPhone, iPad, Mac, Apple Watch and Apple Vision. There is no Android app, only an Android waitlist page.

### Positioning (their words)
- "Get the truth when you travel." (flighty.com)
- "The only app that tells you everything about your flight and tracks your lifetime of travel." (flighty.com)
- "The flight tracker your pilot uses… No account required. No newsletters. No ads." The App Store subtitle is "World's Fastest Delay Alerts".
- "We want Flighty to work so well that it feels almost boringly obvious." (Apple, Behind the Design)
- On airport boards: "they've had 50 years of figuring out what's important." (Apple, Behind the Design)

### Public traction
- **Apple Design Award 2023 winner, Interaction category** (Apple Developer ADA 2023 page).
- **App Store Awards 2023: App of the Year finalist** (flighty.com, Wikipedia).
- **App Store Editors' Choice** within days of launch (Mercury).
- **Users:** the homepage says "+3 million users". Mercury's case study says "over 4 million" `[figures differ; use the lower one or re-check]`. Mercury also quotes the company as saying it is "present on 3 out of every 4 flights in the U.S." `[company claim]`.
- **App Store rating:** 4.8 from about 155K ratings (snapshot).
- **Funding:** none found. The company is bootstrapped.
- **Press:** WSJ, Business Insider, TechCrunch and Forbes, per the Wikipedia citations.

### Audience and personas (our assumptions)
Frequent flyers, business travellers, aviation enthusiasts and the families who track them. Pilots and crew are also users, according to Mercury.
1. **"Road-warrior Ana", 38, consultant.** She flies about 80 legs a year and wants to rebook before the gate queue forms.
2. **"Pickup-duty Tom", 55.** He collects family at arrivals and only wants to know when to leave the house.
3. **"AvGeek Jordan", 26.** Jordan loves tail numbers, aircraft history and the annual Passport stats.

### Brand look
- **Colours:** none published. *Our inference:* a near-black UI with high-contrast white type. Status semantics are green for on time, amber for delayed and red for cancelled or diverted.
- **Typography:** not published. *Our inference:* SF-style system sans with tabular numerals for times, which echoes airport signage.
- **Tone:** confident, plain-spoken and a little wry. One example: flights appear "magically (read: extremely quickly)" from email, calendar or TripIt.
- **Signature UI (sourced):** Apple says the Live Activities and Dynamic Island are "designed to recall airport signage conventions that have been in place for decades". The Dynamic Island uses a simple circular chart for flight progress. One line per flight follows the departure-board analogy.

### Core journeys and real features
- **Add a flight.** Search it, or import it from email, calendar or TripIt.
- **Travel day.** Live Activity, gate changes, 65+ alert types and delay reasons.
- **Delay predictions.** Machine learning predicts late-arriving aircraft "up to 6 hours before the airline says anything". It also uses ATC mandates, which the site calls the #2 cause of delays.
- **"Where's my plane".** Follows the inbound aircraft for 25 hours.
- **Arrival.** Gate and baggage-claim predictions, plus Connection Assistant.
- **Social.** Flighty Friends (July 2023) shares live flights privately.
- **Lifetime stats.** Flighty Passport (December 2023), plus a personal flight map.
- **Airport Intelligence:** delay trends at each airport.

**Prototype screens (10)**
1. **Splash/hero.** A split-flap board resolves to "Get the truth when you travel".
2. **Add flight.** Search by flight number, with a choice to import from email, calendar or TripIt.
3. **My flights list.** One row per flight, departure-board style, with status chips.
4. **Flight detail.** Times (scheduled vs. estimated), gate and terminal, and a progress arc.
5. **Delay prediction card.** "Your inbound plane is 48 min late in Denver", the reason, and a confidence note.
6. **Where's my plane.** A 25-hour inbound aircraft timeline.
7. **Live Activity/Dynamic Island mock.** Lock-screen states for boarding, in-air and landed.
8. **Connection Assistant.** Step-by-step walk time from arrival gate to departure gate.
9. **Flighty Friends.** A friend's live flight with their ETA.
10. **Passport.** A year-in-flight poster showing miles, airports and hours delayed, with a share sheet.

### Design problems (our framing)
1. **Calm under bad news.** How should a cancellation or diversion alert be designed so it is urgent but never panicky, and leads with the next action (rebook)?
2. **Glanceability across surfaces.** Watch, Live Activity, widget and Mac each need one consistent information hierarchy, the "one line per flight" rule.
3. **Shareability as growth.** Flighty grows without paid marketing ("let the product do the marketing", Mercury). How could Passport and Friends become richer, privacy-safe share moments?

### Cinematic opening (our idea)
The page opens on a black airport departure board. As the user scrolls, split-flap letters clatter through the alphabet and settle into "FLIGHTY". The rows below flip city by city into a real-looking itinerary, ending at "DELAYED". Further scrolling turns that word into a prediction card, "Your plane is late in Denver: 6 hrs before the airline knows". The board then zooms down into the iPhone Dynamic Island, and its circular progress ring draws round as a small plane crosses the arc. The page ends on a Passport-style poster of the year's routes drawn as glowing great-circle lines.

### Sources
- https://en.wikipedia.org/wiki/Flighty
- https://mercury.com/blog/flighty-app-case-study
- https://developer.apple.com/news/?id=970ncww4 (Behind the Design: Flighty)
- https://developer.apple.com/design/awards/2023/
- https://www.apple.com/newsroom/2023/06/apple-announces-winners-of-the-2023-apple-design-awards/
- https://flighty.com · https://flighty.com/pricing · https://flighty.com/android-waitlist
- https://apps.apple.com/us/app/flighty-live-flight-tracker/id1358823008
- https://simpleflying.com/flighty-app-interview/

---

## 2. Gentler Streak: fitness and wellbeing tracker (Apple Watch/iPhone)

### Company summary
- **Company:** **Gentler Stories**, based in **Kranj, Slovenia**. The App Store lists "Gentler Stories LLC" and Apple's ADA page lists "Gentler Stories d.o.o.".
- **Co-founders:**
  - Katarina Lotrič, CEO
  - Andrej Mihelič, UI/UX
  - Jasna Krmelj, CTO
  - Luka Orešnik, senior developer
- **Team:** 8 people (Apple; Apptisan).
- **Launch:** Gentler Streak launched in **fall 2021** (Apple Behind the Design).
- **Prior work:** Lotrič and Orešnik previously won a **2017 Apple Design Award** for *Lake: Coloring Book for Adults* (startup.si). The studio also makes a second app, *The Outsiders*.
- **What it does:** an activity and health tracker that suggests how much to move each day based on readiness, not fixed goals. It covers heart-rate zones, sleep, menstrual-cycle-aware guidance, VO₂ max, steps and 140+ activity types.
- **Business model:** the core features are free, with a Premium subscription. The App Store lists $8.99/month and $39.99/year, lifetime at $59.99–$179.99, and family plans.
- **Funding:** bootstrapped, with no VC (Apptisan). No funding rounds found.
- **Platforms:** iPhone, iPad and Apple Watch. It uses Apple Health data and is available in 10 languages.

### Positioning (their words)
- "Move consistently, not constantly." (startup.si)
- "Gentler Streak meets you where you are each day." (gentlerstories.com)
- "No guilt, no punishment." (gentlerstories.com)
- "We want it to feel like a compass, a reminder to get moving, no matter what that means for you." (Lotrič, Apple)
- "Statistics are just numbers… We wanted to change that and focus on the humanity." (Apple)

### Public traction
- **App Store Awards 2022: Apple Watch App of the Year.**
- **Apple Design Award 2024 winner, Social Impact category** (Apple ADA 2024 page).
- **ADA 2023 finalist, Visuals and Graphics**, per the company's own site `[not cross-checked on Apple's 2023 page]`.
- Other recognition:
  - App Store Editors' Choice and App of the Day
  - Slovenian Startup of the Year 2023 finalist
- **App Store rating:** 4.7 from about 8.8K ratings (snapshot).
- **Users:** none found. **Revenue:** startup.si gives a 2022 band of "76–300k" `[currency and meaning unclear; don't publish]`.
- **Partnership:** from 29 June 2026, yearly subscribers of Gentler Streak or Tiimo get 40% off a yearly plan for the other app (Tiimo resource hub).

### Audience and personas (our assumptions)
Apple Watch owners put off by "push harder" fitness culture. That includes people returning from injury, burnout or illness, and people who track their cycle.
1. **"Recovering Maja", 34.** She is coming back from an overtraining injury and needs permission to rest.
2. **"Restarting Ben", 47.** He is getting back into exercise after years away, and the closed rings make him feel like a failure.
3. **"Cycle-aware Lea", 29.** She wants her training load to adapt to her menstrual cycle and sleep.

### Brand look
- **Mascot (verified):** **Yorhart**, a pun on "your heart". This orange, heart-shaped, abstract character was created with illustrator **Sören Selleslagh**. It represents "what your heart would be telling you" (Apple). The design was meant to resonate "regardless of age, gender, race, or body shape" (Sketch blog).
- **Colours:** none officially published. *Third-party sample (floow.design App Store screenshot teardown):*
  - coral `#FF7A45` for the daily summary
  - deep purple `#2E1B4E` for sleep
  - yellow `#F4C430` for steps
  - mint `#7ED957` for trends
  - sky blue `#8DB4E6` for guided activities
  - Each feature has its own gradient.
- **Typography:** the teardown reads headlines as heavy geometric sans, like SF Pro Display Heavy, with conversational sentence-case body text *(third-party observation)*.
- **Tone:** "supportive but not cheesy, motivating but not fake-hyped" (Sketch blog). Illustration is used to avoid the "cold" feel of most fitness apps.
- **Signature UI:** the **Activity Path**, a band showing your safe zone for activity, with Daily Readiness, 10-day and 30-day views. Also simple charts and monthly summaries that focus on progress over comparison.

### Core journeys and real features
- **Morning check-in.** Readiness, then the Activity Path, then a Go Gentler workout suggestion.
- **Workout.** Track on the Watch, with heart-rate zones.
- **Recovery.** Rest days are treated as part of the streak.
- **Reflect.** Sleep stages and consistency, the cycle view, and weekly/monthly/yearly recaps.
- **Learn.** "Insights", short health articles.

**Prototype screens (10)**
1. **Welcome.** Yorhart waves: "Move consistently, not constantly."
2. **Health permissions.** Explains why each data type helps.
3. **Today/Readiness.** A Yorhart mood state plus a plain-language readiness line.
4. **Activity Path.** A 30-day band with today's dot, inside, above or below the path.
5. **Go Gentler suggestion.** For example "A 20-min walk is perfect today", with alternatives.
6. **Workout summary.** Time in zones and effect on the path.
7. **Rest day.** A celebratory, guilt-free state with Yorhart resting.
8. **Sleep.** Stages and a consistency chart, with a purple theme.
9. **Cycle view.** Activity guidance by phase.
10. **Monthly recap.** A shareable card focused on progress, not leaderboards.

### Design problems (our framing)
1. **Explaining "readiness" without anxiety.** How do you turn HRV, sleep and load into one gentle sentence and visual?
2. **Celebrating rest.** Design streak mechanics that reward recovery, not just volume.
3. **Systemic colour.** Each feature has its own colour, which can dilute recognition (floow.design's critique). How do you build a coherent palette system around Yorhart's orange?

### Cinematic opening (our idea)
A soft, warm canvas holds a single orange Yorhart, breathing slowly. As the user scrolls, its heartbeat draws a line across the screen. The line softly widens into the Activity Path band, and 30 days of dots drift in: some above, some below, all inside the gentle zone. The background moves through the feature colours, from coral morning to yellow steps, then deep purple night. At the purple stage Yorhart curls up to sleep and a "Rest day" badge glows like an achievement. The final frame says "Move consistently, not constantly" and shows the two awards as small, quiet badges.

### Sources
- https://gentlerstories.com/gentlerstreak · https://gentlerstories.com/newsroom
- https://developer.apple.com/news/?id=3m0ht22s (Behind the Design: Gentler Streak)
- https://developer.apple.com/design/awards/2024/
- https://www.sketch.com/blog/gentler-streak/
- https://apptisan.substack.com/p/apptisan-025-gentler-streak
- https://www.startup.si/en-us/startup-map/startups-scaleups/gentler-streak
- https://apps.apple.com/us/app/gentler-streak-workout-tracker/id1576857102
- https://www.floow.design/aso-screens/gentler (third-party colour teardown)
- https://www.tiimoapp.com/resource-hub/tiimo-gentler-streak-partnership

---

## 3. Copilot Money: personal finance and budgeting

### Company summary
- **Company:** Copilot Money, Inc., based in **New York**.
- **Founder:** **Andrés Ugarte**, founder and CEO. He was a software engineer (Crowdfund Insider says ex-Google) and quit in 2018 to build Copilot (Apple Developer Spotlight).
- **Co-founder:** Copilot's Series A post says "co-founder Gabriel joined later" `[surname not found]`.
- **Founding date:** sources differ. The FAQ says "Founded: 2019". The Series A post says it launched publicly in January 2020, and Crowdfund Insider says "founded in 2020" `[use "launched 2020"]`.
- **What it does:** brings bank, card and investment accounts into one view, covering 10,000+ US institutions plus Venmo, Apple Card and Coinbase. It adds ML auto-categorisation, budgets with rollovers, recurring and subscription tracking, goals, cash flow, investments and net worth. US accounts only.
- **Business model:** subscription only, with "No financial data selling, no ads" (FAQ).
  - $95/year, shown as $7.92/month billed yearly, on the homepage.
  - $13/month on the App Store.
  - 1-month free trial.
- **Platforms:** iPhone, iPad, Mac and Apple Vision, plus **Web (launched 15 Dec 2025)**. No Android app.

### Positioning (their words)
- "Your money, beautifully organized." (copilot.money)
- A "smart, private, and delightful personal finance tool"… "no ads, no gimmicks." (Series A post)
- "I believe that having a native Swift app makes a difference the moment you start interacting with it." (Ugarte, Apple)
- An early user request, quoted by Apple: "Please don't sell my data or put in ads. I'm willing to pay a few bucks for this service."

### Public traction
- **Apple Design Awards 2024 finalist, Innovation category** (Apple ADA 2024 page). Finalist only, not a winner.
- **App Store Editors' Choice.**
- **Webby Award Winner** per the FAQ and App Store `[category and year not found]`.
- **Funding:**
  - $250K angel to start.
  - **$6M Series A led by Adjacent**, Nico Wittenborn (March 2024).
  - **$10.5M total** venture capital (TechCrunch, Crowdfund Insider).
  - Angels include Scott Belsky, Mathilde Collin and Lenny Rachitsky.
- **Users:** 100,000+ subscribers in March 2024. The day Mint's shutdown was announced (Nov 2023) was its "biggest day ever". It "grew more in the last 4 months than in our first 4 years" (TechCrunch, Series A post).
- **Profitability:** reached in 2023 (Series A post).
- **App Store rating:** 4.8 from 31K+ ratings (snapshot). MKBHD is quoted on the listing.

### Audience and personas (our assumptions)
Design-minded, Apple-first US professionals, including former Mint users who will pay for privacy and polish.
1. **"Ex-Mint Priya", 33, nurse.** Her old app shut down and she wants a calm, trustworthy replacement.
2. **"Couple-finances Sam & Alex", 30s.** They share budgets and want to see where the money went every week.
3. **"Net-worth Nate", 41, engineer.** He follows investments, crypto and property in one view.

### Brand look
- **Colours:** none officially published. *Third-party sample (blakecrosley.com, explicitly "analyzed and sampled"):*
  - canvas `#000814` (deep navy) and surface `#001533`
  - income green `#00CC4B`
  - spending red-orange `#FF4433`
  - interactive/net-worth blue `#1C6CFF`
  - pending yellow `#FECE4C`
- **Category styling:** users can set the colour and emoji (or Genmoji) for each category (Copilot help centre).
- **Typography:** not published. *Our inference:* the SF system family, large numerals and tight display headings.
- **Tone:** premium, calm and privacy-first ("no ads, no gimmicks"), with a hint of delight.
- **Signature UI:** elegant charts (Swift Charts per the third-party analysis) and colourful category emoji. The "To review" transaction flow is *our inference* `[unverified]`. Apple calls it a "clear, colorful interface".

### Core journeys and real features
- **Onboard.** Connect accounts and let ML categorise the history.
- **Daily.** Review new transactions, re-categorise them, and the model learns.
- **Monthly.** Budgets with rollovers, then cash flow and month summary.
- **Watch for leaks.** Recurring and subscription spotting, plus overdraft and unusual-spend alerts.
- **Long-term.** Net worth, investment performance and allocation, and savings goals.
- **Support.** In-app support from real people.

**Prototype screens (11)**
1. **Hero.** "Your money, beautifully organized."
2. **Connect accounts.** Bank search with privacy reassurance ("No ads. No data selling.").
3. **Dashboard.** Month-to-date spend vs. budget ring, plus top categories as emoji chips.
4. **Transactions to review.** Swipe to confirm, or pick a category.
5. **Category detail.** A trend chart and merchant list, with emoji and colour editing.
6. **Budgets.** Category bars with rollover amounts.
7. **Recurring.** Upcoming subscriptions, with a "new subscription spotted" flag.
8. **Cash flow.** Income (green) vs. spend (red-orange) bars by month.
9. **Investments.** Performance line and allocation donut.
10. **Net worth.** A long-range line chart with an asset breakdown.
11. **Goal.** A savings goal with a progress ring and the date you'll reach it.

### Design problems (our framing)
1. **Trust at the connect step.** This is the scariest moment, because it asks for bank logins. Design the reassurance, from the copy and motion to the security cues.
2. **Making review a ritual.** Turn the daily review of new transactions into a two-minute, satisfying loop, not a chore.
3. **Native polish on the web.** The web app arrived in Dec 2025 and is the only route for Android users. How does the "native Swift feel" carry over to a browser?

### Cinematic opening (our idea)
The scroll begins in deep-space navy with hundreds of tiny transaction dots drifting like stars. As the user scrolls they snap into constellations, each forming around a category emoji (☕ 🛒 ✈️) in its own colour. The constellations collapse into stacked budget bars that fill to 72%. A green income line and a red-orange spend line then race across the screen, and the gap between them glows blue as net worth climbs. The final frame says "Your money, beautifully organized", with a padlock motif and "No ads. No gimmicks."

### Sources
- https://www.copilot.money/ · https://www.copilot.money/faq · https://copilot.money/series-a · https://www.copilot.money/dispatch/web-app
- https://techcrunch.com/2024/03/21/budgeting-app-copilot-mint-6m-series-a/
- https://www.crowdfundinsider.com/2024/03/223058-copilot-raises-6m-in-series-a-funding-to-expand-personal-finance-tool/
- https://developer.apple.com/news/?id=m1mmw99d (Developer Spotlight: Copilot)
- https://developer.apple.com/design/awards/2024/
- https://apps.apple.com/us/app/copilot-track-budget-money/id1447330651
- https://help.copilot.money/en/articles/11062072-settings-overview
- https://blakecrosley.com/guides/design/copilot-money (third-party colour analysis)

---

## 4. Tiimo: visual planner for neurodivergent minds

### Company summary
- **Company:** Tiimo, based in **Copenhagen (Frederiksberg), Denmark**. It was founded in **2015** by **Helene Lassen Nørlem** and **Melissa Würtz Azari**. Würtz Azari is CPO and describes herself as "a dyslexic ADHDer".
- **Origin:** a research project interviewing neurodivergent teenagers about how technology could support them at school.
- **Team:** women-led, about 20 people, 30% of whom identify as neurodivergent (press kit).
- **What it does:** a visual planner and to-do app. It covers:
  - colour-coded, emoji-accented timeline blocks
  - an AI co-planner that breaks goals into timed steps
  - a visual focus timer
  - Calendar/Reminders sync
  - widgets and Live Activities
  - mood check-ins, courses and community
- **Business model:** freemium with Tiimo Pro, monthly or yearly.
  - App Store IAPs range from $7 to $54. Wikipedia says about $10/month.
  - The web planner is Pro-only.
  - Trial length: the pricing FAQ says 7 days on yearly plans, while Retention.Blog (Dec 2025) saw 30 days `[trial length unverified]`.
- **Platforms:** iPhone, iPad, Mac, Apple Watch, Apple Vision, Android and Web.

### Positioning (their words)
- "Designed for brains that work differently." (tiimoapp.com/about)
- "Planning that fits the way you think." (pricing page)
- "My ADHD and dyslexia showed me how much the world isn't built for brains like mine. We created Tiimo to change that." (Würtz Azari)
- "Different brains thrive with different tools. Tiimo is adaptive by design." (Nørlem)
- From the App Store editors: "By turning our chaotic calendars into a timeline of soothing colours, Tiimo did the unthinkable: it made tackling our to-dos a calming activity."

### Public traction
- **App Store Awards 2025: iPhone App of the Year.**
- **Apple Design Awards 2024 finalist, Inclusivity category** (Apple ADA 2024 page).
- **Neurodiversity Awards 2022: Best Assistive Technology** (Genius Within).
- **Nordic Startup Awards 2019: Best Social Impact Startup** (press kit).
- **App Store Editors' Choice.**
- **App Store rating:** 4.6 from about 21K ratings (snapshot).
- **Funding:**
  - **$3.2M seed in 2022**, from investors including Goodwater Capital and Divergent Investments.
  - **€1.4M (about $1.6M) in Aug 2024**, co-led by Crowberry Capital and People Ventures, with The Inner Foundation.
  - **€4.3M / $4.8M total pre-Series A** (EU-Startups; Tiimo). The press kit says "EUR 5 million to date".
- **Users:**
  - Aug 2024: 500K+ free users, 50K+ paying subscribers, 75% of payers neurodivergent.
  - Now: "1+ million users" and "3 million downloads" (App Store, About page).
  - About 200K downloads in the 48 hours after the App of the Year announcement `[Appfigures estimate via Retention.Blog]`.

### Audience and personas (our assumptions)
ADHD, autistic and dyslexic adults (main markets US, UK, Canada and Brazil, per the press kit), plus anyone overwhelmed by planning.
1. **"Time-blind Jess", 27, designer with ADHD.** She can't feel how long tasks take and needs to see time passing.
2. **"Routine-anchored Oskar", 19, autistic student.** He wants predictable visual routines and gentle transitions between tasks.
3. **"Overloaded parent Rosa", 42.** She was recently diagnosed and wants AI to break "sort the house" into steps.

### Brand look
- **Colours:** none published. *Our inference:* a soft pastel task palette chosen by the user (Apple confirms "customizable theme colors" and a "timeline of soothing colours"), on a calm light canvas. A purple accent ties to the mascot.
- **Mascot:** a **purple circle character** (Retention.Blog, Dec 2025) `[name not found]`.
- **Typography:** dyslexia-friendly font options (Apple). *Our inference:* rounded, friendly sans with generous spacing.
- **Tone:** gentle, affirming, non-judgemental. "If people use Tiimo every day, we have the responsibility to make the experience feel gentle, inviting, and easy to trust." (Tiimo)
- **Signature UI:** an emoji-icon task block on a vertical timeline, a visual countdown timer, Live Activities, and a Liquid Glass interface (Tiimo award post). The app is built in SwiftUI.

### Core journeys and real features
- **Onboard.** Optional "Are you neurodivergent?" question and goals, which personalise the paywall copy (Retention.Blog).
- **Plan.** Brain-dump to-dos, then the AI co-planner splits them into timed steps and places them on the timeline.
- **Do.** The focus timer runs on the current task, with a Live Activity on the lock screen.
- **Adjust.** Drag to reschedule, and see gentle notifications.
- **Reflect.** Mood check-in.
- **Share.** Shared profiles for up to 5 people.
- **Learn.** Neuroinclusive courses.

**Prototype screens (11)**
1. **Welcome.** "Designed for brains that work differently."
2. **Personalise.** Neurotype question (optional, skippable), goals, and theme colour and font choice (including a dyslexia-friendly option).
3. **Brain dump.** A free-text or voice list of to-dos.
4. **AI co-planner.** "Clean kitchen" breaks into 4 steps with time estimates and an editable chip for each.
5. **Today timeline.** Pastel blocks with emoji, and a "now" line moving down.
6. **Task detail.** Checklist sub-steps and a start button.
7. **Focus timer.** A visual disc that drains, plus a gentle extend option.
8. **Lock screen Live Activity/widget mock.**
9. **To-do list.** AI priority groups ("Now / Soon / Someday").
10. **Mood check-in.** Emoji scale and a short reflection.
11. **Routines library.** Morning and wind-down templates.

### Design problems (our framing)
1. **Making time visible.** How can the passing of time be shown for people with time blindness, without inducing panic?
2. **AI that doesn't overwhelm.** The AI co-planner's output must feel like help, not a longer list. Plan the pacing, defaults and an "undo".
3. **Sensory customisation as a system.** Theme colours, fonts and motion preferences need to stay accessible (contrast, reduced motion) whatever the user picks.

### Cinematic opening (our idea)
The screen opens in mild chaos: dozens of to-dos ("email Sam", "laundry", "dentist?!") jitter and overlap in grey. As the user scrolls, each one picks up a soft pastel colour and an emoji and drifts into place on a calm vertical timeline. The motion slows the closer each task gets to its slot, like an exhale. A "now" line appears and glides down. The current block blooms into a visual timer disc that gently drains as you keep scrolling. The purple circle mascot rolls in to tick it off, and the final frame says "Designed for brains that work differently", with the iPhone App of the Year 2025 badge. Respect `prefers-reduced-motion` by making it a static, colour-sorted end state, which fits the brand.

### Sources
- https://www.tiimoapp.com/about · https://www.tiimoapp.com/pricing
- https://www.tiimoapp.com/resource-hub/tiimo-winner-2025-app-store-awards
- https://www.tiimoapp.com/resource-hub/tiimo-raises-4-8m-neurodivergent-planner
- https://www.tiimoapp.com/resource-hub/tiimo-gentler-streak-partnership
- https://en.wikipedia.org/wiki/Tiimo
- https://tiimo.pressdeck.io/ (press kit)
- https://www.eu-startups.com/2024/08/copenhagen-based-tiimo-secures-additional-e1-4-million-to-advance-neuro-inclusive-tech/
- https://developer.apple.com/design/awards/2024/
- https://apps.apple.com/au/iphone/story/id1847760015 (App Store editorial, iPhone App of the Year)
- https://apps.apple.com/us/app/tiimo-daily-to-do-list/id1480220328
- https://www.retention.blog/p/app-of-the-year-tiimo
