// Fishwife × NUUKE concept: "Tin O'Clock".
// All art here is original NUUKE folk-style illustration (not Fishwife's packaging art).
// Brand facts live in the page and come only from research/brands.md §5.

/** Working approximation of the brand palette (our inference, not official values). */
export const FW = {
  red: '#E8452C',
  sun: '#F6C343',
  cobalt: '#2747A8',
  pink: '#F4A6B8',
  mint: '#9ED6C2',
  cream: '#FFF6E5',
  ink: '#1D1B3A',
} as const;

/* ---------- Original folk fish, drawn in a 120 × 60 box, head on the left ---------- */
export const fish = {
  body: 'M6 30 C 16 11, 50 5, 82 21 L 110 7 C 103 21, 103 39, 110 53 L 82 39 C 50 55, 16 49, 6 30 Z',
  finTop: 'M48 13 C 54 1, 70 1, 76 17',
  finLow: 'M54 46 C 60 57, 71 57, 74 43',
  gill: 'M35 15 C 43 23, 43 37, 35 45',
  mouth: 'M7 32 Q 12 34 16 31',
  tailLines: 'M90 22 L 104 14 M 91 30 L 105 30 M 90 38 L 104 46',
  scales: 'M46 24 q 4 -6 8 0 M 56 24 q 4 -6 8 0 M 66 24 q 4 -6 8 0 M 51 32 q 4 -6 8 0 M 61 32 q 4 -6 8 0 M 71 32 q 4 -6 8 0 M 56 40 q 4 -6 8 0 M 66 40 q 4 -6 8 0',
  eye: { cx: 22, cy: 26, r: 5 },
};

/* ---------- Flavours for the 3D tin (product names as reported) ---------- */
export type Flavour = {
  id: string;
  name: string;
  short: string;
  bg: string;
  ink: string;
  pop: string;
  fishFill: string;
  contents: { fish: 'fillet' | 'sardine' | 'chunk'; color: string; garnish: 'chili' | 'lemon' | 'none' };
};

export const flavours: Flavour[] = [
  {
    id: 'salmon',
    name: 'Smoked Atlantic Salmon',
    short: 'Smoked salmon',
    bg: FW.pink,
    ink: FW.cobalt,
    pop: FW.red,
    fishFill: FW.cream,
    contents: { fish: 'fillet', color: '#ef8a5c', garnish: 'none' },
  },
  {
    id: 'chili',
    name: 'Smoked Salmon with Sichuan Chili Crisp',
    short: 'Chili crisp salmon',
    bg: FW.red,
    ink: FW.cream,
    pop: FW.sun,
    fishFill: FW.sun,
    contents: { fish: 'fillet', color: '#e9784c', garnish: 'chili' },
  },
  {
    id: 'sardine',
    name: 'Sardines with Preserved Lemon',
    short: 'Sardines + lemon',
    bg: FW.sun,
    ink: FW.cobalt,
    pop: FW.red,
    fishFill: FW.mint,
    contents: { fish: 'sardine', color: '#8e9cab', garnish: 'lemon' },
  },
  {
    id: 'albacore',
    name: 'Albacore Tuna with Spanish Lemon',
    short: 'Albacore + lemon',
    bg: FW.mint,
    ink: FW.ink,
    pop: FW.cobalt,
    fishFill: FW.pink,
    contents: { fish: 'chunk', color: '#e6cfa6', garnish: 'lemon' },
  },
];

/* ---------- Strategy funnel ---------- */
export type FunnelStage = {
  id: string;
  label: string;
  job: string;
  who: string;
  channels: string[];
  formats: string[];
  kpis: string[];
};

