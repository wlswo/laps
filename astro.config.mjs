import { defineConfig } from 'astro/config';

import sitemap from '@astrojs/sitemap';

// wlswo.me is the custom domain of wlswo.github.io, so a project repo named `laps` is served at wlswo.me/laps.
export default defineConfig({
  site: 'https://wlswo.me',
  base: '/laps',
  trailingSlash: 'ignore',
  integrations: [sitemap()],
});
