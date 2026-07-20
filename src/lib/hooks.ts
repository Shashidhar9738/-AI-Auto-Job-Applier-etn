import { useEffect, useState } from 'react';
import type {
  ApplicationRecord,
  ApplySession,
  ResumeProfile,
  SearchFilters,
  Settings,
} from './types';
import { STORAGE_KEYS } from './constants';
import {
  getApplications,
  getFilters,
  getProfiles,
  getSession,
  getSettings,
  watch,
} from './storage';

/**
 * React hooks that read from chrome.storage and stay live via the storage
 * change listener. Every extension surface (popup, side panel, onboarding)
 * shares the same source of truth this way — no prop drilling, no duplication.
 */
function useStorageValue<T>(key: string, loader: () => Promise<T>): T | undefined {
  const [value, setValue] = useState<T>();
  useEffect(() => {
    let active = true;
    loader().then((v) => active && setValue(v));
    const unwatch = watch<T>(key, () => loader().then((v) => active && setValue(v)));
    return () => {
      active = false;
      unwatch();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return value;
}

export const useSettings = (): Settings | undefined =>
  useStorageValue(STORAGE_KEYS.settings, getSettings);

export const useProfiles = (): ResumeProfile[] =>
  useStorageValue(STORAGE_KEYS.profiles, getProfiles) ?? [];

export const useApplications = (): ApplicationRecord[] =>
  useStorageValue(STORAGE_KEYS.applications, getApplications) ?? [];

export const useSession = (): ApplySession | undefined =>
  useStorageValue(STORAGE_KEYS.session, getSession);

export const useFilters = (): SearchFilters | undefined =>
  useStorageValue(STORAGE_KEYS.filters, getFilters);
