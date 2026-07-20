import type { AiSettings, JobDetails, ResumeProfile } from '../types';
import { chat } from './client';

const TONE_HINT: Record<string, string> = {
  professional: 'formal, concise, and confident',
  conversational: 'warm, natural, and personable',
  enthusiastic: 'energetic and genuinely excited, without being over the top',
};

const SYSTEM = `You write tailored cover letters for job applications. Keep them
to 150–220 words, 3 short paragraphs. Ground every claim in the candidate's
actual experience — never fabricate employers, titles, or metrics. No greeting
placeholders like "[Hiring Manager]"; open directly. No sign-off block.`;

export async function generateCoverLetter(
  ai: AiSettings,
  job: JobDetails,
  profile: ResumeProfile,
): Promise<string> {
  const tone = TONE_HINT[ai.coverLetterTone] ?? TONE_HINT.professional;
  const user = `Write a ${tone} cover letter.

ROLE: ${job.title} at ${job.company}
JOB DESCRIPTION:
${job.description.slice(0, 5000)}

CANDIDATE:
Name: ${profile.contact.fullName}
Summary: ${profile.summary ?? '—'}
Key skills: ${profile.skills.slice(0, 15).join(', ')}
Recent roles: ${profile.workExperience
    .slice(0, 3)
    .map((w) => `${w.title} at ${w.company}`)
    .join('; ')}`;

  return chat(ai, { system: SYSTEM, user, maxTokens: 600, temperature: 0.6 });
}
