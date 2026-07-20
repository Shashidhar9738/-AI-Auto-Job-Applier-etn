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
