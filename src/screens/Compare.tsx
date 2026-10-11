import { useEffect, useId, useMemo } from 'react';
import { BarChart } from '../components/BarChart';
import { ChartFrame } from '../components/ChartFrame';
import { track } from '../lib/analytics';
import type { ScenarioResult } from '../lib/calc';
import { compareScenarios, type Comparison } from '../lib/compare';
import type { Decimal } from '../lib/decimal';
import { formatMoney, formatPct, formatSignedMoney, formatSignedPct } from '../lib/format';
import type { Currency, SavedScenario } from '../lib/types';
import { roiClass } from './Editor';

interface Props {
  scenarios: SavedScenario[];
  aId: string | null;
  bId: string | null;
  onSelect: (a: string | null, b: string | null) => void;
  onGoToList: () => void;
}

const COLOR_A = '#5b6fd6';
const COLOR_B = '#e08a2c';

export function Compare({ scenarios, aId, bId, onSelect, onGoToList }: Props) {
  const a = scenarios.find((s) => s.id === aId) ?? null;
  const b = scenarios.find((s) => s.id === bId) ?? null;
  const cmp = useMemo(() => (a && b ? compareScenarios(a, b) : null), [a, b]);
  const selA = useId();
  const selB = useId();

  useEffect(() => {
    if (a && b) track('compare_opened', { a: a.id, b: b.id });
  }, [a?.id, b?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (scenarios.length < 2) {
    return (
      <div className="state card">
        <h1 className="h1">Porównanie wymaga dwóch scenariuszy</h1>
        <p className="muted">
          Masz zapisanych scenariuszy: {scenarios.length}. Zapisz jeszcze {2 - scenarios.length} — najszybciej przez „Duplikuj” w edytorze.
        </p>
        <button type="button" className="btn btn-primary" onClick={onGoToList}>
          Przejdź do scenariuszy
        </button>
      </div>
    );
  }

  return (
    <div className="compare">
      <div className="list-head">
        <h1 className="h1">Porównanie A vs B</h1>
      </div>

      <div className="compare-pickers card">
        <div className="field">
          <label htmlFor={selA}>
            <span className="tag tag-a">A</span> Scenariusz A
          </label>
          <select id={selA} value={aId ?? ''} onChange={(e) => onSelect(e.target.value || null, bId)}>
            <option value="">— wybierz —</option>
            {scenarios.map((s) => (
              <option key={s.id} value={s.id} disabled={s.id === bId}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          className="btn btn-secondary swap"
          onClick={() => onSelect(bId, aId)}
          disabled={!aId && !bId}
          aria-label="Zamień A i B"
        >
          ⇄ Zamień
        </button>
        <div className="field">
          <label htmlFor={selB}>
            <span className="tag tag-b">B</span> Scenariusz B
          </label>
          <select id={selB} value={bId ?? ''} onChange={(e) => onSelect(aId, e.target.value || null)}>
            <option value="">— wybierz —</option>
            {scenarios.map((s) => (
              <option key={s.id} value={s.id} disabled={s.id === aId}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!cmp || !a || !b ? (
        <div className="state card">
          <p>Wybierz scenariusz A i B, aby zobaczyć porównanie.</p>
        </div>
      ) : (
        <CompareBody cmp={cmp} a={a} b={b} />
      )}
    </div>
  );
}

function CompareBody({ cmp, a, b }: { cmp: Comparison; a: SavedScenario; b: SavedScenario }) {
  const sameCurrency = a.currency === b.currency;
  const cur = a.currency;

  return (
    <>
      <p className="forecast-note">Prognoza na podstawie Twoich założeń — nie gwarancja wyników.</p>
      {!sameCurrency && (
        <div className="alert alert-warn" role="status">
          Scenariusze mają różne waluty ({a.currency} i {b.currency}). Różnice liczone są bez przeliczania kursów.
        </div>
      )}

      <div className="compare-summary">
        <SummaryColumn label="A" s={a} r={cmp.a} winReturn={cmp.higherReturn === 'A'} winRoi={cmp.higherRoi === 'A'} />
        <SummaryColumn label="B" s={b} r={cmp.b} winReturn={cmp.higherReturn === 'B'} winRoi={cmp.higherRoi === 'B'} />
      </div>

      <div className="card table-wrap">
        <table className="table">
          <caption className="table-caption">Różnice per kategoria (B − A)</caption>
          <thead>
            <tr>
              <th scope="col">Kategoria</th>
              <th scope="col" className="num">Kwota A</th>
              <th scope="col" className="num">Kwota B</th>
              <th scope="col" className="num">Δ kwota</th>
              <th scope="col" className="num">Δ % budżetu</th>
              <th scope="col" className="num">Δ % ROI</th>
              <th scope="col" className="num">Δ zwrot</th>
            </tr>
          </thead>
          <tbody>
            {cmp.rows.map((row) => (
              <tr key={row.key}>
                <th scope="row">
                  {row.name}
                  {row.presence === 'onlyA' && <span className="tag tag-a tag-inline">tylko w A</span>}
                  {row.presence === 'onlyB' && <span className="tag tag-b tag-inline">tylko w B</span>}
                </th>
                <td className="num">{row.a ? formatMoney(row.a.cost, a.currency) : '—'}</td>
                <td className="num">{row.b ? formatMoney(row.b.cost, b.currency) : '—'}</td>
                <td className="num">{formatSignedMoney(row.costDiff, cur)}</td>
                <td className="num">{formatSignedPct(row.budgetPctDiff, ' pp')}</td>
                <td className={`num ${row.roiPctDiff ? diffClass(row.roiPctDiff) : ''}`}>
                  {row.roiPctDiff ? formatSignedPct(row.roiPctDiff, ' pp') : '—'}
                </td>
                <td className={`num ${diffClass(row.returnDiff)}`}>{formatSignedMoney(row.returnDiff, cur)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">Razem</th>
              <td className="num">{formatMoney(cmp.a.totalCost, a.currency)}</td>
              <td className="num">{formatMoney(cmp.b.totalCost, b.currency)}</td>
              <td className="num">
                {formatSignedMoney(cmp.b.totalCost.minus(cmp.a.totalCost), cur)}
              </td>
              <td className="num">{formatSignedPct(cmp.b.allocatedPct.minus(cmp.a.allocatedPct), ' pp')}</td>
              <td className="num">
                {cmp.a.weightedRoiPct && cmp.b.weightedRoiPct
                  ? formatSignedPct(cmp.b.weightedRoiPct.minus(cmp.a.weightedRoiPct), ' pp')
                  : '—'}
              </td>
              <td className={`num ${diffClass(cmp.b.totalReturn.minus(cmp.a.totalReturn))}`}>
                {formatSignedMoney(cmp.b.totalReturn.minus(cmp.a.totalReturn), cur)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <ChartFrame
        title="Zwrot per kategoria: A obok B"
        exportName={`porownanie ${a.name} vs ${b.name}`}
        table={
          <table className="table table-compact">
            <thead>
              <tr>
                <th scope="col">Kategoria</th>
                <th scope="col" className="num">Zwrot A</th>
                <th scope="col" className="num">Zwrot B</th>
              </tr>
            </thead>
            <tbody>
              {cmp.rows.map((row) => (
                <tr key={row.key}>
                  <th scope="row">{row.name}</th>
                  <td className="num">{row.a ? formatMoney(row.a.returnAmount, a.currency) : '—'}</td>
                  <td className="num">{row.b ? formatMoney(row.b.returnAmount, b.currency) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        }
      >
        <BarChart
          series={[
            { key: 'a', label: `A: ${truncate(a.name, 12)}`, color: () => COLOR_A, legendColor: COLOR_A },
            { key: 'b', label: `B: ${truncate(b.name, 12)}`, color: () => COLOR_B, legendColor: COLOR_B },
          ]}
          groups={cmp.rows.map((row) => ({
            key: row.key,
            label: row.name,
            values: [row.a ? row.a.returnAmount.toNumber() : null, row.b ? row.b.returnAmount.toNumber() : null],
            tooltips: [
              row.a ? `A: ${formatMoney(row.a.returnAmount, a.currency)}` : 'A: brak kategorii',
              row.b ? `B: ${formatMoney(row.b.returnAmount, b.currency)}` : 'B: brak kategorii',
            ],
          }))}
        />
      </ChartFrame>
    </>
  );
}

function SummaryColumn({
  label,
  s,
  r,
  winReturn,
  winRoi,
}: {
  label: 'A' | 'B';
  s: SavedScenario;
  r: ScenarioResult;
  winReturn: boolean;
  winRoi: boolean;
}) {
  const cur: Currency = s.currency;
  return (
    <section className={`card compare-col ${winReturn || winRoi ? 'is-winner' : ''}`} aria-label={`Scenariusz ${label}`}>
      <h2 className="h2">
        <span className={`tag tag-${label.toLowerCase()}`}>{label}</span> {s.name}
      </h2>
      <dl className="compare-dl">
        <div>
          <dt>Budżet</dt>
          <dd>{formatMoney(r.budget, cur)}</dd>
        </div>
        <div>
          <dt>Koszt</dt>
          <dd>{formatMoney(r.totalCost, cur)}</dd>
        </div>
        <div className={winReturn ? 'win' : undefined}>
          <dt>Zwrot</dt>
          <dd className={roiClass(r.totalReturn)}>
            {formatMoney(r.totalReturn, cur)}
            {winReturn && <span className="badge badge-ok">wyższy zwrot</span>}
          </dd>
        </div>
        <div className={winRoi ? 'win' : undefined}>
          <dt>ROI ważony</dt>
          <dd className={roiClass(r.weightedRoiPct)}>
            {formatPct(r.weightedRoiPct)}
            {winRoi && <span className="badge badge-ok">wyższy ROI</span>}
          </dd>
        </div>
        <div>
          <dt>Liczba kategorii</dt>
          <dd>{s.categories.length}</dd>
        </div>
      </dl>
    </section>
  );
}

function diffClass(d: Decimal) {
  const r = d.toDecimalPlaces(2);
  return r.gt(0) ? 'pos' : r.lt(0) ? 'neg' : '';
}

function truncate(s: string, n: number) {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}
