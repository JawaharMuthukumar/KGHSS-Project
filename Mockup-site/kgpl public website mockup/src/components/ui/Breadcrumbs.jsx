import { Link } from "react-router-dom";
import Icon from "./Icon";

export default function Breadcrumbs({ trail = [] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm">
      <ol className="flex flex-wrap items-center gap-1.5 text-white/60">
        <li>
          <Link to="/" className="hover:text-white transition-colors">Home</Link>
        </li>
        {trail.map((crumb, i) => (
          <li key={crumb.label} className="flex items-center gap-1.5">
            <Icon name="ChevronRight" size={13} />
            {i === trail.length - 1 || !crumb.to ? (
              <span className="text-white font-medium" aria-current="page">{crumb.label}</span>
            ) : (
              <Link to={crumb.to} className="hover:text-white transition-colors">{crumb.label}</Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
