type EventName = 'scenario_saved' | 'scenario_duplicated' | 'scenario_deleted' | 'compare_opened' | 'chart_exported' | 'first_save';

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
  }
}

/** Zdarzenia produktowe z PRD (np. `compare_opened`). Trafiają do `window.dataLayer`, jeśli jest podpięty. */
export function track(event: EventName, props: Record<string, unknown> = {}) {
  const payload = { event, ts: new Date().toISOString(), ...props };
  if (typeof window !== 'undefined') {
    window.dataLayer?.push(payload);
    if (import.meta.env.DEV) console.debug('[analytics]', payload);
  }
}

const SESSION_START = Date.now();
export function msSinceSessionStart() {
  return Date.now() - SESSION_START;
}
