import { useState } from "react";
import PortalPageHeader from "../../components/portal/PortalPageHeader";
import Card from "../../components/ui/Card";
import Banner from "../../components/portal/Banner";
import EmptyState from "../../components/portal/EmptyState";
import { inputClass } from "../../components/portal/FormField";
import ClassMarkReport from "../../components/reports/ClassMarkReport";
import ClassScorecard from "../../components/reports/ClassScorecard";
import ConsolidatedReport from "../../components/reports/ConsolidatedReport";
import { useApiResource } from "../../hooks/useApiResource";
import { EXAM_TERMS } from "../../constants/academic";

const tabs = [
  { id: "mark-report", label: "Class Mark Report", needsClass: true },
  { id: "scorecard", label: "Scorecard", needsClass: true },
  { id: "consolidated", label: "Consolidated Report", needsClass: false },
];

export default function ResultsReports() {
  const { data: classes } = useApiResource("/classes");
  const [classCode, setClassCode] = useState("");
  const [term, setTerm] = useState(EXAM_TERMS[0]);
  const [tab, setTab] = useState("mark-report");

  const { data: schoolWide, loading: loadingSchoolWide, error: schoolWideError } = useApiResource("/reports/results", {
    query: { term },
    deps: [term],
  });

  const activeTab = tabs.find((t) => t.id === tab);

  return (
    <div>
      <PortalPageHeader title="Results & Reports" description="Class mark reports, scorecards, and school-wide analysis." />

      <Card className="p-4 mb-5 flex flex-wrap gap-3 items-center">
        <select value={classCode} onChange={(e) => setClassCode(e.target.value)} className={inputClass + " max-w-[10rem]"}>
          <option value="">Select a class…</option>
          {(classes || []).map((c) => (
            <option key={c.code} value={c.code}>
              {c.code}
            </option>
          ))}
        </select>
        <select value={term} onChange={(e) => setTerm(e.target.value)} className={inputClass + " max-w-[10rem]"}>
          {EXAM_TERMS.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </Card>

      <div className="flex gap-1 mb-5 border-b border-navy/8">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
              tab === t.id ? "border-gold text-navy" : "border-transparent text-navy/45 hover:text-navy"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab.needsClass && !classCode && (
        <EmptyState icon="School" title="Select a class" description="Pick a class above to view this report." />
      )}
      {tab === "mark-report" && classCode && <ClassMarkReport classCode={classCode} term={term} />}
      {tab === "scorecard" && classCode && <ClassScorecard classCode={classCode} term={term} />}
      {tab === "consolidated" && <ConsolidatedReport term={term} />}

      <div className="mt-8">
        <h2 className="font-heading font-bold text-navy text-base mb-3">School-wide Averages — {term}</h2>
        {schoolWideError && <Banner tone="error">{schoolWideError.message}</Banner>}
        {!loadingSchoolWide && schoolWide && (
          <Card className="p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-navy/45 border-b border-navy/8">
                  <th className="px-4 py-3">Class</th>
                  <th className="px-4 py-3">Students with Marks</th>
                  <th className="px-4 py-3">Average %</th>
                </tr>
              </thead>
              <tbody>
                {schoolWide.classes.map((c) => (
                  <tr key={c.class_code} className="border-b border-navy/6 last:border-0">
                    <td className="px-4 py-2.5 font-medium text-navy">{c.class_code}</td>
                    <td className="px-4 py-2.5 text-navy/70">{c.students_with_marks}</td>
                    <td className="px-4 py-2.5 text-navy/70">{c.average_percent != null ? `${c.average_percent}%` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </div>
  );
}
