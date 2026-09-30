import { useState } from "react";
import PortalPageHeader from "../../components/portal/PortalPageHeader";
import Card from "../../components/ui/Card";
import Banner from "../../components/portal/Banner";
import EmptyState from "../../components/portal/EmptyState";
import FormField, { inputClass } from "../../components/portal/FormField";
import { useMyTeacherProfile } from "../../hooks/useMyTeacherProfile";
import { useApiResource } from "../../hooks/useApiResource";
import { api, ApiError } from "../../lib/apiClient";
import { formatDate } from "../../utils/formatDate";

export default function ClassNotices() {
  const { classCode, loading: loadingProfile } = useMyTeacherProfile();
  const { data: notices, loading, error, reload } = useApiResource(`/classes/${classCode}/notices`, {
    enabled: Boolean(classCode),
  });
  const [form, setForm] = useState({ title: "", body: "" });
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");
    setSubmitting(true);
    try {
      await api.post("/notices", { title: form.title, body: form.body, class_code: classCode, audience: "students" });
      setForm({ title: "", body: "" });
      reload();
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!loadingProfile && !classCode) {
    return (
      <div>
        <PortalPageHeader title="Class Notices" />
        <EmptyState
          icon="Bell"
          title="You are not a Class Teacher"
          description="Class notices can only be posted by the assigned Class Teacher."
        />
      </div>
    );
  }

  return (
    <div>
      <PortalPageHeader title="Class Notices" description={classCode ? `Class ${classCode}` : undefined} />

      <div className="grid lg:grid-cols-3 gap-5">
        <Card className="p-5 lg:col-span-1">
          <h2 className="font-heading font-bold text-navy text-sm mb-4">Post a Notice</h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <FormField label="Title" htmlFor="title" required>
              <input
                id="title"
                required
                minLength={2}
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className={inputClass}
              />
            </FormField>
            <FormField label="Message" htmlFor="body" required>
              <textarea
                id="body"
                required
                rows={4}
                value={form.body}
                onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                className={inputClass}
              />
            </FormField>
            {submitError && <Banner tone="error">{submitError}</Banner>}
            <button
              type="submit"
              disabled={submitting}
              className="bg-gold text-navy-dark font-semibold text-sm py-2.5 rounded-full hover:bg-gold-light transition-colors disabled:opacity-60"
            >
              {submitting ? "Posting…" : "Post Notice"}
            </button>
          </form>
        </Card>

        <Card className="p-5 lg:col-span-2">
          <h2 className="font-heading font-bold text-navy text-sm mb-4">Posted Notices</h2>
          {error && <Banner tone="error">{error.message}</Banner>}
          {!loading && (notices || []).length === 0 && <p className="text-sm text-navy/50">No notices posted yet.</p>}
          <div className="flex flex-col gap-3">
            {(notices || []).map((n) => (
              <div key={n.id} className="pb-3 border-b border-navy/6 last:border-0">
                <p className="text-sm font-semibold text-navy">{n.title}</p>
                <p className="text-sm text-navy/60 mt-0.5">{n.body}</p>
                <p className="text-xs text-navy/40 mt-1">{formatDate(n.created_at)}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
