import { useRef, useState } from "react";
import PortalPageHeader from "../../components/portal/PortalPageHeader";
import Card from "../../components/ui/Card";
import Icon from "../../components/ui/Icon";
import Banner from "../../components/portal/Banner";
import FormField, { inputClass } from "../../components/portal/FormField";
import { useApiResource } from "../../hooks/useApiResource";
import { api, ApiError, resolveMediaUrl } from "../../lib/apiClient";

export default function GalleryEvents() {
  const [tab, setTab] = useState("gallery");
  return (
    <div>
      <PortalPageHeader title="Gallery & Events" description="Manage public gallery photos and school events." />
      <div className="flex gap-1 mb-5 border-b border-navy/8">
        {["gallery", "events"].map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`px-4 py-2.5 text-sm font-semibold capitalize border-b-2 -mb-px transition-colors ${
              tab === key ? "border-gold text-navy" : "border-transparent text-navy/45 hover:text-navy"
            }`}
          >
            {key}
          </button>
        ))}
      </div>
      {tab === "gallery" && <GalleryTab />}
      {tab === "events" && <EventsTab />}
    </div>
  );
}

function GalleryTab() {
  const { data: items, loading, error, reload } = useApiResource("/gallery");
  const { data: events } = useApiResource("/events");
  const fileInput = useRef(null);
  const [form, setForm] = useState({ title: "", category: "General", event_id: "" });
  const [submitError, setSubmitError] = useState("");
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e) => {
    e.preventDefault();
    const file = fileInput.current?.files?.[0];
    if (!file) {
      setSubmitError("Choose an image to upload.");
      return;
    }
    setSubmitError("");
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("title", form.title);
      formData.append("category", form.category);
      if (form.event_id) formData.append("event_id", form.event_id);
      formData.append("media", file);
      await api.postForm("/gallery/upload", formData);
      setForm({ title: "", category: "General", event_id: "" });
      if (fileInput.current) fileInput.current.value = "";
      reload();
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Remove this photo from the gallery?")) return;
    await api.delete(`/gallery/${id}`);
    reload();
  };

  return (
    <div className="grid lg:grid-cols-3 gap-5">
      <Card className="p-5 lg:col-span-1">
        <h2 className="font-heading font-bold text-navy text-sm mb-4">Upload Photo</h2>
        <form onSubmit={handleUpload} className="flex flex-col gap-4">
          <FormField label="Title" htmlFor="g-title" required>
            <input
              id="g-title"
              required
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className={inputClass}
            />
          </FormField>
          <FormField label="Category" htmlFor="g-category">
            <input
              id="g-category"
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              className={inputClass}
            />
          </FormField>
          <FormField label="Event" htmlFor="g-event" hint="Optional">
            <select
              id="g-event"
              value={form.event_id}
              onChange={(e) => setForm((f) => ({ ...f, event_id: e.target.value }))}
              className={inputClass}
            >
              <option value="">None</option>
              {(events || []).map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.title}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Image" htmlFor="g-file" required hint="JPEG, PNG, WebP or GIF, up to 10MB">
            <input id="g-file" type="file" accept="image/*" ref={fileInput} className={inputClass} />
          </FormField>
          {submitError && <Banner tone="error">{submitError}</Banner>}
          <button
            type="submit"
            disabled={uploading}
            className="bg-gold text-navy-dark font-semibold text-sm py-2.5 rounded-full hover:bg-gold-light transition-colors disabled:opacity-60"
          >
            {uploading ? "Uploading…" : "Upload"}
          </button>
        </form>
      </Card>

      <Card className="p-5 lg:col-span-2">
        <h2 className="font-heading font-bold text-navy text-sm mb-4">Published Photos</h2>
        {error && <Banner tone="error">{error.message}</Banner>}
        {!loading && (items || []).length === 0 && <p className="text-sm text-navy/50">No photos uploaded yet.</p>}
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {(items || []).map((item) => (
            <div key={item.id} className="relative group rounded-xl overflow-hidden border border-navy/8">
              <img src={resolveMediaUrl(item.media_url)} alt={item.title} className="w-full h-24 object-cover" />
              <button
                type="button"
                onClick={() => handleDelete(item.id)}
                className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-navy-dark/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Delete"
              >
                <Icon name="Trash2" size={13} />
              </button>
              <p className="absolute bottom-0 inset-x-0 bg-navy-dark/70 text-white text-[10px] px-2 py-1 truncate">{item.title}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function EventsTab() {
  const { data: events, loading, error, reload } = useApiResource("/events");
  const [form, setForm] = useState({ title: "", description: "", event_date: "" });
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");
    setSubmitting(true);
    try {
      await api.post("/events", {
        title: form.title,
        description: form.description || undefined,
        academic_year: "2026-2027",
        event_date: form.event_date || undefined,
      });
      setForm({ title: "", description: "", event_date: "" });
      reload();
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Unpublish this event?")) return;
    await api.delete(`/events/${id}`);
    reload();
  };

  return (
    <div className="grid lg:grid-cols-3 gap-5">
      <Card className="p-5 lg:col-span-1">
        <h2 className="font-heading font-bold text-navy text-sm mb-4">Add Event</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FormField label="Title" htmlFor="e-title" required>
            <input
              id="e-title"
              required
              value={form.title}
              onChange={(ev) => setForm((f) => ({ ...f, title: ev.target.value }))}
              className={inputClass}
            />
          </FormField>
          <FormField label="Date" htmlFor="e-date">
            <input
              id="e-date"
              type="date"
              value={form.event_date}
              onChange={(ev) => setForm((f) => ({ ...f, event_date: ev.target.value }))}
              className={inputClass}
            />
          </FormField>
          <FormField label="Description" htmlFor="e-desc">
            <textarea
              id="e-desc"
              rows={3}
              value={form.description}
              onChange={(ev) => setForm((f) => ({ ...f, description: ev.target.value }))}
              className={inputClass}
            />
          </FormField>
          {submitError && <Banner tone="error">{submitError}</Banner>}
          <button
            type="submit"
            disabled={submitting}
            className="bg-gold text-navy-dark font-semibold text-sm py-2.5 rounded-full hover:bg-gold-light transition-colors disabled:opacity-60"
          >
            {submitting ? "Saving…" : "Add Event"}
          </button>
        </form>
      </Card>

      <Card className="p-5 lg:col-span-2">
        <h2 className="font-heading font-bold text-navy text-sm mb-4">Published Events</h2>
        {error && <Banner tone="error">{error.message}</Banner>}
        {!loading && (events || []).length === 0 && <p className="text-sm text-navy/50">No events yet.</p>}
        <div className="flex flex-col gap-2">
          {(events || []).map((ev) => (
            <div key={ev.id} className="flex items-center justify-between gap-3 py-2.5 border-b border-navy/6 last:border-0">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-navy truncate">{ev.title}</p>
                <p className="text-xs text-navy/45">{ev.event_date || "No date set"}</p>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(ev.id)}
                className="text-red-500/70 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 shrink-0"
                aria-label="Unpublish"
              >
                <Icon name="Trash2" size={15} />
              </button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
