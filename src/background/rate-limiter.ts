import { getSession, getSettings, saveSession } from '@/lib/storage';

/**
 * Enforces the human-like application pace from settings. This is a courtesy
 * throttle so we never hammer a portal — it caps applications-per-hour, not a
 * mechanism to evade any protection.
 */
export async function canApplyNow(): Promise<{ ok: boolean; waitMs: number }> {
  const settings = await getSettings();
  const session = await getSession();
  const now = Date.now();
  const cap = settings.rateLimit.applicationsPerHour;

  const windowStart = session.hourWindowStart ?? now;
  const elapsed = now - windowStart;

  // Reset the rolling hour window.
  if (elapsed >= 3_600_000) {
    await saveSession({ hourWindowStart: now, appliedThisHour: 0 });
    return { ok: true, waitMs: 0 };
  }

  if (session.appliedThisHour < cap) return { ok: true, waitMs: 0 };
  return { ok: false, waitMs: 3_600_000 - elapsed };
}

export async function recordApplication(): Promise<void> {
  const session = await getSession();
  const now = Date.now();
  const windowStart = session.hourWindowStart ?? now;
  const reset = now - windowStart >= 3_600_000;
  await saveSession({
    appliedThisSession: session.appliedThisSession + 1,
    appliedThisHour: reset ? 1 : session.appliedThisHour + 1,
    hourWindowStart: reset ? now : windowStart,
  });
}
