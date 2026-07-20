import type { JobDetails, PortalId } from '@/lib/types';
import { BaseAdapter } from './base-adapter';

/** Monster adapter. Single "Apply" affordance; forms vary by employer. */
export class MonsterAdapter extends BaseAdapter {
  readonly id: PortalId = 'monster';
  readonly name = 'Monster';

  protected selectors = {
    applyButton: [
      'button[data-testid="apply-button"]',
      'a[data-testid="apply-button"]',
      'text=Apply',
    ],
    formContainer: ['[data-testid="apply-form"]', 'main form', '[role="dialog"] form'],
    nextButton: ['text=Next', 'text=Continue'],
    submitButton: ['text=Submit application', 'text=Submit'],
    successIndicator: ['text=application submitted', 'text=applied'],
  };

  matchUrl(url: string): boolean {
    return /monster\./i.test(url);
  }

  extractJobDetails(): JobDetails {
    return {
      portal: this.id,
      url: window.location.href,
      title: this.text('[data-testid="jobTitle"], h1'),
      company: this.text('[data-testid="companyName"], [name="companyName"]'),
      location: this.text('[data-testid="jobDetailLocation"]'),
      description: this.text('[data-testid="svx-description-container"], .job-description'),
      easyApply: this.selectors.applyButton.some((s) => this.visibleEl(s)),
    };
  }
}
