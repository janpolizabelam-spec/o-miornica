import { useCallback, useState, type MouseEvent as ReactMouseEvent } from 'react';

export interface TooltipState {
  x: number;
  y: number;
  lines: string[];
}

/** Lekki tooltip pozycjonowany względem kontenera wykresu. */
export function useChartTooltip() {
  const [tip, setTip] = useState<TooltipState | null>(null);
  const show = useCallback((e: ReactMouseEvent<SVGElement>, lines: string[]) => {
    const host = (e.currentTarget as SVGElement).closest('.chart-svg-wrap') as HTMLElement | null;
    if (!host) return;
    const r = host.getBoundingClientRect();
    setTip({ x: e.clientX - r.left, y: e.clientY - r.top, lines });
  }, []);
  const hide = useCallback(() => setTip(null), []);
  const node = tip ? (
    <div className="tooltip" style={{ left: tip.x, top: tip.y }}>
      {tip.lines.map((l, i) => (
        <div key={i} className={i === 0 ? 'tooltip-title' : undefined}>
          {l}
        </div>
      ))}
    </div>
  ) : null;
  return { show, hide, node };
}
