import type { ApplicationRecord, JobDetails, ResumeProfile, Settings } from '@/lib/types';
import { sendToTab } from '@/lib/messaging';
import type { ContentResponse } from '@/lib/messaging';
import { broadcast } from '@/lib/messaging';
import {
  findApplicationByUrl,
  getSettings,
  upsertApplication,
} from '@/lib/storage';
import { uid } from '@/lib/utils';
import { scoreMatch } from '@/lib/ai/matcher';
import { generateCoverLetter } from '@/lib/ai/cover-letter';
import { canApplyNow, recordApplication } from './rate-limiter';
import { notify } from './notifications';

export type ApplyOutcome =
  | { status: 'submitted' | 'filled'; record: ApplicationRecord }
  | { status: 'skipped'; reason: string }
  | { status: 'blocked'; reason: string }
  | { status: 'error'; reason: string };

/**
 * Full pipeline for applying to the job open in a tab:
 * dedupe → extract → blacklist → match/threshold → cover letter → fill/submit.
 */
export async function applyToTab(
  tabId: number,
  profile: ResumeProfile,
): Promise<ApplyOutcome> {
  const settings = await getSettings();

  const rate = await canApplyNow();
  if (!rate.ok) {
    return { status: 'blocked', reason: `Hourly limit reached. Try again in ${Math.ceil(rate.waitMs / 60000)} min.` };
  }

  // 1. Extract the job.
  const extract = await safeSend(tabId, { type: 'content/extract-job' });
  if (!extract || extract.type !== 'job') {
    return { status: 'error', reason: 'Could not read the job posting on this page.' };
  }
  const job = extract.job;

  // 2. Dedupe.
  const existing = await findApplicationByUrl(job.url);
  if (existing && ['applied', 'submitted', 'in-progress'].includes(existing.status)) {
    return { status: 'skipped', reason: 'Already applied to this job.' };
  }

  // 3. Blacklist.
  const blocked = isBlacklisted(job, settings);
  if (blocked) return { status: 'skipped', reason: blocked };

  // 4. Match + threshold.
  let match;
  try {
    match = await scoreMatch(settings.ai, job, profile);
  } catch (e) {
    match = undefined;
    broadcast({ type: 'event/log', level: 'warn', message: `Match scoring failed: ${String(e)}` });
  }
  if (match) {
    if (match.score >= settings.notifications.highMatchThreshold) {
      notify('high-match', 'High-match job found', `${job.title} at ${job.company} — ${match.score}%`);
      broadcast({ type: 'event/high-match', job, match });
    }
    if (match.score < settings.matchThreshold) {
      await saveRecord(job, profile.id, 'skipped', { match });
      return { status: 'skipped', reason: `Match ${match.score}% below threshold ${settings.matchThreshold}%.` };
    }
  }

  // 5. Cover letter (best effort).
  let coverLetter: string | undefined;
  if (job.description) {
    try {
      coverLetter = await generateCoverLetter(settings.ai, job, profile);
    } catch (e) {
      broadcast({ type: 'event/log', level: 'warn', message: `Cover letter failed: ${String(e)}` });
    }
  }

  // 6. Fill / submit via the content script.
  const record = await saveRecord(job, profile.id, 'in-progress', { match, coverLetter });
  const submit = settings.applyMode === 'full-auto';
  const result = await safeSend(tabId, {
    type: 'content/apply',
    profile,
    answers: {},
    coverLetter,
    submit,
  });

  return finalize(record, result, settings);
}

async function finalize(
  record: ApplicationRecord,
  result: ContentResponse | undefined,
  settings: Settings,
): Promise<ApplyOutcome> {
  if (!result || result.type !== 'apply-result') {
    record.status = 'error';
    record.errorMessage = 'No response from page.';
    await upsertApplication(record);
    broadcast({ type: 'event/application-updated', record });
    return { status: 'error', reason: record.errorMessage };
  }

  switch (result.status) {
    case 'submitted':
      record.status = 'applied';
      record.appliedAt = Date.now();
      await upsertApplication(record);
      await recordApplication();
      notify('applied', 'Application submitted', `${record.job.title} at ${record.job.company}`);
      broadcast({ type: 'event/application-updated', record });
      return { status: 'submitted', record };

    case 'filled':
      record.status = 'awaiting-review';
      await upsertApplication(record);
      // In semi-auto the user still submits manually; count it as an attempt.
      if (settings.applyMode !== 'manual-queue') await recordApplication();
      broadcast({ type: 'event/application-updated', record });
      return { status: 'filled', record };

    case 'captcha':
      record.status = 'error';
      record.errorMessage = 'CAPTCHA — paused for manual completion.';
      await upsertApplication(record);
      notify('captcha', 'CAPTCHA encountered', `Finish ${record.job.title} manually, then resume.`);
      broadcast({ type: 'event/captcha', url: record.job.url });
      broadcast({ type: 'event/application-updated', record });
      return { status: 'blocked', reason: record.errorMessage };

    default:
      record.status = 'error';
      record.errorMessage = result.message ?? 'Unknown error.';
      await upsertApplication(record);
      notify('error', 'Application error', record.errorMessage);
      broadcast({ type: 'event/application-updated', record });
      return { status: 'error', reason: record.errorMessage };
  }
}

function isBlacklisted(job: JobDetails, settings: Settings): string | null {
  const company = job.company.toLowerCase();
  if (settings.blacklistCompanies.some((c) => company.includes(c.toLowerCase()))) {
    return `Company "${job.company}" is blacklisted.`;
  }
  const haystack = `${job.title} ${job.description}`.toLowerCase();
  const hit = settings.blacklistKeywords.find((k) => haystack.includes(k.toLowerCase()));
  return hit ? `Contains blacklisted keyword "${hit}".` : null;
}

async function saveRecord(
  job: JobDetails,
  profileId: string,
  status: ApplicationRecord['status'],
  extra: Partial<ApplicationRecord> = {},
): Promise<ApplicationRecord> {
  const now = Date.now();
  const existing = await findApplicationByUrl(job.url);
  const record: ApplicationRecord = {
    id: existing?.id ?? uid('app_'),
    job,
    resumeProfileId: profileId,
    status,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    ...extra,
  };
  await upsertApplication(record);
  return record;
}

async function safeSend(
  tabId: number,
  msg: Parameters<typeof sendToTab>[1],
): Promise<ContentResponse | undefined> {
  try {
    return await sendToTab(tabId, msg);
  } catch {
    return undefined;
  }
}
