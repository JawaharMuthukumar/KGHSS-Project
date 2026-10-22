import { useState } from "react";
import PortalPageHeader from "../../components/portal/PortalPageHeader";
import Card from "../../components/ui/Card";
import Banner from "../../components/portal/Banner";
import Icon from "../../components/ui/Icon";
import { inputClass } from "../../components/portal/FormField";
import ClassMarkReport from "../../components/reports/ClassMarkReport";
import ClassScorecard from "../../components/reports/ClassScorecard";
import ConsolidatedReport from "../../components/reports/ConsolidatedReport";
import ClassReportCards from "../../components/reports/ClassReportCards";
import { useApiResource } from "../../hooks/useApiResource";
import { termsForGrade } from "../../constants/academic";
import { TableSkeleton } from "../../components/ui/Skeleton";

const ALL = "ALL"; // "All Classes": school-wide averages instead of a single class's report

const tabs = [
  { id: "mark-report", label: "Class Mark Report", needsClass: true },
  { id: "scorecard", label: "Scorecard", needsClass: true },
  { id: "report-cards", label: "Report Cards", needsClass: true },
  { id: "consolidated", label: "Consolidated Report", needsClass: false },
];

export default function ResultsReports() {
  const { data: classes } = useApiResource("/classes");
  const [classCode, setClassCode] = useState(ALL);
  const [term, setTerm] = useState(termsForGrade(null)[0]);
  const [tab, setTab] = useState("mark-report");
  // With "All Classes" (school-wide / consolidated views) every exam name from both grade bands is offered.
  const terms = termsForGrade((classes || []).find((c) => c.code === classCode)?.grade);

  const selectClass = (code) => {
    setClassCode(code);
    const next = termsForGrade((classes || []).find((c) => c.code === code)?.grade);
    if (!next.includes(term)) setTerm(next[0]);
  };

  const showAll = classCode === ALL;
  const { data: schoolWide, loading: loadingSchoolWide, error: schoolWideError } = useApiResource("/reports/results", {
    query: { term },
    deps: [term],
    enabled: showAll,
  });

  const activeTab = tabs.find((t) => t.id === tab);

  return (
    <div>
      <PortalPageHeader title="Results & Reports" description="Class mark reports, scorecards, and school-wide analysis." />

      <Card className="p-4 mb-5 flex flex-wrap gap-3 items-center">
        <select value={classCode} onChange={(e) => selectClass(e.target.value)} className={inputClass + " max-w-[10rem]"}>
          <option value={ALL}>All Classes</option>
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

      {activeTab.needsClass && showAll && (
        <div>
          <h2 className="font-heading font-bold text-navy text-base mb-1">All Classes — Averages · {term}</h2>
          <p className="text-sm text-navy/50 mb-3">Choose a class above (or click a row) to see its {activeTab.label.toLowerCase()}.</p>
          {schoolWideError && <Banner tone="error">{schoolWideError.message}</Banner>}
          {loadingSchoolWide && <Card className="p-0 overflow-hidden"><TableSkeleton rows={5} columns={3} /></Card>}
          {!loadingSchoolWide && schoolWide && (
            <Card className="p-0 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold uppercase tracking-wide text-navy/45 border-b border-navy/8">
                    <th className="px-4 py-3">Class</th>
                    <th className="px-4 py-3">Students with Marks</th>
                    <th className="px-4 py-3">Average %</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {schoolWide.classes.map((c) => (
                    <tr
                      key={c.class_code}
                      onClick={() => selectClass(c.class_code)}
                      className="border-b border-navy/6 last:border-0 hover:bg-navy/[0.04] cursor-pointer"
                    >
                      <td className="px-4 py-2.5 font-medium text-navy">{c.class_code}</td>
                      <td className="px-4 py-2.5 text-navy/70">{c.students_with_marks}</td>
                      <td className="px-4 py-2.5 text-navy/70">{c.average_percent != null ? `${c.average_percent}%` : "—"}</td>
                      <td className="px-4 py-2.5 text-right">
                        <Icon name="ChevronRight" size={16} className="text-navy/30" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}
      {tab === "mark-report" && !showAll && <ClassMarkReport classCode={classCode} term={term} />}
      {tab === "scorecard" && !showAll && <ClassScorecard classCode={classCode} term={term} />}
      {tab === "report-cards" && !showAll && <ClassReportCards classCode={classCode} />}
      {tab === "consolidated" && <ConsolidatedReport term={term} />}
    </div>
  );
}
