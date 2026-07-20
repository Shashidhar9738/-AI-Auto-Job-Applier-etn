import type { JobDetails, PortalId } from '@/lib/types';
import { BaseAdapter } from './base-adapter';

/**
 * Wellfound (formerly AngelList Talent) adapter. Startup jobs; applying usually
 * opens a message/apply panel with a note field.
 */
export class WellfoundAdapter extends BaseAdapter {
  readonly id: PortalId = 'wellfound';
  readonly name = 'Wellfound';

  protected selectors = {
    applyButton: [
      'button[data-test="JobApplicationButton"]',
      'text=Apply',
      'text=Apply now',
    ],
    formContainer: ['[data-test="JobApplicationForm"]', '[role="dialog"] form', 'main form'],
    nextButton: ['text=Next', 'text=Continue'],
    submitButton: ['button[type="submit"]', 'text=Send', 'text=Submit application'],
    successIndicator: ['text=Application sent', 'text=applied', '[data-test="applied"]'],
  };

  matchUrl(url: string): boolean {
    return /wellfound\.|angel\.co/i.test(url);
  }

  extractJobDetails(): JobDetails {
    return {
      portal: this.id,
      url: window.location.href,
      title: this.text('[data-test="JobDetail-Title"], h1, h2'),
      company: this.text('[data-test="StartupHeader-name"], a[href*="/company/"]'),
      location: this.text('[data-test="JobDetail-Location"]'),
      description: this.text('[data-test="JobDescription"], .job-description'),
      salaryText: this.text('[data-test="JobDetail-Compensation"]') || undefined,
      easyApply: this.selectors.applyButton.some((s) => this.visibleEl(s)),
    };
  }
}
