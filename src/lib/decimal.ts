import Decimal from 'decimal.js';

Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_UP });

export { Decimal };

/** Akceptuje przecinek lub kropkę i spacje jako separator tysięcy. Zwraca null dla niepoprawnych wpisów. */
export function parseDecimal(raw: string | null | undefined): Decimal | null {
  if (raw == null) return null;
  const cleaned = String(raw).replace(/[\s ]/g, '').replace(',', '.');
  if (cleaned === '' || !/^-?\d*\.?\d*$/.test(cleaned) || cleaned === '-' || cleaned === '.' || cleaned === '-.') {
    return null;
  }
  try {
    return new Decimal(cleaned);
  } catch {
    return null;
  }
}

/** Parsuje, a w razie błędu zwraca 0 — do obliczeń „na żywo” przy niekompletnym wpisie. */
export function toDecimal(raw: string | null | undefined): Decimal {
  return parseDecimal(raw) ?? new Decimal(0);
}

export function decimalPlaces(raw: string): number {
  const cleaned = raw.replace(/[\s ]/g, '').replace(',', '.');
  const dot = cleaned.indexOf('.');
  return dot === -1 ? 0 : cleaned.length - dot - 1;
}

/** Normalizuje wpis użytkownika do kanonicznego zapisu (kropka, bez spacji). */
export function normalizeDecimalString(raw: string): string {
  const d = parseDecimal(raw);
  return d ? d.toString() : raw;
}
