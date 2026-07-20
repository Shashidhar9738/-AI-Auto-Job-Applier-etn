import type { PortalId } from '@/lib/types';
import type { JobPortalAdapter } from './adapter';
import { GenericAdapter } from './generic-adapter';
import { LinkedInAdapter } from './linkedin-adapter';
import { IndeedAdapter } from './indeed-adapter';
import { NaukriAdapter } from './naukri-adapter';
import { GlassdoorAdapter } from './glassdoor-adapter';
import { MonsterAdapter } from './monster-adapter';
import { InternshalaAdapter } from './internshala-adapter';
import { WellfoundAdapter } from './wellfound-adapter';
import { ZipRecruiterAdapter } from './ziprecruiter-adapter';
import { DiceAdapter } from './dice-adapter';
import { SimplyHiredAdapter } from './simplyhired-adapter';
import { GreenhouseAdapter } from './greenhouse-adapter';
import { LeverAdapter } from './lever-adapter';
import { WorkdayAdapter } from './workday-adapter';
import { AshbyAdapter } from './ashby-adapter';

/**
 * Ordered list of dedicated adapters, checked by `matchUrl`. The first match
 * wins; anything unmatched falls through to a `GenericAdapter`.
 *
 * ATS adapters (Greenhouse, Lever, Workday, Ashby) matter because a huge share
 * of company career pages embed one of them — a single adapter covers many
 * employers at once.
 */
const DEDICATED: JobPortalAdapter[] = [
  new LinkedInAdapter(),
  new IndeedAdapter(),
  new NaukriAdapter(),
  new GlassdoorAdapter(),
  new MonsterAdapter(),
  new InternshalaAdapter(),
  new WellfoundAdapter(),
  new ZipRecruiterAdapter(),
  new DiceAdapter(),
  new SimplyHiredAdapter(),
  new GreenhouseAdapter(),
  new LeverAdapter(),
  new WorkdayAdapter(),
  new AshbyAdapter(),
];

export function getAdapterForUrl(url: string): JobPortalAdapter {
  const dedicated = DEDICATED.find((a) => a.matchUrl(url));
  return dedicated ?? new GenericAdapter('generic');
}

/** Exposed for docs / settings UI: which portals have dedicated adapters. */
export const SUPPORTED_PORTALS: PortalId[] = DEDICATED.map((a) => a.id);
