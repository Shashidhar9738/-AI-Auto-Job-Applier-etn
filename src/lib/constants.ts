import type { PortalId, Settings } from './types';

export const STORAGE_KEYS = {
  profiles: 'profiles',
  applications: 'applications',
  settings: 'settings',
  session: 'session',
  filters: 'filters',
} as const;

export const PORTAL_LABELS: Record<PortalId, string> = {
  linkedin: 'LinkedIn',
  indeed: 'Indeed',
  naukri: 'Naukri',
  glassdoor: 'Glassdoor',
  monster: 'Monster',
  internshala: 'Internshala',
  wellfound: 'Wellfound',
  ziprecruiter: 'ZipRecruiter',
  dice: 'Dice',
  simplyhired: 'SimplyHired',
  greenhouse: 'Greenhouse',
  lever: 'Lever',
  workday: 'Workday',
  ashby: 'Ashby',
  generic: 'Other',
};

export const DEFAULT_SETTINGS: Settings = {
  applyMode: 'semi-auto',
  matchThreshold: 60,
  blacklistCompanies: [],
  blacklistKeywords: [],
  rateLimit: {
    applicationsPerHour: 10,
    minActionDelayMs: 700,
    maxActionDelayMs: 2500,
  },
  schedule: {
    enabled: false,
    startTime: '09:00',
    dailyTarget: 20,
  },
  notifications: {
    onHighMatch: true,
    highMatchThreshold: 90,
    onApplied: true,
    onError: true,
    dailyDigest: false,
  },
  ai: {
    provider: 'anthropic',
    apiKey: '',
    model: 'claude-sonnet-5',
    baseUrl: '',
    coverLetterTone: 'professional',
  },
  customPortals: [],
  acknowledgedTosRisk: false,
  onboardingComplete: false,
};

/** Curated model choices shown as a dropdown per provider (UI convenience).
 *  The user can always pick "Other…" to type any slug. */
export const MODEL_OPTIONS: Record<string, { value: string; label: string }[]> = {
  anthropic: [
    { value: 'claude-sonnet-5', label: 'Claude Sonnet 5 — balanced (recommended)' },
    { value: 'claude-opus-4-8', label: 'Claude Opus 4.8 — highest quality' },
    { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5 — fast & cheap' },
  ],
  openai: [
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'gpt-4o-mini', label: 'GPT-4o mini — cheap' },
  ],
  openrouter: [
    { value: 'openai/gpt-4o-mini', label: 'GPT-4o mini — cheap' },
    { value: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet' },
    { value: 'deepseek/deepseek-chat', label: 'DeepSeek Chat' },
    { value: 'google/gemini-2.0-flash-001', label: 'Gemini 2.0 Flash' },
    { value: 'meta-llama/llama-3.3-70b-instruct', label: 'Llama 3.3 70B' },
    // Free slugs rotate on OpenRouter; if one 404s, pick another or use "Other…".
    { value: 'deepseek/deepseek-r1:free', label: 'DeepSeek R1 — FREE' },
    { value: 'deepseek/deepseek-chat-v3-0324:free', label: 'DeepSeek V3 — FREE' },
    { value: 'meta-llama/llama-3.3-70b-instruct:free', label: 'Llama 3.3 70B — FREE' },
  ],
  // Custom is free-text (any slug); no curated list.
  custom: [],
};

/** One-tap presets for the Custom (OpenAI-compatible) provider: fill the base
 *  URL + a sensible model. The user still supplies their own API key. */
export const CUSTOM_PRESETS: { label: string; baseUrl: string; model: string; free?: boolean }[] = [
  { label: 'Groq', baseUrl: 'https://api.groq.com/openai/v1', model: 'llama-3.3-70b-versatile', free: true },
  { label: 'Gemini', baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai', model: 'gemini-2.0-flash', free: true },
  { label: 'Cerebras', baseUrl: 'https://api.cerebras.ai/v1', model: 'llama-3.3-70b', free: true },
  { label: 'DeepSeek', baseUrl: 'https://api.deepseek.com', model: 'deepseek-chat' },
  { label: 'Together', baseUrl: 'https://api.together.xyz/v1', model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo' },
  { label: 'Mistral', baseUrl: 'https://api.mistral.ai/v1', model: 'mistral-large-latest' },
];

export const DEFAULT_MODELS = {
  anthropic: 'claude-sonnet-5',
  openai: 'gpt-4o',
  // OpenRouter uses "vendor/model" slugs. This one is cheap and widely available;
  // swap for any slug from https://openrouter.ai/models (e.g.
  // "anthropic/claude-3.5-sonnet", "google/gemini-flash-1.5", "deepseek/deepseek-chat").
  openrouter: 'openai/gpt-4o-mini',
  // No default for custom — the user supplies both base URL and model
  // (e.g. DeepSeek: "deepseek-chat", Groq: "llama-3.3-70b-versatile").
  custom: '',
} as const;
