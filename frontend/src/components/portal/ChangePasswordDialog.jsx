import { useState } from "react";
import Icon from "../ui/Icon";
import Banner from "./Banner";
import FormField, { inputClass } from "./FormField";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../ui/Toast";
import { api, ApiError } from "../../lib/apiClient";

/** Password box with a show/hide (eye) button. */
function PasswordInput({ id, value, onChange, autoComplete }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        type={visible ? "text" : "password"}
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        className={`${inputClass} pr-11`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-navy/45 hover:text-navy"
      >
        <Icon name={visible ? "EyeOff" : "Eye"} size={17} />
      </button>
    </div>
  );
}

/** Change your own password: current, new, confirm. Clears the "default password" reminder on success. */
export default function ChangePasswordDialog({ open, onClose }) {
  const { user, updateUser } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
  const close = () => {
    setForm({ current: "", next: "", confirm: "" });
    setError("");
    onClose();
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.next.length < 8) return setError("The new password must be at least 8 characters.");
    if (form.next !== form.confirm) return setError("The new passwords don't match.");
    setSaving(true);
    try {
      const res = await api.post("/auth/change-password", { old_password: form.current, new_password: form.next });
      if (res?.user) updateUser({ ...user, ...res.user });
      toast.success("Password changed. Use the new password next time you sign in.");
      close();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not change the password. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="pw-title">
      <button type="button" aria-label="Close" onClick={saving ? undefined : close} className="absolute inset-0 bg-navy-dark/50" />
      <form onSubmit={submit} className="relative w-full max-w-md max-h-[90svh] overflow-y-auto rounded-2xl bg-white shadow-xl p-5 sm:p-6 flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <span className="flex items-center justify-center w-10 h-10 rounded-full bg-gold/15 text-gold-dark shrink-0">
            <Icon name="KeyRound" size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="pw-title" className="font-heading font-bold text-navy text-base">Change Password</h2>
            <p className="text-sm text-navy/60 mt-0.5">{user?.username}</p>
          </div>
          <button type="button" onClick={close} aria-label="Close" className="text-navy/45 hover:text-navy">
            <Icon name="X" size={20} />
          </button>
        </div>

        <FormField label="Current password" htmlFor="pw-current" required>
          <PasswordInput id="pw-current" value={form.current} onChange={set("current")} autoComplete="current-password" />
        </FormField>
        <FormField label="New password" htmlFor="pw-new" required hint="At least 8 characters.">
          <PasswordInput id="pw-new" value={form.next} onChange={set("next")} autoComplete="new-password" />
        </FormField>
        <FormField label="Confirm new password" htmlFor="pw-confirm" required>
          <PasswordInput id="pw-confirm" value={form.confirm} onChange={set("confirm")} autoComplete="new-password" />
        </FormField>

        {error && <Banner tone="error">{error}</Banner>}

        <div className="flex gap-3 mt-1">
          <button
            type="button"
            onClick={close}
            disabled={saving}
            className="flex-1 py-2.5 rounded-full border border-navy/15 text-sm font-semibold text-navy hover:bg-navy/5 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 py-2.5 rounded-full bg-gold text-navy-dark text-sm font-semibold hover:bg-gold-light transition-colors disabled:opacity-50"
          >
            {saving ? "Saving…" : "Change Password"}
          </button>
        </div>
      </form>
    </div>
  );
}
