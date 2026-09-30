import { useMemo, useState } from "react";
import PortalPageHeader from "../../components/portal/PortalPageHeader";
import Card from "../../components/ui/Card";
import Icon from "../../components/ui/Icon";
import Badge from "../../components/ui/Badge";
import Banner from "../../components/portal/Banner";
import Drawer from "../../components/portal/Drawer";
import FormField, { inputClass } from "../../components/portal/FormField";
import { useApiResource } from "../../hooks/useApiResource";
import { api, ApiError } from "../../lib/apiClient";

const emptyForm = { full_name: "", subject: "", phone: "", password: "" };

export default function Teachers() {
  const { data: teachers, loading, error, reload } = useApiResource("/teachers");
  const [search, setSearch] = useState("");
  const [drawer, setDrawer] = useState(null); // { mode: 'create' | 'edit', teacher? }
  const [credentials, setCredentials] = useState(null);

  const filtered = useMemo(() => {
    const list = teachers || [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (t) => t.full_name.toLowerCase().includes(q) || t.subject.toLowerCase().includes(q) || t.employee_id.toLowerCase().includes(q)
    );
  }, [teachers, search]);

  const handleDeactivate = async (teacher) => {
    if (!window.confirm(`Deactivate ${teacher.full_name}? They will no longer be able to sign in.`)) return;
    await api.delete(`/teachers/${teacher.id}`);
    reload();
  };

  const handleReactivate = async (teacher) => {
    await api.patch(`/teachers/${teacher.id}`, { is_active: true });
    reload();
  };

  return (
    <div>
      <PortalPageHeader
        title="Teachers"
        description="Add teachers, edit their details, or deactivate accounts."
        actions={
          <button
            type="button"
            onClick={() => setDrawer({ mode: "create" })}
            className="flex items-center gap-1.5 bg-gold text-navy-dark font-semibold text-sm px-4 py-2.5 rounded-full hover:bg-gold-light transition-colors"
          >
            <Icon name="UserPlus" size={16} />
            Add Teacher
          </button>
        }
      />

      {error && <Banner tone="error" className="mb-4">Could not load teachers. {error.message}</Banner>}

      <Card className="p-0 overflow-hidden">
        <div className="p-4 border-b border-navy/8">
          <div className="relative max-w-xs">
            <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy/35" />
            <input
              type="text"
              placeholder="Search by name, subject, ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`${inputClass} pl-9`}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-navy/45 border-b border-navy/8">
                <th className="px-4 py-3">Teacher</th>
                <th className="px-4 py-3">Employee ID</th>
                <th className="px-4 py-3">Subject</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-navy/40">
                    Loading…
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-navy/40">
                    No teachers found.
                  </td>
                </tr>
              )}
              {filtered.map((t) => (
                <tr key={t.id} className="border-b border-navy/6 last:border-0 hover:bg-navy/[0.02]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center justify-center w-8 h-8 rounded-full bg-navy/8 text-navy text-xs font-bold shrink-0">
                        {t.full_name.slice(0, 1)}
                      </span>
                      <span className="font-medium text-navy">{t.full_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-navy/70">{t.employee_id}</td>
                  <td className="px-4 py-3 text-navy/70">{t.subject}</td>
                  <td className="px-4 py-3 text-navy/70">{t.phone || "—"}</td>
                  <td className="px-4 py-3">
                    <Badge tone={t.is_active ? "success" : "danger"}>{t.is_active ? "Active" : "Inactive"}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setDrawer({ mode: "edit", teacher: t })}
                        className="text-navy/50 hover:text-navy p-1.5 rounded-lg hover:bg-navy/6"
                        aria-label="Edit"
                      >
                        <Icon name="Pencil" size={15} />
                      </button>
                      {t.is_active ? (
                        <button
                          type="button"
                          onClick={() => handleDeactivate(t)}
                          className="text-red-500/70 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50"
                          aria-label="Deactivate"
                        >
                          <Icon name="Trash2" size={15} />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleReactivate(t)}
                          className="text-emerald-600/70 hover:text-emerald-600 p-1.5 rounded-lg hover:bg-emerald-50"
                          aria-label="Reactivate"
                        >
                          <Icon name="RefreshCw" size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Drawer
        open={Boolean(drawer)}
        onClose={() => {
          setDrawer(null);
          setCredentials(null);
        }}
        title={credentials ? "Teacher Created" : drawer?.mode === "edit" ? "Edit Teacher" : "Add Teacher"}
      >
        {drawer && !credentials && (
          <TeacherForm
            mode={drawer.mode}
            teacher={drawer.teacher}
            onCancel={() => setDrawer(null)}
            onSuccess={(created) => {
              reload();
              if (created) setCredentials(created);
              else setDrawer(null);
            }}
          />
        )}
        {credentials && (
          <div className="flex flex-col gap-4">
            <Banner tone="success">Teacher account created. Share these login details securely.</Banner>
            <div className="bg-navy-dark text-white rounded-2xl p-5">
              <p className="text-xs text-white/50 uppercase tracking-wide mb-1">Employee ID (Login)</p>
              <p className="font-heading font-bold text-lg mb-4">{credentials.employee_id}</p>
              <p className="text-xs text-white/50 uppercase tracking-wide mb-1">Temporary Password</p>
              <p className="font-heading font-bold text-lg">{credentials.password}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setDrawer(null);
                setCredentials(null);
              }}
              className="bg-gold text-navy-dark font-semibold text-sm py-3 rounded-full hover:bg-gold-light transition-colors"
            >
              Done
            </button>
          </div>
        )}
      </Drawer>
    </div>
  );
}

