# AI Auto Job Applier — Chrome Extension (Manifest V3)

An AI-powered Chrome extension that parses your resume, scores jobs against
your profile, and auto-fills / submits applications across major job portals —
with a full tracker dashboard, human-paced rate limiting, and per-portal
adapters.

> ⚠️ **Compliance:** Automating applications may violate some portals' Terms of
> Service. The extension asks you to acknowledge this during onboarding. Use it
> responsibly and at your own risk.

---

## Features

| Area | What it does |
|------|--------------|
| **Profile & resume** | Upload PDF/DOCX → AI parses it into a structured, editable profile. Multiple resume versions, one default. |
| **Matching** | Cheap keyword pre-score gates an LLM fit score (0–100) with reasons + missing skills. Configurable threshold. |
| **Auto-fill & apply** | Semantic field detection, native-value setting for React/Vue forms, file upload, multi-step forms, AI answers for open questions. Three modes: Full-Auto / Semi-Auto / Manual Queue. |
| **Cover letters** | Tailored per job, tone-configurable (professional / conversational / enthusiastic). |
| **Tracker** | Status pipeline (Applied → Viewed → Interview → Offer → Rejected), KPIs, CSV export. |
| **Pace & scheduling** | Applications-per-hour cap, randomized human-like delays, daily scheduled sessions via `chrome.alarms`. |
| **Notifications** | High-match alerts, submit confirmations, error/CAPTCHA warnings. |
| **Privacy** | All data — profiles, resume files, API key, history — lives in `chrome.storage.local`. No cloud sync, no telemetry. |

## Supported portals

**14 dedicated adapters:**

- **Job boards:** LinkedIn (Easy Apply), Indeed, Naukri, Glassdoor, Monster,
  Internshala, Wellfound, ZipRecruiter, Dice, SimplyHired
- **ATS platforms** (cover thousands of company career pages): Greenhouse,
  Lever, Workday, Ashby

Any other site falls through to the **generic adapter**, which applies the same
heuristic field detection and label-based button driving.

---

## Architecture

```
┌──────────────┐   messages    ┌─────────────────────┐   messages   ┌─────────────────┐
│  Popup /     │ ────────────▶ │ Background service  │ ───────────▶ │ Content script  │
│  Side panel  │ ◀──────────── │ worker (the brain)  │ ◀─────────── │ (per portal)    │
│  Onboarding  │  broadcasts   │ • AI key + calls    │  DOM results │ • adapters      │
└──────────────┘               │ • session state     │              │ • field detect  │
      ▲                        │ • rate limit        │              │ • apply runner  │
      │  React hooks           │ • scheduler         │              └─────────────────┘
      ▼                        └─────────────────────┘                       │
┌──────────────┐                        │                                    ▼
│ chrome.      │◀───────────────────────┴──────────────────────── reads/writes DOM of
│ storage.local│   single source of truth (profiles, apps, settings)  linkedin.com etc.
└──────────────┘
```

- **The background worker holds the only copy of the AI key** and makes all
  provider calls. Content scripts hold no secrets; they only manipulate the DOM
  and report results.
- **All UI surfaces read the same `chrome.storage.local`** via live React hooks
  (`src/lib/hooks.ts`), so there is one source of truth and no prop drilling.
- **Adapters** implement a common `JobPortalAdapter` interface. Generic
  heuristics (`field-detection.ts`, `BaseAdapter`) provide resilience so an
  adapter only needs portal-specific selectors and quirks.

### Project structure

