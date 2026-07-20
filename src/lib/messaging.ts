import type {
  AiSettings,
  ApplicationRecord,
  FormField,
  JobDetails,
  MatchResult,
  ResumeProfile,
} from './types';

/**
 * Typed message bus between the extension surfaces.
 *
 *   popup / sidepanel  ──▶  background service worker  ──▶  content script
 *
 * Each message has a `type` discriminant and a matching response shape. Use the
 * `sendToBackground` / `sendToTab` helpers rather than calling
 * `chrome.runtime.sendMessage` directly so the payloads stay type-checked.
 */

// ─── UI → Background ─────────────────────────────────────────────────────────

export type BackgroundRequest =
  | { type: 'session/start'; profileId: string }
  | { type: 'session/pause' }
  | { type: 'session/resume' }
  | { type: 'session/stop' }
  | { type: 'ai/test'; ai: AiSettings }
  | { type: 'ai/list-models'; ai: AiSettings }
  | { type: 'ai/parse-resume'; resumeText: string; label?: string }
  | { type: 'ai/score-match'; job: JobDetails; profile: ResumeProfile }
  | {
      type: 'ai/cover-letter';
      job: JobDetails;
      profile: ResumeProfile;
    }
  | {
      type: 'ai/answer-question';
      question: string;
      job: JobDetails;
      profile: ResumeProfile;
    }
  | { type: 'apply/from-current-tab'; tabId: number };

export type BackgroundResponse =
  | { ok: true; data?: unknown }
  | { ok: false; error: string };

// ─── Background → Content script ─────────────────────────────────────────────

export type ContentRequest =
  | { type: 'content/extract-job' }
  | { type: 'content/detect-fields' }
  | {
      type: 'content/apply';
      profile: ResumeProfile;
      answers: Record<string, string>;
      coverLetter?: string;
      submit: boolean; // false => fill only (semi-auto)
    }
  | { type: 'content/ping' };

export type ContentResponse =
  | { type: 'job'; job: JobDetails }
  | { type: 'fields'; fields: FormField[] }
  | {
      type: 'apply-result';
      status: 'submitted' | 'filled' | 'captcha' | 'error';
      message?: string;
      openQuestions?: string[];
    }
  | { type: 'pong'; portal: string }
  | { type: 'error'; message: string };

// ─── Broadcast events (background → all UI surfaces) ─────────────────────────

export type BroadcastEvent =
  | { type: 'event/application-updated'; record: ApplicationRecord }
  | { type: 'event/session-updated' }
  | { type: 'event/high-match'; job: JobDetails; match: MatchResult }
  | { type: 'event/captcha'; url: string }
  | { type: 'event/log'; level: 'info' | 'warn' | 'error'; message: string };

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function sendToBackground(
  msg: BackgroundRequest,
): Promise<BackgroundResponse> {
  return chrome.runtime.sendMessage(msg);
}

export async function sendToTab(
  tabId: number,
  msg: ContentRequest,
): Promise<ContentResponse> {
  return chrome.tabs.sendMessage(tabId, msg);
}

export function broadcast(event: BroadcastEvent): void {
  // Fire-and-forget; UI surfaces may or may not be open.
  chrome.runtime.sendMessage(event).catch(() => void 0);
}
