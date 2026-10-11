import { useId, useMemo, useRef, useState } from 'react';
import { NumberInput, formatGrouped } from '../components/NumberInput';
import { ResultsCharts } from '../components/ResultsCharts';
import { computeScenario, distributeRemainder, type ScenarioResult } from '../lib/calc';
import { categoryColor, PREDEFINED_CATEGORIES, UNALLOCATED_COLOR } from '../lib/colors';
import { Decimal, toDecimal } from '../lib/decimal';
import { formatMoney, formatPct } from '../lib/format';
import { newId } from '../lib/id';
import { CURRENCIES, type Category, type Currency, type Scenario } from '../lib/types';
import { LIMITS, validateCategoryName, type ScenarioValidation } from '../lib/validation';

interface Props {
  scenario: Scenario;
  validation: ScenarioValidation;
  dirty: boolean;
  isSample: boolean;
  onChange: (s: Scenario) => void;
  onSave: () => void;
  onDuplicate: () => void;
  onNew: () => void;
  onClearSample: () => void;
}

export function Editor({ scenario, validation, dirty, isSample, onChange, onSave, onDuplicate, onNew, onClearSample }: Props) {
  const result = useMemo(() => computeScenario(scenario), [scenario]);
  const [showErrors, setShowErrors] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const ids = { name: useId(), desc: useId(), budget: useId(), currency: useId() };

  const set = (patch: Partial<Scenario>) => onChange({ ...scenario, ...patch });
  const setCategories = (categories: Category[]) => set({ categories });
  const fe = validation.fieldErrors;
  const canSave = validation.errors.length === 0;

  function trySave() {
    if (!canSave) {
      setShowErrors(true);
      if (fe.name) nameRef.current?.focus();
      return;
    }
    setShowErrors(false);
    onSave();
  }

  return (
    <div className="editor">
      <div className="editor-toolbar">
        <div className="editor-status" aria-live="polite">
          {scenario.id ? (
            dirty ? (
              <span className="badge badge-warn">Niezapisane zmiany</span>
            ) : (
              <span className="badge badge-ok">Zapisano</span>
            )
          ) : (
            <span className="badge">Nowy scenariusz — niezapisany</span>
          )}
        </div>
        <div className="toolbar-actions">
          {isSample && (
            <button type="button" className="btn btn-ghost" onClick={onClearSample}>
              Wyczyść przykład
            </button>
          )}
          <button type="button" className="btn btn-secondary" onClick={onNew}>
            Nowy
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => (canSave ? onDuplicate() : setShowErrors(true))}
            title="Zapisz kopię jako nowy scenariusz"
          >
            Duplikuj
          </button>
          <button type="button" className="btn btn-primary" onClick={trySave} aria-disabled={!canSave}>
            Zapisz
          </button>
        </div>
      </div>

      {showErrors && validation.errors.length > 0 && (
        <div className="alert alert-error" role="alert">
          <strong>Nie można zapisać:</strong>
          <ul>
            {validation.errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="editor-grid">
        <section className="editor-left" aria-label="Dane wejściowe">
          <div className="card">
            <div className="field">
              <label htmlFor={ids.name}>
                Nazwa scenariusza <span className="req" aria-hidden="true">*</span>
              </label>
              <input
                ref={nameRef}
                id={ids.name}
                type="text"
                value={scenario.name}
                maxLength={LIMITS.scenarioNameMax}
                placeholder="np. Plan 2027 — wariant bazowy"
                aria-invalid={showErrors && !!fe.name}
                aria-describedby={showErrors && fe.name ? `${ids.name}-err` : undefined}
                onChange={(e) => set({ name: e.target.value })}
                required
              />
              {showErrors && fe.name && (
                <p id={`${ids.name}-err`} className="field-error">
                  {fe.name}
                </p>
              )}
            </div>
            <div className="field">
              <label htmlFor={ids.desc}>
                Opis <span className="muted">(opcjonalnie)</span>
              </label>
              <textarea id={ids.desc} rows={2} value={scenario.description} onChange={(e) => set({ description: e.target.value })} />
            </div>
          </div>

          <div className="card">
            <div className="budget-row">
              <div className="field field-grow">
                <label htmlFor={ids.budget}>Roczny budżet</label>
                <NumberInput
                  id={ids.budget}
                  className="input-lg"
                  value={scenario.annualBudget}
                  onValueChange={(annualBudget) => set({ annualBudget })}
                  format={formatGrouped}
                  placeholder="np. 120 000"
                  aria-invalid={!!fe.budget && scenario.annualBudget !== ''}
                  aria-describedby={`${ids.budget}-err`}
                />
                <p id={`${ids.budget}-err`} className="field-error" aria-live="polite">
                  {scenario.annualBudget !== '' || showErrors ? fe.budget : null}
                </p>
              </div>
              <div className="field">
                <label htmlFor={ids.currency}>Waluta</label>
                <select id={ids.currency} value={scenario.currency} onChange={(e) => set({ currency: e.target.value as Currency })}>
                  {CURRENCIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
            <p className="hint">Waluta zmienia tylko formatowanie — kwoty nie są przeliczane po kursie.</p>
          </div>

          <CategoriesEditor
            categories={scenario.categories}
            result={result}
            currency={scenario.currency}
            validation={validation}
            showErrors={showErrors}
            onChange={setCategories}
          />
        </section>

        <section className="editor-right" aria-label="Wyniki">
          <p className="forecast-note">Prognoza na podstawie Twoich założeń — nie gwarancja wyników.</p>
          <SummaryCards result={result} currency={scenario.currency} />
          <ResultsTable result={result} currency={scenario.currency} />
          <ResultsCharts result={result} currency={scenario.currency} scenarioName={scenario.name} />
        </section>
      </div>

      <div className="mobile-bar" aria-hidden="true">
        <div>
          <span className="mobile-bar-label">Koszt</span>
          <strong>{formatMoney(result.totalCost, scenario.currency)}</strong>
        </div>
        <div>
          <span className="mobile-bar-label">ROI ważony</span>
          <strong className={roiClass(result.weightedRoiPct)}>{formatPct(result.weightedRoiPct)}</strong>
        </div>
        <button type="button" className="btn btn-primary btn-sm" onClick={trySave}>
          Zapisz
        </button>
      </div>
    </div>
  );
}

export function roiClass(v: Decimal | null) {
  if (!v) return '';
  return v.gt(0) ? 'pos' : v.lt(0) ? 'neg' : '';
}

function roiWord(v: Decimal | null) {
  if (!v) return 'brak danych';
  return v.gt(0) ? 'zysk' : v.lt(0) ? 'strata' : 'bez zmian';
}

/* ------------------------------------------------------------------------ */

function SummaryCards({ result, currency }: { result: ScenarioResult; currency: Currency }) {
  return (
    <div className="summary">
      <div className="stat card">
        <span className="stat-label">Całkowity koszt</span>
        <span className="stat-value">{formatMoney(result.totalCost, currency)}</span>
        <span className="stat-sub">z budżetu {formatMoney(result.budget, currency)}</span>
      </div>
      <div className="stat card">
        <span className="stat-label">Oczekiwany zwrot (zysk)</span>
        <span className={`stat-value ${roiClass(result.totalReturn)}`}>{formatMoney(result.totalReturn, currency)}</span>
        <span className="stat-sub">{roiWord(result.totalReturn)}</span>
      </div>
      <div className="stat card">
        <span className="stat-label">Przychód</span>
        <span className="stat-value">{formatMoney(result.totalRevenue, currency)}</span>
        <span className="stat-sub">koszt + zwrot</span>
      </div>
      <div className="stat card">
        <span className="stat-label">ROI ważony</span>
        <span className={`stat-value ${roiClass(result.weightedRoiPct)}`}>{formatPct(result.weightedRoiPct)}</span>
        <span className="stat-sub">{roiWord(result.weightedRoiPct)} · średnia ważona kwotami</span>
      </div>
    </div>
  );
}

function ResultsTable({ result, currency }: { result: ScenarioResult; currency: Currency }) {
  return (
    <div className="card table-wrap">
      <table className="table">
        <caption className="table-caption">Wyniki per kategoria</caption>
        <thead>
          <tr>
            <th scope="col">Kategoria</th>
            <th scope="col" className="num">Kwota</th>
            <th scope="col" className="num">Zwrot</th>
            <th scope="col" className="num">Przychód</th>
            <th scope="col" className="num">Udział w zwrocie</th>
          </tr>
        </thead>
        <tbody>
          {result.categories.map((c) => (
            <tr key={c.id}>
              <th scope="row">
                <span className="dot" style={{ background: categoryColor(c.name) }} aria-hidden="true" />
                {c.name || <em className="muted">bez nazwy</em>}
              </th>
              <td className="num">{formatMoney(c.cost, currency)}</td>
              <td className={`num ${roiClass(c.returnAmount)}`}>{formatMoney(c.returnAmount, currency)}</td>
              <td className="num">{formatMoney(c.revenue, currency)}</td>
              <td className="num">{formatPct(c.shareOfReturnPct)}</td>
            </tr>
          ))}
          {result.remainingPct.gt(0) && (
            <tr className="row-muted">
              <th scope="row">
                <span className="dot" style={{ background: UNALLOCATED_COLOR }} aria-hidden="true" />
                Nierozdysponowane ({formatPct(result.remainingPct)})
              </th>
              <td className="num">{formatMoney(result.unallocatedAmount, currency)}</td>
              <td className="num">—</td>
              <td className="num">—</td>
              <td className="num">—</td>
            </tr>
          )}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">Razem</th>
            <td className="num">{formatMoney(result.totalCost, currency)}</td>
            <td className={`num ${roiClass(result.totalReturn)}`}>{formatMoney(result.totalReturn, currency)}</td>
            <td className="num">{formatMoney(result.totalRevenue, currency)}</td>
            <td className="num">{result.totalReturn.isZero() ? '—' : '100,0%'}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------------ */

interface CategoriesProps {
  categories: Category[];
  result: ScenarioResult;
  currency: Currency;
  validation: ScenarioValidation;
  showErrors: boolean;
  onChange: (c: Category[]) => void;
}

function CategoriesEditor({ categories, result, currency, validation, showErrors, onChange }: CategoriesProps) {
  const [custom, setCustom] = useState('');
  const [customError, setCustomError] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [announce, setAnnounce] = useState('');
  const customId = useId();

  const used = new Set(categories.map((c) => c.name.trim().toLocaleLowerCase('pl')));
  const available = PREDEFINED_CATEGORIES.filter((n) => !used.has(n.toLocaleLowerCase('pl')));
  const full = categories.length >= LIMITS.maxCategories;

  const allocated = result.allocatedPct;
  const over = allocated.gt(100);
  const under = allocated.lt(100);
  const hasZero = categories.some((c) => toDecimal(c.budgetPct).isZero());

  const update = (id: string, patch: Partial<Category>) => onChange(categories.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  const add = (name: string) => onChange([...categories, { id: newId(), name, budgetPct: '0', expectedRoiPct: '0' }]);

  function move(from: number, to: number) {
    if (to < 0 || to >= categories.length || from === to) return;
    const next = [...categories];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
    setAnnounce(`${item.name} przeniesiono na pozycję ${to + 1} z ${next.length}.`);
  }

  function addCustom() {
    const err = validateCategoryName(custom, categories.map((c) => c.name));
    if (err) {
      setCustomError(err);
      return;
    }
    add(custom.trim());
    setCustom('');
    setCustomError(null);
  }

  return (
    <div className="card categories">
      <div className="categories-head">
        <h2 className="h2">Kanały</h2>
        <span className="muted">
          {categories.length}/{LIMITS.maxCategories}
        </span>
      </div>

      <div className={`allocation ${over ? 'is-over' : under ? 'is-under' : 'is-full'}`} aria-live="polite">
        <div className="allocation-text">
          <span>
            Rozdysponowano <strong>{formatPct(allocated)}</strong>
          </span>
          <span>
            {over ? (
              <strong className="neg">Przekroczono o {formatPct(allocated.minus(100))}</strong>
            ) : (
              <>
                pozostało <strong>{formatPct(result.remainingPct)}</strong>
                {under && result.budget.gt(0) && <> · {formatMoney(result.unallocatedAmount, currency)}</>}
              </>
            )}
          </span>
        </div>
        <div
          className="allocation-bar"
          role="meter"
          aria-label="Rozdysponowany budżet"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.min(allocated.toNumber(), 100)}
          aria-valuetext={`${formatPct(allocated)} rozdysponowano`}
        >
          {result.categories.map((c) => (
            <span
              key={c.id}
              style={{
                width: `${allocated.gt(0) ? c.budgetPct.div(Decimal.max(allocated, 100)).mul(100).toNumber() : 0}%`,
                background: categoryColor(c.name),
              }}
            />
          ))}
        </div>
        {over && <p className="field-error">Suma przekracza 100% — zmniejsz udziały, aby zapisać scenariusz.</p>}
        {under && !over && categories.length > 0 && (
          <p className="hint">Nierozdysponowana kwota nie jest wliczana do kosztu. Zapis jest możliwy.</p>
        )}
        {under && hasZero && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange(distributeRemainder(categories))}>
            Rozłóż resztę równo
          </button>
        )}
      </div>

      <ol className="cat-list">
        {categories.map((c, i) => {
          const r = result.categories[i];
          const err = validation.fieldErrors.categories[c.id];
          const nameErr = err?.name && (showErrors || c.name !== '') ? err.name : null;
          return (
            <li
              key={c.id}
              className={`cat-row ${dragId === c.id ? 'is-dragging' : ''} ${overId === c.id && dragId !== c.id ? 'is-over' : ''}`}
              draggable={dragId === c.id}
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', c.id);
              }}
              onDragOver={(e) => {
                if (!dragId) return;
                e.preventDefault();
                setOverId(c.id);
              }}
              onDrop={(e) => {
                e.preventDefault();
                const from = categories.findIndex((x) => x.id === dragId);
                move(from, i);
                setDragId(null);
                setOverId(null);
              }}
              onDragEnd={() => {
                setDragId(null);
                setOverId(null);
              }}
            >
              <div className="cat-top">
                <span
                  className="drag-handle"
                  title="Przeciągnij, aby zmienić kolejność"
                  aria-hidden="true"
                  onPointerDown={() => setDragId(c.id)}
                  onPointerUp={() => setDragId(null)}
                >
                  ⋮⋮
                </span>
                <span className="dot" style={{ background: categoryColor(c.name) }} aria-hidden="true" />
                <input
                  className="cat-name"
                  type="text"
                  value={c.name}
                  maxLength={LIMITS.categoryNameMax}
                  aria-label={`Nazwa kategorii ${i + 1}`}
                  aria-invalid={!!nameErr}
                  onChange={(e) => update(c.id, { name: e.target.value })}
                />
                <span className="cat-amount">{formatMoney(r?.cost ?? new Decimal(0), currency)}</span>
                <div className="cat-actions">
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => move(i, i - 1)}
                    disabled={i === 0}
                    aria-label={`Przesuń ${c.name || 'kategorię'} wyżej`}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => move(i, i + 1)}
                    disabled={i === categories.length - 1}
                    aria-label={`Przesuń ${c.name || 'kategorię'} niżej`}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="icon-btn icon-btn-danger"
                    onClick={() => onChange(categories.filter((x) => x.id !== c.id))}
                    disabled={categories.length <= LIMITS.minCategories}
                    aria-label={`Usuń ${c.name || 'kategorię'}`}
                    title={categories.length <= LIMITS.minCategories ? 'Scenariusz musi mieć co najmniej 1 kategorię' : 'Usuń'}
                  >
                    ✕
                  </button>
                </div>
              </div>
              {nameErr && <p className="field-error">{nameErr}</p>}
              <div className="cat-fields">
                <div className="field">
                  <label htmlFor={`${c.id}-pct`}>% budżetu</label>
                  <div className="pct-input">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={0.1}
                      value={Number(c.budgetPct) || 0}
                      aria-label={`% budżetu dla ${c.name || 'kategorii'} — suwak`}
                      onChange={(e) => update(c.id, { budgetPct: e.target.value })}
                    />
                    <NumberInput
                      id={`${c.id}-pct`}
                      className="input-sm"
                      value={c.budgetPct}
                      onValueChange={(budgetPct) => update(c.id, { budgetPct })}
                      aria-invalid={!!err?.budgetPct}
                    />
                    <span className="unit">%</span>
                  </div>
                  {err?.budgetPct && <p className="field-error">{err.budgetPct}</p>}
                </div>
                <div className="field">
                  <label htmlFor={`${c.id}-roi`}>
                    Oczekiwany ROI{' '}
                    <span className="info" tabIndex={0} role="note" aria-label="ROI to zysk netto podzielony przez koszt. ROI 150% oznacza, że 1 zł wydana wraca jako 1,50 zł zysku ponad koszt, czyli 2,50 zł przychodu. To nie ROAS.">
                      ?
                      <span className="info-pop" aria-hidden="true">
                        ROI = zysk netto ÷ koszt. ROI 150% → każda wydana 1 zł wraca jako 1,50 zł zysku ponad koszt (2,50 zł przychodu). To nie
                        ROAS (przychód ÷ koszt).
                      </span>
                    </span>
                  </label>
                  <div className="pct-input">
                    <NumberInput
                      id={`${c.id}-roi`}
                      className="input-sm"
                      value={c.expectedRoiPct}
                      onValueChange={(expectedRoiPct) => update(c.id, { expectedRoiPct })}
                      aria-invalid={!!err?.roi}
                    />
                    <span className="unit">%</span>
                    {r && <span className={`roi-tag ${roiClass(r.roiPct)}`}>{roiWord(r.roiPct)}</span>}
                  </div>
                  {err?.roi && <p className="field-error">{err.roi}</p>}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      <div className="sr-only" aria-live="polite">
        {announce}
      </div>

      <div className="add-cat">
        {full ? (
          <p className="hint">Osiągnięto limit {LIMITS.maxCategories} kategorii.</p>
        ) : (
          <>
            {available.length > 0 && (
              <div className="chips" role="group" aria-label="Dodaj kanał z listy">
                {available.map((n) => (
                  <button key={n} type="button" className="chip" onClick={() => add(n)}>
                    <span className="dot" style={{ background: categoryColor(n) }} aria-hidden="true" />+ {n}
                  </button>
                ))}
              </div>
            )}
            <form
              className="custom-cat"
              onSubmit={(e) => {
                e.preventDefault();
                addCustom();
              }}
            >
              <label htmlFor={customId} className="sr-only">
                Własna kategoria
              </label>
              <input
                id={customId}
                type="text"
                placeholder="Własna kategoria, np. Influencerzy"
                value={custom}
                maxLength={LIMITS.categoryNameMax}
                onChange={(e) => {
                  setCustom(e.target.value);
                  setCustomError(null);
                }}
                aria-invalid={!!customError}
                aria-describedby={customError ? `${customId}-err` : undefined}
              />
              <button type="submit" className="btn btn-secondary">
                Dodaj
              </button>
            </form>
            {customError && (
              <p id={`${customId}-err`} className="field-error">
                {customError}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
