import { MODEL_OPTIONS } from '@/lib/constants';

const OTHER = '__other__';

interface Props {
  provider: string;
  value: string;
  onChange: (model: string) => void;
}

/**
 * Model chooser: a dropdown of curated models for the provider, plus an
 * "Other…" entry that reveals a free-text field for any custom slug. For the
 * 'custom' provider (arbitrary endpoints) it's always free text.
 */
export function ModelPicker({ provider, value, onChange }: Props) {
  const options = MODEL_OPTIONS[provider] ?? [];

  // No curated list → just a text input.
  if (options.length === 0) {
    return (
      <input
        className="input"
        value={value}
        placeholder="e.g. deepseek-chat"
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  const listed = options.some((o) => o.value === value);

  return (
    <div className="space-y-2">
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
      {!listed && (
        <input
          className="input"
          value={value}
          placeholder="Enter exact model slug (from the provider)"
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}
