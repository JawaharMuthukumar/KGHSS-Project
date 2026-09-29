import PortalPageHeader from "./PortalPageHeader";
import EmptyState from "./EmptyState";

export default function ComingSoon({ title, description }) {
  return (
    <div>
      <PortalPageHeader title={title} description={description} />
      <EmptyState
        icon="SlidersHorizontal"
        title="This screen is being built"
        description="This part of the portal is still under construction and will be wired up to the backend next."
      />
    </div>
  );
}
