import type {
  ApplicationRecord,
  ApplySession,
  ResumeProfile,
  SearchFilters,
  Settings,
} from './types';
import { DEFAULT_SETTINGS, STORAGE_KEYS } from './constants';

/**
 * Thin, typed wrapper over `chrome.storage.local`.
 *
 * Everything the user provides — profiles, resume files, API keys, history —
 * lives in local storage only. There is no cloud sync in this build, in line
 * with the privacy commitment in the spec.
 */

async function get<T>(key: string, fallback: T): Promise<T> {
  const result = await chrome.storage.local.get(key);
  return (result[key] as T) ?? fallback;
}

async function set<T>(key: string, value: T): Promise<void> {
  await chrome.storage.local.set({ [key]: value });
}

// ─── Settings ────────────────────────────────────────────────────────────────

export async function getSettings(): Promise<Settings> {
  const stored = await get<Partial<Settings>>(STORAGE_KEYS.settings, {});
  // Deep-merge so newly added defaults appear for existing installs.
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    rateLimit: { ...DEFAULT_SETTINGS.rateLimit, ...stored.rateLimit },
    schedule: { ...DEFAULT_SETTINGS.schedule, ...stored.schedule },
    notifications: { ...DEFAULT_SETTINGS.notifications, ...stored.notifications },
    ai: { ...DEFAULT_SETTINGS.ai, ...stored.ai },
  };
}

export async function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  const current = await getSettings();
  const next = { ...current, ...patch };
  await set(STORAGE_KEYS.settings, next);
  return next;
}

// ─── Profiles ─────────────────────────────────────────────────────────────────

export async function getProfiles(): Promise<ResumeProfile[]> {
  return get<ResumeProfile[]>(STORAGE_KEYS.profiles, []);
}

export async function getDefaultProfile(): Promise<ResumeProfile | undefined> {
  const profiles = await getProfiles();
  return profiles.find((p) => p.isDefault) ?? profiles[0];
}

export async function upsertProfile(profile: ResumeProfile): Promise<void> {
  const profiles = await getProfiles();
  const idx = profiles.findIndex((p) => p.id === profile.id);
  profile.updatedAt = Date.now();
  if (idx >= 0) profiles[idx] = profile;
  else profiles.push(profile);
  // Guarantee exactly one default.
  if (profile.isDefault) {
    profiles.forEach((p) => {
      if (p.id !== profile.id) p.isDefault = false;
    });
  } else if (!profiles.some((p) => p.isDefault) && profiles.length) {
    profiles[0].isDefault = true;
  }
  await set(STORAGE_KEYS.profiles, profiles);
}

export async function deleteProfile(id: string): Promise<void> {
  const profiles = (await getProfiles()).filter((p) => p.id !== id);
  if (profiles.length && !profiles.some((p) => p.isDefault)) {
    profiles[0].isDefault = true;
  }
  await set(STORAGE_KEYS.profiles, profiles);
}

// ─── Applications ───────────────────────────────────────────────────────────

export async function getApplications(): Promise<ApplicationRecord[]> {
  return get<ApplicationRecord[]>(STORAGE_KEYS.applications, []);
}

export async function upsertApplication(record: ApplicationRecord): Promise<void> {
  const apps = await getApplications();
  const idx = apps.findIndex((a) => a.id === record.id);
  record.updatedAt = Date.now();
  if (idx >= 0) apps[idx] = record;
  else apps.unshift(record);
  await set(STORAGE_KEYS.applications, apps);
}

export async function findApplicationByUrl(
  url: string,
): Promise<ApplicationRecord | undefined> {
  return (await getApplications()).find((a) => a.job.url === url);
}

export async function deleteApplication(id: string): Promise<void> {
  const apps = (await getApplications()).filter((a) => a.id !== id);
  await set(STORAGE_KEYS.applications, apps);
}

// ─── Search filters ───────────────────────────────────────────────────────────

const DEFAULT_FILTERS: SearchFilters = {
  keywords: [],
  locations: [],
  workMode: 'any',
  experienceLevel: 'any',
  datePosted: 'week',
  portals: ['linkedin', 'indeed', 'naukri'],
};

export async function getFilters(): Promise<SearchFilters> {
  return get<SearchFilters>(STORAGE_KEYS.filters, DEFAULT_FILTERS);
}

export async function saveFilters(filters: SearchFilters): Promise<void> {
  await set(STORAGE_KEYS.filters, filters);
}

// ─── Session ──────────────────────────────────────────────────────────────────

const IDLE_SESSION: ApplySession = {
  state: 'idle',
  appliedThisSession: 0,
  appliedThisHour: 0,
};

export async function getSession(): Promise<ApplySession> {
  return get<ApplySession>(STORAGE_KEYS.session, IDLE_SESSION);
}

export async function saveSession(patch: Partial<ApplySession>): Promise<ApplySession> {
  const current = await getSession();
  const next = { ...current, ...patch };
  await set(STORAGE_KEYS.session, next);
  return next;
}

export async function resetSession(): Promise<void> {
  await set(STORAGE_KEYS.session, IDLE_SESSION);
}

/** Subscribe to changes for a given key; returns an unsubscribe fn. */
export function watch<T>(key: string, cb: (value: T | undefined) => void): () => void {
  const listener = (
    changes: Record<string, chrome.storage.StorageChange>,
    area: string,
  ) => {
    if (area === 'local' && changes[key]) cb(changes[key].newValue as T);
  };
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}
