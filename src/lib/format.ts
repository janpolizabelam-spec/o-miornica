import type { Decimal } from './decimal';
import type { Currency } from './types';

const LOCALE = 'pl-PL';
const moneyFormatters = new Map<Currency, Intl.NumberFormat>();

function moneyFormatter(currency: Currency) {
  let f = moneyFormatters.get(currency);
  if (!f) {
    f = new Intl.NumberFormat(LOCALE, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      useGrouping: 'always' as unknown as boolean,
    });
    moneyFormatters.set(currency, f);
  }
  return f;
}

const pctFormatter = new Intl.NumberFormat(LOCALE, {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
  useGrouping: 'always' as unknown as boolean,
});

const compactFormatter = new Intl.NumberFormat(LOCALE, { notation: 'compact', maximumFractionDigits: 1 });

/** Zaokrąglenie do 2 miejsc tylko przy wyświetlaniu (PRD: „Zasady zaokrągleń”). */
export function formatMoney(value: Decimal, currency: Currency): string {
  return moneyFormatter(currency).format(value.toDecimalPlaces(2).toNumber());
}

export function formatSignedMoney(value: Decimal, currency: Currency): string {
  const s = formatMoney(value, currency);
  return value.toDecimalPlaces(2).gt(0) ? `+${s}` : s;
}

export function formatPct(value: Decimal | null): string {
  if (value == null) return '—';
  return `${pctFormatter.format(value.toDecimalPlaces(1).toNumber())}%`;
}

export function formatSignedPct(value: Decimal | null, unit = '%'): string {
  if (value == null) return '—';
  const n = value.toDecimalPlaces(1);
  const s = `${pctFormatter.format(n.toNumber())}${unit}`;
  return n.gt(0) ? `+${s}` : s;
}

export function formatCompact(value: number): string {
  return compactFormatter.format(value);
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(LOCALE, { dateStyle: 'medium', timeStyle: 'short' });
}

/** Wyświetlanie wartości wpisanej w polu (kropka → przecinek). */
export function toInputString(raw: string): string {
  return raw.replace('.', ',');
}
