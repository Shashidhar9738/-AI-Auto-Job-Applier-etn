import type { FormField, JobDetails, PortalId } from '@/lib/types';
import {
  buildSelector,
  clickElement,
  isVisible,
  setNativeValue,
  typeInto,
} from '../dom-utils';
import { detectFields } from '../field-detection';
import type { JobPortalAdapter } from './adapter';

/**
 * Shared implementation of the generic parts of an adapter. Portal adapters
 * extend this and override only the portal-specific selectors and quirks.
 */
export abstract class BaseAdapter implements JobPortalAdapter {
  abstract readonly id: PortalId;
  abstract readonly name: string;
  abstract matchUrl(url: string): boolean;
  abstract extractJobDetails(): JobDetails;

  /** Selectors the portal uses for its apply button / form / submit control. */
  protected abstract selectors: {
    applyButton: string[];
    formContainer: string[];
    nextButton: string[];
    submitButton: string[];
    successIndicator: string[];
  };

  protected formRoot(): ParentNode {
    for (const sel of this.selectors.formContainer) {
      const el = document.querySelector(sel);
      if (el && isVisible(el)) return el;
    }
    return document;
  }

  hasApplyForm(): boolean {
    return (
      this.selectors.applyButton.some((s) => this.visibleEl(s)) ||
      this.selectors.formContainer.some((s) => this.visibleEl(s))
    );
  }

  async openApplyForm(): Promise<boolean> {
    // Already open?
    if (this.selectors.formContainer.some((s) => this.visibleEl(s))) return true;
    const btn = this.firstVisible(this.selectors.applyButton);
    if (!btn) return false;
    clickElement(btn);
    await this.wait(1200);
    return this.selectors.formContainer.some((s) => this.visibleEl(s));
  }

  detectFormFields(): FormField[] {
    return detectFields(this.formRoot());
  }

  async fillField(field: FormField, value: string): Promise<void> {
    const el = document.querySelector<HTMLElement>(field.selector);
    if (!el) return;

    switch (field.type) {
      case 'select': {
        const select = el as HTMLSelectElement;
        const opt = Array.from(select.options).find(
          (o) =>
            o.text.toLowerCase().includes(value.toLowerCase()) ||
            value.toLowerCase().includes(o.text.toLowerCase()),
        );
        if (opt) setNativeValue(select, opt.value);
        break;
      }
      case 'radio': {
        this.selectRadioOrCheckbox(field, value);
        break;
      }
      case 'checkbox': {
        const cb = el as HTMLInputElement;
        const truthy = /^(yes|true|1|on)$/i.test(value);
        if (cb.checked !== truthy) clickElement(cb);
        break;
      }
      case 'textarea':
      case 'text':
      case 'email':
      case 'tel':
      case 'number':
      case 'date':
        await typeInto(el as HTMLInputElement | HTMLTextAreaElement, value);
        break;
      default:
        break;
    }
  }

  /** Radio groups share a name; pick the option matching the value. */
  protected selectRadioOrCheckbox(field: FormField, value: string): void {
    const el = document.querySelector<HTMLInputElement>(field.selector);
    const name = el?.getAttribute('name');
    const group = name
      ? Array.from(
          document.querySelectorAll<HTMLInputElement>(
            `input[name="${CSS.escape(name)}"]`,
          ),
        )
      : el
        ? [el]
        : [];
    for (const radio of group) {
      const label = radio.closest('label')?.textContent ?? '';
      if (label.toLowerCase().includes(value.toLowerCase())) {
        clickElement(radio);
        return;
      }
    }
    // Default: first option if value is affirmative-ish.
    if (group[0]) clickElement(group[0]);
  }

  async uploadFile(field: FormField, file: File): Promise<void> {
    const input = document.querySelector<HTMLInputElement>(field.selector);
    if (!input) return;
    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await this.wait(1500); // allow upload to process
  }

  async handleNextStep(): Promise<boolean> {
    const next = this.firstVisible(this.selectors.nextButton);
    if (!next) return false;
    clickElement(next);
    await this.wait(1000);
    return true;
  }

  async submitApplication(): Promise<boolean> {
    const submit = this.firstVisible(this.selectors.submitButton);
    if (!submit) return false;
    clickElement(submit);
    await this.wait(1500);
    return this.isSubmitted();
  }

  isSubmitted(): boolean {
    return this.selectors.successIndicator.some((s) => this.visibleEl(s));
  }

  // ── helpers ──────────────────────────────────────────────────────────────

  protected visibleEl(selector: string): boolean {
    return this.query(selector) != null;
  }

  protected firstVisible(selectors: string[]): HTMLElement | null {
    for (const sel of selectors) {
      const el = this.query(sel);
      if (el) return el;
    }
    return null;
  }

  /**
   * Resolve a selector to the first *visible* match. Supports a `text=Label`
   * convention (case-insensitive substring match on buttons/links), since CSS
   * has no text selector. Invalid CSS is swallowed so one bad selector in a
   * list never breaks the rest.
   */
  protected query(selector: string): HTMLElement | null {
    if (selector.startsWith('text=')) {
      const needle = selector.slice(5).toLowerCase();
      const candidates = document.querySelectorAll<HTMLElement>(
        'button, a[role="button"], [role="button"], input[type="submit"]',
      );
      for (const el of candidates) {
        const label = (el.textContent ?? (el as HTMLInputElement).value ?? '')
          .toLowerCase()
          .trim();
        if (label.includes(needle) && isVisible(el)) return el;
      }
      return null;
    }
    try {
      const el = document.querySelector<HTMLElement>(selector);
      return el && isVisible(el) ? el : null;
    } catch {
      return null; // invalid CSS selector
    }
  }

  protected text(selector: string): string {
    return document.querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  }

  protected wait(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }

  protected fallbackSelectorFor(el: Element | null): string {
    return el ? buildSelector(el) : '';
  }
}
