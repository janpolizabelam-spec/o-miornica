import { useMemo, useState } from 'react';
import { computeScenario } from '../lib/calc';
import { formatDateTime, formatMoney, formatPct } from '../lib/format';
import type { SavedScenario } from '../lib/types';
import { validateScenarioName } from '../lib/validation';
import { roiClass } from './Editor';

interface Props {
  scenarios: SavedScenario[];
  currentId: string | null;
  error: string | null;
  onOpen: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (s: SavedScenario) => void;
  onCompare: (a: string, b: string) => void;
  onNew: () => void;
}

export function ScenarioList({ scenarios, currentId, error, onOpen, onRename, onDuplicate, onDelete, onCompare, onNew }: Props) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [renaming, setRenaming] = useState<{ id: string; name: string; error: string | null } | null>(null);

  const rows = useMemo(
    () =>
      scenarios
        .filter((s) => s.name.toLocaleLowerCase('pl').includes(query.trim().toLocaleLowerCase('pl')))
        .map((s) => ({ s, r: computeScenario(s) })),
    [scenarios, query],
  );

  const toggle = (id: string) =>
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id].slice(-2)));

  function submitRename() {
    if (!renaming) return;
    const err = validateScenarioName(renaming.name);
    if (err) {
      setRenaming({ ...renaming, error: err });
      return;
    }
    onRename(renaming.id, renaming.name.trim());
    setRenaming(null);
  }

  if (error) {
    return (
      <div className="state card" role="alert">
        <h1 className="h1">Nie udało się wczytać scenariuszy</h1>
        <p>{error}</p>
        <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
          Spróbuj ponownie
        </button>
      </div>
    );
  }

  if (scenarios.length === 0) {
    return (
      <div className="state card">
        <h1 className="h1">Nie masz jeszcze zapisanych scenariuszy</h1>
        <p className="muted">Rozpisz budżet w edytorze i kliknij „Zapisz”. Dwa zapisane scenariusze możesz porównać obok siebie.</p>
        <button type="button" className="btn btn-primary" onClick={onNew}>
          Utwórz scenariusz
        </button>
      </div>
    );
  }

  return (
    <div className="list">
      <div className="list-head">
        <h1 className="h1">Moje scenariusze</h1>
        <div className="list-tools">
          <label className="sr-only" htmlFor="search">
            Szukaj po nazwie
          </label>
          <input
            id="search"
            type="search"
            placeholder="Szukaj po nazwie…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button
            type="button"
            className="btn btn-primary"
            disabled={selected.length !== 2}
            onClick={() => onCompare(selected[0], selected[1])}
          >
            Porównaj {selected.length}/2
          </button>
        </div>
      </div>
      <p className="hint">Zaznacz dwa scenariusze, aby je porównać.</p>

      {rows.length === 0 ? (
        <div className="state card">
          <p>Brak scenariuszy pasujących do „{query}”.</p>
        </div>
      ) : (
        <ul className="scenario-grid">
          {rows.map(({ s, r }) => {
            const isSel = selected.includes(s.id);
            return (
              <li key={s.id} className={`scenario-card card ${isSel ? 'is-selected' : ''}`}>
                <div className="scenario-card-top">
                  <input
                    type="checkbox"
                    checked={isSel}
                    onChange={() => toggle(s.id)}
                    aria-label={`Zaznacz do porównania: ${s.name}`}
                  />
                  {renaming?.id === s.id ? (
                    <form
                      className="rename-form"
                      onSubmit={(e) => {
                        e.preventDefault();
                        submitRename();
                      }}
                    >
                      <input
                        autoFocus
                        type="text"
                        value={renaming.name}
                        maxLength={60}
                        aria-label="Nowa nazwa scenariusza"
                        aria-invalid={!!renaming.error}
                        onChange={(e) => setRenaming({ ...renaming, name: e.target.value, error: null })}
                        onKeyDown={(e) => e.key === 'Escape' && setRenaming(null)}
                      />
                      <button type="submit" className="btn btn-primary btn-sm">
                        OK
                      </button>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setRenaming(null)}>
                        Anuluj
                      </button>
                      {renaming.error && <p className="field-error">{renaming.error}</p>}
                    </form>
                  ) : (
                    <h2 className="scenario-name">
                      <button type="button" className="link" onClick={() => onOpen(s.id)}>
                        {s.name}
                      </button>
                      {s.id === currentId && <span className="badge">w edytorze</span>}
                    </h2>
                  )}
                </div>
                {s.description && <p className="muted scenario-desc">{s.description}</p>}
                <dl className="scenario-meta">
                  <div>
                    <dt>Budżet</dt>
                    <dd>{formatMoney(r.budget, s.currency)}</dd>
                  </div>
                  <div>
                    <dt>ROI ważony</dt>
                    <dd className={roiClass(r.weightedRoiPct)}>{formatPct(r.weightedRoiPct)}</dd>
                  </div>
                  <div>
                    <dt>Kanały</dt>
                    <dd>{s.categories.length}</dd>
                  </div>
                  <div>
                    <dt>Zmodyfikowano</dt>
                    <dd>
                      <time dateTime={s.updatedAt}>{formatDateTime(s.updatedAt)}</time>
                    </dd>
                  </div>
                </dl>
                <div className="scenario-actions">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => onOpen(s.id)}>
                    Otwórz
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setRenaming({ id: s.id, name: s.name, error: null })}
                  >
                    Zmień nazwę
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => onDuplicate(s.id)}>
                    Duplikuj
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm btn-danger-text" onClick={() => onDelete(s)}>
                    Usuń
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
