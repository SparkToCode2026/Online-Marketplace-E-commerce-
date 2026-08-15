import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { TrashIcon, InfoIcon } from "./icons";

type ConfirmTone = "danger" | "default";

interface ConfirmOptions {
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
}

interface PendingConfirm extends ConfirmOptions {
  message: string;
  resolve: (ok: boolean) => void;
}

interface ConfirmContextValue {
  confirm: (message: string, options?: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

// Access the confirm() function from any component under <ConfirmProvider>.
// Usage: const confirm = useConfirm(); if (!(await confirm("Delete X?"))) return;
export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used inside <ConfirmProvider>");
  return ctx.confirm;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  const confirm = useCallback((message: string, options: ConfirmOptions = {}) => {
    return new Promise<boolean>((resolve) => {
      setPending({ message, resolve, ...options });
    });
  }, []);

  const settle = (ok: boolean) => {
    pending?.resolve(ok);
    setPending(null);
  };

  const tone = pending?.tone ?? "danger";
  const Icon = tone === "danger" ? TrashIcon : InfoIcon;

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {pending && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
          onClick={() => settle(false)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            className="w-full max-w-sm rounded-2xl bg-surface p-6 text-ink shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                  tone === "danger" ? "bg-accent-100 text-accent-700" : "bg-ink/5 text-ink/70"
                }`}
              >
                <Icon className="h-5 w-5" />
              </span>
              <div className="flex-1 pt-1">
                <h2 id="confirm-dialog-title" className="font-heading text-h4">
                  {pending.title ?? "Are you sure?"}
                </h2>
                <p className="mt-1 text-sm text-ink/70">{pending.message}</p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => settle(false)}
                className="rounded-full px-4 py-2 text-sm font-medium text-ink/70 hover:bg-ink/5"
              >
                {pending.cancelLabel ?? "Cancel"}
              </button>
              <button
                type="button"
                autoFocus
                onClick={() => settle(true)}
                className={`rounded-full px-4 py-2 text-sm font-medium text-white shadow-sm ${
                  tone === "danger" ? "bg-accent-600 hover:bg-accent-700" : "bg-ink hover:bg-ink/90"
                }`}
              >
                {pending.confirmLabel ?? "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
