import type { PortalId } from '@/lib/types';
import type { JobPortalAdapter } from './adapter';
import { GenericAdapter } from './generic-adapter';
import { IndeedAdapter } from './indeed-adapter';
import { LinkedInAdapter } from './linkedin-adapter';
import { NaukriAdapter } from './naukri-adapter';

/**
 * Ordered list of dedicated adapters. Portals without a bespoke adapter
 * (Glassdoor, Monster, Wellfound, Internshala) fall through to a
 * `GenericAdapter` tagged with the correct portal id so records still attribute
 * to the right site.
 */
const DEDICATED: JobPortalAdapter[] = [
  new LinkedInAdapter(),
  new IndeedAdapter(),
  new NaukriAdapter(),
];

const HOST_TO_PORTAL: Array<[RegExp, PortalId]> = [
  [/glassdoor\./i, 'glassdoor'],
  [/monster\./i, 'monster'],
  [/internshala\./i, 'internshala'],
  [/wellfound\.|angel\.co/i, 'wellfound'],
];

export function getAdapterForUrl(url: string): JobPortalAdapter {
  const dedicated = DEDICATED.find((a) => a.matchUrl(url));
  if (dedicated) return dedicated;

  const mapped = HOST_TO_PORTAL.find(([re]) => re.test(url));
  return new GenericAdapter(mapped ? mapped[1] : 'generic');
}
