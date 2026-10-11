import { Decimal, decimalPlaces, parseDecimal } from './decimal';
import type { Scenario } from './types';

export const LIMITS = {
  minCategories: 1,
  maxCategories: 15,
  categoryNameMax: 40,
  scenarioNameMax: 60,
  roiMin: -100,
  roiMax: 1000,
} as const;

export function validateBudget(raw: string): string | null {
  const d = parseDecimal(raw);
  if (raw.trim() === '') return 'Podaj roczny budżet.';
  if (!d) return 'Budżet musi być liczbą.';
  if (d.lte(0)) return 'Budżet musi być większy od zera.';
  if (decimalPlaces(raw) > 2) return 'Maksymalnie 2 miejsca po przecinku.';
  if (d.gte(new Decimal('1e12'))) return 'Budżet jest zbyt duży.';
  return null;
}

export function validateBudgetPct(raw: string): string | null {
  const d = parseDecimal(raw);
  if (raw.trim() === '') return 'Podaj % budżetu.';
  if (!d) return 'Wpisz liczbę.';
  if (d.lt(0) || d.gt(100)) return 'Zakres 0–100.';
  if (decimalPlaces(raw) > 1) return 'Krok 0,1.';
  return null;
}

export function validateRoiPct(raw: string): string | null {
  const d = parseDecimal(raw);
  if (raw.trim() === '') return 'Podaj % ROI.';
  if (!d) return 'Wpisz liczbę.';
  if (d.lt(LIMITS.roiMin) || d.gt(LIMITS.roiMax)) return 'Zakres −100–1000.';
  if (decimalPlaces(raw) > 1) return 'Krok 0,1.';
  return null;
}

export function validateCategoryName(name: string, otherNames: string[]): string | null {
  const trimmed = name.trim();
  if (trimmed.length === 0) return 'Nazwa jest wymagana.';
  if (trimmed.length > LIMITS.categoryNameMax) return `Maksymalnie ${LIMITS.categoryNameMax} znaków.`;
  const key = trimmed.toLocaleLowerCase('pl');
  if (otherNames.some((n) => n.trim().toLocaleLowerCase('pl') === key)) return 'Ta kategoria już istnieje.';
  return null;
}

export function validateScenarioName(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed.length === 0) return 'Nazwa scenariusza jest wymagana.';
  if (trimmed.length > LIMITS.scenarioNameMax) return `Maksymalnie ${LIMITS.scenarioNameMax} znaków.`;
  return null;
}

export interface ScenarioValidation {
  /** Błędy blokujące zapis. */
  errors: string[];
  warnings: string[];
  fieldErrors: {
    budget: string | null;
    name: string | null;
    categories: Record<string, { name: string | null; budgetPct: string | null; roi: string | null }>;
  };
  overAllocatedBy: Decimal | null;
}

export function validateScenario(s: Scenario): ScenarioValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const budget = validateBudget(s.annualBudget);
  const name = validateScenarioName(s.name);
  if (budget) errors.push(`Budżet: ${budget}`);
  if (name) errors.push(name);

  if (s.categories.length < LIMITS.minCategories) errors.push('Dodaj co najmniej jedną kategorię.');
  if (s.categories.length > LIMITS.maxCategories) errors.push(`Maksymalnie ${LIMITS.maxCategories} kategorii.`);

  const categories: ScenarioValidation['fieldErrors']['categories'] = {};
  let total = new Decimal(0);
  s.categories.forEach((c, i) => {
    const others = s.categories.filter((_, j) => j !== i).map((o) => o.name);
    const e = {
      name: validateCategoryName(c.name, others),
      budgetPct: validateBudgetPct(c.budgetPct),
      roi: validateRoiPct(c.expectedRoiPct),
    };
    categories[c.id] = e;
    if (e.name || e.budgetPct || e.roi) {
      errors.push(`Kategoria „${c.name.trim() || `#${i + 1}`}”: ${[e.name, e.budgetPct, e.roi].filter(Boolean).join(' ')}`);
    }
    total = total.plus(parseDecimal(c.budgetPct) ?? 0);
  });

  let overAllocatedBy: Decimal | null = null;
  if (total.gt(100)) {
    overAllocatedBy = total.minus(100);
    errors.push(`Suma % budżetu przekracza 100% o ${overAllocatedBy.toFixed(1).replace('.', ',')} pp.`);
  } else if (total.lt(100) && s.categories.length > 0) {
    warnings.push(`Nie rozdysponowano ${new Decimal(100).minus(total).toFixed(1).replace('.', ',')}% budżetu.`);
  }

  return { errors, warnings, fieldErrors: { budget, name, categories }, overAllocatedBy };
}
