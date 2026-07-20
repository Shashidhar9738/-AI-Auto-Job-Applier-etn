import type { JobDetails, PortalId } from '@/lib/types';
import { BaseAdapter } from './base-adapter';

/**
 * Fallback adapter for portals without a dedicated implementation
 * (Glassdoor, Monster, Wellfound, Internshala, or any ATS embed).
 *
 * It relies entirely on the generic heuristics: pull the biggest text block as
 * the description, and drive whatever form/next/submit controls it can find by
 * their visible labels.
 */
export class GenericAdapter extends BaseAdapter {
  readonly id: PortalId;
  readonly name = 'Generic';

  constructor(portalId: PortalId = 'generic') {
    super();
    this.id = portalId;
  }

  protected selectors = {
    applyButton: ['text=Apply', 'text=Apply now', 'text=Easy apply', 'text=Submit application'],
    formContainer: ['form', '[role="dialog"] form', 'main form'],
    nextButton: ['text=Next', 'text=Continue', 'text=Save and continue'],
    submitButton: ['text=Submit application', 'text=Submit', 'text=Send application'],
    successIndicator: [
      'text=application submitted',
      'text=thank you for applying',
      'text=successfully applied',
    ],
  };

  matchUrl(): boolean {
    return true; // last-resort fallback
  }

  extractJobDetails(): JobDetails {
    const title = this.text('h1') || document.title;
    const company =
      this.text('[class*="company" i]') ||
      this.text('meta[property="og:site_name"]');
    const description = this.largestTextBlock();

    return {
      portal: this.id,
      url: window.location.href,
      title,
      company,
      description,
      easyApply: false,
    };
  }

  /** Heuristic: the element with the most text is usually the description. */
  private largestTextBlock(): string {
    const candidates = Array.from(
      document.querySelectorAll<HTMLElement>('article, section, div[class*="desc" i], main'),
    );
    let best = '';
    for (const el of candidates) {
      const text = el.innerText?.replace(/\s+/g, ' ').trim() ?? '';
      if (text.length > best.length) best = text;
    }
    return best.slice(0, 12000);
  }
}
