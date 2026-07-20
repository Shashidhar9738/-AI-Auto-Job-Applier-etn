import type { JobDetails, PortalId } from '@/lib/types';
import { BaseAdapter } from './base-adapter';

/**
 * Lever ATS adapter (jobs.lever.co/<company>/<id> → /apply). The apply page is
 * a single form with `name`d fields (name, email, phone, org, resume upload,
 * and `cards[...]` custom questions).
 */
export class LeverAdapter extends BaseAdapter {
  readonly id: PortalId = 'lever';
  readonly name = 'Lever';

  protected selectors = {
    applyButton: ['a.postings-btn[href*="/apply"]', 'text=Apply for this job', 'text=Apply'],
    formContainer: ['form.application-form', 'form[action*="/apply"]', 'main form'],
    nextButton: ['text=Continue'],
    submitButton: ['.template-btn-submit', 'button[type="submit"]', 'text=Submit application'],
    successIndicator: ['.application-confirmation', 'text=Thank you', 'text=application has been submitted'],
  };

  matchUrl(url: string): boolean {
    return /lever\.co/i.test(url);
  }

  extractJobDetails(): JobDetails {
    return {
      portal: this.id,
      url: window.location.href,
      title: this.text('.posting-headline h2, h2'),
      company: this.text('.main-header-logo img')
        ? (document.querySelector('.main-header-logo img') as HTMLImageElement)?.alt ?? ''
        : this.text('.company-name'),
      location: this.text('.posting-categories .location, .sort-by-time'),
      description: this.text('.section-wrapper.page-full-width, .posting-description, .content'),
      easyApply: true,
    };
  }
}
