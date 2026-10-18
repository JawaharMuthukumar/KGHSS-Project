import { useEffect, useState } from "react";
import PortalPageHeader from "../../components/portal/PortalPageHeader";
import Card from "../../components/ui/Card";
import Banner from "../../components/portal/Banner";
import EmptyState from "../../components/portal/EmptyState";
import FormField, { inputClass } from "../../components/portal/FormField";
import { useMyTeacherProfile } from "../../hooks/useMyTeacherProfile";
import { useApiResource } from "../../hooks/useApiResource";
import { api, ApiError } from "../../lib/apiClient";
import { formatDate } from "../../utils/formatDate";
import { ContentSkeleton } from "../../components/ui/Skeleton";
import { useToast } from "../../components/ui/Toast";

const classLabel = (c) => [c.code, c.group_name, c.medium].filter(Boolean).join(" · ");

/**
 * Teachers post notices to any class they teach: "My Class" for the classes they are Class Teacher
 * of, "My Subject Classes" for every class/subject pair the admin assigned them as Subject Teacher.
 */
export default function ClassNotices() {
  const { profile, classCode: selectedClass, classes, loading: loadingProfile } = useMyTeacherProfile();
  const subjectClasses = profile?.subject_classes || [];
  const [tab, setTab] = useState(null); // "class" | "subject"
  const [target, setTarget] = useState(null); // { code, subject? }

  // Default to the class-teacher tab (on the class chosen in the header), else the first subject class.
  useEffect(() => {
    if (loadingProfile || tab) return;
    if (classes.length) {
      setTab("class");
      setTarget({ code: selectedClass || classes[0].code });
    } else if (subjectClasses.length) {
      setTab("subject");
      setTarget({ code: subjectClasses[0].code, subject: subjectClasses[0].subject });
    }
  }, [loadingProfile, tab, classes, subjectClasses, selectedClass]);

  const switchTab = (next) => {
    setTab(next);
    if (next === "class") setTarget(classes[0] ? { code: selectedClass || classes[0].code } : null);
    else setTarget(subjectClasses[0] ? { code: subjectClasses[0].code, subject: subjectClasses[0].subject } : null);
  };

  if (!loadingProfile && !classes.length && !subjectClasses.length) {
    return (
      <div>
        <PortalPageHeader title="Class Notices" />
        <EmptyState
          icon="Bell"
          title="No classes assigned yet"
          description="Ask an admin to assign you as a Class Teacher or Subject Teacher to post class notices."
        />
      </div>
    );
  }

  return (
    <div>
      <PortalPageHeader title="Class Notices" description="Send a notice to the students of a class you teach." />

      <div className="flex items-center gap-1 mb-5 border-b border-navy/8">
        {classes.length > 0 && <TabButton active={tab === "class"} onClick={() => switchTab("class")}>My Class</TabButton>}
        {subjectClasses.length > 0 && (
          <TabButton active={tab === "subject"} onClick={() => switchTab("subject")}>My Subject Classes</TabButton>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        {tab === "class" &&
          classes.map((c) => (
            <Chip key={c.code} active={target?.code === c.code} onClick={() => setTarget({ code: c.code })}>
              {classLabel(c)}
            </Chip>
          ))}
        {tab === "subject" &&
          subjectClasses.map((c) => (
            <Chip
              key={`${c.code}-${c.subject}`}
              active={target?.code === c.code && target?.subject === c.subject}
              onClick={() => setTarget({ code: c.code, subject: c.subject })}
            >
              <span className="font-semibold">{c.code}</span>
              <span className="opacity-70"> · {c.subject}</span>
            </Chip>
          ))}
      </div>

      {target && <NoticeBoard key={`${target.code}-${target.subject || ""}`} classCode={target.code} subject={target.subject} />}
    </div>
  );
}

function NoticeBoard({ classCode, subject }) {
  const toast = useToast();
  const { data: notices, loading, error, reload } = useApiResource(`/classes/${classCode}/notices`);
  const [form, setForm] = useState({ title: "", body: "" });
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");
    setSubmitting(true);
    try {
      // Subject notices carry the subject in the title so students know which teacher it is from.
      const title = subject ? `${subject}: ${form.title}` : form.title;
      await api.post("/notices", { title, body: form.body, class_code: classCode, audience: "students" });
      setForm({ title: "", body: "" });
      reload();
      toast.success(`Notice sent to ${classCode} students`);
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid lg:grid-cols-3 gap-5">
      <Card className="p-5 lg:col-span-1">
        <h2 className="font-heading font-bold text-navy text-sm mb-1">Post a Notice</h2>
        <p className="text-xs text-navy/50 mb-4">
          To {classCode} students{subject ? ` · ${subject}` : ""}
        </p>
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
            {submitting ? "Sending…" : "Send Notice"}
          </button>
        </form>
      </Card>

      <Card className="p-5 lg:col-span-2">
        <h2 className="font-heading font-bold text-navy text-sm mb-4">Posted Notices · {classCode}</h2>
        {error && <Banner tone="error">{error.message}</Banner>}
        {loading && <ContentSkeleton rows={4} />}
        {!loading && (notices || []).length === 0 && <p className="text-sm text-navy/50">No notices posted yet.</p>}
        {!loading && (
          <div className="flex flex-col gap-3">
            {(notices || []).map((n) => (
              <div key={n.id} className="pb-3 border-b border-navy/6 last:border-0">
                <p className="text-sm font-semibold text-navy">{n.title}</p>
                <p className="text-sm text-navy/60 mt-0.5 whitespace-pre-line">{n.body}</p>
                <p className="text-xs text-navy/40 mt-1">{formatDate(n.created_at)}</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
        active ? "border-gold text-navy" : "border-transparent text-navy/45 hover:text-navy"
      }`}
    >
      {children}
    </button>
  );
}

function Chip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-sm border transition-colors ${
        active ? "bg-navy text-white border-navy" : "bg-white text-navy border-navy/15 hover:border-gold"
      }`}
    >
      {children}
    </button>
  );
}
