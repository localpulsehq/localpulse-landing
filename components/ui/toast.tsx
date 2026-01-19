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
                  "border-[#22C3A6]/40 bg-[#22C3A6]/10 text-[#E2E8F0]",
                toast.variant === "error" &&
                  "border-[#EF4444]/40 bg-[#EF4444]/10 text-[#E2E8F0]",
                toast.variant === "info" &&
                  "border-[#38BDF8]/40 bg-[#38BDF8]/10 text-[#E2E8F0]",
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

