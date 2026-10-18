import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "./Icon";

const ToastContext = createContext(null);

const tones = {
  success: { icon: "CircleCheck", className: "border-emerald-200 text-emerald-700", iconClass: "text-emerald-500" },
  error: { icon: "CircleX", className: "border-red-200 text-red-700", iconClass: "text-red-500" },
  info: { icon: "Bell", className: "border-gold/40 text-navy", iconClass: "text-gold-dark" },
};

/**
 * App-wide popup messages, e.g. `toast.success("Teacher added successfully")`, or
 * `toast.info("New leave request", { detail: "Ravi · 2 days", to: "/teacher/leave-requests" })`
 * for a clickable alert. Must sit inside the router (clicks navigate).
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(0);
  const navigate = useNavigate();

  const dismiss = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const show = useCallback(
    (message, tone = "success", { detail, to, duration } = {}) => {
      const id = ++nextId.current;
      setToasts((list) => [...list.slice(-3), { id, message, tone, detail, to }]);
      setTimeout(() => dismiss(id), duration || (to ? 7000 : 3500));
    },
    [dismiss]
  );

  const toast = useMemo(
    () => ({
      success: (message, opts) => show(message, "success", opts),
      error: (message, opts) => show(message, "error", opts),
      info: (message, opts) => show(message, "info", opts),
    }),
    [show]
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-2 w-[calc(100%-2rem)] max-w-sm pointer-events-none">
        {toasts.map((t) => {
          const tone = tones[t.tone] || tones.success;
          return (
            <div
              key={t.id}
              role="status"
              onClick={
                t.to
                  ? () => {
                      navigate(t.to);
                      dismiss(t.id);
                    }
                  : undefined
              }
              className={`pointer-events-auto w-full flex items-center gap-3 bg-white border rounded-2xl shadow-lg px-4 py-3 text-sm animate-[toast-in_0.2s_ease-out] ${tone.className} ${
                t.to ? "cursor-pointer hover:bg-gold/[0.04]" : ""
              }`}
            >
              <Icon name={tone.icon} size={18} className={`shrink-0 ${tone.iconClass}`} />
              <span className="flex-1 min-w-0">
                <span className="block font-semibold">{t.message}</span>
                {t.detail && <span className="block text-xs text-navy/60 truncate">{t.detail}</span>}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  dismiss(t.id);
                }}
                aria-label="Dismiss"
                className="text-navy/35 hover:text-navy/70"
              >
                <Icon name="X" size={15} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
