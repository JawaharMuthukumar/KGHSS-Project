import { useState } from "react";
import PortalPageHeader from "../../components/portal/PortalPageHeader";
import Card from "../../components/ui/Card";
import Icon from "../../components/ui/Icon";
import Badge from "../../components/ui/Badge";
import Banner from "../../components/portal/Banner";
import FormField, { inputClass } from "../../components/portal/FormField";
import { useApiResource } from "../../hooks/useApiResource";
import { api, ApiError } from "../../lib/apiClient";
import { formatDate } from "../../utils/formatDate";
import { ContentSkeleton } from "../../components/ui/Skeleton";
import NoticeAuthor from "../../components/portal/NoticeAuthor";

const audiences = [
  { value: "website", label: "Public Website" },
  { value: "all", label: "All (Teachers & Students)" },
  { value: "students", label: "All Students" },
  { value: "teachers", label: "All Teachers" },
];

const TABS = [
  { key: "website", label: "Website", audiences: ["website"] },
  { key: "teachers", label: "Teachers", audiences: ["teachers", "all"] },
  { key: "students", label: "Students", audiences: ["students", "all", "class"] },
];
const tabFor = (audience) => (audience === "website" ? "website" : audience === "teachers" ? "teachers" : "students");

export default function AdminNotices() {
  const { data: notices, loading, error, reload } = useApiResource("/portal/notices");
  const { data: classes } = useApiResource("/classes");
  const [tab, setTab] = useState("website");
  const [form, setForm] = useState({ title: "", body: "", audience: "website" });
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");
    setSubmitting(true);
    try {
      await api.post("/notices", form);
      setTab(tabFor(form.audience));
      setForm({ title: "", body: "", audience: "website" });
      reload();
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Unpublish this notice?")) return;
    await api.delete(`/notices/${id}`);
    reload();
  };

  const shown = (notices || []).filter((n) => TABS.find((t) => t.key === tab).audiences.includes(n.audience));
  // Students tab: school-wide student notices first, then each class's notices in class order.
  const groups =
    tab === "students"
      ? [
          { key: "school", title: "All Students", items: shown.filter((n) => !n.class_code) },
          ...(classes || []).map((c) => ({ key: c.code, title: c.code, items: shown.filter((n) => n.class_code === c.code) })),
        ].filter((g) => g.items.length > 0)
      : [{ key: tab, title: null, items: shown }];

  const renderNotice = (n) => (
    <div key={n.id} className="flex items-start gap-3 pb-3 border-b border-navy/6 last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-sm font-semibold text-navy">{n.title}</p>
          {n.audience === "all" && <Badge tone="navy">Teachers &amp; Students</Badge>}
        </div>
        <p className="text-sm text-navy/60 whitespace-pre-line">{n.body}</p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
          {n.audience === "class" && <NoticeAuthor notice={n} />}
          <p className="text-xs text-navy/40">{formatDate(n.created_at)}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => handleDelete(n.id)}
        className="text-red-500/70 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 shrink-0"
        aria-label="Unpublish"
      >
        <Icon name="Trash2" size={15} />
      </button>
    </div>
  );

  return (
    <div>
      <PortalPageHeader title="Notices" description="Publish and manage school notices." />

      <div className="grid lg:grid-cols-3 gap-5">
        <Card className="p-5 lg:col-span-1">
          <h2 className="font-heading font-bold text-navy text-sm mb-4">Post a Notice</h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <FormField label="Title" htmlFor="n-title" required>
              <input
                id="n-title"
                required
                minLength={2}
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className={inputClass}
              />
            </FormField>
            <FormField label="Audience" htmlFor="n-audience" required>
              <select
                id="n-audience"
                value={form.audience}
                onChange={(e) => setForm((f) => ({ ...f, audience: e.target.value }))}
                className={inputClass}
              >
                {audiences.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Message" htmlFor="n-body" required>
              <textarea
                id="n-body"
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
          <h2 className="font-heading font-bold text-navy text-sm mb-3">Posted Notices</h2>
          <div className="flex items-center gap-1 mb-4 border-b border-navy/8" role="tablist">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={tab === t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
                  tab === t.key ? "border-gold text-navy" : "border-transparent text-navy/45 hover:text-navy"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          {error && <Banner tone="error">{error.message}</Banner>}
          {loading && <ContentSkeleton rows={4} />}
          {!loading && shown.length === 0 && <p className="text-sm text-navy/50">No notices here yet.</p>}
          {!loading && (
            <div className="flex flex-col gap-5">
              {groups.map((g) => (
                <div key={g.key}>
                  {g.title && (
                    <p className="text-xs font-semibold uppercase tracking-wide text-navy/45 mb-2">
                      {g.title} <span className="text-navy/30">· {g.items.length}</span>
                    </p>
                  )}
                  <div className="flex flex-col gap-3">{g.items.map(renderNotice)}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
