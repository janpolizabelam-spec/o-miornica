import { computeScenario, distributeRemainder } from './calc';
import { compareScenarios } from './compare';
import { sampleScenario } from './sample';
import { copyName, LocalScenarioRepository, MemoryStorage } from './storage';
import type { Category, Scenario } from './types';
import { validateScenario } from './validation';

const cat = (name: string, budgetPct: string, expectedRoiPct: string): Category => ({ id: name, name, budgetPct, expectedRoiPct });

describe('przykład kontrolny z PRD (120 000 PLN)', () => {
  const r = computeScenario(sampleScenario());

  it('liczy koszt, zwrot, przychód i ROI ważony', () => {
    expect(r.totalCost.toString()).toBe('120000');
    expect(r.totalReturn.toString()).toBe('169200');
    expect(r.totalRevenue.toString()).toBe('289200');
    expect(r.weightedRoiPct!.toDecimalPlaces(1).toFixed(1)).toBe('141.0');
  });

  it('liczy wartości per kategoria', () => {
    expect(r.categories.map((c) => [c.name, c.cost.toString(), c.returnAmount.toString(), c.revenue.toString()])).toEqual([
      ['Facebook', '48000', '72000', '120000'],
      ['Instagram', '36000', '72000', '108000'],
      ['TikTok', '24000', '19200', '43200'],
      ['LinkedIn', '12000', '6000', '18000'],
    ]);
  });

  it('udziały w zwrocie sumują się do 100%', () => {
    const sum = r.categories.reduce((acc, c) => acc + c.shareOfReturnPct!.toNumber(), 0);
    expect(sum).toBeCloseTo(100, 10);
  });
});

describe('precyzja decimal', () => {
  it('nie gubi groszy tam, gdzie float by się pomylił', () => {
    const r = computeScenario({ annualBudget: '0.3', categories: [cat('A', '10', '10'), cat('B', '20', '0')] });
    expect(r.totalCost.toString()).toBe('0.09');
    expect(r.categories[0].returnAmount.toString()).toBe('0.003');
  });
});

describe('alokacja poniżej i powyżej 100%', () => {
  it('poniżej 100%: koszt mniejszy od budżetu, kwota nierozdysponowana, ostrzeżenie', () => {
    const s: Scenario = { ...sampleScenario(), categories: [cat('Facebook', '60', '100')] };
    const r = computeScenario(s);
    expect(r.totalCost.toString()).toBe('72000');
    expect(r.unallocatedAmount.toString()).toBe('48000');
    const v = validateScenario(s);
    expect(v.errors).toEqual([]);
    expect(v.warnings[0]).toContain('40');
  });

  it('powyżej 100%: błąd blokujący zapis z nadwyżką', () => {
    const s: Scenario = { ...sampleScenario(), categories: [cat('Facebook', '70', '100'), cat('TikTok', '35.5', '10')] };
    const v = validateScenario(s);
    expect(v.overAllocatedBy!.toString()).toBe('5.5');
    expect(v.errors.join(' ')).toContain('5,5 pp');
  });

  it('ROI ujemny daje stratę, a zerowy koszt — brak ROI', () => {
    expect(computeScenario({ annualBudget: '1000', categories: [cat('A', '100', '-50')] }).totalReturn.toString()).toBe('-500');
    expect(computeScenario({ annualBudget: '1000', categories: [cat('A', '0', '50')] }).weightedRoiPct).toBeNull();
  });
});

describe('walidacja pól', () => {
  it('odrzuca duplikaty nazw, złe zakresy i zbyt wiele miejsc po przecinku', () => {
    const s: Scenario = {
      ...sampleScenario(),
      annualBudget: '100.123',
      categories: [cat('Facebook', '10.25', '1001'), { ...cat('facebook', '10', '-101'), id: 'x' }],
    };
    const v = validateScenario(s);
    expect(v.fieldErrors.budget).not.toBeNull();
    expect(v.fieldErrors.categories['Facebook'].budgetPct).toBe('Krok 0,1.');
    expect(v.fieldErrors.categories['Facebook'].roi).not.toBeNull();
    expect(v.fieldErrors.categories['x'].name).toBe('Ta kategoria już istnieje.');
    expect(v.fieldErrors.categories['x'].roi).not.toBeNull();
  });

  it('akceptuje przecinek jako separator dziesiętny', () => {
    const s: Scenario = { ...sampleScenario(), annualBudget: '1 000,50', categories: [cat('A', '99,9', '12,5')] };
    expect(validateScenario(s).errors).toEqual([]);
    expect(computeScenario(s).totalCost.toString()).toBe('999.4995');
  });
});

