import type { BackgroundRequest, BackgroundResponse } from '@/lib/messaging';
import { broadcast } from '@/lib/messaging';
import {
  getDefaultProfile,
  getProfiles,
  getSettings,
  resetSession,
  saveSession,
  upsertProfile,
} from '@/lib/storage';
import { answerQuestion } from '@/lib/ai/question-answerer';
import { generateCoverLetter } from '@/lib/ai/cover-letter';
import { scoreMatch } from '@/lib/ai/matcher';
import { parseResumeText } from '@/lib/ai/resume-parser';
import { applyToTab } from './apply-controller';
import { notify } from './notifications';
import { isScheduleAlarm, syncSchedule } from './scheduler';
import { syncCustomPortals } from '@/lib/custom-portals';

/**
 * Background service worker: the extension's brain. It holds the AI key, routes
 * all messages, enforces session state, and owns scheduling. It never touches
 * portal DOMs directly — that's delegated to content scripts.
 */

// ─── Lifecycle ────────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  // Let clicking the toolbar icon also toggle the side panel.
  chrome.sidePanel
    ?.setPanelBehavior({ openPanelOnActionClick: false })
    .catch(() => void 0);

  if (reason === 'install') {
    chrome.tabs.create({ url: chrome.runtime.getURL('onboarding.html') });
  }
  await syncSchedule();
  await syncCustomPortals();
});

// Dynamic content-script registrations are cleared on browser start; restore.
chrome.runtime.onStartup.addListener(() => {
  void syncCustomPortals();
});

// Re-sync the daily alarm whenever schedule settings change.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.settings) void syncSchedule();
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (!isScheduleAlarm(alarm.name)) return;
  const profile = await getDefaultProfile();
  if (!profile) return;
  await saveSession({ state: 'running', activeProfileId: profile.id, startedAt: Date.now() });
  broadcast({ type: 'event/session-updated' });
  notify('applied', 'Scheduled session started', 'Open the side panel to watch progress.');
});

// ─── Message router ───────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener(
  (msg: BackgroundRequest, _sender, sendResponse): boolean => {
    // Ignore broadcast events echoed back to us.
    if (typeof msg?.type !== 'string' || msg.type.startsWith('event/')) return false;

    route(msg)
      .then((data) => sendResponse({ ok: true, data } satisfies BackgroundResponse))
      .catch((err) =>
        sendResponse({ ok: false, error: String(err?.message ?? err) } satisfies BackgroundResponse),
      );
    return true; // async
  },
);

async function route(msg: BackgroundRequest): Promise<unknown> {
  switch (msg.type) {
    // ── Session control ──
    case 'session/start': {
      await saveSession({
        state: 'running',
        activeProfileId: msg.profileId,
        startedAt: Date.now(),
        appliedThisSession: 0,
      });
      broadcast({ type: 'event/session-updated' });
      return null;
    }
    case 'session/pause':
      await saveSession({ state: 'paused' });
      broadcast({ type: 'event/session-updated' });
      return null;
    case 'session/resume':
      await saveSession({ state: 'running' });
      broadcast({ type: 'event/session-updated' });
      return null;
    case 'session/stop':
      await resetSession();
      broadcast({ type: 'event/session-updated' });
      return null;

    // ── Apply the job in a given tab ──
    case 'apply/from-current-tab': {
      const profiles = await getProfiles();
      const profile =
        profiles.find((p) => p.isDefault) ?? profiles[0];
      if (!profile) throw new Error('No profile set up yet. Upload a resume first.');
      const outcome = await applyToTab(msg.tabId, profile);
      if (outcome.status === 'error' || outcome.status === 'blocked') {
        throw new Error(outcome.reason);
      }
      return outcome;
    }

    // ── AI helpers ──
    case 'ai/parse-resume': {
      const { ai } = await getSettings();
      const profile = await parseResumeText(ai, msg.resumeText, msg.label);
      await upsertProfile(profile);
      return profile;
    }
    case 'ai/score-match': {
      const { ai } = await getSettings();
      return scoreMatch(ai, msg.job, msg.profile);
    }
    case 'ai/cover-letter': {
      const { ai } = await getSettings();
      return generateCoverLetter(ai, msg.job, msg.profile);
    }
    case 'ai/answer-question': {
      const { ai } = await getSettings();
      return answerQuestion(ai, msg.question, msg.job, msg.profile);
    }

    default: {
      const _exhaustive: never = msg;
      throw new Error(`Unhandled request: ${JSON.stringify(_exhaustive)}`);
    }
  }
}
