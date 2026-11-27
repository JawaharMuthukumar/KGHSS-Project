import PortalPageHeader from "../../components/portal/PortalPageHeader";
import Banner from "../../components/portal/Banner";
import EmptyState from "../../components/portal/EmptyState";
import StudentProgressView from "../../components/reports/StudentProgressView";
import { ContentSkeleton } from "../../components/ui/Skeleton";
import { useApiResource } from "../../hooks/useApiResource";

/** A student's own progress: every exam of the year, mid terms and main exams compared, per-subject change, tips. */
export default function MyProgress() {
  const { data, loading, error } = useApiResource("/reports/my-progress");

  if (error) return <Banner tone="error">{error.message}</Banner>;
  if (loading || !data) return <ContentSkeleton rows={6} />;

  const header = <PortalPageHeader title="My Progress" description="How your marks are moving from exam to exam, and what to focus on next." />;
  if (!data.exams.length) {
    return (
      <div>
        {header}
        <EmptyState icon="TrendingUp" title="No exam marks yet" description="Once your teachers enter marks, your progress, comparisons and tips will appear here." />
      </div>
    );
  }

  return (
    <div>
      {header}
      <StudentProgressView data={data} />
    </div>
  );
}