describe('Rozłóż resztę równo', () => {
  it('dzieli pozostały % między kategorie z wartością 0, krokiem 0,1', () => {
    const out = distributeRemainder([cat('A', '50', '0'), cat('B', '0', '0'), cat('C', '0', '0'), cat('D', '0', '0')]);
    expect(out.map((c) => c.budgetPct)).toEqual(['50', '16.7', '16.7', '16.6']);
    expect(computeScenario({ annualBudget: '100', categories: out }).allocatedPct.toString()).toBe('100');
  });

  it('nic nie zmienia, gdy brak reszty lub brak zer', () => {
    const full = [cat('A', '100', '0'), cat('B', '0', '0')];
    expect(distributeRemainder(full)).toBe(full);
    const noZeros = [cat('A', '40', '0')];
    expect(distributeRemainder(noZeros)).toBe(noZeros);
  });
});

describe('porównanie A vs B', () => {
  it('liczy różnice B − A i oznacza kategorie tylko w jednym wariancie', () => {
    const a: Scenario = { ...sampleScenario(), categories: [cat('Facebook', '50', '100'), cat('TikTok', '50', '50')] };
    const b: Scenario = { ...sampleScenario(), categories: [cat('facebook', '60', '120'), cat('YouTube', '40', '80')] };
    const c = compareScenarios(a, b);
    const fb = c.rows.find((r) => r.key === 'facebook')!;
    expect(fb.presence).toBe('both');
    expect(fb.costDiff.toString()).toBe('12000');
    expect(fb.budgetPctDiff.toString()).toBe('10');
    expect(fb.roiPctDiff!.toString()).toBe('20');
    expect(c.rows.find((r) => r.key === 'tiktok')!.presence).toBe('onlyA');
    expect(c.rows.find((r) => r.key === 'youtube')!.presence).toBe('onlyB');
    expect(c.rows.find((r) => r.key === 'tiktok')!.costDiff.toString()).toBe('-60000');
    // A: 60000 + 30000 = 90000 zwrotu; B: 86400 + 38400 = 124800
    expect(c.higherReturn).toBe('B');
    expect(c.higherRoi).toBe('B');
  });
});

describe('repozytorium scenariuszy', () => {
  it('zapis i odczyt zachowuje wartości i kolejność kategorii', () => {
    const repo = new LocalScenarioRepository(new MemoryStorage());
    const saved = repo.save(sampleScenario());
    const loaded = repo.get(saved.id)!;
    expect(loaded.categories.map((c) => [c.name, c.budgetPct, c.expectedRoiPct])).toEqual(
      sampleScenario().categories.map((c) => [c.name, c.budgetPct, c.expectedRoiPct]),
    );
    expect(loaded.annualBudget).toBe('120000');
  });

  it('duplikat to niezależna kopia z nazwą „<nazwa> (kopia)”', () => {
    const repo = new LocalScenarioRepository(new MemoryStorage());
    const saved = repo.save(sampleScenario());
    const copy = repo.duplicate(saved.id);
    expect(copy.id).not.toBe(saved.id);
    expect(copy.name).toBe('Przykładowy plan 2027 (kopia)');
    repo.save({ ...copy, annualBudget: '1' });
    expect(repo.get(saved.id)!.annualBudget).toBe('120000');
    expect(repo.list()).toHaveLength(2);
    repo.remove(saved.id);
    expect(repo.list().map((s) => s.id)).toEqual([copy.id]);
  });

  it('nazwa kopii nie przekracza 60 znaków', () => {
    expect(copyName('x'.repeat(60))).toHaveLength(60);
  });
});
