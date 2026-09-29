import Icon from "./Icon";

const gradients = [
  "from-navy to-teal",
  "from-teal to-navy-dark",
  "from-gold-dark to-navy",
  "from-navy via-teal to-gold-dark",
];

function hashToIndex(str = "", mod = gradients.length) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) % 9973;
  return hash % mod;
}

export default function ImagePlaceholder({ label = "Photo coming soon", icon = "ImageIcon", hideLabel = false, className = "" }) {
  const gradient = gradients[hashToIndex(label)];
  return (
    <div
      className={`relative flex flex-col items-center justify-center gap-2 overflow-hidden bg-gradient-to-br ${gradient} text-white/85 ${className}`}
      role="img"
      aria-label={label}
    >
      <div className="absolute inset-0 bg-noise opacity-40" />
      <Icon name={icon} size={30} className="relative opacity-80" strokeWidth={1.5} />
      {!hideLabel && (
        <span className="relative text-xs sm:text-sm font-medium text-center px-4 text-balance">{label}</span>
      )}
    </div>
  );
}
