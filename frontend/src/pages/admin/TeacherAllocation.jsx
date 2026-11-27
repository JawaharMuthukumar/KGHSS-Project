import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import PortalPageHeader from "../../components/portal/PortalPageHeader";
import Card from "../../components/ui/Card";
import Icon from "../../components/ui/Icon";
import Banner from "../../components/portal/Banner";
import TeacherWeekGrid from "../../components/timetable/TeacherWeekGrid";
import { ContentSkeleton } from "../../components/ui/Skeleton";
import { useApiResource } from "../../hooks/useApiResource";
import { printElement } from "../../lib/printElement";

const cell = "border border-black px-2 py-1.5 align-top";

/**
 * The school's teacher – class – subject allocation (ஆசிரியர் – வகுப்பு – பாட ஒதுக்கீட்டு அட்டவணை) with each
 * teacher's periods per week, like the paper the office keeps; optionally every teacher's timetable, all printable.
 */
export default function TeacherAllocation() {
  const { data, loading, error } = useApiResource("/reports/teacher-allocation");
  const [withTimetables, setWithTimetables] = useState(false);
  const sheet = useRef(null);

  if (error) return <Banner tone="error">{error.message}</Banner>;
  if (loading || !data) return <ContentSkeleton rows={8} />;
  const total = data.teachers.reduce((n, t) => n + t.periods_per_week, 0);

  return (
    <div>
      <PortalPageHeader
        title="Teacher Allocation"
        description="Every teacher's classes, subjects and periods per week. Add the timetables to print each teacher's week too."
        actions={
          <>
            <Link to="/admin/teachers" className="flex items-center gap-1.5 text-sm font-semibold text-navy border border-navy/15 px-4 py-2.5 rounded-full hover:bg-navy/5">
              <Icon name="ArrowLeft" size={15} />
              Teachers
            </Link>
            <button
              type="button"
              onClick={() => printElement(sheet.current, { orientation: "portrait", title: `Teacher Allocation ${data.academic_year}` })}
              className="flex items-center gap-1.5 bg-gold text-navy-dark font-semibold text-sm px-4 py-2.5 rounded-full hover:bg-gold-light"
            >
              <Icon name="Printer" size={15} />
              Print
            </button>
          </>
        }
      />

      <label className="flex items-center gap-2 mb-4 text-sm text-navy cursor-pointer w-fit">
        <input type="checkbox" checked={withTimetables} onChange={(e) => setWithTimetables(e.target.checked)} className="w-4 h-4 accent-[var(--color-gold-dark)]" />
        Include every teacher's timetable
      </label>

      <Card className="p-4 overflow-x-auto" hover={false}>
        <div ref={sheet} className="bg-white text-black min-w-[640px]">
          <p className="text-center font-bold text-sm mb-1">அரசு மேல்நிலைப்பள்ளி, காங்கயம்பாளையம்</p>
          <p className="text-center font-bold text-sm mb-3">
            {data.academic_year} ஆசிரியர் – வகுப்பு – பாட ஒதுக்கீட்டு அட்டவணை <span className="font-normal text-xs">/ Teacher – Class – Subject Allocation</span>
          </p>
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr className="font-bold">
                <th className={`${cell} w-10 text-center`}>எண்<span className="block text-[9px] font-normal">No</span></th>
                <th className={cell}>ஆசிரியர்<span className="block text-[9px] font-normal">Teacher</span></th>
                <th className={cell}>வகுப்புகள்<span className="block text-[9px] font-normal">Classes</span></th>
                <th className={cell}>பாடம்<span className="block text-[9px] font-normal">Subject</span></th>
                <th className={`${cell} w-24 text-center`}>மொத்த பாடவேளைகள்<span className="block text-[9px] font-normal">Periods / week</span></th>
              </tr>
            </thead>
            <tbody>
              {data.teachers.map((t, i) => (
                <tr key={t.teacher_id} className="break-inside-avoid">
                  <td className={`${cell} text-center`}>{i + 1}</td>
                  <td className={cell}>
                    <Link to={`/admin/teachers/${t.teacher_id}`} className="font-semibold hover:underline print:no-underline">
                      {t.name}
                    </Link>
                  </td>
                  <td className={cell}>
                    {t.subjects.map((s) => (
                      <span key={s} className="block">{(t.classes_by_subject[s] || []).join(", ") || "—"}</span>
                    ))}
                  </td>
                  <td className={cell}>
                    {t.subjects.length ? t.subjects.map((s) => <span key={s} className="block">{s}</span>) : "—"}
                  </td>
                  <td className={`${cell} text-center font-bold`}>{t.periods_per_week || "—"}</td>
                </tr>
              ))}
              <tr className="font-bold">
                <td className={cell} colSpan={4}>
                  Total periods per week (all teachers)
                </td>
                <td className={`${cell} text-center`}>{total}</td>
              </tr>
            </tbody>
          </table>

          {withTimetables && (
            <div className="mt-6 flex flex-col gap-5">
              {data.teachers.map((t, i) => (
                <div key={t.teacher_id} className="break-inside-avoid">
                  <p className="font-bold text-sm mb-1.5">
                    {i + 1}. {t.name} <span className="font-normal text-xs">· {t.subjects.join(", ") || "—"} · {t.periods_per_week} periods / week</span>
                  </p>
                  {t.timetable.length ? <TeacherWeekGrid entries={t.timetable} compact /> : <p className="text-xs">No periods in the timetable.</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