export const funnel: FunnelStage[] = [
  {
    id: 'awareness',
    label: 'Awareness',
    job: 'Make “12:30 on a weekday” mean “open a tin” — before anyone has tasted one.',
    who: 'Snack-plate Sofia and her feed',
    channels: ['TikTok & Reels creators', 'Paid social (lunch-hour dayparting)', 'OOH near office districts in LA & NYC', 'PR: the Tin O’Clock “alarm” drop'],
    formats: ['12:30 alarm stunt video', '15-sec recipe-in-a-tin', 'Postcard billboards'],
    kpis: ['Reach & 3-sec view rate in lunch hours', 'Branded search for “tin o’clock”', 'Ad recall (brand-lift study)'],
  },
  {
    id: 'consideration',
    label: 'Consideration',
    job: 'Prove a tin is a real lunch: fast, filling, no kitchen needed.',
    who: 'Protein Pete, at his desk',
    channels: ['Creator duets & stitches', 'Pinterest & TikTok search', 'Recipe hub on the DTC site', 'Email: “5 lunches, 5 tins”'],
    formats: ['30-sec recipe shorts', 'Desk-lunch glow-ups', 'Sourcing stories (where the fish comes from)'],
    kpis: ['Saves & shares per 1k views', 'Recipe-page dwell time', 'Email click-through on lunch content'],
  },
  {
    id: 'purchase',
    label: 'Purchase',
    job: 'Put the tin where lunch is bought — online and on the shelf.',
    who: 'Pete in-store, Sofia online',
    channels: ['Retail shelf takeover & wobblers', 'Retail media (grocery apps)', 'DTC “Weekday Lunch Box” bundle', 'Shoppable creator posts'],
    formats: ['Shelf strip + clock wobbler', 'QR to 30-sec recipes', '5-tin weekday bundle'],
    kpis: ['Retail velocity in campaign stores', 'Bundle conversion rate', 'Cost per acquisition by channel'],
  },
  {
    id: 'loyalty',
    label: 'Loyalty',
    job: 'Turn one good lunch into a weekly ritual — and a gift people pass on.',
    who: 'Gifting Grace and every repeat buyer',
    channels: ['Subscribe & save “Tin O’Clock club”', 'SMS 12:30 nudge (opt-in)', 'UGC reposts & creator community', 'Gift sets for hosts'],
    formats: ['Weekly lunch drop', 'Limited Tin O’Clock label', 'Shareable lunch “stamp card”'],
    kpis: ['Repeat purchase within 30 days', 'Weekday-lunch share of purchases', 'UGC posts tagged #TinOClock'],
  },
];

/* ---------- Story viewer posts ---------- */
export type StoryPost = {
  id: 'recipe' | 'glowup' | 'alarm' | 'sourcing' | 'duet';
  title: string;
  format: string;
  hook: string;
  cta: string;
  persona: string;
  why: string;
};

export const posts: StoryPost[] = [
  { id: 'recipe', title: '30-second recipe in a tin', format: 'Reel / TikTok · 30s', hook: 'A timer starts at 0:30 in the first frame.', cta: 'Save for tomorrow’s lunch', persona: 'Protein Pete', why: 'Speed is the objection. A visible countdown answers it before anyone asks.' },
  { id: 'glowup', title: 'Desk-lunch glow-up', format: 'Reel · 12s before/after', hook: 'The sad sandwich, then the wipe.', cta: 'Show us your desk lunch', persona: 'Snack-plate Sofia', why: 'Borrows the snack-plate aesthetic Sofia already loves and moves it to a Tuesday.' },
  { id: 'alarm', title: 'The 12:30 Tin O’Clock alarm', format: 'Story + opt-in SMS · 8s', hook: 'Your lock screen rings at 12:30.', cta: 'Set your Tin O’Clock alarm', persona: 'Everyone', why: 'Rituals need a cue. We give lunch a literal alarm — the campaign’s signature mechanic.' },
  { id: 'sourcing', title: 'Where the fish comes from', format: 'Carousel / Story · 4 frames', hook: 'Six canneries, four places, one map.', cta: 'Read the sourcing story', persona: 'Protein Pete', why: 'Makes the fine print (canneries, certification, traceable salmon) feel like a travel postcard.' },
  { id: 'duet', title: 'Creator duet: “My Tin O’Clock”', format: 'TikTok duet · 20s', hook: 'Split screen: their lunch vs. yours.', cta: 'Duet this with your tin', persona: 'Snack-plate Sofia', why: 'A format built to be copied. Every duet is a free, native ad for the ritual.' },
];

/* ---------- 4-week content calendar ---------- */
export type CalType = 'reel' | 'story' | 'creator' | 'email' | 'retail' | 'ooh' | 'paid';
export const calTypes: Record<CalType, { label: string; color: string }> = {
  reel: { label: 'Reel / TikTok', color: FW.red },
  story: { label: 'Story', color: FW.pink },
  creator: { label: 'Creator', color: FW.sun },
  paid: { label: 'Paid flight', color: '#ff8a3d' },
  email: { label: 'Email / SMS', color: FW.mint },
  retail: { label: 'Retail', color: '#7f9cff' },
  ooh: { label: 'OOH / PR', color: '#c9b8ff' },
};

