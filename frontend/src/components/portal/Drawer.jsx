import Icon from "../ui/Icon";

export default function Drawer({ open, onClose, title, children, width = "max-w-md" }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close panel"
        onClick={onClose}
        className="absolute inset-0 bg-navy-dark/50"
      />
      <div className={`relative h-full w-full ${width} bg-white shadow-xl flex flex-col overflow-hidden`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-navy/8 shrink-0">
          <h2 className="font-heading font-bold text-navy text-base">{title}</h2>
          <button type="button" onClick={onClose} className="text-navy/50 hover:text-navy" aria-label="Close">
            <Icon name="X" size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}
