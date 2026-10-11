import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

interface ConfirmOptions {
  title: string;
  body?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface Pending extends ConfirmOptions {
  resolve: (ok: boolean) => void;
}

/** Dostępne okno potwierdzenia oparte na <dialog> (fokus, Esc, blokada tła). */
export function useConfirm() {
  const [pending, setPending] = useState<Pending | null>(null);
  const ref = useRef<HTMLDialogElement>(null);

  const confirm = useCallback(
    (opts: ConfirmOptions) => new Promise<boolean>((resolve) => setPending({ ...opts, resolve })),
    [],
  );

  useEffect(() => {
    const d = ref.current;
    if (pending && d && !d.open) d.showModal?.();
  }, [pending]);

  const close = (ok: boolean) => {
    ref.current?.close?.();
    pending?.resolve(ok);
    setPending(null);
  };

  const dialog = pending ? (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby="confirm-title"
      onCancel={(e) => {
        e.preventDefault();
        close(false);
      }}
    >
      <h2 id="confirm-title" className="dialog-title">
        {pending.title}
      </h2>
      {pending.body && <div className="dialog-body">{pending.body}</div>}
      <div className="dialog-actions">
        <button type="button" className="btn btn-secondary" onClick={() => close(false)} autoFocus>
          {pending.cancelLabel ?? 'Anuluj'}
        </button>
        <button type="button" className={`btn ${pending.danger ? 'btn-danger' : 'btn-primary'}`} onClick={() => close(true)}>
          {pending.confirmLabel ?? 'Potwierdź'}
        </button>
      </div>
    </dialog>
  ) : null;

  return { confirm, dialog };
}
