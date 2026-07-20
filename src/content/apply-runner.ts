import type { ResumeProfile } from '@/lib/types';
import { sendToBackground } from '@/lib/messaging';
import { dataUrlToFile, humanDelay } from '@/lib/utils';
import type { ContentResponse } from '@/lib/messaging';
import { detectCaptcha } from './dom-utils';
import { valueForField } from './field-detection';
import type { JobPortalAdapter } from './adapters/adapter';

const MAX_STEPS = 8;

interface RunOptions {
  profile: ResumeProfile;
  /** Pre-supplied answers keyed by question label. */
  answers: Record<string, string>;
  coverLetter?: string;
  /** false => fill only, then stop (semi-auto review). */
  submit: boolean;
  /** Delay bounds between field actions. */
  minDelay: number;
  maxDelay: number;
}

/**
 * Drive a single application to completion (or to the review point).
 *
 * Open-ended questions with no pre-supplied answer are generated on demand by
 * asking the background worker (which holds the AI key). The runner pauses and
 * reports if a CAPTCHA appears — it never attempts to solve one.
 */
export async function runApply(
  adapter: JobPortalAdapter,
  opts: RunOptions,
): Promise<Extract<ContentResponse, { type: 'apply-result' }>> {
  const job = adapter.extractJobDetails();
  const opened = await adapter.openApplyForm();
  if (!opened) {
    return { type: 'apply-result', status: 'error', message: 'Could not open the apply form.' };
  }

  const unanswered: string[] = [];

  for (let step = 0; step < MAX_STEPS; step++) {
    if (detectCaptcha()) {
      return { type: 'apply-result', status: 'captcha', message: 'CAPTCHA detected.' };
    }

    const fields = adapter.detectFormFields();
    for (const field of fields) {
      await humanDelay(opts.minDelay, opts.maxDelay);

      if (field.semantic === 'resume-upload' && opts.profile.resumeFile) {
        const f = opts.profile.resumeFile;
        await adapter.uploadFile(field, dataUrlToFile(f.dataUrl, f.name, f.mimeType));
        continue;
      }
      if (field.semantic === 'cover-letter-text' && opts.coverLetter) {
        await adapter.fillField(field, opts.coverLetter);
        continue;
      }
      if (field.semantic === 'open-question') {
        const answer =
          opts.answers[field.label] ??
          (await generateAnswer(field.label, adapter, opts.profile));
        if (answer) await adapter.fillField(field, answer);
        else unanswered.push(field.label);
        continue;
      }

      const value = valueForField(field, opts.profile);
      if (value) await adapter.fillField(field, value);
      else if (field.required) unanswered.push(field.label);
    }

    // Semi-auto: stop after filling the current step for user review.
    if (!opts.submit) {
      return {
        type: 'apply-result',
        status: 'filled',
        message: 'Form filled — review and submit.',
        openQuestions: unanswered,
      };
    }

    const advanced = await adapter.handleNextStep();
    if (!advanced) break;
  }

  if (detectCaptcha()) {
    return { type: 'apply-result', status: 'captcha', message: 'CAPTCHA detected.' };
  }

  const submitted = await adapter.submitApplication();
  return submitted
    ? { type: 'apply-result', status: 'submitted' }
    : {
        type: 'apply-result',
        status: 'error',
        message:
          unanswered.length > 0
            ? `Could not submit — unfilled fields: ${unanswered.join(', ')}`
            : 'Submit control not found or submission not confirmed.',
      };

  async function generateAnswer(
    question: string,
    a: JobPortalAdapter,
    profile: ResumeProfile,
  ): Promise<string | undefined> {
    const res = await sendToBackground({
      type: 'ai/answer-question',
      question,
      job,
      profile,
    });
    void a;
    return res.ok ? (res.data as string) : undefined;
  }
}