```
src/
  lib/                    # shared, context-agnostic code
    types.ts              # the domain model (single source of types)
    storage.ts            # typed chrome.storage.local wrapper
    messaging.ts          # typed message bus (UI ↔ bg ↔ content)
    hooks.ts              # live React hooks over storage
    export.ts             # CSV export
    utils.ts  constants.ts  resume-text.ts (PDF/DOCX → text)
    ai/                   # provider-agnostic AI (Anthropic + OpenAI)
      client.ts  resume-parser.ts  matcher.ts  cover-letter.ts  question-answerer.ts
  background/
    service-worker.ts     # message router + lifecycle
    apply-controller.ts   # full apply pipeline for one job
    rate-limiter.ts  notifications.ts  scheduler.ts
  content/
    index.ts              # content-script entry
    apply-runner.ts       # drives one application to completion
    field-detection.ts  dom-utils.ts
    adapters/
      adapter.ts base-adapter.ts registry.ts
      linkedin-adapter.ts indeed-adapter.ts naukri-adapter.ts generic-adapter.ts
  popup/  sidepanel/  onboarding/   # three React UIs
```

## Tech stack

React 18 · TypeScript · Tailwind CSS · Vite + `@crxjs/vite-plugin` · pdf.js +
mammoth (resume text extraction) · Anthropic / OpenAI APIs.

---

## Setup & build

```bash
npm install --ignore-scripts   # --ignore-scripts avoids blocked postinstall on locked machines
npm run typecheck              # pure-JS, always works
npm run build                  # standard Vite + CRXJS production build → dist/
npm run build:wasm             # pure-WASM build → dist/ (no native binaries; see below)
npm run dev                    # HMR dev build (standard toolchain)
```

### Load the unpacked extension

1. `npm run build`
2. Open `chrome://extensions`, enable **Developer mode**.
3. **Load unpacked** → select the `dist/` folder.
4. The onboarding tab opens: acknowledge the ToS note, add your AI API key,
   upload a resume, review the parsed profile.
5. Open a job on a supported portal → click the extension icon → **Apply to
   current tab**. Start in **Semi-Auto** to review before each submit.

> ### ⚠️ Building on a locked-down (Device Guard / WDAC) machine
> If `npm run build` fails with `ERR_DLOPEN_FAILED` ("Your organization used
> Device Guard to block this app") or esbuild `spawn UNKNOWN`, your machine's
> security policy is blocking the native Rollup/esbuild binaries. The code is
> unaffected (`npm run typecheck` still passes).
>
> **Use the pure-WASM build instead — it runs on the locked-down machine:**
> ```bash
> npm run build:wasm
> ```
> `scripts/build.mjs` bundles everything with `esbuild-wasm` (WebAssembly, no
> native addon, no child process) and compiles Tailwind via its pure-JS PostCSS
> API. Output is a complete, loadable `dist/` — load it unpacked exactly as
> below. This is the recommended path here; the Vite `build`/`dev` scripts are
> for unrestricted machines/CI.

---

## Adding a new portal adapter

1. Create `src/content/adapters/<portal>-adapter.ts` extending `BaseAdapter`.
2. Implement `id`, `name`, `matchUrl()`, `extractJobDetails()`, and fill the
   `selectors` object (`applyButton`, `formContainer`, `nextButton`,
   `submitButton`, `successIndicator`). Use the `text=Label` convention for
   text-matched buttons.
3. Override any method (e.g. `submitApplication()`) for portal quirks.
4. Register it in `src/content/adapters/registry.ts`.
5. Add the host to `host_permissions` and `content_scripts.matches` in
   `manifest.config.ts`.

Because `detectFormFields()` and the fill logic are inherited, a new adapter is
usually just selectors + a few overrides.

---

## Configuration notes

- **AI provider/model** are set in onboarding and Settings. Default is Claude
  (`claude-sonnet-5`); switch to OpenAI (`gpt-4o`) in Settings → AI.
- **Rate limiting** defaults to 10 applies/hour with 0.7–2.5 s action delays.
- **Selectors drift:** portals change their DOM often. When a flow breaks, the
  adapter's `selectors` are the first thing to update.

## Roadmap / not yet implemented

- Automated multi-tab job-search crawling for fully unattended sessions (the
  single-tab apply pipeline and session/scheduler scaffolding are in place).
- Optional backend (auth, cloud history, email digests) — intentionally omitted
  to keep everything local.
