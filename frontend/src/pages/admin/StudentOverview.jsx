import { useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Card from "../../components/ui/Card";
import Icon from "../../components/ui/Icon";
import Banner from "../../components/portal/Banner";
import Drawer from "../../components/portal/Drawer";
import StatCard from "../../components/portal/StatCard";
import StudentProfilePanel from "../../components/portal/StudentProfilePanel";
import StudentProgressView from "../../components/reports/StudentProgressView";
import ReportCard from "../../components/reports/ReportCard";
import { HBars } from "../../components/charts/Charts";
import { ContentSkeleton } from "../../components/ui/Skeleton";
import { useApiResource } from "../../hooks/useApiResource";
import { printElement } from "../../lib/printElement";
import { formatDate } from "../../utils/formatDate";

const monthLabel = (ym) => new Date(`${ym}-01T00:00:00`).toLocaleString("en-IN", { month: "short", year: "numeric" });
const PRESENT = [{ key: "pct", label: "Present %", color: "var(--viz-series-1)" }];

function Field({ label, value }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] uppercase tracking-wide text-navy/45">{label}</p>
      <p className="text-sm font-medium text-navy truncate">{value || "—"}</p>
    </div>
  );
}

/**
 * HM's full page for one student — profile, latest result with change and class rank, attendance by month,
 * exam-to-exam progress with tips, and the report card. Made to show a parent at a parent–teacher meeting.
 */
export default function StudentOverview() {
  const { studentId } = useParams();
  const { data: profile, error: profileError, reload: reloadProfile } = useApiResource(`/students/${studentId}`, { deps: [studentId] });
  const { data, loading, error } = useApiResource(`/reports/student/${studentId}`, { deps: [studentId] });
  const { data: reportCard } = useApiResource(`/students/${studentId}/report-card`, { deps: [studentId] });
  const [editing, setEditing] = useState(false);
  const page = useRef(null);
  const card = useRef(null);

  if (profileError || error) return <Banner tone="error">{(profileError || error).message}</Banner>;
  if (!profile || loading || !data) return <ContentSkeleton rows={8} />;

  const o = data.overall;
  const att = data.attendance;
  const latest = data.exams.filter((e) => e.percent != null).at(-1);
  const below = latest ? Object.values(latest.subjects).filter((s) => s.absent || (s.percent != null && s.percent < 35)) : [];
  const parentPhone = profile.father_phone || profile.mother_phone || profile.guardian_phone;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4 print:hidden">
        <Link
          to={`/admin/students?class=${encodeURIComponent(profile.class_code)}`}
          className="flex items-center gap-1.5 text-sm font-semibold text-navy border border-navy/15 rounded-full px-4 py-2 hover:border-gold"
        >
          <Icon name="ArrowLeft" size={15} />
          {profile.class_code} students
        </Link>
        <div className="ml-auto flex flex-wrap gap-2">
          <button type="button" onClick={() => setEditing(true)} className="flex items-center gap-1.5 text-sm font-semibold text-navy border border-navy/15 rounded-full px-4 py-2 hover:border-gold">
            <Icon name="Pencil" size={14} />
            Edit profile
          </button>
          <button
            type="button"
            disabled={!reportCard}
            onClick={() => printElement(card.current, { orientation: "portrait", title: `${profile.full_name} - Report Card` })}
            className="flex items-center gap-1.5 text-sm font-semibold text-navy border border-navy/15 rounded-full px-4 py-2 hover:border-gold disabled:opacity-50"
          >
            <Icon name="FileText" size={14} />
            Print report card
          </button>
          <button
            type="button"
            onClick={() => printElement(page.current, { orientation: "portrait", title: `${profile.full_name} - Full Report` })}
            className="flex items-center gap-1.5 text-sm font-semibold bg-gold text-navy-dark rounded-full px-4 py-2 hover:bg-gold-light"
          >
            <Icon name="Printer" size={14} />
            Print full report
          </button>
        </div>
      </div>

      <div ref={page} className="flex flex-col gap-5">
        <Card className="p-5">
          <div className="flex flex-wrap items-start gap-4">
            <span className="flex items-center justify-center w-14 h-14 rounded-full bg-navy text-white text-xl font-bold shrink-0">
              {profile.full_name.slice(0, 1)}
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="font-heading font-bold text-navy text-2xl leading-tight">{profile.full_name}</h1>
              <p className="text-sm text-navy/60">
                Class {profile.class_code} · Reg. No {profile.registration_no}
                {profile.admission_no ? ` · Admission No ${profile.admission_no}` : ""} · {data.academic_year}
              </p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <Field label="Gender" value={profile.gender} />
            <Field label="Date of birth" value={profile.date_of_birth ? formatDate(profile.date_of_birth) : null} />
            <Field label="Medium" value={profile.medium} />
            <Field label="Father" value={profile.father_name} />
            <Field label="Mother" value={profile.mother_name} />
            <Field label="Parent phone" value={parentPhone} />
          </div>
        </Card>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label={o ? `${o.latest_term}${o.change != null ? ` (${o.change > 0 ? "+" : ""}${o.change}%)` : ""}` : "Latest exam"} value={o ? `${o.latest}%` : null} icon="TrendingUp" tone="gold" />
          <StatCard label="Class rank" value={o?.rank ? `${o.rank} / ${o.ranked_of}` : null} icon="Trophy" tone="navy" />
          <StatCard label={`Attendance (${att.present}/${att.working} days)`} value={att.percent != null ? `${att.percent}%` : null} icon="CalendarDays" tone="teal" />
          <StatCard label="Subjects below pass (latest)" value={latest ? below.length : null} icon="CircleAlert" tone={below.length ? "danger" : "success"} />
        </div>

        {data.exams.length ? (
          <StudentProgressView data={data} meLabel="Student %" />
        ) : (
          <Card className="p-8 text-center text-sm text-navy/50">No exam marks entered for this student yet.</Card>
        )}

        <Card className="p-5">
          <h3 className="font-heading font-bold text-navy text-sm">Attendance by month</h3>
          <p className="text-xs text-navy/50 mt-0.5 mb-4">
            {att.working ? `${att.present} of ${att.working} working days present this year` : "No monthly attendance recorded yet"}
          </p>
          {att.months.length > 0 && (
            <HBars
              series={PRESENT}
              labelWidth="5.5rem"
              rows={att.months.map((m) => ({
                label: monthLabel(m.month),
                sublabel: m.present != null ? `${m.present}/${m.working} days` : "not entered",
                values: { pct: m.present != null && m.working ? Math.round((m.present * 1000) / m.working) / 10 : null },
              }))}
            />
          )}
        </Card>

        <div>
          <h3 className="font-heading font-bold text-navy text-sm mb-2">Report card</h3>
          {reportCard ? (
            <div className="overflow-x-auto">
              <div className="min-w-[720px]">
                <ReportCard ref={card} meta={reportCard} card={reportCard.card} />
              </div>
            </div>
          ) : (
            <ContentSkeleton rows={3} />
          )}
        </div>
      </div>

      <Drawer open={editing} onClose={() => setEditing(false)} title="Edit Student Profile">
        {editing && <StudentProfilePanel studentId={Number(studentId)} editable onSaved={reloadProfile} />}
      </Drawer>
    </div>
  );
}
