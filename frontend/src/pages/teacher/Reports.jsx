import { useState } from "react";
import PortalPageHeader from "../../components/portal/PortalPageHeader";
import EmptyState from "../../components/portal/EmptyState";
import Card from "../../components/ui/Card";
import { inputClass } from "../../components/portal/FormField";
import ClassMarkReport from "../../components/reports/ClassMarkReport";
import ClassScorecard from "../../components/reports/ClassScorecard";
import HmClassReport from "../../components/reports/HmClassReport";
import MyClassReport from "../../components/reports/MyClassReport";
import { useApiResource } from "../../hooks/useApiResource";
import { useMyTeacherProfile } from "../../hooks/useMyTeacherProfile";
import { termsForGrade } from "../../constants/academic";

const TABS = {
  "mark-report": "Class Mark Report",
  scorecard: "Scorecard",
  "hm-report": "HM Report",
  "my-report": "My Report",
};

export default function Reports() {
  const { classCode, loading: loadingProfile } = useMyTeacherProfile();
  const { data: classes } = useApiResource("/classes");
  const [selectedTerm, setTerm] = useState(null);
  const [tab, setTab] = useState("mark-report");
  const terms = termsForGrade((classes || []).find((c) => c.code === classCode)?.grade);
  const term = selectedTerm && terms.includes(selectedTerm) ? selectedTerm : terms[0];

  if (!loadingProfile && !classCode) {
    return (
      <div>
        <PortalPageHeader title="Reports" />
        <EmptyState
          icon="FileText"
          title="You are not a Class Teacher"
          description="Reports are available only for your assigned class. Ask an admin to assign you as a Class Teacher first."
        />
      </div>
    );
  }

  return (
    <div>
      <PortalPageHeader
        title="Reports"
        description={classCode ? `Mark report and scorecard for Class ${classCode}.` : undefined}
      />

      {classCode && (
        <>
          <Card className="p-4 mb-5 flex flex-wrap gap-3 items-center">
            <span className="text-sm font-semibold text-navy">Class {classCode}</span>
            <select value={term} onChange={(e) => setTerm(e.target.value)} className={inputClass + " max-w-[10rem]"}>
              {terms.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Card>

          <div className="flex gap-1 mb-5 border-b border-navy/8">
            {Object.entries(TABS).map(([key, label]) => (
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

          {tab === "mark-report" && <ClassMarkReport classCode={classCode} term={term} />}
          {tab === "scorecard" && <ClassScorecard classCode={classCode} term={term} />}
          {tab === "hm-report" && <HmClassReport classCode={classCode} term={term} />}
          {tab === "my-report" && <MyClassReport classCode={classCode} term={term} />}
        </>
      )}
    </div>
  );
}
