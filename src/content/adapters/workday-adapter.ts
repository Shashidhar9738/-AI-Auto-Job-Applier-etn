import type { JobDetails, PortalId } from '@/lib/types';
import { BaseAdapter } from './base-adapter';

/**
 * Workday ATS adapter (*.myworkdayjobs.com).
 *
 * Workday is a heavy multi-step React SPA that keys everything off
 * `data-automation-id` attributes. It typically requires an account, so this
 * adapter focuses on job extraction and driving the visible step; the generic
 * field detection fills what it can and pauses for review on complex steps.
 */
export class WorkdayAdapter extends BaseAdapter {
  readonly id: PortalId = 'workday';
  readonly name = 'Workday';

  protected selectors = {
    applyButton: [
      'a[data-automation-id="adventureButton"]',
      'a[data-automation-id="applyManually"]',
      'text=Apply',
      'text=Apply Manually',
    ],
    formContainer: ['[data-automation-id="applyFlowPage"]', 'form', 'main'],
    nextButton: [
      'button[data-automation-id="pageFooterNextButton"]',
      'button[data-automation-id="continueButton"]',
      'text=Next',
      'text=Save and Continue',
    ],
    submitButton: ['button[data-automation-id="pageFooterSubmitButton"]', 'text=Submit'],
    successIndicator: [
      '[data-automation-id="submissionConfirmation"]',
      'text=submitted',
      'text=Thank you for applying',
    ],
  };

  matchUrl(url: string): boolean {
    return /myworkdayjobs\.com|workday/i.test(url);
  }

  extractJobDetails(): JobDetails {
    return {
      portal: this.id,
      url: window.location.href,
      title: this.text('[data-automation-id="jobPostingHeader"], h1, h2'),
      company: document.title.split('-').pop()?.trim() || location.hostname.split('.')[0],
      location: this.text('[data-automation-id="locations"], [data-automation-id="jobPostingLocation"]'),
      description: this.text('[data-automation-id="jobPostingDescription"]'),
      easyApply: false,
    };
  }
}
