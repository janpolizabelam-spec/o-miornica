import { useChartTooltip } from './Tooltip';

export interface Slice {
  key: string;
  label: string;
  value: number;
  color: string;
  detail: string;
}

interface Props {
  slices: Slice[];
  centerTop: string;
  centerBottom: string;
}

const W = 560;
const H = 280;
const CX = 140;
const CY = 140;
const R = 118;
const R_IN = 74;

function arcPath(start: number, end: number) {
  const large = end - start > Math.PI ? 1 : 0;
  const p = (r: number, a: number) => [CX + r * Math.sin(a), CY - r * Math.cos(a)];
  const [x0, y0] = p(R, start);
  const [x1, y1] = p(R, end);
  const [x2, y2] = p(R_IN, end);
  const [x3, y3] = p(R_IN, start);
  return `M${x0},${y0} A${R},${R} 0 ${large} 1 ${x1},${y1} L${x2},${y2} A${R_IN},${R_IN} 0 ${large} 0 ${x3},${y3} Z`;
}

export function DonutChart({ slices, centerTop, centerBottom }: Props) {
  const { show, hide, node } = useChartTooltip();
  const visible = slices.filter((s) => s.value > 0);
  const total = visible.reduce((a, s) => a + s.value, 0);
  let angle = 0;
  const gap = visible.length > 1 ? 0.012 : 0;

  return (
    <div className="chart-svg-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg" role="img">
        {total === 0 ? (
          <circle cx={CX} cy={CY} r={(R + R_IN) / 2} fill="none" className="chart-empty-ring" strokeWidth={R - R_IN} />
        ) : visible.length === 1 ? (
          <circle
            cx={CX}
            cy={CY}
            r={(R + R_IN) / 2}
            fill="none"
            stroke={visible[0].color}
            strokeWidth={R - R_IN}
            onMouseMove={(e) => show(e, [visible[0].label, visible[0].detail])}
            onMouseLeave={hide}
          />
        ) : (
          visible.map((s) => {
            const start = angle;
            const end = angle + (s.value / total) * Math.PI * 2;
            angle = end;
            return (
              <path
                key={s.key}
                d={arcPath(start + gap / 2, end - gap / 2)}
                fill={s.color}
                className="chart-mark"
                onMouseMove={(e) => show(e, [s.label, s.detail])}
                onMouseLeave={hide}
              />
            );
          })
        )}
        <text x={CX} y={CY - 4} textAnchor="middle" className="chart-center-big">
          {centerTop}
        </text>
        <text x={CX} y={CY + 18} textAnchor="middle" className="chart-label">
          {centerBottom}
        </text>
        <g transform="translate(300, 0)">
          {slices.slice(0, 16).map((s, i) => {
            const rowH = Math.min(26, (H - 20) / Math.max(slices.length, 1));
            const y = (H - rowH * slices.length) / 2 + i * rowH + rowH / 2;
            return (
              <g key={s.key} transform={`translate(0, ${y})`}>
                <rect x={0} y={-6} width={12} height={12} rx={3} fill={s.color} />
                <text x={20} y={0} dominantBaseline="middle" className="chart-label">
                  {s.label.length > 18 ? `${s.label.slice(0, 17)}…` : s.label}
                </text>
                <text x={250} y={0} dominantBaseline="middle" textAnchor="end" className="chart-label chart-label-strong">
                  {total > 0 ? `${((s.value / total) * 100).toLocaleString('pl-PL', { maximumFractionDigits: 1, minimumFractionDigits: 1 })}%` : '—'}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
      {node}
    </div>
  );
}
