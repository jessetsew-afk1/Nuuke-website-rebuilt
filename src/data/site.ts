// Site-wide facts. Edit here and every page updates.

export const site = {
  name: 'NUUKE',
  url: 'https://www.nuuke.us',
  tagline: 'Built for market leaders.',
  description:
    'NUUKE is a design and engineering studio for mobile apps, immersive 3D web, 2D/3D animation, digital marketing and applied AI. Stop playing defense.',
  phone: '+1 (307) 655-6344',
  phoneHref: 'tel:+13076556344',
  email: 'hello@nuuke.us',
  // TODO(owner): confirm the address to publish. The old footer said Casper, WY; Google lists Sheridan, WY.
  address: '30 N Gould St Ste R, Sheridan, WY 82801',
  footerLine: 'Good work speaks. Ours doesn’t shut up.',
  reviews: [
    { name: 'Bark', href: 'https://www.bark.com/en/us/company/nuuke/wJ9GnR/?show_reviews=true&review_source=share_link' },
    // Add Clutch / Trustpilot profile links here once they exist.
  ],
};

export const nav = [
  { label: 'Home', href: '/' },
  { label: 'Works', href: '/works' },
  { label: 'Services', href: '/services' },
  { label: 'About', href: '/about' },
  { label: 'Blog', href: '/blog' },
  { label: 'Contact', href: '/contact' },
];

export type Service = {
  slug: string;
  index: string;
  title: string;
  short: string;
  tagline: string;
  accent: string;
  deliverables: string[];
};

export const services: Service[] = [
  {
    slug: 'mobile-app',
    index: '01',
    title: 'Mobile App Dev',
    short: 'Mobile apps',
    tagline: 'Apps engineered to punch above their weight.',
    accent: '#ff2e88',
    deliverables: ['Product strategy', 'UX research', 'Wireframes & flows', 'Interactive prototypes', 'UI & design systems', 'iOS / Android / React Native', 'Launch & growth'],
  },
  {
    slug: '2d-3d-animation',
    index: '02',
    title: '2D/3D Animation',
    short: '3D & animation',
    tagline: 'World-class animation that transforms your vision into visual storytelling.',
    accent: '#ffb547',
    deliverables: ['Concept & storyboards', 'Product modelling', 'Look development', 'Motion & simulation', 'Launch films', 'Immersive 3D websites'],
  },
  {
    slug: 'digitalmarketing',
    index: '03',
    title: 'Digital Marketing',
    short: 'Marketing',
    tagline: 'Your brand deserves chaos, let’s unleash it!',
    accent: '#3ee6b0',
    deliverables: ['Campaign strategy', 'Social & creator content', 'Paid media creative', 'Brand identity', 'Content calendars', 'Performance reporting'],
  },
  {
    slug: 'applied-ai-automation-systems',
    index: '04',
    title: 'Applied AI & Automation Systems',
    short: 'AI & automation',
    tagline: 'Where automation meets intelligence, and your business begins to run itself.',
    accent: '#8b5cff',
    deliverables: ['Process audits', 'AI assistants & agents', 'Workflow automation', 'CRM & data pipelines', 'Internal tools'],
  },
];
