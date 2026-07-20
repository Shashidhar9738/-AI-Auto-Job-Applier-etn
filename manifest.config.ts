import { defineManifest } from '@crxjs/vite-plugin';
import pkg from './package.json';

/** Match patterns for every supported job portal + ATS platform. */
const PORTAL_MATCHES = [
  'https://*.linkedin.com/*',
  'https://*.indeed.com/*',
  'https://*.naukri.com/*',
  'https://*.glassdoor.com/*',
  'https://*.monster.com/*',
  'https://*.internshala.com/*',
  'https://*.wellfound.com/*',
  'https://*.ziprecruiter.com/*',
  'https://*.dice.com/*',
  'https://*.simplyhired.com/*',
  'https://*.greenhouse.io/*',
  'https://*.lever.co/*',
  'https://*.myworkdayjobs.com/*',
  'https://*.ashbyhq.com/*',
];

/**
 * Manifest V3 definition.
 *
 * Host permissions are scoped to the supported job portals only — the
 * extension never requests broad `<all_urls>` access. Content scripts are
 * matched per portal so each adapter is only injected where it applies.
 */
export default defineManifest({
  manifest_version: 3,
  name: 'AI Auto Job Applier',
  version: pkg.version,
  description: pkg.description,
  icons: {
    16: 'src/assets/icon-16.png',
    48: 'src/assets/icon-48.png',
    128: 'src/assets/icon-128.png',
  },
  action: {
    default_popup: 'popup.html',
    default_title: 'AI Auto Job Applier',
  },
  side_panel: {
    default_path: 'sidepanel.html',
  },
  background: {
    service_worker: 'src/background/service-worker.ts',
    type: 'module',
  },
  permissions: [
    'storage',
    'tabs',
    'scripting',
    'alarms',
    'notifications',
    'sidePanel',
  ],
  host_permissions: [
    ...PORTAL_MATCHES,
    // AI providers (used by the background worker for fetch calls)
    'https://api.openai.com/*',
    'https://api.anthropic.com/*',
    'https://openrouter.ai/*',
    'https://generativelanguage.googleapis.com/*',
  ],
  // Requested on demand when the user adds a custom portal in Settings.
  optional_host_permissions: ['https://*/*'],
  content_scripts: [
    {
      matches: PORTAL_MATCHES,
      js: ['src/content/index.ts'],
      run_at: 'document_idle',
    },
  ],
  web_accessible_resources: [
    {
      resources: ['src/assets/*'],
      matches: ['<all_urls>'],
    },
  ],
});
