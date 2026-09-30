export const inputClass =
  "w-full px-3.5 py-2.5 rounded-xl border border-navy/15 text-sm text-navy placeholder:text-navy/30 focus:border-gold focus:ring-2 focus:ring-gold/15 outline-none transition-colors bg-white disabled:bg-navy/5 disabled:text-navy/40";

export default function FormField({ label, htmlFor, required, hint, error, children }) {
  return (
    <div>
      {label && (
        <label className="block text-xs font-semibold text-navy/70 mb-1.5" htmlFor={htmlFor}>
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      {children}
      {hint && !error && <p className="text-xs text-navy/40 mt-1">{hint}</p>}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
