import { useEffect, useRef, useState } from "react";
import PortalPageHeader from "../../components/portal/PortalPageHeader";
import Card from "../../components/ui/Card";
import Icon from "../../components/ui/Icon";
import Banner from "../../components/portal/Banner";
import FormField, { inputClass } from "../../components/portal/FormField";
import { useApiResource } from "../../hooks/useApiResource";
import { api, ApiError, resolveMediaUrl } from "../../lib/apiClient";

// Public pages a post can be published to — keys must match POST_PAGES in the backend.
const POST_PAGES = [
  { key: "achievements", label: "Achievements & Results" },
  { key: "sports", label: "Sports" },
  { key: "school-life", label: "School Life" },
  { key: "events", label: "Events" },
];
const pageLabel = Object.fromEntries(POST_PAGES.map((p) => [p.key, p.label]));
const MAX_POST_IMAGES = 6;

const TABS = [
  { key: "posts", label: "Page Posts" },
  { key: "gallery", label: "Gallery" },
  { key: "events", label: "Events" },
];

export default function Posts() {
  const [tab, setTab] = useState("posts");
  return (
    <div>
      <PortalPageHeader title="Posts" description="Publish posts to website pages, and manage gallery photos and events." />
      <div className="flex gap-1 mb-5 border-b border-navy/8">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
              tab === key ? "border-gold text-navy" : "border-transparent text-navy/45 hover:text-navy"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "posts" && <PagePostsTab />}
      {tab === "gallery" && <GalleryTab />}
      {tab === "events" && <EventsTab />}
    </div>
  );
}

