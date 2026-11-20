import { Link } from "react-router-dom";
import Icon from "../ui/Icon";
import { useApiResource } from "../../hooks/useApiResource";

/**
 * Strip across the top of the home hero, right under the header (the stats card overlaps the hero's bottom edge,
 * so the top is the one place nothing covers it): the latest public-website notices (title + message) scroll continuously,
 * pause while hovered or focused, and each title opens the Notice Board. Hidden when there are no notices.
 */
export default function HeroNoticeTicker() {
  const { data } = useApiResource("/notices");
  const notices = (data || []).slice(0, 10);
  if (!notices.length) return null;

  // Title plus its message on one line; long messages are cut short (the Notice Board has them in full).
  const message = (n) => {
    const text = (n.body || "").replace(/\s+/g, " ").trim();
    return text.length > 120 ? `${text.slice(0, 117).trimEnd()}…` : text;
  };
  // The track holds the list twice and slides by half its width, so the loop has no visible seam.
  // Speed follows the text length, so longer messages don't rush past.
  const seconds = Math.max(18, notices.reduce((n, x) => n + x.title.length + message(x).length, 0) * 0.3);
  const items = (copy) =>
    notices.map((n) => (
      <Link
        key={`${copy}-${n.id}`}
        to="/notices"
        aria-hidden={copy === "b" ? true : undefined}
        tabIndex={copy === "b" ? -1 : undefined}
        className="group/item flex items-center gap-3 shrink-0 px-6 text-sm text-white/90 outline-none"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-gold-light shrink-0" aria-hidden="true" />
        <span className="font-semibold group-hover/item:text-gold-light group-focus-visible/item:text-gold-light">{n.title}</span>
        {message(n) && (
          <span className="text-white/65 group-hover/item:text-white">
            <span className="text-white/35 mr-2" aria-hidden="true">—</span>
            {message(n)}
          </span>
        )}
      </Link>
    ));

  return (
    <div className="absolute top-[var(--site-header-h,76px)] inset-x-0 z-10 flex items-stretch bg-navy-dark/70 backdrop-blur-md border-y border-white/10">
      <Link
        to="/notices"
        className="flex items-center gap-2 shrink-0 px-4 sm:px-6 py-3 bg-gold text-navy-dark text-xs sm:text-sm font-bold uppercase tracking-wide hover:bg-gold-light transition-colors"
      >
        <Icon name="Bell" size={16} />
        <span className="hidden sm:inline">Notices</span>
      </Link>
      <div className="group relative flex-1 overflow-hidden motion-reduce:overflow-x-auto" aria-label="Latest notices">
        <div
          className="flex w-max py-3 animate-[marquee_var(--ticker-duration)_linear_infinite] group-hover:[animation-play-state:paused] group-focus-within:[animation-play-state:paused] motion-reduce:animate-none"
          style={{ "--ticker-duration": `${seconds}s` }}
        >
          {/* Each copy is at least a screen wide, so even one short notice loops without a blank gap */}
          <span className="flex min-w-[100vw]">{items("a")}</span>
          <span className="motion-reduce:hidden flex min-w-[100vw]">{items("b")}</span>
        </div>
      </div>
    </div>
  );
}
