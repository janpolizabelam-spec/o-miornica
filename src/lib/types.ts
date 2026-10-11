export type Currency = 'PLN' | 'EUR' | 'USD';

export const CURRENCIES: Currency[] = ['PLN', 'EUR', 'USD'];

/**
 * Wartości liczbowe trzymamy jako znormalizowane napisy dziesiętne (np. "40.5"),
 * żeby nigdy nie przechodziły przez float. Liczy je wyłącznie `calc.ts` (decimal.js).
 */
export interface Category {
  id: string;
  name: string;
  budgetPct: string;
  expectedRoiPct: string;
}

export interface Scenario {
  id: string | null;
  name: string;
  description: string;
  annualBudget: string;
  currency: Currency;
  updatedAt: string | null;
  categories: Category[];
}

export interface SavedScenario extends Scenario {
  id: string;
  updatedAt: string;
}
