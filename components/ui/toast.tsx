"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  ReactNode,
} from "react";

type ToastVariant = "success" | "error" | "info";

type Toast = {
  id: number;
  message: string;
  variant: ToastVariant;
};

type ToastContextValue = {
  showToast: (message: string, variant?: ToastVariant) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback(
    (message: string, variant: ToastVariant = "info") => {
      setToasts((prev) => {
        const id = Date.now();
        return [...prev, { id, message, variant }];
      });

      // Auto-dismiss after 3s
      setTimeout(() => {
        setToasts((prev) => prev.slice(1));
      }, 3000);
    },
    []
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Toast stack */}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-[60] flex justify-center">
        <div className="flex w-full max-w-md flex-col gap-2 px-4">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={[
                "pointer-events-auto rounded-lg border px-3 py-2 text-xs shadow-lg animate-fade-in",
                toast.variant === "success" &&
                  "border-emerald-500/40 bg-emerald-500/10 text-emerald-100",
                toast.variant === "error" &&
                  "border-red-500/40 bg-red-500/10 text-red-100",
                toast.variant === "info" &&
                  "border-sky-500/40 bg-sky-500/10 text-sky-100",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {toast.message}
            </div>
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used inside <ToastProvider>");
  }
  return ctx;
}
