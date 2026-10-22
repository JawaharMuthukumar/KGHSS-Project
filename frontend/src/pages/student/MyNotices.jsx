import PortalPageHeader from "../../components/portal/PortalPageHeader";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Banner from "../../components/portal/Banner";
import { useApiResource } from "../../hooks/useApiResource";
import { formatDate } from "../../utils/formatDate";
import { ContentSkeleton } from "../../components/ui/Skeleton";
import NoticeAuthor from "../../components/portal/NoticeAuthor";

export default function MyNotices() {
  const { data: notices, loading, error } = useApiResource("/portal/notices", { live: "notices" });

  return (
    <div>
      <PortalPageHeader title="Notices" description="Notices for you and your class." />

      {error && <Banner tone="error" className="mb-4">{error.message}</Banner>}

      <Card className="p-5">
        {loading && <ContentSkeleton rows={4} />}
        {!loading && (notices || []).length === 0 && <p className="text-sm text-navy/50">No notices yet.</p>}
        {!loading && <div className="flex flex-col gap-4">
          {(notices || []).map((n) => (
            <div key={n.id} className="pb-4 border-b border-navy/6 last:border-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <p className="text-sm font-semibold text-navy">{n.title}</p>
                <Badge tone="navy">{n.class_id ? "Class" : "School"}</Badge>
              </div>
              <p className="text-sm text-navy/60 whitespace-pre-line">{n.body}</p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                <NoticeAuthor notice={n} />
                <p className="text-xs text-navy/40">{formatDate(n.created_at)}</p>
              </div>
            </div>
          ))}
        </div>}
      </Card>
    </div>
  );
}
