// Case-study registry. Every project here is a NUUKE concept project:
// an independent exploration built on the brand's public story, not commissioned work.

export type Discipline = 'mobile' | 'web3d' | 'animation' | 'marketing';

export type Project = {
  slug: string;
  brand: string;
  title: string;
  discipline: Discipline;
  disciplineLabel: string;
  year: string;
  summary: string;
  accent: string;
  accent2: string;
  ink: string; // text colour on the accent
  tags: string[];
  brandUrl: string;
};

export const projects: Project[] = [
  {
    slug: 'rise-science',
    brand: 'Rise Science',
    title: 'RISE: making invisible biology readable at a glance',
    discipline: 'mobile',
    disciplineLabel: 'Mobile App',
    year: '2026',
    summary: 'A concept for the RISE sleep and energy app: turning sleep debt and circadian science into one calm daily plan you can read in two seconds.',
    accent: '#ffb27a',
    accent2: '#7b61ff',
    ink: '#14122b',
    tags: ['UX research', 'Flows', 'Wireframes', 'Prototype', 'UI system'],
    brandUrl: 'https://www.risescience.com',
  },
  {
    slug: 'olio',
    brand: 'Olio',
    title: 'Olio: giving food away faster than throwing it away',
    discipline: 'mobile',
    disciplineLabel: 'Mobile App',
    year: '2026',
    summary: 'A concept for Olio’s list → request → pickup journey, built around one idea: good food goes in minutes, so speed is the product.',
    accent: '#8b5cf6',
    accent2: '#ff8a5b',
    ink: '#0b0b0f',
    tags: ['Service design', 'Flows', 'Wireframes', 'Prototype', 'Map UX'],
    brandUrl: 'https://olioapp.com',
  },
  {
    slug: 'flighty',
    brand: 'Flighty',
    title: 'Flighty: every flight, read like a departure board',
    discipline: 'mobile',
    disciplineLabel: 'Mobile App',
    year: '2026',
    summary: 'A concept for Flighty’s live flight tracking: from the airport signage it borrows to Live Activities, delay explanations and a usability test you can replay.',
    accent: '#ffb020',
    accent2: '#2ee58a',
    ink: '#0b0b0f',
    tags: ['Research', 'Live Activities', 'Wireframes', 'Prototype', 'Usability testing'],
    brandUrl: 'https://flighty.com',
  },
  {
    slug: 'gentler-streak',
    brand: 'Gentler Streak',
    title: 'Gentler Streak: fitness that knows when to rest',
    discipline: 'mobile',
    disciplineLabel: 'Mobile App',
    year: '2026',
    summary: 'A concept for Gentler Streak’s Apple Watch and iPhone experience: information architecture you can sort yourself, an accessibility pass and a wrist-first design.',
    accent: '#ff7a45',
    accent2: '#2e1b4e',
    ink: '#140b05',
    tags: ['IA & card sorting', 'Accessibility', 'Watch app', 'Prototype', 'Illustration'],
    brandUrl: 'https://gentler.app',
  },
  {
    slug: 'copilot-money',
    brand: 'Copilot Money',
    title: 'Copilot Money: a money app that tells you what changed',
    discipline: 'mobile',
    disciplineLabel: 'Mobile App',
    year: '2026',
    summary: 'A concept for Copilot Money: a data-visualisation lab, a trust-first onboarding and the design-to-code handoff, from tokens to SwiftUI.',
    accent: '#00cc4b',
    accent2: '#1c6cff',
    ink: '#000814',
    tags: ['Data viz', 'Onboarding & trust', 'Design tokens', 'Dev handoff', 'Prototype'],
    brandUrl: 'https://copilot.money',
  },
  {
    slug: 'tiimo',
    brand: 'Tiimo',
    title: 'Tiimo: a day you can see',
    discipline: 'mobile',
    disciplineLabel: 'Mobile App',
    year: '2026',
    summary: 'A concept for Tiimo’s visual planner: wireframes that draw themselves, sensory settings you can feel, and the road to launch from App Store page to release notes.',
    accent: '#a98bff',
    accent2: '#ffb3c7',
    ink: '#140f24',
    tags: ['Neuro-inclusive UX', 'Wireframes', 'Prototype', 'App Store launch', 'Roadmap'],
    brandUrl: 'https://www.tiimoapp.com',
  },
  {
    slug: 'feeld',
    brand: 'Feeld',
    title: 'Feeld: a dating app built on consent and curiosity',
    discipline: 'mobile',
    disciplineLabel: 'Mobile App',
    year: '2026',
    summary: 'A concept for Feeld: identity you can describe in your own words, desires shared only when both people choose to, and privacy controls you can feel working.',
    accent: '#c7b6ff',
    accent2: '#ff9e7a',
    ink: '#120d1c',
    tags: ['Inclusive identity', 'Consent UX', 'Privacy by design', 'Prototype', 'Trust & safety'],
    brandUrl: 'https://feeld.co',
  },
  {
    slug: 'heirloom',
    brand: 'Heirloom',
    title: 'Heirloom: an interactive 3D journey through carbon removal',
    discipline: 'web3d',
    disciplineLabel: '3D Website',
    year: '2026',
    summary: 'A scroll-driven WebGL explainer of Heirloom’s limestone loop: follow CO₂ from the air into rock, through a 900 °C kiln and into permanent storage.',
    accent: '#e2783a',
    accent2: '#f2efe8',
    ink: '#1e1e1c',
    tags: ['Narrative', 'WebGL', '3D modelling', 'Scroll storytelling'],
    brandUrl: 'https://www.heirloomcarbon.com',
  },
  {
    slug: 'fellow',
    brand: 'Fellow',
    title: 'Fellow: a product film for the perfect pour',
    discipline: 'animation',
    disciplineLabel: '3D Animation',
    year: '2026',
    summary: 'A launch-film concept for the Stagg EKG kettle, shown stage by stage: storyboard, blockout, wireframe, materials, lighting and final frames.',
    accent: '#c98a4e',
    accent2: '#7e93a3',
    ink: '#111111',
    tags: ['Storyboard', 'Modelling', 'Look dev', 'Lighting', 'Animation'],
    brandUrl: 'https://fellowproducts.com',
  },
  {
    slug: 'fishwife',
    brand: 'Fishwife',
    title: 'Fishwife: a campaign that makes tinned fish the main character',
    discipline: 'marketing',
    disciplineLabel: 'Digital Marketing',
    year: '2026',
    summary: '“Tin O’Clock”: a social-first campaign concept that moves tinned fish from snack-plate special to weekday lunch staple.',
    accent: '#e8452c',
    accent2: '#f6c343',
    ink: '#120f0d',
    tags: ['Strategy', 'Creative', 'Social', 'Paid media', 'Measurement'],
    brandUrl: 'https://eatfishwife.com',
  },
];

export const bySlug = (slug: string) => projects.find((p) => p.slug === slug)!;
export const nextOf = (slug: string) => {
  const i = projects.findIndex((p) => p.slug === slug);
  return projects[(i + 1) % projects.length];
};
