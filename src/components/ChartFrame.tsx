import { useRef, useState, type ReactNode } from 'react';
import { track } from '../lib/analytics';
import { exportSvgToPng, slugify } from '../lib/exportPng';

interface Props {
  title: string;
  /** Tabela alternatywna z danymi wykresu (dla czytników ekranu i do wglądu). */
  table: ReactNode;
  children: ReactNode;
  exportName?: string;
}

export function ChartFrame({ title, table, children, exportName }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onExport() {
    const svg = ref.current?.querySelector('svg');
    if (!svg) return;
    setBusy(true);
    setError(null);
    try {
      await exportSvgToPng(svg, slugify(exportName ?? title));
      track('chart_exported', { chart: title });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Eksport nie powiódł się.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <figure className="chart card">
      <div className="chart-head">
        <figcaption className="chart-title">{title}</figcaption>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onExport} disabled={busy}>
          {busy ? 'Eksport…' : 'Pobierz PNG'}
        </button>
      </div>
      <div ref={ref} className="chart-body" aria-hidden="true">
        {children}
      </div>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
      <details className="chart-table">
        <summary>Pokaż dane wykresu w tabeli</summary>
        {table}
      </details>
    </figure>
  );
}
