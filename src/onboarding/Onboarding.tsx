import { useState, type ReactNode } from 'react';
import { saveSettings, upsertProfile } from '@/lib/storage';
import { sendToBackground } from '@/lib/messaging';
import { extractResumeText } from '@/lib/resume-text';
import { toDataUrl } from '@/lib/utils';
import { DEFAULT_MODELS } from '@/lib/constants';
import { testAiConnection } from '@/lib/ai/test-connection';
import { ModelPicker } from '@/components/ModelPicker';
import { CustomPresets } from '@/components/CustomPresets';
import type { AiProvider, AiSettings, ResumeProfile } from '@/lib/types';

type Step = 0 | 1 | 2 | 3 | 4;

export function Onboarding() {
  const [step, setStep] = useState<Step>(0);
  const [provider, setProvider] = useState<AiProvider>('anthropic');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [tosOk, setTosOk] = useState(false);
  const [profile, setProfile] = useState<ResumeProfile>();
  const [status, setStatus] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [aiError, setAiError] = useState<string>();

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string }>();

  const onProvider = (p: AiProvider) => {
    setProvider(p);
    setModel(DEFAULT_MODELS[p]); // prefill sensible default
    setTestResult(undefined);
  };

  const currentAi = (): AiSettings => ({
    provider,
    apiKey,
    model: model || DEFAULT_MODELS[provider],
    baseUrl: provider === 'custom' ? baseUrl.trim() : '',
    coverLetterTone: 'professional',
  });

  const runTest = async () => {
    setTesting(true);
    setTestResult(undefined);
    setTestResult(await testAiConnection(currentAi()));
    setTesting(false);
  };

  const saveAi = async () => {
    setAiError(undefined);
    // Custom endpoint needs host permission for background fetch — request it
    // here (before any await) so the click's user gesture stays valid.
    if (provider === 'custom') {
      if (!baseUrl.trim()) return setAiError('Enter the Base URL for your provider.');
      try {
        const origin = new URL(baseUrl).origin + '/*';
        const granted = await chrome.permissions.request({ origins: [origin] });
        if (!granted) return setAiError('Permission denied for that endpoint.');
      } catch {
        return setAiError('Invalid Base URL.');
      }
    }
    await saveSettings({
      ai: {
        provider,
        apiKey,
        model: model || DEFAULT_MODELS[provider],
        baseUrl: provider === 'custom' ? baseUrl.trim() : '',
        coverLetterTone: 'professional',
      },
      acknowledgedTosRisk: tosOk,
    });
    setStep(2);
  };

  const onFile = async (file: File) => {
    setBusy(true);
    setStatus('Extracting text…');
    try {
      const text = await extractResumeText(file);
      if (text.trim().length < 30) throw new Error('Could not read enough text from that file.');
      setStatus('Parsing with AI…');
      const res = await sendToBackground({
        type: 'ai/parse-resume',
        resumeText: text,
        label: file.name.replace(/\.[^.]+$/, ''),
      });
      if (!res.ok) throw new Error(res.error);
      const parsed = res.data as ResumeProfile;

      // Attach the original file for re-upload to portals.
      const dataUrl = await toDataUrl(file);
      parsed.resumeFile = { name: file.name, mimeType: file.type, dataUrl, size: file.size };
      await upsertProfile(parsed);

      setProfile(parsed);
      setStatus(undefined);
      setStep(3);
    } catch (e) {
      setStatus(`⚠ ${String(e instanceof Error ? e.message : e)}`);
    } finally {
      setBusy(false);
    }
  };

  const finish = async () => {
    if (profile) await upsertProfile(profile);
    await saveSettings({ onboardingComplete: true });
    setStep(4);
  };

  return (
    <div className="app-bg flex min-h-screen flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center gap-3">
          <div className="logo-mark h-11 w-11 text-lg font-bold">A</div>
          <div>
            <div className="text-base font-bold leading-tight">AI Auto Job Applier</div>
            <div className="text-xs text-slate-500">Apply smarter, not harder</div>
          </div>
        </div>
        <Progress step={step} />

      {step === 0 && (
        <Panel title="Welcome 👋" subtitle="Let's set up your AI job applier in a few steps.">
          <ul className="mb-4 space-y-1.5 text-sm text-slate-600 dark:text-slate-300">
            <li>• Parses your resume into a reusable profile</li>
            <li>• Scores and applies to matching jobs</li>
            <li>• Tracks every application in one dashboard</li>
          </ul>
          <label className="mb-4 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-300">
            <input type="checkbox" className="mt-0.5" checked={tosOk} onChange={(e) => setTosOk(e.target.checked)} />
            I understand that automatically applying to jobs may violate some portals' terms of
            service, and I accept responsibility for how I use this tool.
          </label>
          <button className="btn-primary w-full" disabled={!tosOk} onClick={() => setStep(1)}>
            Get started
          </button>
        </Panel>
      )}

      {step === 1 && (
        <Panel title="Connect an AI provider" subtitle="Used for resume parsing, matching, and cover letters. Your key stays on this device.">
          <label className="label">Provider</label>
          <select className="input mb-3" value={provider} onChange={(e) => onProvider(e.target.value as AiProvider)}>
            <option value="anthropic">Anthropic (Claude)</option>
            <option value="openai">OpenAI</option>
            <option value="openrouter">OpenRouter</option>
            <option value="custom">Custom (OpenAI-compatible — DeepSeek, Groq, etc.)</option>
          </select>
          {provider === 'custom' && (
            <>
              <label className="label">Quick presets</label>
              <div className="mb-3">
                <CustomPresets onPick={(b, m) => { setBaseUrl(b); setModel(m); }} />
              </div>
              <label className="label">Base URL</label>
              <input className="input mb-3" value={baseUrl} placeholder="https://api.deepseek.com" onChange={(e) => setBaseUrl(e.target.value)} />
            </>
          )}
          <label className="label">Model</label>
          <div className="mb-3">
            <ModelPicker provider={provider} value={model} onChange={setModel} />
          </div>
          <label className="label">API key</label>
          <input className="input mb-2" type="password" value={apiKey} placeholder="sk-…" onChange={(e) => setApiKey(e.target.value)} />
          {aiError && <p className="mb-2 text-xs text-red-500">{aiError}</p>}
          <button className="btn-ghost mb-2 w-full" disabled={testing || !apiKey} onClick={runTest}>
            {testing ? 'Testing…' : 'Test connection'}
          </button>
          {testResult && (
            <p className={`mb-2 text-xs ${testResult.ok ? 'text-green-600' : 'text-red-500'}`}>
              {testResult.message}
            </p>
          )}
          <div className="mt-2 flex gap-2">
            <button className="btn-ghost" onClick={() => setStep(0)}>Back</button>
            <button className="btn-primary flex-1" disabled={!apiKey} onClick={saveAi}>Continue</button>
          </div>
        </Panel>
      )}

      {step === 2 && (
        <Panel title="Upload your resume" subtitle="PDF or DOCX. We'll parse it into an editable profile.">
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 hover:border-brand-400 dark:border-slate-700">
            <span className="text-2xl">📄</span>
            {busy ? status : 'Click to choose a file'}
            <input
              type="file" accept=".pdf,.docx,.txt" className="hidden" disabled={busy}
              onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
            />
          </label>
          {status && !busy && <p className="mt-3 text-xs text-red-500">{status}</p>}
          <button className="btn-ghost mt-4" onClick={() => setStep(1)}>Back</button>
        </Panel>
      )}

      {step === 3 && profile && (
        <Panel title="Review your profile" subtitle="Quick check — you can edit everything later in the dashboard.">
          <div className="space-y-2 text-sm">
            <Row label="Name" value={profile.contact.fullName} />
            <Row label="Email" value={profile.contact.email} />
            <Row label="Phone" value={profile.contact.phone} />
            <Row label="Experience" value={profile.yearsOfExperience ? `${profile.yearsOfExperience} yrs` : '—'} />
            <div>
              <div className="label">Skills ({profile.skills.length})</div>
              <div className="flex flex-wrap gap-1">
                {profile.skills.slice(0, 12).map((s) => <span key={s} className="chip">{s}</span>)}
              </div>
            </div>
          </div>
          <button className="btn-primary mt-5 w-full" onClick={finish}>Looks good — finish</button>
        </Panel>
      )}

      {step === 4 && (
        <Panel title="You're all set 🎉" subtitle="Open a job posting on a supported portal, then click the extension icon.">
          <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
            <p>Supported: LinkedIn, Indeed, Naukri, Glassdoor, Monster, Internshala, Wellfound, ZipRecruiter, Dice, SimplyHired — plus Greenhouse, Lever, Workday & Ashby career pages.</p>
            <p>Tip: start in <b>Semi-Auto</b> mode so you can review before each submit.</p>
          </div>
          <button className="btn-primary mt-5 w-full" onClick={() => window.close()}>Close</button>
        </Panel>
      )}
      </div>
    </div>
  );
}

function Progress({ step }: { step: number }) {
  return (
    <div className="mb-5 flex gap-1.5">
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className={`h-1.5 flex-1 rounded-full transition-colors ${
            i <= step ? 'bg-brand-600' : 'bg-slate-200 dark:bg-slate-800'
          }`}
        />
      ))}
    </div>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="card p-6 shadow-xl">
      <h1 className="text-xl font-bold tracking-tight">{title}</h1>
      <p className="mb-5 mt-1 text-sm text-slate-500">{subtitle}</p>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-slate-100 pb-1.5 dark:border-slate-800">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium">{value || '—'}</span>
    </div>
  );
}
