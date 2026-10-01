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
    title: 'RISE — making invisible biology readable at a glance',
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
    title: 'Olio — giving food away faster than throwing it away',
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
    slug: 'heirloom',
    brand: 'Heirloom',
    title: 'Heirloom — an interactive 3D journey through carbon removal',
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
    title: 'Fellow — a product film for the perfect pour',
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
    title: 'Fishwife — a campaign that makes tinned fish the main character',
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
