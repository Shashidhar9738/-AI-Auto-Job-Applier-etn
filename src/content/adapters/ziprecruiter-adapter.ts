import type { JobDetails, PortalId } from '@/lib/types';
import { BaseAdapter } from './base-adapter';

/** ZipRecruiter adapter — "1-Click Apply" and standard forms. */
export class ZipRecruiterAdapter extends BaseAdapter {
  readonly id: PortalId = 'ziprecruiter';
  readonly name = 'ZipRecruiter';

  protected selectors = {
    applyButton: [
      'button[aria-label*="Apply" i]',
      'button.apply_button',
      'text=1-Click Apply',
      'text=Apply Now',
    ],
    formContainer: ['form#applyFlow', '.apply_form', 'main form'],
    nextButton: ['text=Continue', 'text=Next'],
    submitButton: ['text=Submit application', 'text=Submit', 'button[type="submit"]'],
    successIndicator: ['text=application was sent', 'text=Application submitted'],
  };

  matchUrl(url: string): boolean {
    return /ziprecruiter\./i.test(url);
  }

  extractJobDetails(): JobDetails {
    return {
      portal: this.id,
      url: window.location.href,
      title: this.text('h1.job_title, h1'),
      company: this.text('a.company_name, [data-testid="job-company"]'),
      location: this.text('[data-testid="job-location"], .location'),
      description: this.text('.job_description, [data-testid="job-description"]'),
      salaryText: this.text('.salary, [data-testid="job-compensation"]') || undefined,
      easyApply: this.selectors.applyButton.some((s) => this.visibleEl(s)),
    };
  }
}
