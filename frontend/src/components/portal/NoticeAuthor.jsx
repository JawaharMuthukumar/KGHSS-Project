import Icon from "../ui/Icon";

/** "SATHYAB · Chemistry · Class Teacher" / "Head Master" under a notice, from the API's author_* fields. */
export default function NoticeAuthor({ notice, className = "" }) {
  if (!notice.author_name) return null;
  const isAdmin = notice.author_role === "admin";
  const parts = isAdmin
    ? ["Head Master"]
    : [notice.author_name, notice.author_subject, notice.author_is_class_teacher ? "Class Teacher" : null].filter(Boolean);
  return (
    <p className={`flex items-center gap-1.5 text-xs font-medium ${isAdmin ? "text-gold-dark" : "text-teal"} ${className}`}>
      <Icon name={isAdmin ? "Award" : "UserRound"} size={13} className="shrink-0" />
      <span className="truncate">{parts.join(" · ")}</span>
    </p>
  );
}
