export default function Container({ children, className = "" }) {
  return <div className={`container-page ${className}`}>{children}</div>;
}