export type CalPost = { day: number; type: CalType; title: string; caption: string; art: 'clock' | 'fish' | 'tin' | 'bowl' | 'map' | 'duet' | 'shelf' };

const W1 = 'Week 1 · The alarm goes off';
const W2 = 'Week 2 · Lunch, solved';
const W3 = 'Week 3 · Where it comes from';
const W4 = 'Week 4 · On the shelf';
export const weeks = [W1, W2, W3, W4];

export const calendar: CalPost[] = [
  { day: 1, type: 'ooh', title: 'Billboards go up', caption: 'Postcard boards near LA and NYC office districts: “Greetings from Tin O’Clock.”', art: 'clock' },
  { day: 2, type: 'reel', title: 'The 12:30 alarm', caption: 'Launch film. A phone rings at 12:30, a tin opens, lunch happens.', art: 'clock' },
  { day: 3, type: 'paid', title: 'Paid flight #1 live', caption: 'A/B: time cue vs. taste cue, dayparted 11:00–13:30.', art: 'tin' },
  { day: 4, type: 'creator', title: 'Creator wave 1', caption: '10 food creators post their first “My Tin O’Clock”.', art: 'duet' },
  { day: 5, type: 'story', title: 'Set your alarm', caption: 'Story sticker: opt in to a 12:30 Tin O’Clock SMS.', art: 'clock' },
  { day: 6, type: 'email', title: 'Weekend prep', caption: 'Email: “5 tins for 5 weekdays” + the Weekday Lunch Box.', art: 'tin' },
  { day: 7, type: 'story', title: 'Recap', caption: 'Best duets of the week, reposted with permission.', art: 'duet' },
  { day: 8, type: 'reel', title: 'Chili crisp rice bowl', caption: '30-sec recipe #1. Timer on screen from frame one.', art: 'bowl' },
  { day: 9, type: 'reel', title: 'Desk-lunch glow-up', caption: 'Before/after: the sad sandwich retires.', art: 'bowl' },
  { day: 10, type: 'paid', title: 'Paid flight #2', caption: 'A/B: protein-first vs. pleasure-first, split by audience.', art: 'tin' },
  { day: 11, type: 'creator', title: 'Dietitian creator', caption: 'A registered dietitian builds a high-protein desk lunch.', art: 'bowl' },
  { day: 12, type: 'reel', title: 'Sardine toast', caption: '30-sec recipe #2. Sardines, lemon, toast, done.', art: 'fish' },
  { day: 13, type: 'story', title: 'Poll: your lunch?', caption: 'Story poll: “What’s in your tin today?”', art: 'fish' },
  { day: 14, type: 'email', title: 'Recipe digest', caption: 'Five recipes from the week, shoppable.', art: 'bowl' },
  { day: 15, type: 'reel', title: 'Six canneries', caption: 'Sourcing map: Washington State, Spain, Denmark, Scotland.', art: 'map' },
  { day: 16, type: 'story', title: 'Traceable salmon', caption: 'Kvarøy Arctic salmon, which Fishwife describes as 100% traceable.', art: 'map' },
  { day: 17, type: 'creator', title: 'Creator wave 2', caption: 'Stitch chain: “Where’s your lunch from?”', art: 'duet' },
  { day: 18, type: 'paid', title: 'Paid flight #3', caption: 'A/B: creator-shot vs. illustrated creative.', art: 'tin' },
  { day: 19, type: 'reel', title: 'Mackerel crackers', caption: '30-sec recipe #3 with the chili-flake mackerel.', art: 'fish' },
  { day: 20, type: 'ooh', title: 'Lunch-hour pop-up', caption: 'A 12:30–13:30 tin bar outside an office lobby (PR moment).', art: 'tin' },
  { day: 21, type: 'story', title: 'UGC recap', caption: 'Best #TinOClock lunches of the week.', art: 'duet' },
  { day: 22, type: 'retail', title: 'Shelf takeover', caption: 'Clock wobblers + shelf strips land in campaign stores.', art: 'shelf' },
  { day: 23, type: 'reel', title: 'Find it in-store', caption: 'Creator walks from the door to the tin aisle in 30 seconds.', art: 'shelf' },
  { day: 24, type: 'paid', title: 'Retail media', caption: 'Grocery-app ads pointing to campaign stores.', art: 'shelf' },
  { day: 25, type: 'creator', title: 'Creator wave 3', caption: 'Shoppable “lunch haul” posts.', art: 'duet' },
  { day: 26, type: 'email', title: 'Tin O’Clock club', caption: 'Subscribe-and-save launch for weekly lunch tins.', art: 'tin' },
  { day: 27, type: 'story', title: 'Gift a lunch', caption: 'Gifting angle for hosts: the illustrated tin set.', art: 'tin' },
  { day: 28, type: 'reel', title: 'Month one, thank you', caption: 'A montage of community lunches (with permission).', art: 'clock' },
];

