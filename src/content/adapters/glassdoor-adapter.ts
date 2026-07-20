import type { JobDetails, PortalId } from '@/lib/types';
import { BaseAdapter } from './base-adapter';

/**
 * Glassdoor adapter. Glassdoor often proxies applications to Indeed's
 * "smartapply" flow or opens the employer site; the generic field detection
 * handles the embedded form once open.
 */
export class GlassdoorAdapter extends BaseAdapter {
  readonly id: PortalId = 'glassdoor';
  readonly name = 'Glassdoor';

  protected selectors = {
    applyButton: [
      'button[data-test="easyApply"]',
      'button[data-test="applyButton"]',
      'text=Easy Apply',
      'text=Apply Now',
    ],
    formContainer: ['.ia-container', '[data-test="applyModal"]', 'main form'],
    nextButton: ['button[data-testid="continue-button"]', 'text=Continue'],
    submitButton: ['button[data-testid="submit-button"]', 'text=Submit application'],
    successIndicator: ['[data-testid="application-submitted"]', 'text=application submitted'],
  };

  matchUrl(url: string): boolean {
    return /glassdoor\./i.test(url);
  }

  extractJobDetails(): JobDetails {
    return {
      portal: this.id,
      url: window.location.href,
      title: this.text('[data-test="job-title"], h1'),
      company: this.text('[data-test="employer-name"], [data-test="employerName"]'),
      location: this.text('[data-test="location"]'),
      description: this.text('[data-test="jobDescriptionContent"], .jobDescriptionContent'),
      salaryText: this.text('[data-test="detailSalary"]') || undefined,
      easyApply: this.selectors.applyButton.some((s) => this.visibleEl(s)),
    };
  }
}
