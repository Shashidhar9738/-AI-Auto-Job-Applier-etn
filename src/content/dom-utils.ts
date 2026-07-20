import { humanDelay } from '@/lib/utils';

/**
 * Low-level DOM helpers used by every adapter.
 *
 * Filling React/Vue-controlled inputs requires setting the value through the
 * native setter and dispatching real `input`/`change` events, otherwise the
 * framework's state never updates. These helpers centralise that.
 */

const nativeInputSetter = Object.getOwnPropertyDescriptor(
  window.HTMLInputElement.prototype,
  'value',
)?.set;
const nativeTextareaSetter = Object.getOwnPropertyDescriptor(
  window.HTMLTextAreaElement.prototype,
  'value',
)?.set;
const nativeSelectSetter = Object.getOwnPropertyDescriptor(
  window.HTMLSelectElement.prototype,
  'value',
)?.set;

export function setNativeValue(
  el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  value: string,
): void {
  const setter =
    el instanceof HTMLTextAreaElement
      ? nativeTextareaSetter
      : el instanceof HTMLSelectElement
        ? nativeSelectSetter
        : nativeInputSetter;
  setter?.call(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

/**
 * Type text character-by-character with small randomized delays. This mimics a
 * real person's cadence for fields that only react to keystrokes (typeahead /
 * autocomplete widgets) and keeps the pace natural — it is throttling, not an
 * attempt to bypass any security check.
 */
export async function typeInto(
  el: HTMLInputElement | HTMLTextAreaElement,
  value: string,
): Promise<void> {
  el.focus();
  setNativeValue(el, '');
  for (const char of value) {
    el.value += char;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    await humanDelay(20, 80);
  }
  el.dispatchEvent(new Event('change', { bubbles: true }));
  el.blur();
}

export function clickElement(el: HTMLElement): void {
  el.scrollIntoView({ block: 'center', behavior: 'instant' as ScrollBehavior });
  el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
  el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
  el.click();
}

export function labelFor(el: Element): string {
  const input = el as HTMLElement;
  const id = input.getAttribute('id');
  if (id) {
    const lbl = document.querySelector(`label[for="${CSS.escape(id)}"]`);
    if (lbl?.textContent) return clean(lbl.textContent);
  }
  const wrapping = input.closest('label');
  if (wrapping?.textContent) return clean(wrapping.textContent);
  const aria = input.getAttribute('aria-label');
  if (aria) return clean(aria);
  const labelledBy = input.getAttribute('aria-labelledby');
  if (labelledBy) {
    const ref = document.getElementById(labelledBy);
    if (ref?.textContent) return clean(ref.textContent);
  }
  // Fall back to nearest preceding text.
  const prev = input.previousElementSibling;
  if (prev?.textContent) return clean(prev.textContent);
  return clean(input.getAttribute('placeholder') ?? input.getAttribute('name') ?? '');
}

function clean(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

/** Build a reasonably stable selector for re-locating an element. */
export function buildSelector(el: Element): string {
  if (el.id) return `#${CSS.escape(el.id)}`;
  const name = el.getAttribute('name');
  if (name) return `${el.tagName.toLowerCase()}[name="${CSS.escape(name)}"]`;
  // Fall back to nth-of-type path (shallow).
  const parent = el.parentElement;
  if (!parent) return el.tagName.toLowerCase();
  const siblings = Array.from(parent.children).filter((c) => c.tagName === el.tagName);
  const idx = siblings.indexOf(el) + 1;
  return `${buildSelector(parent)} > ${el.tagName.toLowerCase()}:nth-of-type(${idx})`;
}

/** Wait for a selector to appear, up to `timeout` ms. */
export function waitFor<T extends Element = Element>(
  selector: string,
  timeout = 8000,
): Promise<T | null> {
  return new Promise((resolve) => {
    const existing = document.querySelector<T>(selector);
    if (existing) return resolve(existing);
    const obs = new MutationObserver(() => {
      const found = document.querySelector<T>(selector);
      if (found) {
        obs.disconnect();
        resolve(found);
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => {
      obs.disconnect();
      resolve(document.querySelector<T>(selector));
    }, timeout);
  });
}

export function isVisible(el: Element): boolean {
  const rect = (el as HTMLElement).getBoundingClientRect();
  const style = getComputedStyle(el as HTMLElement);
  return (
    rect.width > 0 &&
    rect.height > 0 &&
    style.visibility !== 'hidden' &&
    style.display !== 'none'
  );
}

export function detectCaptcha(): boolean {
  const signals = [
    'iframe[src*="recaptcha"]',
    'iframe[src*="hcaptcha"]',
    'iframe[title*="captcha" i]',
    '[class*="captcha" i]',
    '#px-captcha',
  ];
  return signals.some((s) => {
    const el = document.querySelector(s);
    return el != null && isVisible(el);
  });
}
