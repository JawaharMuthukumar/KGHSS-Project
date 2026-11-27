import { useEffect, useState } from "react";
import Card from "../ui/Card";
import Icon from "../ui/Icon";
import Banner from "../portal/Banner";
import { api, ApiError } from "../../lib/apiClient";
import { useApiResource } from "../../hooks/useApiResource";
import { formatDate } from "../../utils/formatDate";

const STATE = {
  signed: { label: "Signed", tone: "text-emerald-700 bg-emerald-50", icon: "Check" },
  stale: { label: "Marks changed — sign again", tone: "text-amber-800 bg-amber-50", icon: "AlertTriangle" },
  unsigned: { label: "Not signed", tone: "text-navy/60 bg-navy/[0.05]", icon: "Pencil" },
};

/**
 * Class teacher signs each exam's report cards. The signature shows on the cards only for exams signed here,
 * and disappears again if any mark of that exam changes later (then it must be signed again).
 */
export default function ReportSignoff({ classCode, onChanged }) {
  const { data, error, reload } = useApiResource(`/classes/${classCode}/signoffs`, { deps: [classCode], enabled: Boolean(classCode) });
  const [busy, setBusy] = useState(null);
  const [actionError, setActionError] = useState("");

  // Re-check after the teacher adds or changes their signature in the profile menu dialog
  useEffect(() => {
    window.addEventListener("kghss:signature-changed", reload);
    return () => window.removeEventListener("kghss:signature-changed", reload);
  }, [reload]);

  if (error || !data) return null;
  const exams = data.exams.filter((e) => e.state !== "no_marks");
  if (!exams.length) return null;

  const act = async (term, sign) => {
    setBusy(term);
    setActionError("");
    try {
      const path = `/classes/${classCode}/exams/${encodeURIComponent(term)}/sign`;
      await (sign ? api.post(path) : api.delete(path));
      reload();
      onChanged?.();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Could not update the signature. Please try again.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card className="p-4 mb-4">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <Icon name="Pencil" size={16} className="text-gold-dark" />
        <h3 className="font-heading font-bold text-navy text-sm">Class teacher signature</h3>
        <p className="text-xs text-navy/50 basis-full sm:basis-auto">Your signature appears on the cards only for the exams you sign.</p>
      </div>

      {!data.has_signature && (
        <Banner tone="info" className="mb-3">
          Add your signature first —{" "}
          <button type="button" onClick={() => window.dispatchEvent(new CustomEvent("kghss:open-signature"))} className="font-semibold underline">
            open My Signature
          </button>{" "}
          (also in your profile menu).
        </Banner>
      )}
      {actionError && <Banner tone="error" className="mb-3">{actionError}</Banner>}

      <div className="flex flex-col divide-y divide-navy/6">
        {exams.map((e) => {
          const s = STATE[e.state];
          return (
            <div key={e.term} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
              <span className="font-medium text-navy text-sm w-32">{e.term}</span>
              <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${s.tone}`}>
                <Icon name={s.icon} size={12} /> {s.label}
              </span>
              {e.state === "signed" && (
                <span className="text-xs text-navy/45">
                  {e.signed_by_name} · {formatDate(e.signed_at)}
                </span>
              )}
              <div className="ml-auto flex gap-2">
                {e.state !== "signed" && (
                  <button
                    type="button"
                    disabled={busy === e.term || !data.has_signature}
                    onClick={() => act(e.term, true)}
                    className="text-xs font-semibold bg-gold text-navy-dark px-3.5 py-1.5 rounded-full hover:bg-gold-light disabled:opacity-50"
                  >
                    {e.state === "stale" ? "Sign again" : `Sign ${e.term}`}
                  </button>
                )}
                {e.state !== "unsigned" && (
                  <button
                    type="button"
                    disabled={busy === e.term}
                    onClick={() => act(e.term, false)}
                    className="text-xs font-semibold text-navy/55 hover:text-red-600 px-2.5 py-1.5 rounded-full disabled:opacity-50"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
