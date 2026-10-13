import { useId } from 'react';
import { parseNum } from '../domain/validation';

interface Props {
  label: string;
  value: string;
  onChange: (v: string) => void;
  step: number;
  min?: number;
  max?: number;
  inputMode: 'numeric' | 'decimal';
  hint?: string;
}

export function NumberField({ label, value, onChange, step, min = 0, max = 1000, inputMode, hint }: Props) {
  const id = useId();
  const bump = (dir: 1 | -1) => {
    const n = parseNum(value) ?? 0;
    const next = Math.min(max, Math.max(min, Math.round((n + dir * step) * 100) / 100));
    onChange(String(next));
  };
  return (
    <div className="field">
      <label htmlFor={id} className="field-label">
        {label}
        {hint && <small> · {hint}</small>}
      </label>
      <div className="stepper">
        <button type="button" className="step-btn" onClick={() => bump(-1)} aria-label="Намали">
          −
        </button>
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          inputMode={inputMode}
          autoComplete="off"
        />
        <button type="button" className="step-btn" onClick={() => bump(1)} aria-label="Увеличи">
          +
        </button>
      </div>
    </div>
  );
}
