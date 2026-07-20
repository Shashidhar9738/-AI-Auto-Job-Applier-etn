import type { AiSettings, JobDetails, ResumeProfile } from '../types';
import { chat } from './client';

const SYSTEM = `You answer open-ended job-application questions on behalf of a
candidate, in first person. Be specific and grounded in the candidate's real
profile — never invent experience, numbers, or credentials. Keep answers to
2–4 sentences unless the question clearly calls for more. If the question asks
for a number (years of experience, notice period, salary), reply with just the
value when possible.`;

export async function answerQuestion(
  ai: AiSettings,
  question: string,
  job: JobDetails,
  profile: ResumeProfile,
): Promise<string> {
  const user = `QUESTION: ${question}

CONTEXT — applying for ${job.title} at ${job.company}.

CANDIDATE PROFILE:
Name: ${profile.contact.fullName}
Years experience: ${profile.yearsOfExperience ?? '—'}
Skills: ${profile.skills.join(', ')}
Summary: ${profile.summary ?? '—'}
Work authorization: ${profile.workAuthorization ?? 'unspecified'}
Salary expectation: ${
    profile.salaryExpectation
      ? `${profile.salaryExpectation.currency} ${profile.salaryExpectation.min ?? ''}-${profile.salaryExpectation.max ?? ''}/${profile.salaryExpectation.period}`
      : 'flexible'
  }`;

  return chat(ai, { system: SYSTEM, user, maxTokens: 400, temperature: 0.5 });
}
