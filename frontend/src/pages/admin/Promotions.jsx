import { useState } from "react";
import { Link } from "react-router-dom";
import PortalPageHeader from "../../components/portal/PortalPageHeader";
import Card from "../../components/ui/Card";
import Icon from "../../components/ui/Icon";
import Badge from "../../components/ui/Badge";
import Banner from "../../components/portal/Banner";
import Drawer from "../../components/portal/Drawer";
import ConfirmDialog from "../../components/portal/ConfirmDialog";
import PromotionTable, { DecisionCounts } from "../../components/promotions/PromotionTable";
import GroupsManager from "../../components/promotions/GroupsManager";
import { inputClass } from "../../components/portal/FormField";
import { TableSkeleton, ContentSkeleton } from "../../components/ui/Skeleton";
import { useApiResource } from "../../hooks/useApiResource";
import { useToast } from "../../components/ui/Toast";
import { api, ApiError } from "../../lib/apiClient";
import { LIST_STATUS } from "../../constants/promotion";
import { formatDate } from "../../utils/formatDate";

/** HM: review each class teacher's promotion list, approve or send back, then start the new academic year. */
export default function Promotions() {
  const { data, loading, error, reload } = useApiResource("/promotions");
  const [tab, setTab] = useState("lists");
  const [openClass, setOpenClass] = useState(null);
  const withStudents = (data?.classes || []).filter((c) => c.student_count > 0);
  const approved = withStudents.filter((c) => c.status === "approved" && !c.missing_count).length;

  return (
    <div>
      <PortalPageHeader
        title="Promotions"
        description={
          data
            ? `Class teachers send their promotion lists after the ${data.academic_year} final exam. Approve each class, then start ${data.next_academic_year}.`
            : undefined
        }
      />

      <div className="flex items-center gap-1 mb-5 border-b border-navy/8" role="tablist">
        {[
          ["lists", "Promotion Lists"],
          ["groups", "11th & 12th Groups"],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => {
              setTab(key);
              if (key === "lists") reload();
            }}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
              tab === key ? "border-gold text-navy" : "border-transparent text-navy/45 hover:text-navy"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "groups" && <GroupsManager />}

      {tab === "lists" && (
      <>
      {error && <Banner tone="error" className="mb-4">{error.message}</Banner>}

      <Card className="p-0 overflow-hidden mb-6">
        <table className="table-cards w-full text-sm">
          <thead>
            <tr className="text-left text-xs font-semibold uppercase tracking-wide text-navy/45 border-b border-navy/8">
              <th className="px-4 py-3">Class</th>
              <th className="px-4 py-3">Class Teacher</th>
              <th className="px-4 py-3">Students</th>
              <th className="px-4 py-3">Decisions</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="p-0"><TableSkeleton rows={8} columns={5} /></td></tr>}
            {(data?.classes || []).map((c) => {
              const status = LIST_STATUS[c.status] || LIST_STATUS.none;
              const canOpen = c.status !== "none";
              return (
                <tr
                  key={c.class_code}
                  onClick={canOpen ? () => setOpenClass(c.class_code) : undefined}
                  className={`border-b border-navy/6 last:border-0 ${canOpen ? "cursor-pointer" : ""}`}
                >
                  <td className="tc-primary px-4 py-3">
                    <p className="font-semibold text-navy">{c.class_code}</p>
                    <p className="text-xs text-navy/45">{[c.group_name, c.medium].filter(Boolean).join(" · ")}</p>
                  </td>
                  <td data-label="Class Teacher" className="px-4 py-3 text-navy/70">{c.class_teacher_name || "Not assigned"}</td>
                  <td data-label="Students" className="px-4 py-3 text-navy/70">{c.student_count}</td>
                  <td data-label="Decisions" className="px-4 py-3">
                    {c.status === "none" ? <span className="text-navy/40">—</span> : <DecisionCounts counts={c.counts} className="justify-end md:justify-start" />}
                    {c.missing_count > 0 && (
                      <p className="text-[11px] text-amber-700 mt-1">{c.missing_count} new student(s) not in the list</p>
                    )}
                    {c.invalid_count > 0 && (
                      <p className="text-[11px] text-amber-700 mt-1">{c.invalid_count} student(s) going to a closed or hidden class — send back</p>
                    )}
                  </td>
                  <td className="tc-aside px-4 py-3">
                    {c.student_count === 0 ? <span className="text-xs text-navy/40">No students</span> : <Badge tone={status.tone}>{status.label}</Badge>}
                  </td>
                  <td className="tc-hide px-4 py-3 text-right">{canOpen && <Icon name="ChevronRight" size={16} className="text-navy/30" />}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {data && (
        <Card className="p-5">
          <div className="flex flex-wrap items-start gap-4">
            <span className="flex items-center justify-center w-11 h-11 rounded-2xl bg-gold/15 text-gold-dark shrink-0">
              <Icon name="CalendarRange" size={22} />
            </span>
            <div className="flex-1 min-w-[14rem]">
              <h2 className="font-heading font-bold text-navy">Starting {data.next_academic_year}</h2>
              <p className="text-sm text-navy/60 mt-1">
                Once every class is approved, start the new year from the <strong>Academic Year</strong> page. It promotes every class with these
                lists, clears this year's Notes of Lessons (after you download the backup) and sets the new year's dates — in one step.
              </p>
              <p className="text-xs font-semibold text-navy/50 mt-2">
                {approved} of {withStudents.length} classes approved
                {!data.ready && data.blockers.length > 0 && ` · waiting for ${data.blockers.join(", ")}`}
              </p>
            </div>
            <Link
              to="/admin/academic-year"
              className="bg-gold text-navy-dark font-semibold text-sm px-6 py-2.5 rounded-full hover:bg-gold-light transition-colors max-sm:w-full text-center"
            >
              Go to Academic Year
            </Link>
          </div>
        </Card>
      )}

      </>
      )}

      <Drawer open={Boolean(openClass)} onClose={() => setOpenClass(null)} title={`Promotion · ${openClass || ""}`} width="max-w-3xl">
        {openClass && <ClassReview key={openClass} classCode={openClass} onChanged={reload} onClose={() => setOpenClass(null)} />}
      </Drawer>

    </div>
  );
}

/** One class's list inside the drawer, with Approve (Yes/No confirm) and Send back (with a note). */
function ClassReview({ classCode, onChanged, onClose }) {
  const { data, loading, error, reload } = useApiResource(`/promotions/classes/${classCode}`);
  const [confirm, setConfirm] = useState(null); // "approve" | "return"
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const act = async () => {
    setBusy(true);
    try {
      if (confirm === "approve") await api.post(`/promotions/classes/${classCode}/approve`);
      else await api.post(`/promotions/classes/${classCode}/return`, { note: note.trim() });
      toast.success(confirm === "approve" ? `${classCode} approved` : `${classCode} sent back to the class teacher`);
      setConfirm(null);
      onChanged();
      if (confirm === "return") onClose();
      else reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not update this list.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <ContentSkeleton rows={4} />;
  if (error) return <Banner tone="error">{error.message}</Banner>;
  if (!data) return null;
  const status = LIST_STATUS[data.status] || LIST_STATUS.none;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <Badge tone={status.tone}>{status.label}</Badge>
        <DecisionCounts counts={data.counts} />
      </div>
      <p className="text-xs text-navy/50 mb-4">
        Class teacher: {data.class_teacher_name || "Not assigned"}
        {data.submitted_at && ` · submitted ${formatDate(data.submitted_at)}`}
      </p>
      {data.status === "returned" && data.note && <Banner tone="error" className="mb-4">Sent back: “{data.note}”</Banner>}
      {data.status === "draft" && <Banner className="mb-4">The class teacher hasn't submitted this list yet.</Banner>}

      <div className="rounded-2xl border border-navy/8 overflow-hidden">
        <PromotionTable students={data.students} options={data.options} allowedDecisions={data.allowed_decisions} />
      </div>

      {(data.status === "submitted" || data.status === "approved") && (
        <div className="flex flex-wrap gap-3 mt-5">
          <button
            type="button"
            onClick={() => setConfirm("return")}
            className="flex-1 min-w-[10rem] py-3 rounded-full border border-red-200 text-sm font-semibold text-red-600 hover:bg-red-50"
          >
            Send back
          </button>
          {data.status === "submitted" && (
            <button
              type="button"
              onClick={() => setConfirm("approve")}
              className="flex-1 min-w-[10rem] bg-gold text-navy-dark font-semibold text-sm py-3 rounded-full hover:bg-gold-light transition-colors"
            >
              Approve
            </button>
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirm === "approve"}
        title={`Approve ${classCode} promotion list?`}
        message={
          <>
            <DecisionCounts counts={data.counts} />
            <p>These students move when you start {data.next_academic_year}.</p>
          </>
        }
        confirmLabel="Yes, approve"
        busy={busy}
        onConfirm={act}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm === "return"}
        danger
        title={`Send ${classCode} list back?`}
        message="The class teacher will see your note and can change the list."
        confirmLabel="Yes, send back"
        busy={busy}
        confirmDisabled={note.trim().length < 2}
        onConfirm={act}
        onCancel={() => setConfirm(null)}
      >
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="What should the class teacher change?"
          aria-label="Note for the class teacher"
          className={inputClass}
        />
      </ConfirmDialog>
    </div>
  );
}
