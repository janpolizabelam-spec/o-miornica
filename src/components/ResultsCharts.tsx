import type { ScenarioResult } from '../lib/calc';
import { categoryColor, UNALLOCATED_COLOR } from '../lib/colors';
import { formatMoney, formatPct } from '../lib/format';
import type { Currency } from '../lib/types';
import { BarChart } from './BarChart';
import { ChartFrame } from './ChartFrame';
import { DonutChart, type Slice } from './DonutChart';

interface Props {
  result: ScenarioResult;
  currency: Currency;
  scenarioName: string;
}

export function ResultsCharts({ result, currency, scenarioName }: Props) {
  const slices: Slice[] = result.categories.map((c) => ({
    key: c.id,
    label: c.name || 'Bez nazwy',
    value: Math.max(c.cost.toNumber(), 0),
    color: categoryColor(c.name),
    detail: `${formatMoney(c.cost, currency)} · ${formatPct(c.budgetPct)} budżetu`,
  }));
  if (result.remainingPct.gt(0) && result.budget.gt(0)) {
    slices.push({
      key: '__unallocated',
      label: 'Nierozdysponowane',
      value: result.unallocatedAmount.toNumber(),
      color: UNALLOCATED_COLOR,
      detail: `${formatMoney(result.unallocatedAmount, currency)} · ${formatPct(result.remainingPct)} budżetu`,
    });
  }

  const name = scenarioName.trim() || 'scenariusz';

  return (
    <div className="charts">
      <ChartFrame
        title="Podział budżetu"
        exportName={`${name} podzial budzetu`}
        table={
          <table className="table table-compact">
            <thead>
              <tr>
                <th scope="col">Kategoria</th>
                <th scope="col" className="num">Kwota</th>
                <th scope="col" className="num">% budżetu</th>
              </tr>
            </thead>
            <tbody>
              {result.categories.map((c) => (
                <tr key={c.id}>
                  <th scope="row">{c.name}</th>
                  <td className="num">{formatMoney(c.cost, currency)}</td>
                  <td className="num">{formatPct(c.budgetPct)}</td>
                </tr>
              ))}
              {result.remainingPct.gt(0) && (
                <tr>
                  <th scope="row">Nierozdysponowane</th>
                  <td className="num">{formatMoney(result.unallocatedAmount, currency)}</td>
                  <td className="num">{formatPct(result.remainingPct)}</td>
                </tr>
              )}
            </tbody>
          </table>
        }
      >
        <DonutChart slices={slices} centerTop={formatPct(result.allocatedPct)} centerBottom="rozdysponowano" />
      </ChartFrame>

      <ChartFrame
        title="Koszt vs oczekiwany zwrot"
        exportName={`${name} koszt vs zwrot`}
        table={
          <table className="table table-compact">
            <thead>
              <tr>
                <th scope="col">Kategoria</th>
                <th scope="col" className="num">Koszt</th>
                <th scope="col" className="num">Zwrot</th>
              </tr>
            </thead>
            <tbody>
              {result.categories.map((c) => (
                <tr key={c.id}>
                  <th scope="row">{c.name}</th>
                  <td className="num">{formatMoney(c.cost, currency)}</td>
                  <td className="num">{formatMoney(c.returnAmount, currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        }
      >
        <BarChart
          series={[
            { key: 'cost', label: 'Koszt', color: (g) => categoryColor(g.colorKey ?? ''), opacity: 0.42, legendColor: '#6b7686' },
            { key: 'return', label: 'Zwrot (zysk)', color: (g) => categoryColor(g.colorKey ?? ''), legendColor: '#6b7686' },
          ]}
          groups={result.categories.map((c) => ({
            key: c.id,
            colorKey: c.name,
            label: c.name || 'Bez nazwy',
            values: [c.cost.toNumber(), c.returnAmount.toNumber()],
            tooltips: [
              `Koszt: ${formatMoney(c.cost, currency)} (${formatPct(c.budgetPct)} budżetu)`,
              `Zwrot: ${formatMoney(c.returnAmount, currency)} (ROI ${formatPct(c.roiPct)})`,
            ],
          }))}
        />
      </ChartFrame>
    </div>
  );
}
