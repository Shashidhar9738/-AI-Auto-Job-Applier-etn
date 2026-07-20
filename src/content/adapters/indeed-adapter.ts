import type { JobDetails, PortalId } from '@/lib/types';
import { BaseAdapter } from './base-adapter';

/**
 * Indeed adapter — "Apply now" flow. Indeed often routes the form through an
 * iframe or a dedicated apply subdomain (smartapply.indeed.com); the content
 * script is injected there too via the manifest match patterns.
 */
export class IndeedAdapter extends BaseAdapter {
  readonly id: PortalId = 'indeed';
  readonly name = 'Indeed';

  protected selectors = {
    applyButton: [
      '#indeedApplyButton',
      'button[data-testid="indeedApplyButton"]',
      '.jobsearch-IndeedApplyButton-newDesign',
    ],
    formContainer: [
      '.ia-container',
      'main[role="main"] form',
      'div[data-testid="ApplyForm"]',
    ],
    nextButton: [
      'button[data-testid="continue-button"]',
      'text=Continue',
    ],
    submitButton: [
      'button[data-testid="submit-button"]',
      'text=Submit your application',
      'text=Submit application',
    ],
    successIndicator: [
      '[data-testid="application-submitted"]',
      'text=application has been submitted',
    ],
  };

  matchUrl(url: string): boolean {
    return /indeed\.com/i.test(url);
  }

  extractJobDetails(): JobDetails {
    const title = this.text(
      'h1.jobsearch-JobInfoHeader-title, [data-testid="jobsearch-JobInfoHeader-title"]',
    );
    const company = this.text(
      '[data-testid="inlineHeader-companyName"], [data-company-name]',
    );
    const location = this.text('[data-testid="inlineHeader-companyLocation"]');
    const description = this.text('#jobDescriptionText');
    const salaryText = this.text('#salaryInfoAndJobType, [data-testid="attribute_snippet_compensation"]');

    return {
      portal: this.id,
      url: window.location.href,
      title,
      company,
      location,
      description,
      salaryText: salaryText || undefined,
      easyApply: this.selectors.applyButton.some((s) => this.visibleEl(s)),
    };
  }
}
