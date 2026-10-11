import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useConfirm } from './components/ConfirmDialog';
import { msSinceSessionStart, track } from './lib/analytics';
import { newId } from './lib/id';
import { parseHash, routeToHash, useHashRoute, type Route } from './lib/router';
import { emptyScenario, sampleScenario } from './lib/sample';
import { copyName, createRepository, StorageError } from './lib/storage';
import type { SavedScenario, Scenario } from './lib/types';
import { validateScenario } from './lib/validation';
import { Compare } from './screens/Compare';
import { Editor } from './screens/Editor';
import { ScenarioList } from './screens/ScenarioList';

const serialize = (s: Scenario) =>
  JSON.stringify({ ...s, updatedAt: null, categories: s.categories.map(({ name, budgetPct, expectedRoiPct }) => [name, budgetPct, expectedRoiPct]) });

interface Toast {
  id: string;
  text: string;
  kind: 'ok' | 'error';
}

function go(r: Route, replace = false) {
  const hash = routeToHash(r);
  if (window.location.hash === hash) return;
  if (replace) window.location.replace(hash);
  else window.location.hash = hash;
}

export default function App() {
  const { repo, persistent } = useMemo(createRepository, []);
  const { confirm, dialog } = useConfirm();
  const hash = useHashRoute();
  const route = parseHash(hash);

  const [loadError, setLoadError] = useState<string | null>(null);
  const [scenarios, setScenarios] = useState<SavedScenario[]>(() => {
    try {
      return repo.list();
    } catch (e) {
      setTimeout(() => setLoadError(e instanceof Error ? e.message : 'Błąd odczytu.'));
      return [];
    }
  });

  const [{ draft, baseline, isSample }, setEditor] = useState(() => {
    const initial = parseHash(window.location.hash);
    const fromRoute = initial.name === 'editor' && initial.id ? safeGet(initial.id) : null;
    const s: Scenario = fromRoute ?? (scenarios.length === 0 ? sampleScenario() : (safeGet(scenarios[0].id) ?? emptyScenario()));
    return { draft: s, baseline: serialize(s), isSample: !fromRoute && scenarios.length === 0 };
  });

  function safeGet(id: string) {
    try {
      return repo.get(id);
    } catch {
      return null;
    }
  }

  const dirty = serialize(draft) !== baseline;
  const validation = useMemo(() => validateScenario(draft), [draft]);

  const [toasts, setToasts] = useState<Toast[]>([]);
  const toast = useCallback((text: string, kind: Toast['kind'] = 'ok') => {
    const id = newId();
    setToasts((t) => [...t, { id, text, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  const refresh = useCallback(() => {
    try {
      setScenarios(repo.list());
      setLoadError(null);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Błąd odczytu.');
    }
  }, [repo]);

  const run = useCallback(
    <T,>(fn: () => T): T | undefined => {
      try {
        return fn();
      } catch (e) {
        toast(e instanceof StorageError ? e.message : 'Coś poszło nie tak. Spróbuj ponownie.', 'error');
        return undefined;
      }
    },
    [toast],
  );

  const loadIntoEditor = (s: Scenario, sample = false) => setEditor({ draft: s, baseline: serialize(s), isSample: sample });

  const confirmDiscard = useCallback(
    () =>
      confirm({
        title: 'Masz niezapisane zmiany',
        body: <p>Jeśli przejdziesz dalej, zmiany w bieżącym scenariuszu zostaną utracone.</p>,
        confirmLabel: 'Odrzuć zmiany',
        cancelLabel: 'Zostań',
        danger: true,
      }),
    [confirm],
  );

  /* Synchronizacja edytora z adresem #/edytor/<id> (także przycisk „wstecz”). */
  const syncing = useRef(false);
  useEffect(() => {
    if (route.name !== 'editor' || !route.id || route.id === draft.id || syncing.current) return;
    const target = route.id;
    syncing.current = true;
    (async () => {
      if (dirty && !(await confirmDiscard())) {
        go({ name: 'editor', id: draft.id }, true);
        return;
      }
      const s = safeGet(target);
      if (s) loadIntoEditor(s);
      else {
        toast('Nie znaleziono scenariusza.', 'error');
        go({ name: 'editor', id: draft.id }, true);
      }
    })().finally(() => {
      syncing.current = false;
    });
  }, [hash]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Ostrzeżenie o niezapisanych zmianach przy zamykaniu karty. */
  useEffect(() => {
    if (!dirty) return;
    const on = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', on);
    return () => window.removeEventListener('beforeunload', on);
  }, [dirty]);

  useEffect(() => {
    const titles = { editor: 'Edytor', list: 'Moje scenariusze', compare: 'Porównanie A vs B' } as const;
    document.title = `${titles[route.name]} · Planer budżetu social media`;
  }, [route.name]);

  /* ----------------------------- akcje ----------------------------- */

  function save() {
    const wasFirst = scenarios.length === 0;
    const saved = run(() => repo.save(draft));
    if (!saved) return;
    loadIntoEditor(saved);
    refresh();
    track('scenario_saved', { categories: saved.categories.length });
    if (wasFirst) track('first_save', { ms: msSinceSessionStart() });
    toast(`Zapisano „${saved.name}”.`);
    go({ name: 'editor', id: saved.id }, true);
  }

  async function duplicateCurrent() {
    if (
      dirty &&
      draft.id &&
      !(await confirm({
        title: 'Duplikować z niezapisanymi zmianami?',
        body: <p>Kopia będzie zawierać bieżące zmiany. Oryginał pozostanie w ostatnio zapisanej wersji.</p>,
        confirmLabel: 'Utwórz kopię',
      }))
    )
      return;
    const copy = run(() =>
      repo.save({
        ...draft,
        id: null,
        name: copyName(draft.name.trim() || 'Scenariusz'),
        categories: draft.categories.map((c) => ({ ...c, id: newId() })),
      }),
    );
    if (!copy) return;
    loadIntoEditor(copy);
    refresh();
    track('scenario_duplicated', { from: 'editor' });
    toast(`Utworzono „${copy.name}”.`);
    go({ name: 'editor', id: copy.id }, true);
  }

  async function newScenario() {
    if (dirty && !(await confirmDiscard())) return;
    loadIntoEditor(emptyScenario());
    go({ name: 'editor', id: null });
  }

  function clearSample() {
    loadIntoEditor(emptyScenario());
  }

  function openScenario(id: string) {
    go({ name: 'editor', id });
  }

  function duplicateFromList(id: string) {
    const copy = run(() => repo.duplicate(id));
    if (!copy) return;
    refresh();
    track('scenario_duplicated', { from: 'list' });
    toast(`Utworzono „${copy.name}”.`);
  }

  function renameFromList(id: string, name: string) {
    const saved = run(() => repo.rename(id, name));
    if (!saved) return;
    if (draft.id === id) {
      if (dirty) setEditor((e) => ({ ...e, draft: { ...e.draft, name: saved.name } }));
      else loadIntoEditor(saved);
    }
    refresh();
    toast('Zmieniono nazwę.');
  }

  async function deleteScenario(s: SavedScenario) {
    const ok = await confirm({
      title: `Usunąć „${s.name}”?`,
      body: <p>Tej operacji nie można cofnąć.</p>,
      confirmLabel: 'Usuń',
      danger: true,
    });
    if (!ok) return;
    const removed = run(() => {
      repo.remove(s.id);
      return true;
    });
    if (!removed) return;
    if (draft.id === s.id) setEditor((e) => ({ ...e, draft: { ...e.draft, id: null, updatedAt: null }, baseline: '' }));
    refresh();
    track('scenario_deleted');
    toast(`Usunięto „${s.name}”.`);
  }

  /* ----------------------------- widok ----------------------------- */

  const editorHash = routeToHash({ name: 'editor', id: draft.id });
  const listHash = routeToHash({ name: 'list' });
  const compareHash = routeToHash({ name: 'compare', a: null, b: null });

  return (
    <div className="app">
      <a className="skip-link" href="#main" onClick={(e) => (e.preventDefault(), document.getElementById('main')?.focus())}>
        Przejdź do treści
      </a>
      <header className="header">
        <div className="header-inner">
          <a href={editorHash} className="brand">
            <span className="brand-mark" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="22" height="22">
                <path d="M12 3a9 9 0 1 0 9 9h-9z" fill="currentColor" opacity=".9" />
                <path d="M14 1.5V10h8.5A8.5 8.5 0 0 0 14 1.5z" fill="currentColor" opacity=".5" />
              </svg>
            </span>
            Planer budżetu
          </a>
          <nav aria-label="Główna nawigacja">
            <ul className="nav">
              <li>
                <a href={editorHash} aria-current={route.name === 'editor' ? 'page' : undefined}>
                  Edytor{dirty && <span className="nav-dot" title="Niezapisane zmiany" aria-label="(niezapisane zmiany)" />}
                </a>
              </li>
              <li>
                <a href={listHash} aria-current={route.name === 'list' ? 'page' : undefined}>
                  Moje scenariusze <span className="count">{scenarios.length}</span>
                </a>
              </li>
              <li>
                <a href={compareHash} aria-current={route.name === 'compare' ? 'page' : undefined}>
                  Porównaj
                </a>
              </li>
            </ul>
          </nav>
        </div>
      </header>

      {!persistent && (
        <div className="banner" role="status">
          Pamięć przeglądarki jest niedostępna (np. tryb prywatny). Scenariusze znikną po zamknięciu karty.
        </div>
      )}

      <main id="main" tabIndex={-1} className="main">
        {route.name === 'editor' && (
          <Editor
            scenario={draft}
            validation={validation}
            dirty={dirty}
            isSample={isSample && draft.id === null}
            onChange={(s) => setEditor((e) => ({ ...e, draft: s }))}
            onSave={save}
            onDuplicate={duplicateCurrent}
            onNew={newScenario}
            onClearSample={clearSample}
          />
        )}
        {route.name === 'list' && (
          <ScenarioList
            scenarios={scenarios}
            currentId={draft.id}
            error={loadError}
            onOpen={openScenario}
            onRename={renameFromList}
            onDuplicate={duplicateFromList}
            onDelete={deleteScenario}
            onCompare={(a, b) => go({ name: 'compare', a, b })}
            onNew={newScenario}
          />
        )}
        {route.name === 'compare' && (
          <Compare
            scenarios={scenarios}
            aId={route.a}
            bId={route.b}
            onSelect={(a, b) => go({ name: 'compare', a, b }, true)}
            onGoToList={() => go({ name: 'list' })}
          />
        )}
      </main>

      <footer className="footer">
        <p>
          Dane zapisywane lokalnie w tej przeglądarce. ROI = zysk netto ÷ koszt. Wyniki to prognoza na podstawie Twoich założeń.
        </p>
      </footer>

      <div className="toasts" aria-live="polite" role="status">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.kind}`}>
            {t.text}
          </div>
        ))}
      </div>
      {dialog}
    </div>
  );
}
