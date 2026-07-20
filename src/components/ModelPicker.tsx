import { useEffect, useMemo, useRef, useState } from 'react';
import { MODEL_OPTIONS } from '@/lib/constants';
import { fetchModelList } from '@/lib/ai/models';
import type { AiSettings } from '@/lib/types';

const OTHER = '__other__';

interface Props {
  ai: AiSettings;
  onChange: (model: string) => void;
}

/**
 * Model chooser. Shows curated models for the provider merged with the live
 * list fetched from the provider's API (auto-refreshed once a key is present
 * for hosted providers; manual "Update list" for custom endpoints, which need a
 * permission gesture). "Other…" reveals a free-text field for any slug.
 */
export function ModelPicker({ ai, onChange }: Props) {
  const { provider, apiKey, baseUrl } = ai;
  const value = ai.model;
  const curated = MODEL_OPTIONS[provider] ?? [];

  const [fetched, setFetched] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const lastKey = useRef<string>('');

  // Reset the live list when the provider changes.
  useEffect(() => {
    setFetched([]);
    setError(undefined);
    lastKey.current = '';
  }, [provider]);

  const refresh = async () => {
    setLoading(true);
    setError(undefined);
    const res = await fetchModelList(ai);
    if (res.ok) setFetched(res.models.sort(sortFree));
    else setError(res.error);
    setLoading(false);
  };

  // Auto-fetch for hosted providers once a plausible key is present (custom
  // needs a user gesture for the permission prompt, so it's manual-only).
  useEffect(() => {
    if (provider === 'custom') return;
    if (!apiKey || apiKey.length < 20) return;
    const sig = `${provider}:${apiKey}`;
    if (lastKey.current === sig) return;
    const t = setTimeout(async () => {
      lastKey.current = sig;
      const res = await fetchModelList(ai);
      if (res.ok) setFetched(res.models.sort(sortFree)); // silent on auto-fetch errors
    }, 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider, apiKey, baseUrl]);

  const options = useMemo(() => {
    const map = new Map<string, string>();
    curated.forEach((o) => map.set(o.value, o.label));
    fetched.forEach((id) => {
      if (!map.has(id)) map.set(id, id);
    });
    return [...map].map(([v, label]) => ({ value: v, label }));
  }, [curated, fetched]);

  const listed = options.some((o) => o.value === value);

  return (
    <div className="space-y-2">
      {options.length > 0 ? (
        <select
          className="input"
          value={listed ? value : OTHER}
          onChange={(e) => onChange(e.target.value === OTHER ? '' : e.target.value)}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
          <option value={OTHER}>Other… (type a model name)</option>
        </select>
      ) : null}

      {(options.length === 0 || !listed) && (
        <input
          className="input"
          value={value}
          placeholder="Enter exact model slug (e.g. deepseek-chat)"
          onChange={(e) => onChange(e.target.value)}
        />
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          className="text-xs font-medium text-brand-600 hover:underline disabled:opacity-50 dark:text-brand-400"
          onClick={refresh}
          disabled={loading}
        >
          {loading ? 'Updating…' : '↻ Update model list'}
        </button>
        {fetched.length > 0 && (
          <span className="text-[11px] text-slate-400">{fetched.length} live models</span>
        )}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

/** Sort helper: surface `:free` models first, then alphabetical. */
function sortFree(a: string, b: string): number {
  const fa = a.includes(':free') ? 0 : 1;
  const fb = b.includes(':free') ? 0 : 1;
  return fa - fb || a.localeCompare(b);
}
