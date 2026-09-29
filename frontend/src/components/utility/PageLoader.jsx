export default function PageLoader() {
  return (
    <div className="min-h-[60svh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <span className="w-10 h-10 rounded-full border-4 border-navy/15 border-t-gold animate-spin" />
        <span className="text-xs font-medium text-ink/40 tracking-wide uppercase">Loading</span>
      </div>
    </div>
  );
}
