import { formatCompact } from '../lib/format';
import { useChartTooltip } from './Tooltip';

export interface BarSeries {
  key: string;
  label: string;
  /** Kolor słupka dla danej grupy (np. stały kolor kategorii). */
  color: (group: BarGroup) => string;
  opacity?: number;
  legendColor: string;
}

export interface BarGroup {
  key: string;
  label: string;
  colorKey?: string;
  values: (number | null)[];
  tooltips: string[];
}

interface Props {
  groups: BarGroup[];
  series: BarSeries[];
}

const W = 560;
const H = 300;
const M = { top: 34, right: 12, bottom: 46, left: 56 };

function niceStep(range: number, target = 5) {
  const raw = range / target;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  return (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag;
}

export function BarChart({ groups, series }: Props) {
  const { show, hide, node } = useChartTooltip();
  const all = groups.flatMap((g) => g.values.filter((v): v is number => v != null));
  let min = Math.min(0, ...all);
  let max = Math.max(0, ...all);
  if (min === max) max = 1;
  const step = niceStep(max - min);
  min = Math.floor(min / step) * step;
  max = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let t = min; t <= max + step / 2; t += step) ticks.push(Number(t.toPrecision(12)));

  const plotW = W - M.left - M.right;
  const plotH = H - M.top - M.bottom;
  const y = (v: number) => M.top + ((max - v) / (max - min)) * plotH;
  const bandW = plotW / Math.max(groups.length, 1);
  const inner = Math.min(bandW * 0.78, 30 * series.length + 8);
  const barW = Math.max((inner - (series.length - 1) * 3) / series.length, 2);
  const maxChars = Math.max(Math.floor(bandW / 7), 3);
  const legendOffsets = series.reduce<number[]>((acc, _, i) => {
    acc.push(i === 0 ? 0 : acc[i - 1] + 34 + series[i - 1].label.length * 7);
    return acc;
  }, []);

  return (
    <div className="chart-svg-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg" role="img">
        <g transform={`translate(${M.left}, 12)`}>
          {series.map((s, i) => (
            <g key={s.key} transform={`translate(${legendOffsets[i]}, 0)`}>
              <rect x={0} y={-6} width={12} height={12} rx={3} fill={s.legendColor} opacity={s.opacity ?? 1} />
              <text x={18} y={0} dominantBaseline="middle" className="chart-label">
                {s.label}
              </text>
            </g>
          ))}
        </g>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={M.left} x2={W - M.right} y1={y(t)} y2={y(t)} className={t === 0 ? 'chart-axis' : 'chart-grid'} />
            <text x={M.left - 8} y={y(t)} textAnchor="end" dominantBaseline="middle" className="chart-tick">
              {formatCompact(t)}
            </text>
          </g>
        ))}
        {groups.map((g, gi) => {
          const x0 = M.left + gi * bandW + (bandW - inner) / 2;
          return (
            <g key={g.key}>
              {g.values.map((v, si) => {
                if (v == null) return null;
                const s = series[si];
                const top = y(Math.max(v, 0));
                const h = Math.max(Math.abs(y(v) - y(0)), v === 0 ? 0 : 1);
                return (
                  <rect
                    key={s.key}
                    x={x0 + si * (barW + 3)}
                    y={top}
                    width={barW}
                    height={h}
                    rx={2}
                    fill={s.color(g)}
                    opacity={s.opacity ?? 1}
                    className="chart-mark"
                    onMouseMove={(e) => show(e, [g.label, g.tooltips[si]])}
                    onMouseLeave={hide}
                  />
                );
              })}
              <text x={M.left + gi * bandW + bandW / 2} y={H - M.bottom + 18} textAnchor="middle" className="chart-tick">
                {g.label.length > maxChars ? `${g.label.slice(0, maxChars - 1)}…` : g.label}
              </text>
            </g>
          );
        })}
      </svg>
      {node}
    </div>
  );
}
