import { getSettings } from '@/lib/storage';

/**
 * Daily apply-session scheduling via chrome.alarms. When enabled, an alarm
 * fires at the configured local start time; the handler in the service worker
 * kicks off a session. Alarms survive service-worker suspension, which is why
 * we use them instead of setTimeout.
 */
const ALARM_NAME = 'daily-apply-session';

export async function syncSchedule(): Promise<void> {
  const { schedule } = await getSettings();
  await chrome.alarms.clear(ALARM_NAME);
  if (!schedule.enabled) return;

  const when = nextOccurrence(schedule.startTime).getTime();
  chrome.alarms.create(ALARM_NAME, {
    when,
    periodInMinutes: 24 * 60,
  });
}

export function isScheduleAlarm(name: string): boolean {
  return name === ALARM_NAME;
}

/** Next Date matching "HH:MM" local time (today if still ahead, else tomorrow). */
function nextOccurrence(hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number);
  const now = new Date();
  const next = new Date();
  next.setHours(h ?? 9, m ?? 0, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  return next;
}
