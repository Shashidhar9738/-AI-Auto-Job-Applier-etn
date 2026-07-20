import type { JobDetails, PortalId } from '@/lib/types';
import { BaseAdapter } from './base-adapter';

/**
 * Internshala adapter (internships + fresher jobs). The apply flow opens a
 * modal with cover-letter text and a few employer questions.
 */
export class InternshalaAdapter extends BaseAdapter {
  readonly id: PortalId = 'internshala';
  readonly name = 'Internshala';

  protected selectors = {
    applyButton: ['#easy_apply_button', '#continue_button', 'text=Apply now'],
    formContainer: ['#application_form', '.application_container', '#assessment_form'],
    nextButton: ['#submit', 'text=Next', 'text=Save & Continue'],
    submitButton: ['#submit', 'text=Submit application', 'text=Submit'],
    successIndicator: ['text=Application sent', 'text=successfully applied', '.application_success'],
  };

  matchUrl(url: string): boolean {
    return /internshala\./i.test(url);
  }

  extractJobDetails(): JobDetails {
    return {
      portal: this.id,
      url: window.location.href,
      title: this.text('.profile_on_detail_page, .heading_4_5, h1'),
      company: this.text('.company_name, .heading_6'),
      location: this.text('#location_names, .location_names'),
      description: this.text('.internship_details, .text-container'),
      salaryText: this.text('.stipend') || undefined,
      easyApply: this.selectors.applyButton.some((s) => this.visibleEl(s)),
    };
  }
}
