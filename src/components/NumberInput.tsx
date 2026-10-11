import { useState, type InputHTMLAttributes } from 'react';
import { parseDecimal } from '../lib/decimal';

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  /** Kanoniczny zapis dziesiętny (kropka, bez spacji). */
  value: string;
  onValueChange: (canonical: string) => void;
  /** Formatowanie wyświetlane, gdy pole nie ma fokusu (np. separator tysięcy). */
  format?: (canonical: string) => string;
}

const toCanonical = (text: string) => text.replace(/[\s ]/g, '').replace(',', '.').replace('−', '-');
const defaultFormat = (v: string) => v.replace('.', ',');

/** Pole liczbowe akceptujące polski format (przecinek, spacje), bez przechodzenia przez float. */
export function NumberInput({ value, onValueChange, format = defaultFormat, onFocus, onBlur, ...rest }: Props) {
  const [editing, setEditing] = useState<string | null>(null);
  const shown = editing ?? (parseDecimal(value) ? format(value) : value);
  return (
    <input
      {...rest}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={shown}
      onFocus={(e) => {
        setEditing(defaultFormat(value));
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setEditing(null);
        onBlur?.(e);
      }}
      onChange={(e) => {
        setEditing(e.target.value);
        onValueChange(toCanonical(e.target.value));
      }}
    />
  );
}

const grouping = new Intl.NumberFormat('pl-PL', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
  useGrouping: 'always' as unknown as boolean,
});

export function formatGrouped(canonical: string): string {
  const d = parseDecimal(canonical);
  if (!d) return canonical;
  const [int, frac] = d.toFixed().split('.');
  const intFmt = grouping.format(BigInt(int.replace('-', '')) as unknown as number);
  return `${d.isNeg() ? '-' : ''}${intFmt}${frac ? `,${frac}` : ''}`;
}
