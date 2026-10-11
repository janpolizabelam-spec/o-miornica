import { Decimal, toDecimal } from './decimal';
import type { Category, Scenario } from './types';

export interface CategoryResult {
  id: string;
  name: string;
  budgetPct: Decimal;
  roiPct: Decimal;
  cost: Decimal;
  returnAmount: Decimal;
  revenue: Decimal;
  /** Udział w całkowitym zwrocie, w %; null gdy całkowity zwrot = 0. */
  shareOfReturnPct: Decimal | null;
}

export interface ScenarioResult {
  budget: Decimal;
  categories: CategoryResult[];
  allocatedPct: Decimal;
  remainingPct: Decimal;
  unallocatedAmount: Decimal;
  totalCost: Decimal;
  totalReturn: Decimal;
  totalRevenue: Decimal;
  /** ROI ważony kwotami; null, gdy całkowity koszt = 0. */
  weightedRoiPct: Decimal | null;
}

const HUNDRED = new Decimal(100);

export function computeCategory(budget: Decimal, c: Category) {
  const budgetPct = toDecimal(c.budgetPct);
  const roiPct = toDecimal(c.expectedRoiPct);
  const cost = budget.mul(budgetPct).div(HUNDRED);
  const returnAmount = cost.mul(roiPct).div(HUNDRED);
  const revenue = cost.plus(returnAmount);
  return { budgetPct, roiPct, cost, returnAmount, revenue };
}

/**
 * Jedyna funkcja licząca wyniki — używana przez edytor, listę i porównanie,
 * żeby wszystkie widoki dawały identyczne liczby (PRD: „Logika obliczeń”).
 */
export function computeScenario(s: Pick<Scenario, 'annualBudget' | 'categories'>): ScenarioResult {
  const budget = Decimal.max(toDecimal(s.annualBudget), 0);
  const partial = s.categories.map((c) => ({ id: c.id, name: c.name, ...computeCategory(budget, c) }));

  const totalCost = partial.reduce((acc, c) => acc.plus(c.cost), new Decimal(0));
  const totalReturn = partial.reduce((acc, c) => acc.plus(c.returnAmount), new Decimal(0));
  const totalRevenue = totalCost.plus(totalReturn);
  const allocatedPct = partial.reduce((acc, c) => acc.plus(c.budgetPct), new Decimal(0));
  const remainingPct = HUNDRED.minus(allocatedPct);

  const categories: CategoryResult[] = partial.map((c) => ({
    ...c,
    shareOfReturnPct: totalReturn.isZero() ? null : c.returnAmount.div(totalReturn).mul(HUNDRED),
  }));

  return {
    budget,
    categories,
    allocatedPct,
    remainingPct,
    unallocatedAmount: Decimal.max(budget.mul(remainingPct).div(HUNDRED), 0),
    totalCost,
    totalReturn,
    totalRevenue,
    weightedRoiPct: totalCost.isZero() ? null : totalReturn.div(totalCost).mul(HUNDRED),
  };
}

/**
 * „Rozłóż resztę równo”: dzieli pozostały % między kategorie z wartością 0,
 * z krokiem 0,1 pp. Reszta z dzielenia trafia do pierwszych kategorii na liście.
 */
export function distributeRemainder(categories: Category[]): Category[] {
  const allocatedTenths = categories.reduce((acc, c) => acc.plus(toDecimal(c.budgetPct).mul(10)), new Decimal(0));
  const remainingTenths = new Decimal(1000).minus(allocatedTenths).floor();
  const zeroIdx = categories
    .map((c, i) => (toDecimal(c.budgetPct).isZero() ? i : -1))
    .filter((i) => i !== -1);
  if (remainingTenths.lte(0) || zeroIdx.length === 0) return categories;

  const n = zeroIdx.length;
  const base = remainingTenths.divToInt(n);
  const extra = remainingTenths.mod(n).toNumber();
  return categories.map((c, i) => {
    const pos = zeroIdx.indexOf(i);
    if (pos === -1) return c;
    const tenths = base.plus(pos < extra ? 1 : 0);
    return { ...c, budgetPct: tenths.div(10).toString() };
  });
}
