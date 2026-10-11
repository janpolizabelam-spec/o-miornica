import { newId } from './id';
import type { SavedScenario, Scenario } from './types';

/**
 * Tryb gościa: scenariusze zapisywane w localStorage przeglądarki.
 * Interfejs `ScenarioRepository` pozwala później podmienić go na API z kontami (PRD: otwarte pytanie o logowanie).
 */
export interface ScenarioRepository {
  list(): SavedScenario[];
  get(id: string): SavedScenario | null;
  save(s: Scenario): SavedScenario;
  duplicate(id: string): SavedScenario;
  rename(id: string, name: string): SavedScenario;
  remove(id: string): void;
}

const KEY = 'planer-budzetu:scenarios:v1';

export class StorageError extends Error {}

function now() {
  return new Date().toISOString();
}

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

export function copyName(name: string): string {
  const suffix = ' (kopia)';
  return name.length + suffix.length > 60 ? `${name.slice(0, 60 - suffix.length)}${suffix}` : `${name}${suffix}`;
}

export class LocalScenarioRepository implements ScenarioRepository {
  constructor(private readonly store: Pick<Storage, 'getItem' | 'setItem'> = window.localStorage) {}

  private readAll(): SavedScenario[] {
    try {
      const raw = this.store.getItem(KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed) ? (parsed as SavedScenario[]) : [];
    } catch {
      throw new StorageError('Nie udało się odczytać zapisanych scenariuszy.');
    }
  }

  private writeAll(list: SavedScenario[]) {
    try {
      this.store.setItem(KEY, JSON.stringify(list));
    } catch {
      throw new StorageError('Nie udało się zapisać — pamięć przeglądarki jest niedostępna lub pełna.');
    }
  }

  list(): SavedScenario[] {
    return this.readAll().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  get(id: string): SavedScenario | null {
    const found = this.readAll().find((s) => s.id === id);
    return found ? clone(found) : null;
  }

  save(s: Scenario): SavedScenario {
    const all = this.readAll();
    const saved: SavedScenario = {
      ...clone(s),
      name: s.name.trim(),
      categories: s.categories.map((c) => ({ ...c, name: c.name.trim() })),
      id: s.id ?? newId(),
      updatedAt: now(),
    };
    const idx = all.findIndex((x) => x.id === saved.id);
    if (idx === -1) all.push(saved);
    else all[idx] = saved;
    this.writeAll(all);
    return clone(saved);
  }

  duplicate(id: string): SavedScenario {
    const src = this.get(id);
    if (!src) throw new StorageError('Scenariusz nie istnieje.');
    return this.save({
      ...src,
      id: null,
      name: copyName(src.name),
      categories: src.categories.map((c) => ({ ...c, id: newId() })),
    });
  }

  rename(id: string, name: string): SavedScenario {
    const src = this.get(id);
    if (!src) throw new StorageError('Scenariusz nie istnieje.');
    return this.save({ ...src, name });
  }

  remove(id: string): void {
    this.writeAll(this.readAll().filter((s) => s.id !== id));
  }
}

export class MemoryStorage implements Pick<Storage, 'getItem' | 'setItem'> {
  private data = new Map<string, string>();
  getItem(k: string) {
    return this.data.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.data.set(k, v);
  }
}

/** Gdy localStorage jest zablokowany (tryb prywatny), działamy w pamięci i pokazujemy ostrzeżenie. */
export function createRepository(): { repo: ScenarioRepository; persistent: boolean } {
  try {
    const probe = '__planer_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return { repo: new LocalScenarioRepository(window.localStorage), persistent: true };
  } catch {
    return { repo: new LocalScenarioRepository(new MemoryStorage()), persistent: false };
  }
}
