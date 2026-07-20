import type { JobDetails, PortalId } from '@/lib/types';
import { BaseAdapter } from './base-adapter';

/**
 * Greenhouse ATS adapter (boards.greenhouse.io / job-boards.greenhouse.io, and
 * embedded `#grnhse_app` iframes). The application form is a single page with
 * stable field ids (first_name, last_name, email, phone) plus custom questions
 * — well suited to the generic field detection.
 */
export class GreenhouseAdapter extends BaseAdapter {
  readonly id: PortalId = 'greenhouse';
  readonly name = 'Greenhouse';

  protected selectors = {
    applyButton: ['#apply_button', 'a[href*="#app"]', 'text=Apply', 'text=Apply for this job'],
    formContainer: ['#application_form', '#application-form', 'form#main_fields', 'main form'],
    nextButton: ['text=Continue'],
    submitButton: ['#submit_app', '#submit_app_button', 'text=Submit application', 'text=Submit Application'],
    successIndicator: ['#application_confirmation', 'text=Thank you for applying', 'text=application was submitted'],
  };

  matchUrl(url: string): boolean {
    return /greenhouse\.io|grnhse/i.test(url);
  }

  extractJobDetails(): JobDetails {
    return {
      portal: this.id,
      url: window.location.href,
      title: this.text('.app-title, h1.section-header, h1'),
      company: this.text('.company-name, span.company-name') || document.title.split(' at ').pop() || '',
      location: this.text('.location, div.location'),
      description: this.text('#content, .job__description, .body'),
      easyApply: true,
    };
  }
}
