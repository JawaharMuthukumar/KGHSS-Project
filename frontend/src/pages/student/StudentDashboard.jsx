import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PortalPageHeader from "../../components/portal/PortalPageHeader";
import StatCard from "../../components/portal/StatCard";
import Card from "../../components/ui/Card";
import Icon from "../../components/ui/Icon";
import Badge from "../../components/ui/Badge";
import { useApiResource } from "../../hooks/useApiResource";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../lib/apiClient";
import { formatDate } from "../../utils/formatDate";

const statusTone = { pending: "navy", approved: "success", rejected: "danger" };

export default function StudentDashboard() {
  const { user } = useAuth();
  const { data, loading, error } = useApiResource("/dashboards/student");
  const [average, setAverage] = useState(null);

  useEffect(() => {
    if (!data?.student_id) return;
    api
      .get(`/students/${data.student_id}/results`)
      .then((res) => setAverage(res.average_percent))
      .catch(() => setAverage(null));
  }, [data?.student_id]);

  return (
    <div>
      <PortalPageHeader
        title={`Welcome, ${user?.full_name || "Student"}`}
        description={data ? `${data.registration_no} · Class ${data.class_code}` : undefined}
      />

      {error && <p className="text-sm text-red-600 mb-4">Could not load the dashboard. {error.message}</p>}

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard label="My Average" value={average != null ? `${average}%` : "—"} icon="TrendingUp" tone="gold" />
        <StatCard
          label="Certificate Requests"
          value={loading ? undefined : (data?.certificate_requests || []).length}
          icon="FileCheck2"
          tone="navy"
        />
        <StatCard label="Class" value={data?.class_code} icon="School" tone="teal" />
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading font-bold text-navy">Notice Board</h2>
            <Link to="/student/notices" className="text-xs font-semibold text-gold-dark hover:text-gold">
              View all
            </Link>
          </div>
          <div className="flex flex-col gap-3">
            {!loading && (data?.notices || []).length === 0 && (
              <p className="text-sm text-navy/50">No notices yet.</p>
            )}
            {(data?.notices || []).map((notice) => (
              <div key={notice.id} className="pb-3 border-b border-navy/6 last:border-0 last:pb-0">
                <p className="text-sm font-semibold text-navy">{notice.title}</p>
                <p className="text-xs text-navy/55 mt-0.5 line-clamp-2">{notice.body}</p>
                <p className="text-xs text-navy/40 mt-1">{formatDate(notice.created_at)}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="font-heading font-bold text-navy mb-4">Subject Teachers</h2>
          <div className="flex flex-col gap-2.5">
            {!loading && (data?.subject_teachers || []).length === 0 && (
              <p className="text-sm text-navy/50">Not assigned yet.</p>
            )}
            {(data?.subject_teachers || []).map((entry) => (
              <div key={entry.subject} className="flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-navy/8 text-navy text-xs font-bold shrink-0">
                  {(entry.teacher_name || "?").slice(0, 1)}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-navy truncate">{entry.teacher_name}</p>
                  <p className="text-xs text-navy/50">{entry.subject}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-5 mt-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading font-bold text-navy">Certificate Requests</h2>
          <Link to="/student/certificates" className="text-xs font-semibold text-gold-dark hover:text-gold">
            Request a certificate
          </Link>
        </div>
        <div className="flex flex-col gap-2">
          {!loading && (data?.certificate_requests || []).length === 0 && (
            <p className="text-sm text-navy/50">No certificate requests yet.</p>
          )}
          {(data?.certificate_requests || []).map((req) => (
            <div key={req.id} className="flex items-center justify-between gap-3 py-2 border-b border-navy/6 last:border-0">
              <div className="flex items-center gap-2 min-w-0">
                <Icon name="FileCheck2" size={16} className="text-navy/40 shrink-0" />
                <p className="text-sm font-medium text-navy capitalize truncate">{req.certificate_type}</p>
              </div>
              <Badge tone={statusTone[req.status] || "navy"}>{req.status}</Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