function TeacherForm({ mode, teacher, onCancel, onSuccess }) {
  const [form, setForm] = useState(
    mode === "edit"
      ? { full_name: teacher.full_name, subject: teacher.subject, phone: teacher.phone || "", password: "" }
      : emptyForm
  );
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      if (mode === "create") {
        const created = await api.post("/teachers", {
          full_name: form.full_name,
          subject: form.subject,
          phone: form.phone || undefined,
          password: form.password,
        });
        onSuccess({ ...created, password: form.password });
      } else {
        await api.patch(`/teachers/${teacher.id}`, {
          full_name: form.full_name,
          subject: form.subject,
          phone: form.phone || undefined,
        });
        onSuccess(null);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <FormField label="Full Name" htmlFor="full_name" required>
        <input
          id="full_name"
          name="full_name"
          required
          minLength={2}
          value={form.full_name}
          onChange={handleChange}
          className={inputClass}
        />
      </FormField>
      <FormField label="Subject" htmlFor="subject" required>
        <input id="subject" name="subject" required value={form.subject} onChange={handleChange} className={inputClass} />
      </FormField>
      <FormField label="Phone" htmlFor="phone" hint="Optional">
        <input id="phone" name="phone" value={form.phone} onChange={handleChange} className={inputClass} />
      </FormField>
      {mode === "create" && (
        <FormField label="Temporary Password" htmlFor="password" required hint="Minimum 8 characters. Share this with the teacher.">
          <input
            id="password"
            name="password"
            type="text"
            required
            minLength={8}
            value={form.password}
            onChange={handleChange}
            className={inputClass}
          />
        </FormField>
      )}

      {error && <Banner tone="error">{error}</Banner>}

      <div className="flex items-center gap-3 mt-2">
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 bg-gold text-navy-dark font-semibold text-sm py-3 rounded-full hover:bg-gold-light transition-colors disabled:opacity-60"
        >
          {submitting ? "Saving…" : mode === "create" ? "Create Teacher" : "Save Changes"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-3 rounded-full text-sm font-semibold text-navy/60 hover:text-navy hover:bg-navy/5 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
