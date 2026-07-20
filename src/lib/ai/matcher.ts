import type { AiSettings, JobDetails, MatchResult, ResumeProfile } from '../types';
import { clamp } from '../utils';
import { chat, parseJson } from './client';

/**
 * Score a job against a profile (0–100).
 *
 * A cheap deterministic skill-overlap pre-score runs first so we can skip the
 * LLM call entirely for obviously poor matches (saves tokens and time). If the
 * pre-score is promising, the LLM produces the final nuanced score + reasons.
 */

const SYSTEM = `You are a job-fit evaluator. Given a candidate profile and a job
description, score fit from 0 to 100. Consider title/seniority alignment, skill
overlap, domain relevance, and location/work-mode compatibility. Be realistic —
most jobs are 40–75. Reserve 90+ for strong matches.`;

function profileSkillSet(profile: ResumeProfile): Set<string> {
  return new Set(profile.skills.map((s) => s.toLowerCase().trim()));
}

/** Rough keyword overlap used as a gate before the LLM call. */
export function preScore(job: JobDetails, profile: ResumeProfile): number {
  const skills = profileSkillSet(profile);
  if (skills.size === 0) return 50;
  const desc = `${job.title} ${job.description}`.toLowerCase();
  let hits = 0;
  for (const skill of skills) if (skill && desc.includes(skill)) hits++;
  const titleMatch = profile.desiredTitles.some((t) =>
    job.title.toLowerCase().includes(t.toLowerCase()),
  );
  return clamp(Math.round((hits / skills.size) * 80) + (titleMatch ? 20 : 0), 0, 100);
}

export async function scoreMatch(
  ai: AiSettings,
  job: JobDetails,
  profile: ResumeProfile,
  gate = 25,
): Promise<MatchResult> {
  const pre = preScore(job, profile);
  if (pre < gate) {
    return {
      score: pre,
      reasons: ['Low keyword overlap with your skills and target titles.'],
      missingSkills: [],
      matchedSkills: [],
    };
  }

  const user = `CANDIDATE PROFILE
Titles: ${profile.desiredTitles.join(', ') || '—'}
Years experience: ${profile.yearsOfExperience ?? '—'}
Skills: ${profile.skills.join(', ')}
Summary: ${profile.summary ?? '—'}

JOB
Title: ${job.title}
Company: ${job.company}
Location: ${job.location ?? '—'} (${job.workMode ?? 'unspecified'})
Description:
${job.description.slice(0, 6000)}`;

  const raw = await chat(ai, {
    system: SYSTEM,
    user,
    json: true,
    maxTokens: 700,
    temperature: 0.2,
  });

  const parsed = parseJson<{
    score: number;
    reasons: string[];
    missingSkills: string[];
    matchedSkills: string[];
  }>(raw);

  return {
    score: clamp(Math.round(parsed.score ?? pre), 0, 100),
    reasons: parsed.reasons ?? [],
    missingSkills: parsed.missingSkills ?? [],
    matchedSkills: parsed.matchedSkills ?? [],
  };
}
