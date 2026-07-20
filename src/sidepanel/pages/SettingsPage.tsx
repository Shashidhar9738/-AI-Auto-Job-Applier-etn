import { useEffect, useState, type ReactNode } from 'react';
import { useSettings } from '@/lib/hooks';
import { getSettings, saveSettings } from '@/lib/storage';
import { DEFAULT_MODELS } from '@/lib/constants';
import type { AiProvider, CoverLetterTone, Settings } from '@/lib/types';
import {
  addCustomPortal,
  removeCustomPortal,
  setCustomPortalEnabled,
} from '@/lib/custom-portals';
import { TagInput } from '../components/TagInput';

export function SettingsPage() {
  const settings = useSettings();
  const [draft, setDraft] = useState<Settings>();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (settings && !draft) setDraft(settings);
  }, [settings, draft]);

  if (!draft) return <p className="p-4 text-sm text-slate-400">Loading…</p>;

  const patch = (p: Partial<Settings>) => setDraft({ ...draft, ...p });
  const save = async () => {
    setError(undefined);
    // A custom endpoint needs host permission to fetch from the service worker.
    // Request it FIRST — before any await — so the click's user gesture is valid.
    if (draft.ai.provider === 'custom' && draft.ai.baseUrl) {
      try {
        const origin = new URL(draft.ai.baseUrl).origin + '/*';
        const granted = await chrome.permissions.request({ origins: [origin] });
        if (!granted) {
          setError('Permission denied for the custom AI endpoint.');
          return;
        }
      } catch {
        setError('Invalid Base URL.');
        return;
      }
    }
    // customPortals are managed live (permission-gated), so never overwrite
    // them from a possibly-stale draft — always persist the freshest list.
    const { customPortals } = await getSettings();
    await saveSettings({ ...draft, customPortals });
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
              <option value="openrouter">OpenRouter</option>
              <option value="custom">Custom (OpenAI-compatible)</option>
            </select>
          </Field>
          <Field label="Model">
            <input className="input" value={draft.ai.model} placeholder={modelHint(draft.ai.provider)}
              onChange={(e) => patch({ ai: { ...draft.ai, model: e.target.value } })} />
          </Field>
        </div>
        {draft.ai.provider === 'custom' && (
          <Field label="Base URL">
            <input className="input" value={draft.ai.baseUrl ?? ''}
              placeholder="e.g. https://api.deepseek.com"
              onChange={(e) => patch({ ai: { ...draft.ai, baseUrl: e.target.value } })} />
          </Field>
        )}
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

      <Section title="Custom portals">
        <p className="text-xs text-slate-500">
          Add any job site not built in. We'll ask permission for that site, then
          auto-fill it with the generic engine.
        </p>
        <CustomPortals />
      </Section>

      <Section title="Compliance">
        <Toggle
          checked={draft.acknowledgedTosRisk}
          onChange={(v) => patch({ acknowledgedTosRisk: v })}
          label="I understand automated applying may violate some portals' ToS."
        />
      </Section>

      {error && <p className="text-xs text-red-500">{error}</p>}
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

function modelHint(provider: string): string {
  switch (provider) {
    case 'anthropic':
      return 'claude-sonnet-5';
    case 'openai':
      return 'gpt-4o';
    case 'openrouter':
      return 'e.g. deepseek/deepseek-chat';
    case 'custom':
      return 'e.g. deepseek-chat';
    default:
      return '';
  }
}

function CustomPortals() {
  const settings = useSettings();
  const portals = settings?.customPortals ?? [];
  const [url, setUrl] = useState('');
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const add = async () => {
    if (!url.trim()) return;
    setBusy(true);
    setError(undefined);
    try {
      // Runs in this click handler so the permission prompt has a user gesture.
      await addCustomPortal(url, label);
      setUrl('');
      setLabel('');
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      {portals.length > 0 && (
        <ul className="space-y-1.5">
          {portals.map((p) => (
            <li key={p.id} className="flex items-center gap-2 rounded-lg bg-slate-100 px-2.5 py-1.5 text-sm dark:bg-slate-800">
              <input
                type="checkbox"
                checked={p.enabled}
                onChange={(e) => setCustomPortalEnabled(p.id, e.target.checked)}
                title={p.enabled ? 'Enabled' : 'Disabled'}
              />
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{p.label}</div>
                <div className="truncate text-[11px] text-slate-500">{p.origin}</div>
              </div>
              <button
                className="text-xs text-slate-400 hover:text-red-500"
                onClick={() => removeCustomPortal(p.id)}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-2">
        <input
          className="input"
          placeholder="Job site URL or domain (e.g. careers.acme.com)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <div className="flex gap-2">
          <input
            className="input flex-1"
            placeholder="Label (optional)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
          <button className="btn-primary" onClick={add} disabled={busy || !url.trim()}>
            {busy ? 'Adding…' : 'Add portal'}
          </button>
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    </div>
  );
}