/* ---------- Paid A/B tests ---------- */
export type AdVariant = { headline: string; sub: string; visual: 'clock' | 'bowl' | 'protein' | 'party' | 'ugc' | 'folk'; cta: string };
export type AdTest = { id: string; name: string; hypothesis: string; metric: string; audience: string; a: AdVariant; b: AdVariant };

export const adTests: AdTest[] = [
  {
    id: 'cue',
    name: 'Time cue vs. taste cue',
    hypothesis: 'A clock-time cue (“It’s 12:30”) builds a repeatable trigger and lifts weekday purchase intent more than a recipe cue.',
    metric: 'Lunch-hour click-through, saves, add-to-cart between 11:00 and 14:00',
    audience: 'Broad lunch-hour audience, 25–44',
    a: { headline: 'It’s 12:30. Open a tin.', sub: 'Tin O’Clock — every weekday.', visual: 'clock', cta: 'Shop lunch tins' },
    b: { headline: 'Salmon, chili crisp, rice.', sub: 'Lunch in 30 seconds.', visual: 'bowl', cta: 'Get the recipe' },
  },
  {
    id: 'promise',
    name: 'Protein-first vs. pleasure-first',
    hypothesis: 'Protein framing wins with health-led audiences (Pete); pleasure framing wins with food-culture audiences (Sofia).',
    metric: 'CTR and cost per acquisition, split by audience segment',
    audience: 'Fitness & clean-label interests vs. food & hosting interests',
    a: { headline: 'A desk lunch with real protein.', sub: 'No fridge. No prep. Just a tin.', visual: 'protein', cta: 'Build my lunch box' },
    b: { headline: 'The most fun you’ll have at your desk today.', sub: 'It’s Tin O’Clock.', visual: 'party', cta: 'Pick a flavour' },
  },
  {
    id: 'craft',
    name: 'Creator-shot vs. illustrated',
    hypothesis: 'Creator footage stops the scroll; the illustrated world is what people remember. We expect to need both.',
    metric: '3-sec view rate (stopping power) vs. aided ad recall (brand-lift)',
    audience: 'Retargeting: site visitors and video viewers',
    a: { headline: 'My 12:30 tin', sub: 'Shot on a phone, at a real desk.', visual: 'ugc', cta: 'Watch the duet' },
    b: { headline: 'Greetings from Tin O’Clock', sub: 'Illustrated postcard series.', visual: 'folk', cta: 'Shop the set' },
  },
];

/* ---------- Budget split ---------- */
export type Channel = { id: string; label: string; color: string; role: string };
export const channels: Channel[] = [
  { id: 'creators', label: 'Creators & UGC', color: FW.sun, role: 'Fuel the duet chain and recipe shorts' },
  { id: 'paid', label: 'Paid social', color: FW.red, role: 'Daypart to 11:00–13:30, run the A/B tests' },
  { id: 'retail', label: 'Retail & shopper', color: '#7f9cff', role: 'Shelf takeover, wobblers, retail media' },
  { id: 'ooh', label: 'OOH & PR', color: FW.pink, role: 'Postcard billboards and the lunch pop-up' },
  { id: 'owned', label: 'Owned (email, SMS, site)', color: FW.mint, role: 'The 12:30 nudge, recipe hub, club' },
  { id: 'sampling', label: 'Sampling', color: '#c9b8ff', role: 'Office lunch drops: tins + forks' },
];

export const presets: { id: string; label: string; note: string; mix: Record<string, number> }[] = [
  { id: 'launch', label: 'Launch burst', note: 'Big first fortnight: OOH and creators create the moment.', mix: { creators: 26, paid: 24, retail: 12, ooh: 22, owned: 6, sampling: 10 } },
  { id: 'always', label: 'Always-on', note: 'Lean, steady social that builds the weekly habit.', mix: { creators: 32, paid: 34, retail: 10, ooh: 4, owned: 14, sampling: 6 } },
  { id: 'retail', label: 'Retail push', note: 'Follow distribution: drive velocity on the shelf.', mix: { creators: 18, paid: 18, retail: 36, ooh: 8, owned: 8, sampling: 12 } },
];
