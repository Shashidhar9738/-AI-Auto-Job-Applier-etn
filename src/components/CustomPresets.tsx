import { CUSTOM_PRESETS } from '@/lib/constants';

/**
 * Quick-fill chips for the Custom (OpenAI-compatible) provider. Tapping one
 * sets the base URL + model; the user only needs to paste their API key.
 */
export function CustomPresets({ onPick }: { onPick: (baseUrl: string, model: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {CUSTOM_PRESETS.map((p) => (
        <button
          key={p.label}
          type="button"
          className="chip transition hover:ring-2 hover:ring-brand-300"
          onClick={() => onPick(p.baseUrl, p.model)}
          title={`${p.baseUrl} · ${p.model}`}
        >
          {p.label}
          {p.free && <span className="text-[9px] font-bold text-green-600">FREE</span>}
        </button>
      ))}
    </div>
  );
}
