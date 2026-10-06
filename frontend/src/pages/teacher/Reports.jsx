import { useState } from "react";
import PortalPageHeader from "../../components/portal/PortalPageHeader";
import Card from "../../components/ui/Card";
import { inputClass } from "../../components/portal/FormField";
import ClassMarkReport from "../../components/reports/ClassMarkReport";
import ClassScorecard from "../../components/reports/ClassScorecard";
import { useApiResource } from "../../hooks/useApiResource";
import { termsForGrade } from "../../constants/academic";

export default function Reports() {
  const { data: classes } = useApiResource("/classes");
  const [classCode, setClassCode] = useState("");
  const [term, setTerm] = useState(termsForGrade(null)[0]);
  const [tab, setTab] = useState("mark-report");
  const terms = termsForGrade((classes || []).find((c) => c.code === classCode)?.grade);

  const selectClass = (code) => {
    setClassCode(code);
    const next = termsForGrade((classes || []).find((c) => c.code === code)?.grade);
    if (!next.includes(term)) setTerm(next[0]);
  };

  return (
    <div>
      <PortalPageHeader
        title="Reports"
        description="Mark reports and scorecards for classes you teach. Pick a class you're assigned to."
      />

      <Card className="p-4 mb-5 flex flex-wrap gap-3 items-center">
        <select value={classCode} onChange={(e) => selectClass(e.target.value)} className={inputClass + " max-w-[10rem]"}>
          <option value="">Select a class…</option>
          {(classes || []).map((c) => (
            <option key={c.code} value={c.code}>
              {c.code}
            </option>
          ))}
        </select>
        <select value={term} onChange={(e) => setTerm(e.target.value)} className={inputClass + " max-w-[10rem]"}>
          {terms.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </Card>

      {classCode && (
        <>
          <div className="flex gap-1 mb-5 border-b border-navy/8">
            {["mark-report", "scorecard"].map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
                  tab === key ? "border-gold text-navy" : "border-transparent text-navy/45 hover:text-navy"
                }`}
              >
                {key === "mark-report" ? "Class Mark Report" : "Scorecard"}
              </button>
            ))}
          </div>

          {tab === "mark-report" && <ClassMarkReport classCode={classCode} term={term} />}
          {tab === "scorecard" && <ClassScorecard classCode={classCode} term={term} />}
        </>
      )}
    </div>
  );
}
