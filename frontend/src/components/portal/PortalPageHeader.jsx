export default function PortalPageHeader({ title, description, actions }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
      <div>
        <h1 className="font-heading font-bold text-navy text-xl lg:text-2xl">{title}</h1>
        {description && <p className="text-sm text-navy/55 mt-1 max-w-2xl">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
