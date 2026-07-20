import { useEffect, useState, type ReactNode } from 'react';
import { useSettings } from '@/lib/hooks';
import { saveSettings } from '@/lib/storage';
import { DEFAULT_MODELS } from '@/lib/constants';
import type { AiProvider, CoverLetterTone, Settings } from '@/lib/types';
import { TagInput } from '../components/TagInput';

export function SettingsPage() {
  const settings = useSettings();
  const [draft, setDraft] = useState<Settings>();
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings && !draft) setDraft(settings);
  }, [settings, draft]);

  if (!draft) return <p className="p-4 text-sm text-slate-400">Loading…</p>;

  const patch = (p: Partial<Settings>) => setDraft({ ...draft, ...p });
  const save = async () => {
    await saveSettings(draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="space-y-5 pb-8">
      <Section title="Matching">
        <Field label={`Minimum match to apply: ${draft.matchThreshold}%`}>
          <input
            type="range" min={0} max={100} value={draft.matchThreshold}
            onChange={(e) => patch({ matchThreshold: Number(e.target.value) })}
            className="w-full"
          />
        </Field>
        <Field label="Blacklisted companies">
          <TagInput values={draft.blacklistCompanies} onChange={(v) => patch({ blacklistCompanies: v })} placeholder="Company name…" />
        </Field>
        <Field label="Blacklisted keywords">
          <TagInput values={draft.blacklistKeywords} onChange={(v) => patch({ blacklistKeywords: v })} placeholder="e.g. commission-only" />
        </Field>
      </Section>

      <Section title="Pace & rate limiting">
        <Field label={`Applications per hour: ${draft.rateLimit.applicationsPerHour}`}>
          <input
            type="range" min={1} max={30} value={draft.rateLimit.applicationsPerHour}
            onChange={(e) => patch({ rateLimit: { ...draft.rateLimit, applicationsPerHour: Number(e.target.value) } })}
            className="w-full"
          />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Min delay (ms)">
            <input type="number" className="input" value={draft.rateLimit.minActionDelayMs}
              onChange={(e) => patch({ rateLimit: { ...draft.rateLimit, minActionDelayMs: Number(e.target.value) } })} />
          </Field>
          <Field label="Max delay (ms)">
            <input type="number" className="input" value={draft.rateLimit.maxActionDelayMs}
              onChange={(e) => patch({ rateLimit: { ...draft.rateLimit, maxActionDelayMs: Number(e.target.value) } })} />
          </Field>
        </div>
      </Section>

      <Section title="Schedule">
        <Toggle
          checked={draft.schedule.enabled}
          onChange={(enabled) => patch({ schedule: { ...draft.schedule, enabled } })}
          label="Run a daily apply session"
        />
        {draft.schedule.enabled && (
          <div className="grid grid-cols-2 gap-2">
            <Field label="Start time">
              <input type="time" className="input" value={draft.schedule.startTime}
                onChange={(e) => patch({ schedule: { ...draft.schedule, startTime: e.target.value } })} />
            </Field>
            <Field label="Daily target">
              <input type="number" className="input" value={draft.schedule.dailyTarget}
                onChange={(e) => patch({ schedule: { ...draft.schedule, dailyTarget: Number(e.target.value) } })} />
            </Field>
          </div>
        )}
      </Section>

      <Section title="Notifications">
        <Toggle checked={draft.notifications.onHighMatch} onChange={(v) => patch({ notifications: { ...draft.notifications, onHighMatch: v } })} label="High-match job found" />
        <Field label={`High-match threshold: ${draft.notifications.highMatchThreshold}%`}>
          <input type="range" min={50} max={100} value={draft.notifications.highMatchThreshold}
            onChange={(e) => patch({ notifications: { ...draft.notifications, highMatchThreshold: Number(e.target.value) } })}
            className="w-full" />
        </Field>
        <Toggle checked={draft.notifications.onApplied} onChange={(v) => patch({ notifications: { ...draft.notifications, onApplied: v } })} label="Application submitted" />
        <Toggle checked={draft.notifications.onError} onChange={(v) => patch({ notifications: { ...draft.notifications, onError: v } })} label="Errors & CAPTCHAs" />
      </Section>

      <Section title="AI provider">
        <div className="grid grid-cols-2 gap-2">
          <Field label="Provider">
            <select className="input" value={draft.ai.provider}
              onChange={(e) => {
                const provider = e.target.value as AiProvider;
                patch({ ai: { ...draft.ai, provider, model: DEFAULT_MODELS[provider] } });
              }}>
              <option value="anthropic">Anthropic (Claude)</option>
              <option value="openai">OpenAI</option>
            </select>
          </Field>
          <Field label="Model">
            <input className="input" value={draft.ai.model}
              onChange={(e) => patch({ ai: { ...draft.ai, model: e.target.value } })} />
          </Field>
        </div>
        <Field label="API key (stored locally only)">
          <input type="password" className="input" value={draft.ai.apiKey} placeholder="sk-…"
            onChange={(e) => patch({ ai: { ...draft.ai, apiKey: e.target.value } })} />
        </Field>
        <Field label="Cover letter tone">
          <select className="input" value={draft.ai.coverLetterTone}
            onChange={(e) => patch({ ai: { ...draft.ai, coverLetterTone: e.target.value as CoverLetterTone } })}>
            <option value="professional">Professional</option>
            <option value="conversational">Conversational</option>
            <option value="enthusiastic">Enthusiastic</option>
          </select>
        </Field>
      </Section>

      <Section title="Compliance">
        <Toggle
          checked={draft.acknowledgedTosRisk}
          onChange={(v) => patch({ acknowledgedTosRisk: v })}
          label="I understand automated applying may violate some portals' ToS."
        />
      </Section>

      <button className="btn-primary sticky bottom-0 w-full" onClick={save}>
        {saved ? '✓ Saved' : 'Save settings'}
      </button>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</h2>
      {children}
    </section>
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

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}
