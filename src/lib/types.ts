/**
 * Core domain types shared across the popup, side panel, background worker,
 * and content-script adapters. Keep this file free of runtime/browser APIs so
 * it can be imported from any context.
 */

// ─── Profile & Resume ───────────────────────────────────────────────────────

export interface WorkExperience {
  id: string;
  company: string;
  title: string;
  location?: string;
  startDate?: string; // ISO or "YYYY-MM"
  endDate?: string; // ISO, "YYYY-MM", or "" for present
  current: boolean;
  description?: string;
}

export interface Education {
  id: string;
  institution: string;
  degree?: string;
  field?: string;
  startDate?: string;
  endDate?: string;
  grade?: string;
}

export interface Certification {
  id: string;
  name: string;
  issuer?: string;
  issueDate?: string;
  credentialId?: string;
}

export type WorkAuthorization =
  | 'citizen'
  | 'permanent-resident'
  | 'work-visa'
  | 'requires-sponsorship'
  | 'other';

export interface ProfileContact {
  fullName: string;
  email: string;
  phone: string;
  location?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  githubUrl?: string;
}

/** A parsed resume + all the structured fields we auto-fill from. */
export interface ResumeProfile {
  id: string;
  label: string; // e.g. "Frontend Dev Resume"
  isDefault: boolean;
  contact: ProfileContact;
  summary?: string;
  workExperience: WorkExperience[];
  education: Education[];
  certifications: Certification[];
  skills: string[];
  desiredTitles: string[];
  preferredLocations: string[];
  salaryExpectation?: {
    currency: string;
    min?: number;
    max?: number;
    period: 'year' | 'month' | 'hour';
  };
  workAuthorization?: WorkAuthorization;
  yearsOfExperience?: number;
  /** Original uploaded file, stored as a data URL for re-upload to portals. */
  resumeFile?: StoredFile;
  createdAt: number;
  updatedAt: number;
}

export interface StoredFile {
  name: string;
  mimeType: string;
  /** base64 data URL */
  dataUrl: string;
  size: number;
}

// ─── Job search & matching ──────────────────────────────────────────────────

export type PortalId =
  | 'linkedin'
  | 'indeed'
  | 'naukri'
  | 'glassdoor'
  | 'monster'
  | 'internshala'
  | 'wellfound'
  | 'ziprecruiter'
  | 'dice'
  | 'simplyhired'
  | 'greenhouse'
  | 'lever'
  | 'workday'
  | 'ashby'
  | 'generic';

export type WorkMode = 'remote' | 'hybrid' | 'onsite' | 'any';
export type ExperienceLevel =
  | 'internship'
  | 'entry'
  | 'associate'
  | 'mid'
  | 'senior'
  | 'director'
  | 'any';

export interface SearchFilters {
  keywords: string[];
  locations: string[];
  workMode: WorkMode;
  experienceLevel: ExperienceLevel;
  salaryMin?: number;
  datePosted?: 'day' | 'week' | 'month' | 'any';
  portals: PortalId[];
}

export interface JobDetails {
  portal: PortalId;
  /** Stable identifier within the portal, when discoverable. */
  externalId?: string;
  url: string;
  title: string;
  company: string;
  location?: string;
  workMode?: WorkMode;
  description: string;
  salaryText?: string;
  postedAt?: string;
  easyApply: boolean;
}

export interface MatchResult {
  score: number; // 0–100
  reasons: string[];
  missingSkills: string[];
  matchedSkills: string[];
}

// ─── Application lifecycle ──────────────────────────────────────────────────

export type ApplyMode = 'full-auto' | 'semi-auto' | 'manual-queue';

export type ApplicationStatus =
  | 'queued'
  | 'in-progress'
  | 'awaiting-review'
  | 'applied'
  | 'viewed'
  | 'interview'
  | 'offer'
  | 'rejected'
  | 'skipped'
  | 'error';

export interface ApplicationRecord {
  id: string;
  job: JobDetails;
  resumeProfileId: string;
  match?: MatchResult;
  status: ApplicationStatus;
  coverLetter?: string;
  /** Answers we generated for open-ended questions, keyed by question. */
  generatedAnswers?: Record<string, string>;
  errorMessage?: string;
  createdAt: number;
  updatedAt: number;
  appliedAt?: number;
}

// ─── Form field abstraction (content scripts) ───────────────────────────────

export type FieldType =
  | 'text'
  | 'email'
  | 'tel'
  | 'number'
  | 'textarea'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'file'
  | 'date'
  | 'unknown';

/** A semantic tag the field-detection layer maps a raw input to. */
export type FieldSemantic =
  | 'full-name'
  | 'first-name'
  | 'last-name'
  | 'email'
  | 'phone'
  | 'location'
  | 'linkedin'
  | 'portfolio'
  | 'github'
  | 'years-experience'
  | 'salary'
  | 'work-authorization'
  | 'resume-upload'
  | 'cover-letter-upload'
  | 'cover-letter-text'
  | 'open-question'
  | 'unknown';

export interface FormField {
  /** A selector the adapter can use to re-locate this element. */
  selector: string;
  type: FieldType;
  semantic: FieldSemantic;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[]; // for select / radio
}

// ─── Settings ───────────────────────────────────────────────────────────────

export type AiProvider = 'openai' | 'anthropic' | 'openrouter' | 'custom';
export type CoverLetterTone = 'professional' | 'conversational' | 'enthusiastic';

export interface RateLimitSettings {
  applicationsPerHour: number; // human-like pace, e.g. 5–15
  minActionDelayMs: number;
  maxActionDelayMs: number;
}

export interface ScheduleSettings {
  enabled: boolean;
  /** 24h "HH:MM" local time. */
  startTime: string;
  dailyTarget: number;
}

export interface NotificationSettings {
  onHighMatch: boolean;
  highMatchThreshold: number;
  onApplied: boolean;
  onError: boolean;
  dailyDigest: boolean;
}

export interface AiSettings {
  provider: AiProvider;
  /** API key is stored locally only. Never synced. */
  apiKey: string;
  model: string;
  /** Endpoint for the 'custom' provider (any OpenAI-compatible API). */
  baseUrl?: string;
  coverLetterTone: CoverLetterTone;
}

/**
 * A user-added job portal. The content script is registered for `origin` at
 * runtime (after the user grants the host permission) and handled by the
 * generic adapter. Optional selector overrides refine job extraction.
 */
export interface CustomPortal {
  id: string;
  label: string;
  /** Match pattern, e.g. "https://careers.example.com/*". */
  origin: string;
  enabled: boolean;
  /** Optional CSS selectors to improve job extraction on this site. */
  selectors?: {
    title?: string;
    company?: string;
    location?: string;
    description?: string;
  };
  createdAt: number;
}

export interface Settings {
  applyMode: ApplyMode;
  matchThreshold: number; // skip below this
  blacklistCompanies: string[];
  blacklistKeywords: string[];
  rateLimit: RateLimitSettings;
  schedule: ScheduleSettings;
  notifications: NotificationSettings;
  ai: AiSettings;
  customPortals: CustomPortal[];
  acknowledgedTosRisk: boolean;
  onboardingComplete: boolean;
}

// ─── Session state ──────────────────────────────────────────────────────────

export type SessionState = 'idle' | 'running' | 'paused' | 'captcha-blocked';

export interface ApplySession {
  state: SessionState;
  startedAt?: number;
  appliedThisSession: number;
  appliedThisHour: number;
  hourWindowStart?: number;
  activeProfileId?: string;
  lastError?: string;
}
