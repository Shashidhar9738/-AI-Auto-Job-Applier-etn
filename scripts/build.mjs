/**
 * Pure-WASM build — produces a loadable MV3 `dist/` without any native binary.
 *
 * Why this exists: on machines with Device Guard / WDAC, the standard Vite
 * toolchain fails because Rollup's native addon and esbuild's helper process
 * are blocked. This script uses `esbuild-wasm` (runs entirely in WebAssembly)
 * plus Tailwind's pure-JS PostCSS API, so nothing native is loaded or spawned.
 *
 * Run:  npm run build:wasm
 */
import * as esbuild from 'esbuild-wasm';
import postcss from 'postcss';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import { readFile, writeFile, mkdir, copyFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src');
const DIST = join(ROOT, 'dist');
const R = (...p) => join(ROOT, ...p);

// ── esbuild plugins ──────────────────────────────────────────────────────────

/** CSS is handled separately by Tailwind; turn `import './x.css'` into a no-op. */
const ignoreCssPlugin = {
  name: 'ignore-css',
  setup(build) {
    build.onResolve({ filter: /\.css$/ }, (args) => ({
      path: args.path,
      namespace: 'ignore-css',
    }));
    build.onLoad({ filter: /.*/, namespace: 'ignore-css' }, () => ({ contents: '' }));
  },
};

const shared = {
  bundle: true,
  write: false,
  minify: true,
  sourcemap: false,
  target: 'es2020',
  jsx: 'automatic',
  logLevel: 'info',
  define: { 'process.env.NODE_ENV': '"production"' },
  alias: {
    '@': SRC,
    // Use mammoth's browser build so it doesn't pull in Node's fs/path.
    mammoth: R('node_modules/mammoth/mammoth.browser.js'),
  },
  plugins: [ignoreCssPlugin],
  loader: { '.png': 'dataurl' },
};

// Each entry: format matters — content scripts must be classic (iife); pages
// and the service worker load as ES modules.
const ENTRIES = [
  { in: 'src/background/service-worker.ts', out: 'service-worker.js', format: 'esm' },
  { in: 'src/content/index.ts', out: 'content.js', format: 'iife' },
  { in: 'src/popup/main.tsx', out: 'popup.js', format: 'esm' },
  { in: 'src/sidepanel/main.tsx', out: 'sidepanel.js', format: 'esm' },
  { in: 'src/onboarding/main.tsx', out: 'onboarding.js', format: 'esm' },
];

// ── HTML template ──────────────────────────────────────────────────────────

function html({ title, script, bodyClass = '' }) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <link rel="stylesheet" href="globals.css" />
  </head>
  <body${bodyClass ? ` class="${bodyClass}"` : ''}>
    <div id="root"></div>
    <script type="module" src="${script}"></script>
  </body>
</html>
`;
}

const PAGES = [
  { file: 'popup.html', title: 'AI Auto Job Applier', script: 'popup.js', bodyClass: 'w-[380px]' },
  { file: 'sidepanel.html', title: 'AI Auto Job Applier — Dashboard', script: 'sidepanel.js' },
  { file: 'onboarding.html', title: 'Welcome — AI Auto Job Applier', script: 'onboarding.js' },
];

// ── Manifest (output-path variant of manifest.config.ts) ─────────────────────

async function buildManifest() {
  const pkg = JSON.parse(await readFile(R('package.json'), 'utf8'));
  const portals = [
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
  return {
    manifest_version: 3,
    name: 'AI Auto Job Applier',
    version: pkg.version,
    description: pkg.description,
    icons: { 16: 'icon-16.png', 48: 'icon-48.png', 128: 'icon-128.png' },
    action: { default_popup: 'popup.html', default_title: 'AI Auto Job Applier' },
    side_panel: { default_path: 'sidepanel.html' },
    background: { service_worker: 'service-worker.js', type: 'module' },
    permissions: ['storage', 'tabs', 'scripting', 'alarms', 'notifications', 'sidePanel'],
    host_permissions: [
      ...portals,
      'https://api.openai.com/*',
      'https://api.anthropic.com/*',
      'https://openrouter.ai/*',
    ],
    // Covers custom job portals AND custom OpenAI-compatible AI endpoints.
    optional_host_permissions: ['https://*/*'],
    content_scripts: [{ matches: portals, js: ['content.js'], run_at: 'document_idle' }],
    web_accessible_resources: [
      { resources: ['pdf.worker.min.mjs', 'icon-128.png'], matches: ['<all_urls>'] },
    ],
  };
}

// ── Run ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('› initializing esbuild-wasm…');
  await esbuild.initialize({ wasmURL: undefined }); // uses the bundled wasm in node

  await rm(DIST, { recursive: true, force: true });
  await mkdir(DIST, { recursive: true });

  // 1. Bundle JS entries.
  for (const entry of ENTRIES) {
    console.log(`› bundling ${entry.out} (${entry.format})`);
    const result = await esbuild.build({
      ...shared,
      entryPoints: [R(entry.in)],
      format: entry.format,
    });
    for (const file of result.outputFiles) {
      await writeFile(join(DIST, entry.out), file.contents);
    }
  }

  // 2. Compile Tailwind CSS (pure JS via PostCSS).
  console.log('› compiling Tailwind CSS');
  const rawCss = await readFile(join(SRC, 'styles/globals.css'), 'utf8');
  const out = await postcss([tailwindcss(R('tailwind.config.js')), autoprefixer]).process(rawCss, {
    from: join(SRC, 'styles/globals.css'),
    to: join(DIST, 'globals.css'),
  });
  await writeFile(join(DIST, 'globals.css'), out.css);

  // 3. HTML pages.
  for (const p of PAGES) {
    await writeFile(join(DIST, p.file), html(p));
  }

  // 4. Manifest.
  await writeFile(join(DIST, 'manifest.json'), JSON.stringify(await buildManifest(), null, 2));

  // 5. Static assets: icons + pdf worker.
  for (const icon of ['icon-16.png', 'icon-48.png', 'icon-128.png']) {
    await copyFile(join(SRC, 'assets', icon), join(DIST, icon));
  }
  const worker = R('node_modules/pdfjs-dist/build/pdf.worker.min.mjs');
  if (existsSync(worker)) await copyFile(worker, join(DIST, 'pdf.worker.min.mjs'));

  await esbuild.stop();
  console.log('\n✓ Build complete → dist/  (Load unpacked in chrome://extensions)');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
