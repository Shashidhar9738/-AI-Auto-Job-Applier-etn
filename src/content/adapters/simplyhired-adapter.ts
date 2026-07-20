import type { JobDetails, PortalId } from '@/lib/types';
import { BaseAdapter } from './base-adapter';

/** SimplyHired adapter — shares much of Indeed's apply infrastructure. */
export class SimplyHiredAdapter extends BaseAdapter {
  readonly id: PortalId = 'simplyhired';
  readonly name = 'SimplyHired';

  protected selectors = {
    applyButton: ['button[data-testid="apply-button"]', 'text=Apply'],
    formContainer: ['.ia-container', 'main form', '[data-testid="ApplyForm"]'],
    nextButton: ['button[data-testid="continue-button"]', 'text=Continue'],
    submitButton: ['button[data-testid="submit-button"]', 'text=Submit application'],
    successIndicator: ['[data-testid="application-submitted"]', 'text=application submitted'],
  };

  matchUrl(url: string): boolean {
    return /simplyhired\./i.test(url);
  }

  extractJobDetails(): JobDetails {
    return {
      portal: this.id,
      url: window.location.href,
      title: this.text('h1, [data-testid="viewJobTitle"]'),
      company: this.text('[data-testid="viewJobCompanyName"]'),
      location: this.text('[data-testid="viewJobCompanyLocation"]'),
      description: this.text('[data-testid="viewJobBodyJobFullDescriptionContent"]'),
      easyApply: this.selectors.applyButton.some((s) => this.visibleEl(s)),
    };
  }
}
