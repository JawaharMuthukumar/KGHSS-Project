import { useEffect, useState } from "react";
import PortalPageHeader from "../../components/portal/PortalPageHeader";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Banner from "../../components/portal/Banner";
import EmptyState from "../../components/portal/EmptyState";
import ConfirmDialog from "../../components/portal/ConfirmDialog";
import PromotionTable, { DecisionCounts, countDecisions } from "../../components/promotions/PromotionTable";
import { inputClass } from "../../components/portal/FormField";
import { TableSkeleton } from "../../components/ui/Skeleton";
import { useApiResource } from "../../hooks/useApiResource";
import { useMyTeacherProfile } from "../../hooks/useMyTeacherProfile";
import { useToast } from "../../components/ui/Toast";
import { api, ApiError } from "../../lib/apiClient";
import { LIST_STATUS, classOptionLabel } from "../../constants/promotion";
import { formatDate } from "../../utils/formatDate";

/** Class teacher marks each student promoted / not promoted / TC after the final exam, then submits to the HM. */
export default function Promotion() {
  const { classCode, loading: loadingProfile } = useMyTeacherProfile();
  const toast = useToast();
  const { data, loading, error, reload } = useApiResource(`/promotions/classes/${classCode}`, {
    enabled: Boolean(classCode),
    deps: [classCode],
  });
  const [rows, setRows] = useState([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (!data) return;
    setRows(data.students);
    setDirty(false);
  }, [data]);

  const update = (studentId, patch) => {
    // Classes other than 10th have exactly one next class, so a re-promoted student gets it back automatically.
    const fixedTarget = data?.options.length === 1 ? data.options[0].code : null;
    setRows((list) =>
      list.map((r) => {
        if (r.student_id !== studentId) return r;
        const next = { ...r, ...patch };
        if (next.decision === "promoted" && !next.target_class_code && fixedTarget) next.target_class_code = fixedTarget;
        return next;
      })
    );
    setDirty(true);
  };

  const setAllTargets = (code) => {
    if (!code) return;
    setRows((list) => list.map((r) => (r.decision === "promoted" ? { ...r, target_class_code: code } : r)));
    setDirty(true);
  };

  const missingTarget = rows.filter((r) => r.decision === "promoted" && !r.target_class_code).length;
  const counts = countDecisions(rows);

  const save = async (submit) => {
    setSaving(true);
    try {
      await api.put(`/promotions/classes/${classCode}`, {
        submit,
        entries: rows.map(({ student_id, decision, target_class_code }) => ({ student_id, decision, target_class_code })),
      });
      setConfirmOpen(false);
      await reload();
      toast.success(submit ? "Promotion list sent to the HM" : "Promotion list saved");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not save the promotion list.");
    } finally {
      setSaving(false);
    }
  };

  if (!loadingProfile && !classCode) {
    return (
      <div>
        <PortalPageHeader title="Promotion" />
        <EmptyState
          icon="GraduationCap"
          title="You are not a Class Teacher"
          description="Only a class teacher prepares the promotion list for their class."
        />
      </div>
    );
  }

  const status = data ? LIST_STATUS[data.status] || LIST_STATUS.none : null;

  return (
    <div>
      <PortalPageHeader
        title="Promotion"
        description={
          data
            ? `Class ${data.class_code} · after the ${data.academic_year} final exam, choose who moves up for ${data.next_academic_year}.`
            : "After the final exam, choose who moves up to the next class."
        }
      />

      {error && <Banner tone="error" className="mb-4">{error.message}</Banner>}

      {data && (
        <>
          <Card className="p-4 mb-5 flex flex-wrap items-center gap-3">
            <Badge tone={status.tone}>{status.label}</Badge>
            <DecisionCounts counts={counts} />
            {data.submitted_at && <span className="text-xs text-navy/45 sm:ml-auto">Submitted {formatDate(data.submitted_at)}</span>}
          </Card>

          {data.status === "returned" && (
            <Banner tone="error" className="mb-4">
              The HM sent this list back{data.note ? `: “${data.note}”` : "."} Make the changes and submit again.
            </Banner>
          )}
          {data.status === "submitted" && (
            <Banner className="mb-4">This list is with the HM for approval. It can only change if the HM sends it back.</Banner>
          )}
          {data.status === "approved" && (
            <Banner tone="success" className="mb-4">
              The HM approved this list. Students move to their new classes when the HM starts {data.next_academic_year}.
            </Banner>
          )}
          {data.editable && (
            <Banner tone="warning" className="mb-4">
              <strong className="block font-semibold">Fill this in only after the final exam results.</strong>
              This is the real promotion list for {data.class_code}. Once you submit it, the HM uses it to move students to their next class.
            </Banner>
          )}
          {data.editable && data.grade === 10 && (
            <Banner className="mb-4">After 10th, choose each promoted student's 11th group class.</Banner>
          )}

          {data.editable && data.options.length > 1 && (
            <Card className="p-4 mb-5 flex flex-wrap items-center gap-3">
              <label htmlFor="all-target" className="text-sm font-medium text-navy/70">
                Next class for all promoted students
              </label>
              <select id="all-target" defaultValue="" onChange={(e) => setAllTargets(e.target.value)} className={`${inputClass} max-w-[16rem]`}>
                <option value="">Choose…</option>
                {data.options.map((o) => (
                  <option key={o.code} value={o.code}>
                    {classOptionLabel(o)}
                  </option>
                ))}
              </select>
            </Card>
          )}
        </>
      )}

      <Card className="p-0 overflow-hidden">
        {(loading || loadingProfile) && <TableSkeleton rows={6} columns={4} />}
        {!loading && data && rows.length === 0 && <p className="px-4 py-8 text-center text-navy/40">No students in this class.</p>}
        {!loading && data && rows.length > 0 && (
          <PromotionTable
            students={rows}
            options={data.options}
            allowedDecisions={data.allowed_decisions}
            editable={data.editable}
            onChange={update}
          />
        )}
      </Card>

      {data?.editable && rows.length > 0 && (
        <div className="flex flex-wrap items-center justify-end gap-3 mt-5">
          {missingTarget > 0 && (
            <span className="text-xs font-semibold text-amber-700 mr-auto">
              Choose the next class for {missingTarget} student{missingTarget === 1 ? "" : "s"}
            </span>
          )}
          <button
            type="button"
            onClick={() => save(false)}
            disabled={saving || !dirty}
            className="px-5 py-2.5 rounded-full border border-navy/15 text-sm font-semibold text-navy hover:bg-navy/5 disabled:opacity-50"
          >
            Save Draft
          </button>
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            disabled={saving || missingTarget > 0}
            className="bg-gold text-navy-dark font-semibold text-sm px-6 py-2.5 rounded-full hover:bg-gold-light transition-colors disabled:opacity-50"
          >
            Submit to HM
          </button>
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title={`Send ${data?.class_code} promotion list to the HM?`}
        message={
          <>
            <DecisionCounts counts={counts} />
            <p>After sending, you can't change it unless the HM sends it back.</p>
          </>
        }
        confirmLabel="Yes, send"
        busy={saving}
        onConfirm={() => save(true)}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
