import type { FieldSemantic, FieldType, FormField, ResumeProfile } from '@/lib/types';
import { buildSelector, isVisible, labelFor } from './dom-utils';

/**
 * Heuristic form-field detection.
 *
 * Given a container element, enumerate its inputs, classify each into a
 * `FieldType` (how to interact) and a `FieldSemantic` (what it's asking for)
 * using label text, placeholder, name, autocomplete, and type attributes.
 * The semantic tag lets `valueForField` pull the right value from the profile.
 */

const SEMANTIC_PATTERNS: Array<[FieldSemantic, RegExp]> = [
  ['email', /\be-?mail\b/i],
  ['phone', /\b(phone|mobile|contact number|tel)\b/i],
  ['first-name', /\bfirst\s*name|given name\b/i],
  ['last-name', /\b(last|family|sur)\s*name\b/i],
  ['full-name', /\b(full\s*name|your name|name)\b/i],
  ['linkedin', /linkedin/i],
  ['github', /github/i],
  ['portfolio', /\b(portfolio|website|personal site)\b/i],
  ['years-experience', /\byears?\b.*\bexperience\b|experience.*years?/i],
  ['salary', /\b(salary|compensation|ctc|expected pay|desired pay)\b/i],
  ['work-authorization', /\b(authorization|authorised|visa|sponsor|work permit|eligible to work)\b/i],
  ['location', /\b(location|city|address|where.*based)\b/i],
  ['cover-letter-text', /\bcover letter\b/i],
];

function classifyType(el: Element): FieldType {
  if (el instanceof HTMLTextAreaElement) return 'textarea';
  if (el instanceof HTMLSelectElement) return 'select';
  if (el instanceof HTMLInputElement) {
    switch (el.type) {
      case 'email':
        return 'email';
      case 'tel':
        return 'tel';
      case 'number':
        return 'number';
      case 'radio':
        return 'radio';
      case 'checkbox':
        return 'checkbox';
      case 'file':
        return 'file';
      case 'date':
        return 'date';
      default:
        return 'text';
    }
  }
  return 'unknown';
}

function classifySemantic(
  el: Element,
  type: FieldType,
  label: string,
): FieldSemantic {
  const name = (el.getAttribute('name') ?? '').toLowerCase();
  const autocomplete = (el.getAttribute('autocomplete') ?? '').toLowerCase();
  const haystack = `${label} ${name} ${el.getAttribute('placeholder') ?? ''}`;

  if (type === 'file') {
    return /cover/i.test(haystack) ? 'cover-letter-upload' : 'resume-upload';
  }
  if (type === 'email' || autocomplete.includes('email')) return 'email';
  if (type === 'tel' || autocomplete.includes('tel')) return 'phone';

  for (const [semantic, pattern] of SEMANTIC_PATTERNS) {
    if (pattern.test(haystack)) return semantic;
  }
  // Long free-text with a question mark is very likely an open question.
  if (type === 'textarea' && /\?|why|describe|tell us|explain/i.test(label)) {
    return 'open-question';
  }
  return 'unknown';
}

export function detectFields(root: ParentNode = document): FormField[] {
  const nodes = Array.from(
    root.querySelectorAll<HTMLElement>('input, textarea, select'),
  ).filter((el) => {
    if (el instanceof HTMLInputElement && ['hidden', 'submit', 'button'].includes(el.type))
      return false;
    return isVisible(el);
  });

  return nodes.map((el) => {
    const type = classifyType(el);
    const label = labelFor(el);
    const semantic = classifySemantic(el, type, label);
    const options =
      el instanceof HTMLSelectElement
        ? Array.from(el.options).map((o) => o.text.trim())
        : undefined;
    return {
      selector: buildSelector(el),
      type,
      semantic,
      label,
      placeholder: el.getAttribute('placeholder') ?? undefined,
      required:
        el.hasAttribute('required') || el.getAttribute('aria-required') === 'true',
      options,
    };
  });
}

/**
 * Resolve the value to enter for a field from the profile. Returns undefined
 * for fields (like open questions) that need the AI layer instead.
 */
export function valueForField(
  field: FormField,
  profile: ResumeProfile,
): string | undefined {
  const c = profile.contact;
  const [first = '', ...rest] = c.fullName.split(' ');
  switch (field.semantic) {
    case 'full-name':
      return c.fullName;
    case 'first-name':
      return first;
    case 'last-name':
      return rest.join(' ');
    case 'email':
      return c.email;
    case 'phone':
      return c.phone;
    case 'location':
      return c.location ?? profile.preferredLocations[0];
    case 'linkedin':
      return c.linkedinUrl;
    case 'github':
      return c.githubUrl;
    case 'portfolio':
      return c.portfolioUrl;
    case 'years-experience':
      return profile.yearsOfExperience?.toString();
    case 'salary':
      return profile.salaryExpectation?.min?.toString();
    case 'work-authorization':
      return workAuthText(profile);
    default:
      return undefined;
  }
}

function workAuthText(profile: ResumeProfile): string | undefined {
  switch (profile.workAuthorization) {
    case 'citizen':
    case 'permanent-resident':
    case 'work-visa':
      return 'Yes';
    case 'requires-sponsorship':
      return 'No';
    default:
      return undefined;
  }
}
