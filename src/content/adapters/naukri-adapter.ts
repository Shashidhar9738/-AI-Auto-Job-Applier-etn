import type { JobDetails, PortalId } from '@/lib/types';
import { BaseAdapter } from './base-adapter';

/**
 * Naukri adapter. Many Naukri jobs apply in one click when the profile is
 * complete; some open a chatbot-style questionnaire (`.chatbot_DrawerContentWrapper`)
 * with free-text and single-select chips.
 */
export class NaukriAdapter extends BaseAdapter {
  readonly id: PortalId = 'naukri';
  readonly name = 'Naukri';

  protected selectors = {
    applyButton: [
      '#apply-button',
      'button.apply-button',
      'text=Apply',
    ],
    formContainer: [
      '.chatbot_DrawerContentWrapper',
      '.chatbot_MessageContainer',
    ],
    nextButton: ['.sendMsg', 'text=Save'],
    submitButton: ['.sendMsg', 'text=Submit'],
    successIndicator: [
      'text=successfully applied',
      '.apply-message',
      'text=You have already applied',
    ],
  };

  matchUrl(url: string): boolean {
    return /naukri\.com/i.test(url);
  }

  extractJobDetails(): JobDetails {
    const title = this.text('.styles_jd-header-title__rZwM1, h1');
    const company = this.text('.styles_jd-header-comp-name__MvqAI a, .comp-name');
    const location = this.text('.styles_jhc__location__W_pVs, .loc');
    const description = this.text('.styles_JDC__dang-inner-html__h0K4t, .job-desc');
    const salaryText = this.text('.styles_jhc__salary__jdfEC');

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
