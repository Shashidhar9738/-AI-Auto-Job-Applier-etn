import { useMemo, useState } from 'react';
import { useApplications, useProfiles, useSession, useSettings } from '@/lib/hooks';
import { saveSettings, upsertProfile } from '@/lib/storage';
import { sendToBackground } from '@/lib/messaging';
import type { ApplyMode } from '@/lib/types';

const MODE_LABELS: Record<ApplyMode, string> = {
  'full-auto': 'Full Auto',
  'semi-auto': 'Semi-Auto',
  'manual-queue': 'Manual Queue',
};

export function Popup() {
  const settings = useSettings();
  const profiles = useProfiles();
  const session = useSession();
  const apps = useApplications();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string>();

  const stats = useMemo(() => {
    const applied = apps.filter((a) => ['applied', 'viewed', 'interview', 'offer'].includes(a.status));
    const today = applied.filter(
      (a) => a.appliedAt && Date.now() - a.appliedAt < 86_400_000,
    );
    return { total: applied.length, today: today.length, queued: apps.filter((a) => a.status === 'queued').length };
  }, [apps]);

  const activeProfile = profiles.find((p) => p.isDefault) ?? profiles[0];

  if (!settings) return <div className="p-4 text-sm">Loading…</div>;

  if (!settings.onboardingComplete || profiles.length === 0) {
    return (
      <div className="p-5 text-center">
        <h1 className="text-base font-semibold">AI Auto Job Applier</h1>
        <p className="mt-2 text-sm text-slate-500">Finish setup to get started.</p>
        <button
          className="btn-primary mt-4 w-full"
          onClick={() => chrome.tabs.create({ url: chrome.runtime.getURL('onboarding.html') })}
        >
          Open setup
        </button>
      </div>
    );
  }

  const applyCurrentTab = async () => {
    setBusy(true);
    setMsg(undefined);
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) throw new Error('No active tab.');
      const res = await sendToBackground({ type: 'apply/from-current-tab', tabId: tab.id });
      setMsg(res.ok ? '✓ Done — see the dashboard.' : `⚠ ${res.error}`);
    } catch (e) {
      setMsg(`⚠ ${String(e instanceof Error ? e.message : e)}`);
    } finally {
      setBusy(false);
    }
  };

  const setMode = (mode: ApplyMode) => saveSettings({ applyMode: mode });

  const toggleSession = async () => {
    if (session?.state === 'running') await sendToBackground({ type: 'session/pause' });
    else await sendToBackground({ type: 'session/start', profileId: activeProfile!.id });
  };

  const running = session?.state === 'running';

  return (
    <div className="flex flex-col gap-3 p-4">
      <header className="flex items-center justify-between">
        <h1 className="text-sm font-semibold">AI Auto Job Applier</h1>
        <button className="btn-ghost px-2 py-1 text-xs" onClick={openPanel}>
          Dashboard ↗
        </button>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Applied" value={stats.total} />
        <Stat label="Today" value={stats.today} />
        <Stat label="Queued" value={stats.queued} />
      </div>

      {/* Profile switcher */}
      <div>
        <label className="label">Active resume</label>
        <select
          className="input"
          value={activeProfile?.id}
          onChange={(e) => {
            const p = profiles.find((x) => x.id === e.target.value);
            if (p) upsertProfile({ ...p, isDefault: true });
          }}
        >
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      {/* Apply mode */}
      <div>
        <label className="label">Apply mode</label>
        <div className="grid grid-cols-3 gap-1">
          {(Object.keys(MODE_LABELS) as ApplyMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setMode(mode)}
              className={`rounded-lg px-2 py-1.5 text-xs font-medium transition-colors ${
                settings.applyMode === mode
                  ? 'bg-brand-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {MODE_LABELS[mode]}
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <button className="btn-primary w-full" onClick={applyCurrentTab} disabled={busy}>
        {busy ? 'Working…' : 'Apply to current tab'}
      </button>
      <button className="btn-ghost w-full" onClick={toggleSession}>
        {running ? '⏸ Pause session' : '▶ Start session'}
      </button>

      {msg && <p className="text-xs text-slate-500">{msg}</p>}

      {!settings.acknowledgedTosRisk && (
        <p className="rounded-lg bg-amber-50 p-2 text-[11px] text-amber-700 dark:bg-amber-950 dark:text-amber-300">
          Automated applying may violate some portals' terms of service. Use responsibly.
        </p>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-slate-100 p-2 text-center dark:bg-slate-800">
      <div className="text-lg font-semibold">{value}</div>
      <div className="text-[11px] text-slate-500">{label}</div>
    </div>
  );
}

function openPanel() {
  chrome.windows.getCurrent().then((w) => {
    if (w.id != null) chrome.sidePanel.open({ windowId: w.id });
  });
}
