// Blog posts (migrated from Webflow). Markdown lives in src/content/blog.
type Md = { Content: any; frontmatter: { title: string; category: string; excerpt: string; date: string }; rawContent: () => string };
const mods = import.meta.glob<Md>('../content/blog/*.md', { eager: true });

const accents: Record<string, string> = { 'Mobile App': '#ff2e88', Design: '#8b5cff', Theory: '#ffb547', Brand: '#3ee6b0', SMM: '#4cc9ff' };

export const posts = Object.entries(mods)
  .map(([path, m]) => {
    const slug = path.split('/').pop()!.replace(/\.md$/, '');
    const words = m.rawContent().split(/\s+/).length;
    const fm = m.frontmatter;
    // Old titles were ALL CAPS; present them in sentence case.
    const title = fm.title === fm.title.toUpperCase() ? fm.title.charAt(0) + fm.title.slice(1).toLowerCase() : fm.title;
    return { slug, ...fm, title, minutes: Math.max(2, Math.round(words / 230)), accent: accents[fm.category] ?? '#ff2e88', Content: m.Content };
  })
  .sort((a, b) => a.title.localeCompare(b.title));

export type Post = (typeof posts)[number];
