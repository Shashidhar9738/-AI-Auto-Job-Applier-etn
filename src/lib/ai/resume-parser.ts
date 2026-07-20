import type { AiSettings, ResumeProfile } from '../types';
import { uid } from '../utils';
import { chat, parseJson } from './client';

/**
 * Parse raw resume text into a structured profile using the LLM.
 *
 * Text extraction from PDF/DOCX happens before this (see `extractResumeText`)
 * so the model receives plain text. The result is a best-effort draft the user
 * reviews and edits in the onboarding wizard.
 */

interface ParsedResume {
  contact: {
    fullName: string;
    email: string;
    phone: string;
    location?: string;
    linkedinUrl?: string;
    portfolioUrl?: string;
    githubUrl?: string;
  };
  summary?: string;
  workExperience: Array<{
    company: string;
    title: string;
    location?: string;
    startDate?: string;
    endDate?: string;
    current?: boolean;
    description?: string;
  }>;
  education: Array<{
    institution: string;
    degree?: string;
    field?: string;
    startDate?: string;
    endDate?: string;
    grade?: string;
  }>;
  certifications: Array<{ name: string; issuer?: string; issueDate?: string }>;
  skills: string[];
  desiredTitles: string[];
  yearsOfExperience?: number;
}

const SYSTEM = `You are a precise resume parser. Extract structured data from the
resume text. Do not invent facts — leave a field empty/omitted if not present.
Dates should be "YYYY-MM" when a month is known, else "YYYY". Infer
yearsOfExperience from the work history.`;

export async function parseResumeText(
  ai: AiSettings,
  resumeText: string,
  label = 'My Resume',
): Promise<ResumeProfile> {
  const raw = await chat(ai, {
    system: SYSTEM,
    user: `Resume text:\n\n"""\n${resumeText.slice(0, 20000)}\n"""`,
    json: true,
    maxTokens: 2048,
    temperature: 0.1,
  });
  const p = parseJson<ParsedResume>(raw);
  const now = Date.now();

  return {
    id: uid('prof_'),
    label,
    isDefault: true,
    contact: {
      fullName: p.contact?.fullName ?? '',
      email: p.contact?.email ?? '',
      phone: p.contact?.phone ?? '',
      location: p.contact?.location,
      linkedinUrl: p.contact?.linkedinUrl,
      portfolioUrl: p.contact?.portfolioUrl,
      githubUrl: p.contact?.githubUrl,
    },
    summary: p.summary,
    workExperience: (p.workExperience ?? []).map((w) => ({
      id: uid('exp_'),
      company: w.company ?? '',
      title: w.title ?? '',
      location: w.location,
      startDate: w.startDate,
      endDate: w.endDate,
      current: Boolean(w.current),
      description: w.description,
    })),
    education: (p.education ?? []).map((e) => ({
      id: uid('edu_'),
      institution: e.institution ?? '',
      degree: e.degree,
      field: e.field,
      startDate: e.startDate,
      endDate: e.endDate,
      grade: e.grade,
    })),
    certifications: (p.certifications ?? []).map((c) => ({
      id: uid('cert_'),
      name: c.name ?? '',
      issuer: c.issuer,
      issueDate: c.issueDate,
    })),
    skills: p.skills ?? [],
    desiredTitles: p.desiredTitles ?? [],
    preferredLocations: p.contact?.location ? [p.contact.location] : [],
    yearsOfExperience: p.yearsOfExperience,
    createdAt: now,
    updatedAt: now,
  };
}
