import Icon from "../ui/Icon";

/** Centered "are you sure?" box with explicit Yes / No buttons. `children` adds extra content (e.g. a typed check). */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Yes",
  cancelLabel = "No",
  danger = false,
  busy = false,
  confirmDisabled = false,
  onConfirm,
  onCancel,
  children,
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <button type="button" aria-label="Close" onClick={busy ? undefined : onCancel} className="absolute inset-0 bg-navy-dark/50" />
      <div className="relative w-full max-w-md max-h-[90svh] overflow-y-auto rounded-2xl bg-white shadow-xl p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span
            className={`flex items-center justify-center w-10 h-10 rounded-full shrink-0 ${
              danger ? "bg-red-50 text-red-600" : "bg-gold/15 text-gold-dark"
            }`}
          >
            <Icon name={danger ? "AlertTriangle" : "CircleCheck"} size={20} />
          </span>
          <div className="min-w-0">
            <h2 id="confirm-title" className="font-heading font-bold text-navy text-base">{title}</h2>
            {message && <div className="text-sm text-navy/65 mt-1.5 space-y-1.5">{message}</div>}
          </div>
        </div>
        {children && <div className="mt-4">{children}</div>}
        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="flex-1 py-2.5 rounded-full border border-navy/15 text-sm font-semibold text-navy hover:bg-navy/5 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy || confirmDisabled}
            className={`flex-1 py-2.5 rounded-full text-sm font-semibold transition-colors disabled:opacity-50 ${
              danger ? "bg-red-600 text-white hover:bg-red-700" : "bg-gold text-navy-dark hover:bg-gold-light"
            }`}
          >
            {busy ? "Please wait…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