function PagePostsTab() {
  const [filter, setFilter] = useState("");
  const { data: posts, loading, error, reload } = useApiResource("/posts", { query: { page: filter }, deps: [filter] });
  const fileInput = useRef(null);
  const [form, setForm] = useState({ page: "achievements", title: "", body: "" });
  const [images, setImages] = useState([]);
  const [submitError, setSubmitError] = useState("");
  const [saving, setSaving] = useState(false);

  // Free preview blob URLs on unmount; removals/publish revoke their own.
  const imagesRef = useRef(images);
  imagesRef.current = images;
  useEffect(() => () => imagesRef.current.forEach((img) => URL.revokeObjectURL(img.preview)), []);

  const addFiles = (e) => {
    const picked = Array.from(e.target.files || []);
    e.target.value = "";
    const room = MAX_POST_IMAGES - images.length;
    if (picked.length > room) setSubmitError(`Up to ${MAX_POST_IMAGES} images per post.`);
    setImages((prev) => [
      ...prev,
      ...picked.slice(0, room).map((file) => ({ key: `${file.name}-${Math.random()}`, file, caption: "", preview: URL.createObjectURL(file) })),
    ]);
  };

  const updateCaption = (key, caption) => setImages((prev) => prev.map((img) => (img.key === key ? { ...img, caption } : img)));
  const removeImage = (key) => {
    const img = images.find((i) => i.key === key);
    if (img) URL.revokeObjectURL(img.preview);
    setImages((prev) => prev.filter((i) => i.key !== key));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.body.trim() && images.length === 0) {
      setSubmitError("Add some content or at least one image.");
      return;
    }
    setSubmitError("");
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("page", form.page);
      formData.append("title", form.title);
      if (form.body.trim()) formData.append("body", form.body);
      images.forEach((img) => {
        formData.append("images", img.file);
        formData.append("captions", img.caption);
      });
      await api.postForm("/posts", formData);
      setForm((f) => ({ ...f, title: "", body: "" }));
      images.forEach((img) => URL.revokeObjectURL(img.preview));
      setImages([]);
      reload();
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "Could not publish the post.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Remove this post from the website?")) return;
    await api.delete(`/posts/${id}`);
    reload();
  };

  return (
    <div className="grid lg:grid-cols-3 gap-5">
      <Card className="p-5 lg:col-span-1">
        <h2 className="font-heading font-bold text-navy text-sm mb-4">New Post</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FormField label="Show on page" htmlFor="p-page" required>
            <select
              id="p-page"
              value={form.page}
              onChange={(e) => setForm((f) => ({ ...f, page: e.target.value }))}
              className={inputClass}
            >
              {POST_PAGES.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.label}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Title" htmlFor="p-title" required>
            <input
              id="p-title"
              required
              placeholder="e.g. Quarterly Exam Toppers 2026"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className={inputClass}
            />
          </FormField>
          <FormField label="Content" htmlFor="p-body" hint="Optional if you add images">
            <textarea
              id="p-body"
              rows={4}
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              className={inputClass}
            />
          </FormField>
          <div>
            <p className="text-sm font-semibold text-navy mb-1.5">Images</p>
            {images.length > 0 && (
              <div className="flex flex-col gap-2.5 mb-2.5">
                {images.map((img) => (
                  <div key={img.key} className="flex items-center gap-2.5">
                    <img src={img.preview} alt="" className="w-14 h-14 rounded-lg object-cover border border-navy/8 shrink-0" />
                    <input
                      value={img.caption}
                      onChange={(e) => updateCaption(img.key, e.target.value)}
                      placeholder="Caption — e.g. Priya S, 10A · 492/500"
                      aria-label="Image caption"
                      className={`${inputClass} min-w-0`}
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(img.key)}
                      className="text-red-500/70 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 shrink-0"
                      aria-label="Remove image"
                    >
                      <Icon name="X" size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {images.length < MAX_POST_IMAGES && (
              <>
                <input ref={fileInput} type="file" accept="image/*" multiple onChange={addFiles} className="hidden" />
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  className="w-full border border-dashed border-navy/20 rounded-xl py-2.5 text-sm font-semibold text-navy/60 hover:border-gold hover:text-navy transition-colors flex items-center justify-center gap-2"
                >
                  <Icon name="ImagePlus" size={16} /> Add images ({images.length}/{MAX_POST_IMAGES})
                </button>
              </>
            )}
            <p className="text-xs text-navy/45 mt-1.5">JPEG, PNG, WebP or GIF, up to 10MB each</p>
          </div>
          {submitError && <Banner tone="error">{submitError}</Banner>}
          <button
            type="submit"
            disabled={saving}
            className="bg-gold text-navy-dark font-semibold text-sm py-2.5 rounded-full hover:bg-gold-light transition-colors disabled:opacity-60"
          >
            {saving ? "Publishing…" : "Publish Post"}
          </button>
        </form>
      </Card>

      <Card className="p-5 lg:col-span-2">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="font-heading font-bold text-navy text-sm">Published Posts</h2>
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className={`${inputClass} w-auto`} aria-label="Filter by page">
            <option value="">All pages</option>
            {POST_PAGES.map((p) => (
              <option key={p.key} value={p.key}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
        {error && <Banner tone="error">{error.message}</Banner>}
        {!loading && (posts || []).length === 0 && <p className="text-sm text-navy/50">No posts yet.</p>}
        <div className="flex flex-col gap-3">
          {(posts || []).map((post) => (
            <div key={post.id} className="border border-navy/8 rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="inline-block text-[11px] font-semibold uppercase tracking-wide text-gold-dark bg-gold/12 rounded-full px-2.5 py-0.5 mb-1.5">
                    {pageLabel[post.page] || post.page}
                  </span>
                  <p className="text-sm font-semibold text-navy">{post.title}</p>
                  {post.body && <p className="text-xs text-navy/55 mt-1 line-clamp-2 whitespace-pre-line">{post.body}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(post.id)}
                  className="text-red-500/70 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 shrink-0"
                  aria-label="Remove post"
                >
                  <Icon name="Trash2" size={15} />
                </button>
              </div>
              {post.images.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {post.images.map((img) => (
                    <div key={img.id} className="w-20">
                      <img src={resolveMediaUrl(img.media_url)} alt={img.caption || ""} className="w-20 h-20 rounded-lg object-cover border border-navy/8" />
                      {img.caption && <p className="text-[10px] text-navy/60 mt-1 truncate">{img.caption}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>
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
