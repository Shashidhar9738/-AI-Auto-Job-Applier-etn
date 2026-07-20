import type { JobDetails, PortalId } from '@/lib/types';
import { isVisible } from '../dom-utils';
import { BaseAdapter } from './base-adapter';

/**
 * LinkedIn adapter — targets the "Easy Apply" modal flow.
 *
 * NOTE: LinkedIn's DOM/class names change frequently. Selectors here are
 * best-effort and are the primary thing to update when the flow breaks; the
 * generic field detection provides resilience inside the modal.
 */
export class LinkedInAdapter extends BaseAdapter {
  readonly id: PortalId = 'linkedin';
  readonly name = 'LinkedIn';

  protected selectors = {
    applyButton: [
      'button.jobs-apply-button',
      'button[aria-label*="Easy Apply" i]',
    ],
    formContainer: [
      '.jobs-easy-apply-modal',
      'div[data-test-modal][role="dialog"]',
    ],
    nextButton: [
      'button[aria-label="Continue to next step"]',
      'button[data-easy-apply-next-button]',
    ],
    submitButton: [
      'button[aria-label="Submit application"]',
      'button[aria-label="Review your application"]',
    ],
    successIndicator: [
      '.artdeco-inline-feedback--success',
      'text=Application sent',
      'text=Your application was sent',
    ],
  };

  matchUrl(url: string): boolean {
    return /linkedin\.com\/(jobs|job)\//i.test(url);
  }

  extractJobDetails(): JobDetails {
    const title = this.text('.job-details-jobs-unified-top-card__job-title, h1');
    const company = this.text(
      '.job-details-jobs-unified-top-card__company-name, a[data-test-app-aware-link]',
    );
    const location = this.text(
      '.job-details-jobs-unified-top-card__primary-description-container span',
    );
    const description = this.text(
      '#job-details, .jobs-description__content, article',
    );
    const easyApply = this.selectors.applyButton.some((s) => {
      const el = document.querySelector(s);
      return el != null && /easy apply/i.test(el.textContent ?? '');
    });

    return {
      portal: this.id,
      externalId: this.extractJobId(),
      url: window.location.href,
      title,
      company,
      location,
      description,
      easyApply,
    };
  }

  private extractJobId(): string | undefined {
    const m = window.location.href.match(/currentJobId=(\d+)|jobs\/view\/(\d+)/);
    return m?.[1] ?? m?.[2];
  }

  /** LinkedIn shows "Review" before the true submit; handle both. */
  override async submitApplication(): Promise<boolean> {
    // Click "Review" if present first.
    const review = document.querySelector<HTMLElement>(
      'button[aria-label="Review your application"]',
    );
    if (review && isVisible(review)) {
      review.click();
      await this.wait(1000);
    }
    const submit = document.querySelector<HTMLElement>(
      'button[aria-label="Submit application"]',
    );
    if (!submit || !isVisible(submit)) return false;
    submit.click();
    await this.wait(1500);
    return this.isSubmitted();
  }
}
