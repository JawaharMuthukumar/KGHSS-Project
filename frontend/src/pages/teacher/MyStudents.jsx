import { useMemo, useState } from "react";
import PortalPageHeader from "../../components/portal/PortalPageHeader";
import Card from "../../components/ui/Card";
import Icon from "../../components/ui/Icon";
import Banner from "../../components/portal/Banner";
import Drawer from "../../components/portal/Drawer";
import EmptyState from "../../components/portal/EmptyState";
import StudentProfilePanel from "../../components/portal/StudentProfilePanel";
import { inputClass } from "../../components/portal/FormField";
import { useApiResource } from "../../hooks/useApiResource";
import { useMyTeacherProfile } from "../../hooks/useMyTeacherProfile";

export default function MyStudents() {
  const { classCode, loading: loadingProfile } = useMyTeacherProfile();
  const [search, setSearch] = useState("");
  const [activeStudent, setActiveStudent] = useState(null);
  const { data: students, loading, error } = useApiResource("/students", { enabled: Boolean(classCode) });

  const filtered = useMemo(() => {
    const list = students || [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((s) => s.full_name.toLowerCase().includes(q) || s.registration_no.toLowerCase().includes(q));
  }, [students, search]);

  return (
    <div>
      <PortalPageHeader title="My Class Students" description={classCode ? `Class ${classCode}` : undefined} />

      {!loadingProfile && !classCode && (
        <EmptyState
          icon="GraduationCap"
          title="You are not a Class Teacher"
          description="Student lists are scoped to your assigned class. Ask an admin to assign you as a Class Teacher first."
        />
      )}

      {classCode && (
        <>
          {error && <Banner tone="error" className="mb-4">Could not load students. {error.message}</Banner>}

          <Card className="p-4 mb-5">
            <div className="relative max-w-xs">
              <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy/35" />
              <input
                type="text"
                placeholder="Search by name or register number…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`${inputClass} pl-9`}
              />
            </div>
          </Card>

          <Card className="p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-navy/45 border-b border-navy/8">
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Register No</th>
                  <th className="px-4 py-3">Gender</th>
                  <th className="px-4 py-3">Guardian Phone</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-navy/40">Loading…</td>
                  </tr>
                )}
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-navy/40">No students found.</td>
                  </tr>
                )}
                {filtered.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => setActiveStudent(s.id)}
                    className="border-b border-navy/6 last:border-0 hover:bg-navy/[0.02] cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-navy/8 text-navy text-xs font-bold shrink-0">
                          {s.full_name.slice(0, 1)}
                        </span>
                        <span className="font-medium text-navy">{s.full_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-navy/70">{s.registration_no}</td>
                    <td className="px-4 py-3 text-navy/70">{s.gender || "—"}</td>
                    <td className="px-4 py-3 text-navy/70">{s.guardian_phone || "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <Icon name="ChevronRight" size={16} className="text-navy/30" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}

      <Drawer open={Boolean(activeStudent)} onClose={() => setActiveStudent(null)} title="Student Profile">
        {activeStudent && <StudentProfilePanel studentId={activeStudent} />}
      </Drawer>
    </div>
  );
}
