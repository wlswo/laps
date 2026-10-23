import { defineConfig } from 'astro/config';

import sitemap from '@astrojs/sitemap';

// wlswo.me is the custom domain of wlswo.github.io, so a project repo named `laps` is served at wlswo.me/laps.
export default defineConfig({
  site: 'https://wlswo.me',
  base: '/laps',
  // Pages are folders with an index.html, so GitHub Pages serves them with a trailing slash; links and the sitemap match.
  trailingSlash: 'always',
  integrations: [sitemap()],
});
