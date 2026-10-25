import { useEffect, useMemo, useState } from "react";
import Card from "../ui/Card";
import Icon from "../ui/Icon";
import Badge from "../ui/Badge";
import Banner from "../portal/Banner";
import ConfirmDialog from "../portal/ConfirmDialog";
import DownloadButton from "../ui/DownloadButton";
import { inputClass } from "../portal/FormField";
import { TableSkeleton } from "../ui/Skeleton";
import { useToast } from "../ui/Toast";
import { api, ApiError } from "../../lib/apiClient";
import { saveBlob } from "../../lib/download";
import { PASS_MARK } from "../../constants/academic";
import { formatDate } from "../../utils/formatDate";

const SHORT = { theory: "Th", practical: "Pr", internal: "In", sa: "SA", fa: "FA", total: "Mark" };
const STATUS = {
  pending: { tone: "sample", text: "Sent — waiting for the class teacher to accept" },
  accepted: { tone: "success", text: "Accepted by the class teacher" },
  returned: { tone: "danger", text: "Sent back by the class teacher" },
  replaced: { tone: "navy", text: "Replaced by a newer list" },
};

/** Subject teacher: enter one subject's marks for one class, verify, then send in the app or download a CSV. */
export default function SubjectMarksPanel({ pairs }) {
  const toast = useToast();
  const [pairKey, setPairKey] = useState(pairs[0] ? `${pairs[0].code}|${pairs[0].subject}` : "");
  const [classCode, subject] = pairKey.split("|");
  const [term, setTerm] = useState("");
  const [data, setData] = useState(null);
  const [rows, setRows] = useState({}); // { studentId: { absent, components: { key: value } } }
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [verified, setVerified] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = (t = term) => {
    if (!classCode) return;
    setLoading(true);
    setError("");
    api
      .get(`/classes/${classCode}/subject-marks`, { query: { term: t || undefined, subject } })
      .then((res) => {
        setData(res);
        if (!t) setTerm(res.term);
        // Start from what was last sent (if not yet accepted), else from the saved marks.
        setRows(
          Object.fromEntries(
            res.students.map((s) => {
              const src = s.sent || s.saved;
              return [s.student_id, { absent: Boolean(src?.absent), components: { ...(src?.components || {}) } }];
            })
          )
        );
        setVerified(false);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  // The API needs a term; the first load asks for the class's first exam.
  useEffect(() => {
    if (!classCode) return;
    api
      .get(`/classes/${classCode}/mark-scheme`)
      .then((scheme) => {
        const first = scheme.terms.includes(term) ? term : scheme.terms[0];
        setTerm(first);
        load(first);
      })
      .catch((err) => setError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pairKey]);

  const comps = data?.components || [];
  const max = comps.reduce((t, c) => t + c.max, 0);

  const update = (sid, patch) => {
    setRows((r) => ({ ...r, [sid]: { ...r[sid], ...patch, components: { ...r[sid]?.components, ...patch.components } } }));
    setVerified(false);
  };

  const summary = useMemo(() => {
    const list = (data?.students || []).map((s) => {
      const r = rows[s.student_id] || { absent: false, components: {} };
      const typed = comps.some((c) => r.components[c.key] !== "" && r.components[c.key] != null);
      const bad = comps.find((c) => r.components[c.key] !== "" && r.components[c.key] != null && (Number(r.components[c.key]) < 0 || Number(r.components[c.key]) > c.max || Number.isNaN(Number(r.components[c.key]))));
      const total = comps.reduce((t, c) => t + (Number(r.components[c.key]) || 0), 0);
      return { ...s, absent: r.absent, typed, bad, total, below: !r.absent && typed && total < (max * PASS_MARK) / 100 };
    });
    return {
      list,
      entered: list.filter((s) => s.typed && !s.absent).length,
      absent: list.filter((s) => s.absent).length,
      blank: list.filter((s) => !s.typed && !s.absent).length,
      below: list.filter((s) => s.below).length,
      errors: list.filter((s) => s.bad && !s.absent),
    };
  }, [data, rows, comps, max]);

  const payload = () => ({
    term,
    subject,
    students: Object.fromEntries(
      Object.entries(rows).map(([sid, r]) => [
        sid,
        { absent: r.absent, components: Object.fromEntries(comps.map((c) => [c.key, r.components[c.key] === "" ? null : r.components[c.key] ?? null])) },
      ])
    ),
  });

  const send = async () => {
    setBusy(true);
    try {
      await api.post(`/classes/${classCode}/subject-marks/submit`, payload());
      toast.success(`${subject} marks sent to the ${classCode} class teacher`);
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not send the marks.");
    } finally {
      setBusy(false);
    }
  };

  const downloadCsv = async () => {
    setBusy(true);
    try {
      // POST returns the CSV file built from exactly what was verified.
      const blob = await fetchCsv();
      saveBlob(blob, `${classCode}_${subject}_${term}.csv`.replace(/\s+/g, "-"));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not create the file.");
    } finally {
      setBusy(false);
    }
  };
  const fetchCsv = () => api.post(`/classes/${classCode}/subject-marks/csv`, payload());

  if (!pairs.length) return null;
  const last = data?.last_submission;

  return (
    <div>
      <Card className="p-4 mb-5 flex flex-wrap items-center gap-3">
        <select value={pairKey} onChange={(e) => setPairKey(e.target.value)} aria-label="Class and subject" className={`${inputClass} max-w-[16rem]`}>
          {pairs.map((p) => (
            <option key={`${p.code}|${p.subject}`} value={`${p.code}|${p.subject}`}>
              {p.subject} · {p.code}
            </option>
          ))}
        </select>
        {data && (
          <select
            value={term}
            onChange={(e) => {
              setTerm(e.target.value);
              load(e.target.value);
            }}
            aria-label="Exam"
            className={`${inputClass} max-w-[12rem]`}
          >
            {data.terms.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        )}
        {data && <span className="text-xs text-navy/50">{comps.map((c) => `${c.label} ${c.max}`).join(" + ")}</span>}
        {data && (
          <DownloadButton
            path="/exports/subject-marks.csv"
            query={{ class_code: classCode, term, subject }}
            filename={`${classCode}_${subject}_${term}_saved.csv`.replace(/\s+/g, "-")}
            label="Saved marks CSV"
            className="sm:ml-auto"
          />
        )}
      </Card>

      {error && <Banner tone="error" className="mb-4">{error}</Banner>}
      {last && (
        <div className="mb-4">
          <Banner tone={last.status === "returned" ? "error" : last.status === "accepted" ? "success" : "info"}>
            <strong className="font-semibold">{STATUS[last.status]?.text || last.status}</strong>
            {last.note && <> — “{last.note}”</>}
            <span className="opacity-70"> · {formatDate(last.decided_at || last.created_at)}</span>
          </Banner>
        </div>
      )}

      <Card className="p-0 overflow-hidden">
        {loading && <TableSkeleton rows={6} columns={4} />}
        {!loading && data && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-navy/45 border-b border-navy/8">
                  <th className="px-4 py-3">Student</th>
                  {comps.map((c) => (
                    <th key={c.key} className="px-2 py-3 text-center">
                      {SHORT[c.key] || c.label}
                      <span className="block font-normal normal-case">/{c.max}</span>
                    </th>
                  ))}
                  <th className="px-3 py-3 text-center">Total</th>
                  <th className="px-3 py-3 text-center">AB</th>
                </tr>
              </thead>
              <tbody>
                {data.students.map((s) => {
                  const r = rows[s.student_id] || { absent: false, components: {} };
                  const total = comps.reduce((t, c) => t + (Number(r.components[c.key]) || 0), 0);
                  return (
                    <tr key={s.student_id} className="border-b border-navy/6 last:border-0">
                      <td className="px-4 py-2">
                        <p className="font-medium text-navy whitespace-nowrap">{s.name}</p>
                        <p className="text-[11px] text-navy/40">{s.registration_no}</p>
                      </td>
                      {comps.map((c) => {
                        const v = r.components[c.key] ?? "";
                        const over = v !== "" && (Number(v) < 0 || Number(v) > c.max);
                        return (
                          <td key={c.key} className="px-1.5 py-2 text-center">
                            <input
                              type="number"
                              inputMode="numeric"
                              min={0}
                              max={c.max}
                              disabled={r.absent}
                              value={r.absent ? "" : v}
                              onChange={(e) => update(s.student_id, { components: { [c.key]: e.target.value } })}
                              aria-label={`${s.name} ${c.label}`}
                              className={`w-16 px-2 py-1.5 rounded-lg border text-center text-sm bg-white disabled:bg-navy/5 ${over ? "border-red-400 text-red-600" : "border-navy/15"}`}
                            />
                          </td>
                        );
                      })}
                      <td className="px-3 py-2 text-center font-semibold text-navy">{r.absent ? "AB" : total}</td>
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => update(s.student_id, { absent: !r.absent })}
                          aria-pressed={r.absent}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${r.absent ? "bg-red-50 border-red-200 text-red-600" : "border-navy/15 text-navy/45"}`}
                        >
                          AB
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {data && (
        <div className="flex flex-wrap items-center justify-end gap-3 mt-5">
          {verified ? (
            <>
              <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 mr-auto">
                <Icon name="CircleCheck" size={15} /> Verified — send it, or download the file to share
              </span>
              <button
                type="button"
                onClick={downloadCsv}
                disabled={busy}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-full border border-navy/15 text-sm font-semibold text-navy hover:bg-navy/5 disabled:opacity-50"
              >
                <Icon name="Download" size={15} /> Download CSV
              </button>
              <button
                type="button"
                onClick={send}
                disabled={busy}
                className="flex items-center gap-1.5 bg-gold text-navy-dark font-semibold text-sm px-6 py-2.5 rounded-full hover:bg-gold-light transition-colors disabled:opacity-50"
              >
                <Icon name="Send" size={15} /> Send to Class Teacher
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setVerifyOpen(true)}
              className="flex items-center gap-1.5 bg-gold text-navy-dark font-semibold text-sm px-6 py-2.5 rounded-full hover:bg-gold-light transition-colors"
            >
              <Icon name="ClipboardCheck" size={15} /> Verify Marks
            </button>
          )}
        </div>
      )}

      <ConfirmDialog
        open={verifyOpen}
        title={`Verify ${subject} marks · ${classCode} · ${term}`}
        message={
          <>
            <div className="flex flex-wrap gap-2">
              <Badge tone="success">Entered · {summary.entered}</Badge>
              <Badge tone="danger">Absent · {summary.absent}</Badge>
              <Badge tone="navy">Blank · {summary.blank}</Badge>
              <Badge tone="sample">Below pass · {summary.below}</Badge>
            </div>
            {summary.errors.length > 0 && (
              <p className="text-red-600">
                Fix these first: {summary.errors.map((s) => `${s.name} (${s.bad.label} max ${s.bad.max})`).join(", ")}
              </p>
            )}
            {summary.blank > 0 && <p>Blank students are not sent; their marks stay as they are.</p>}
            {summary.below > 0 && (
              <p>Below pass: {summary.list.filter((s) => s.below).map((s) => `${s.name} (${s.total})`).join(", ")}</p>
            )}
          </>
        }
        confirmLabel="Yes, marks are correct"
        cancelLabel="Edit again"
        confirmDisabled={summary.errors.length > 0 || summary.entered + summary.absent === 0}
        onConfirm={() => {
          setVerified(true);
          setVerifyOpen(false);
        }}
        onCancel={() => setVerifyOpen(false)}
      />
    </div>
  );
}
