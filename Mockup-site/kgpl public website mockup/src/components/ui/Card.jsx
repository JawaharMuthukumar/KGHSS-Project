export default function Card({ children, className = "", hover = true, as = "div" }) {
  const Tag = as;
  return (
    <Tag
      className={`bg-white rounded-3xl border border-navy/8 shadow-soft ${
        hover ? "transition-all duration-300 hover:shadow-lift hover:-translate-y-1" : ""
      } ${className}`}
    >
      {children}
    </Tag>
  );
}
