"use client";
/**
 * Toast provider — minimal, used across client + admin pages.
 * Usage: const { toast } = useToast(); toast({ title, kind: "success" });
 */
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from "lucide-react";

type ToastKind = "success" | "error" | "warning" | "info";
interface Toast {
  id: number;
  title: string;
  description?: string;
  kind: ToastKind;
}
interface ToastCtx {
  toast: (t: { title: string; description?: string; kind?: ToastKind }) => void;
}

const Ctx = createContext<ToastCtx | null>(null);

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback<ToastCtx["toast"]>((t) => {
    const id = nextId++;
    setToasts((cur) => [...cur, { id, title: t.title, description: t.description, kind: t.kind ?? "info" }]);
    setTimeout(() => setToasts((cur) => cur.filter((x) => x.id !== id)), 5000);
  }, []);

  const dismiss = (id: number) => setToasts((cur) => cur.filter((x) => x.id !== id));

  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
        {toasts.map((t) => {
          const Icon = t.kind === "success" ? CheckCircle2
            : t.kind === "error" ? XCircle
            : t.kind === "warning" ? AlertTriangle
            : Info;
          const color = t.kind === "success" ? "text-emerald-600"
            : t.kind === "error" ? "text-red-600"
            : t.kind === "warning" ? "text-amber-600"
            : "text-navy-700";
          return (
            <div key={t.id} className="card p-4 flex gap-3 items-start animate-in slide-in-from-bottom-2">
              <Icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${color}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text">{t.title}</p>
                {t.description && <p className="text-xs text-muted mt-0.5">{t.description}</p>}
              </div>
              <button onClick={() => dismiss(t.id)} className="text-muted hover:text-text">
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </Ctx.Provider>
  );
}

export function useToast(): ToastCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}
