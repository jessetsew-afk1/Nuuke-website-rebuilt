// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://www.nuuke.us',
  trailingSlash: 'never',
  build: { format: 'file', inlineStylesheets: 'auto' },
  integrations: [sitemap()],
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },
  redirects: {
    // Old Webflow case studies that are no longer published.
    '/works/etihad': '/works',
    '/works/prometheus-fuels': '/works',
    '/works/mars-express': '/works',
    '/works/anodyne-2': '/works',
    '/works/gymshark': '/works',
    '/works/robotaxi': '/works',
  },
});
