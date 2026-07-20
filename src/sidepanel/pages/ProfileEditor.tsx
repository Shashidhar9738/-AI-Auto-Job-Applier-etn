import { useEffect, useState, type ReactNode } from 'react';
import { useProfiles } from '@/lib/hooks';
import { deleteProfile, upsertProfile } from '@/lib/storage';
import type { ResumeProfile, WorkAuthorization } from '@/lib/types';
import { TagInput } from '../components/TagInput';

const WORK_AUTH: { value: WorkAuthorization; label: string }[] = [
  { value: 'citizen', label: 'Citizen' },
  { value: 'permanent-resident', label: 'Permanent resident' },
  { value: 'work-visa', label: 'Work visa (no sponsorship needed)' },
  { value: 'requires-sponsorship', label: 'Requires sponsorship' },
  { value: 'other', label: 'Other' },
];

export function ProfileEditor() {
  const profiles = useProfiles();
  const [selectedId, setSelectedId] = useState<string>();
  const active = profiles.find((p) => p.id === selectedId) ?? profiles[0];
  const [draft, setDraft] = useState<ResumeProfile | undefined>(active);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setDraft(active);
  }, [active?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!draft) {
    return <p className="py-10 text-center text-sm text-slate-400">No profile yet. Upload a resume from setup.</p>;
  }

  const patch = (p: Partial<ResumeProfile>) => setDraft({ ...draft, ...p });
  const patchContact = (p: Partial<ResumeProfile['contact']>) =>
    setDraft({ ...draft, contact: { ...draft.contact, ...p } });

  const save = async () => {
    await upsertProfile(draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="space-y-4">
      {profiles.length > 1 && (
        <select
          className="input"
          value={draft.id}
          onChange={(e) => setSelectedId(e.target.value)}
        >
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label} {p.isDefault ? '(default)' : ''}
            </option>
          ))}
        </select>
      )}

      <Field label="Resume label">
        <input className="input" value={draft.label} onChange={(e) => patch({ label: e.target.value })} />
      </Field>

      <div className="grid grid-cols-2 gap-2">
        <Field label="Full name">
          <input className="input" value={draft.contact.fullName} onChange={(e) => patchContact({ fullName: e.target.value })} />
        </Field>
        <Field label="Email">
          <input className="input" value={draft.contact.email} onChange={(e) => patchContact({ email: e.target.value })} />
        </Field>
        <Field label="Phone">
          <input className="input" value={draft.contact.phone} onChange={(e) => patchContact({ phone: e.target.value })} />
        </Field>
        <Field label="Location">
          <input className="input" value={draft.contact.location ?? ''} onChange={(e) => patchContact({ location: e.target.value })} />
        </Field>
        <Field label="LinkedIn URL">
          <input className="input" value={draft.contact.linkedinUrl ?? ''} onChange={(e) => patchContact({ linkedinUrl: e.target.value })} />
        </Field>
        <Field label="Portfolio / GitHub">
          <input className="input" value={draft.contact.portfolioUrl ?? ''} onChange={(e) => patchContact({ portfolioUrl: e.target.value })} />
        </Field>
      </div>

      <Field label="Professional summary">
        <textarea className="input min-h-[70px]" value={draft.summary ?? ''} onChange={(e) => patch({ summary: e.target.value })} />
      </Field>

      <Field label="Skills">
        <TagInput values={draft.skills} onChange={(skills) => patch({ skills })} placeholder="Add a skill…" />
      </Field>
      <Field label="Desired job titles">
        <TagInput values={draft.desiredTitles} onChange={(desiredTitles) => patch({ desiredTitles })} placeholder="e.g. Frontend Engineer" />
      </Field>
      <Field label="Preferred locations">
        <TagInput values={draft.preferredLocations} onChange={(preferredLocations) => patch({ preferredLocations })} placeholder="e.g. Remote, Bangalore" />
      </Field>

      <div className="grid grid-cols-2 gap-2">
        <Field label="Years of experience">
          <input
            type="number"
            className="input"
            value={draft.yearsOfExperience ?? ''}
            onChange={(e) => patch({ yearsOfExperience: Number(e.target.value) || undefined })}
          />
        </Field>
        <Field label="Work authorization">
          <select
            className="input"
            value={draft.workAuthorization ?? ''}
            onChange={(e) => patch({ workAuthorization: e.target.value as WorkAuthorization })}
          >
            <option value="">Select…</option>
            {WORK_AUTH.map((w) => (
              <option key={w.value} value={w.value}>{w.label}</option>
            ))}
          </select>
        </Field>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={draft.isDefault}
          onChange={(e) => patch({ isDefault: e.target.checked })}
        />
        Use as default resume
      </label>

      <div className="flex gap-2 pt-2">
        <button className="btn-primary flex-1" onClick={save}>
          {saved ? '✓ Saved' : 'Save profile'}
        </button>
        {profiles.length > 1 && (
          <button className="btn-danger" onClick={() => deleteProfile(draft.id)}>
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}
