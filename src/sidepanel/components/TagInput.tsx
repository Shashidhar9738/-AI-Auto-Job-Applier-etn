import { useState, type KeyboardEvent } from 'react';

interface Props {
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}

/** A simple chip/token input: type + Enter (or comma) to add, × to remove. */
export function TagInput({ values, onChange, placeholder }: Props) {
  const [text, setText] = useState('');

  const add = () => {
    const v = text.trim().replace(/,$/, '');
    if (v && !values.includes(v)) onChange([...values, v]);
    setText('');
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      add();
    } else if (e.key === 'Backspace' && !text && values.length) {
      onChange(values.slice(0, -1));
    }
  };

  return (
    <div className="flex flex-wrap gap-1.5 rounded-lg border border-slate-300 bg-white p-1.5 focus-within:border-brand-500 dark:border-slate-700 dark:bg-slate-800">
      {values.map((v) => (
        <span key={v} className="chip">
          {v}
          <button
            type="button"
            className="text-slate-400 hover:text-red-500"
            onClick={() => onChange(values.filter((x) => x !== v))}
          >
            ×
          </button>
        </span>
      ))}
      <input
        className="min-w-[90px] flex-1 bg-transparent px-1 text-sm outline-none"
        value={text}
        placeholder={placeholder}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKey}
        onBlur={add}
      />
    </div>
  );
}
