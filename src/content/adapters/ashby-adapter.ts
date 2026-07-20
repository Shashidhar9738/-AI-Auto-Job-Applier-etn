import type { JobDetails, PortalId } from '@/lib/types';
import { BaseAdapter } from './base-adapter';

/**
 * Ashby ATS adapter (jobs.ashbyhq.com/<company>/<id>). React app with a clean
 * single-page application form; fields are labelled, so generic detection maps
 * them well.
 */
export class AshbyAdapter extends BaseAdapter {
  readonly id: PortalId = 'ashby';
  readonly name = 'Ashby';

  protected selectors = {
    applyButton: ['text=Apply for this Job', 'text=Apply', 'a[href*="/application"]'],
    formContainer: ['form.ashby-application-form', '[class*="ApplicationForm"]', 'main form'],
    nextButton: ['text=Continue'],
    submitButton: ['button[type="submit"]', 'text=Submit Application', 'text=Submit'],
    successIndicator: ['text=Thank you for applying', 'text=application has been submitted', '[class*="Confirmation"]'],
  };

  matchUrl(url: string): boolean {
    return /ashbyhq\.com/i.test(url);
  }

  extractJobDetails(): JobDetails {
    return {
      portal: this.id,
      url: window.location.href,
      title: this.text('h1, [class*="JobPostingHeader"] h1'),
      company: this.text('[class*="CompanyName"]') || document.title.split(' @ ').pop() || '',
      location: this.text('[class*="JobPostingHeader"] [class*="location"], [class*="Location"]'),
      description: this.text('[class*="JobPostingDescription"], [class*="Description"]'),
      easyApply: true,
    };
  }
}
