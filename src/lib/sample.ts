import { newId } from './id';
import type { Scenario } from './types';

/** Przykład kontrolny z PRD (budżet 120 000 PLN). */
export function sampleScenario(): Scenario {
  return {
    id: null,
    name: 'Przykładowy plan 2027',
    description: 'Scenariusz startowy — możesz go wyczyścić jednym kliknięciem.',
    annualBudget: '120000',
    currency: 'PLN',
    updatedAt: null,
    categories: [
      { id: newId(), name: 'Facebook', budgetPct: '40', expectedRoiPct: '150' },
      { id: newId(), name: 'Instagram', budgetPct: '30', expectedRoiPct: '200' },
      { id: newId(), name: 'TikTok', budgetPct: '20', expectedRoiPct: '80' },
      { id: newId(), name: 'LinkedIn', budgetPct: '10', expectedRoiPct: '50' },
    ],
  };
}

export function emptyScenario(): Scenario {
  return {
    id: null,
    name: '',
    description: '',
    annualBudget: '',
    currency: 'PLN',
    updatedAt: null,
    categories: [{ id: newId(), name: 'Facebook', budgetPct: '0', expectedRoiPct: '0' }],
  };
}
