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
    coverLetterTone: 'professional',
  },
  acknowledgedTosRisk: false,
  onboardingComplete: false,
};

export const DEFAULT_MODELS = {
  anthropic: 'claude-sonnet-5',
  openai: 'gpt-4o',
} as const;
