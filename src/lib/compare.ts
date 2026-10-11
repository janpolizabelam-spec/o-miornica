import { computeScenario, type CategoryResult, type ScenarioResult } from './calc';
import { Decimal } from './decimal';
import type { Scenario } from './types';

export type Presence = 'both' | 'onlyA' | 'onlyB';

export interface CategoryDiff {
  key: string;
  name: string;
  presence: Presence;
  a: CategoryResult | null;
  b: CategoryResult | null;
  /** B − A; brak kategorii w wariancie traktujemy jako 0. */
  costDiff: Decimal;
  budgetPctDiff: Decimal;
  roiPctDiff: Decimal | null;
  returnDiff: Decimal;
}

export interface Comparison {
  a: ScenarioResult;
  b: ScenarioResult;
  rows: CategoryDiff[];
  higherReturn: 'A' | 'B' | 'tie';
  higherRoi: 'A' | 'B' | 'tie' | null;
}

const ZERO = new Decimal(0);
const keyOf = (name: string) => name.trim().toLocaleLowerCase('pl');

function winner(a: Decimal, b: Decimal): 'A' | 'B' | 'tie' {
  const ra = a.toDecimalPlaces(2);
  const rb = b.toDecimalPlaces(2);
  return ra.eq(rb) ? 'tie' : ra.gt(rb) ? 'A' : 'B';
}

/** Kategorie dopasowujemy po nazwie (bez rozróżniania wielkości liter). */
export function compareScenarios(sa: Scenario, sb: Scenario): Comparison {
  const a = computeScenario(sa);
  const b = computeScenario(sb);
  const mapA = new Map(a.categories.map((c) => [keyOf(c.name), c]));
  const mapB = new Map(b.categories.map((c) => [keyOf(c.name), c]));

  const keys: string[] = [];
  for (const c of [...a.categories, ...b.categories]) {
    const k = keyOf(c.name);
    if (!keys.includes(k)) keys.push(k);
  }

  const rows: CategoryDiff[] = keys.map((key) => {
    const ca = mapA.get(key) ?? null;
    const cb = mapB.get(key) ?? null;
    return {
      key,
      name: (ca ?? cb)!.name,
      presence: ca && cb ? 'both' : ca ? 'onlyA' : 'onlyB',
      a: ca,
      b: cb,
      costDiff: (cb?.cost ?? ZERO).minus(ca?.cost ?? ZERO),
      budgetPctDiff: (cb?.budgetPct ?? ZERO).minus(ca?.budgetPct ?? ZERO),
      roiPctDiff: ca && cb ? cb.roiPct.minus(ca.roiPct) : null,
      returnDiff: (cb?.returnAmount ?? ZERO).minus(ca?.returnAmount ?? ZERO),
    };
  });

  return {
    a,
    b,
    rows,
    higherReturn: winner(a.totalReturn, b.totalReturn),
    higherRoi: a.weightedRoiPct && b.weightedRoiPct ? winner(a.weightedRoiPct, b.weightedRoiPct) : null,
  };
}
