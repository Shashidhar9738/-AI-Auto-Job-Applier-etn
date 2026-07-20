import type { ContentRequest, ContentResponse } from '@/lib/messaging';
import { getAdapterForUrl } from './adapters/registry';
import { detectCaptcha } from './dom-utils';
import { runApply } from './apply-runner';
import { getSettings } from '@/lib/storage';

/**
 * Content-script entry point. Injected into supported job portals. Holds no
 * secrets — it receives instructions from the background worker and reports DOM
 * results back. All AI/API work happens in the background.
 */

const adapter = getAdapterForUrl(window.location.href);

chrome.runtime.onMessage.addListener(
  (msg: ContentRequest, _sender, sendResponse): boolean => {
    handle(msg)
      .then(sendResponse)
      .catch((err) =>
        sendResponse({ type: 'error', message: String(err?.message ?? err) }),
      );
    return true; // async response
  },
);

async function handle(msg: ContentRequest): Promise<ContentResponse> {
  switch (msg.type) {
    case 'content/ping':
      return { type: 'pong', portal: adapter.id };

    case 'content/extract-job':
      return { type: 'job', job: adapter.extractJobDetails() };

    case 'content/detect-fields':
      return { type: 'fields', fields: adapter.detectFormFields() };

    case 'content/apply': {
      if (detectCaptcha()) {
        return { type: 'apply-result', status: 'captcha', message: 'CAPTCHA present.' };
      }
      const settings = await getSettings();
      return runApply(adapter, {
        profile: msg.profile,
        answers: msg.answers,
        coverLetter: msg.coverLetter,
        submit: msg.submit,
        minDelay: settings.rateLimit.minActionDelayMs,
        maxDelay: settings.rateLimit.maxActionDelayMs,
      });
    }

    default:
      return { type: 'error', message: 'Unknown message.' };
  }
}
