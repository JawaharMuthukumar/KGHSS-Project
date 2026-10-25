import { useState } from "react";
import Icon from "../ui/Icon";
import Banner from "./Banner";
import FormField, { inputClass } from "./FormField";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../ui/Toast";
import { api, ApiError } from "../../lib/apiClient";

/** HM changes their own sign-in Staff ID (e.g. when a new Headmaster takes over). Needs the current password. */
export default function ChangeStaffIdDialog({ open, onClose }) {
  const { user, updateUser } = useAuth();
  const toast = useToast();
  const [newId, setNewId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const close = () => {
    setNewId("");
    setPassword("");
    setError("");
    onClose();
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await api.post("/auth/change-username", { new_username: newId.trim(), password });
      updateUser({ ...user, ...res.user });
      toast.success(`Staff ID changed to ${res.user.username}. Use it next time you sign in.`);
      close();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not change the Staff ID. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="sid-title">
      <button type="button" aria-label="Close" onClick={saving ? undefined : close} className="absolute inset-0 bg-navy-dark/50" />
      <form onSubmit={submit} className="relative w-full max-w-md rounded-2xl bg-white shadow-xl p-5 sm:p-6 flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <span className="flex items-center justify-center w-10 h-10 rounded-full bg-gold/15 text-gold-dark shrink-0">
            <Icon name="UserCog" size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="sid-title" className="font-heading font-bold text-navy text-base">Change Staff ID</h2>
            <p className="text-sm text-navy/60 mt-0.5">
              Current: <strong className="text-navy">{user?.username}</strong>
            </p>
          </div>
          <button type="button" onClick={close} aria-label="Close" className="text-navy/45 hover:text-navy">
            <Icon name="X" size={20} />
          </button>
        </div>

        <FormField label="New Staff ID" htmlFor="sid-new" required hint="Letters, numbers and - / _ . (e.g. GHSS-HM-002).">
          <input id="sid-new" required minLength={3} maxLength={40} value={newId} onChange={(e) => setNewId(e.target.value)} className={inputClass} />
        </FormField>
        <FormField label="Your password" htmlFor="sid-password" required hint="To confirm it's you.">
          <div className="relative">
            <input
              id="sid-password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${inputClass} pr-11`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-navy/45 hover:text-navy"
            >
              <Icon name={showPassword ? "EyeOff" : "Eye"} size={17} />
            </button>
          </div>
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
            disabled={saving || newId.trim().length < 3}
            className="flex-1 py-2.5 rounded-full bg-gold text-navy-dark text-sm font-semibold hover:bg-gold-light transition-colors disabled:opacity-50"
          >
            {saving ? "Saving…" : "Change Staff ID"}
          </button>
        </div>
      </form>
    </div>
  );
}
