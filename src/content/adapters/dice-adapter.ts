import type { JobDetails, PortalId } from '@/lib/types';
import { BaseAdapter } from './base-adapter';

/** Dice adapter (tech jobs). "Easy apply" opens a stepped form. */
export class DiceAdapter extends BaseAdapter {
  readonly id: PortalId = 'dice';
  readonly name = 'Dice';

  protected selectors = {
    applyButton: [
      'apply-button-wc',
      'button[data-cy="easyApplyButton"]',
      'text=Easy apply',
      'text=Apply now',
    ],
    formContainer: ['.application-container', '[data-cy="applyForm"]', 'main form'],
    nextButton: ['text=Next', 'text=Continue'],
    submitButton: ['text=Submit', 'button[type="submit"]'],
    successIndicator: ['text=Application submitted', 'text=successfully applied'],
  };

  matchUrl(url: string): boolean {
    return /dice\.com/i.test(url);
  }

  extractJobDetails(): JobDetails {
    return {
      portal: this.id,
      url: window.location.href,
      title: this.text('h1[data-cy="jobTitle"], h1'),
      company: this.text('[data-cy="companyNameLink"], a[data-cy="company"]'),
      location: this.text('[data-cy="location"]'),
      description: this.text('[data-testid="jobDescriptionHtml"], #jobDescription'),
      easyApply: this.selectors.applyButton.some((s) => this.visibleEl(s)),
    };
  }
}
