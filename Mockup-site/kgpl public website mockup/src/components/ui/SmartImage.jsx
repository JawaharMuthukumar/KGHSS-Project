import { useState } from "react";
import ImagePlaceholder from "./ImagePlaceholder";

/**
 * Renders a real image when `src` is provided, otherwise (or on load error)
 * falls back to a tasteful gradient placeholder instead of a broken image.
 */
export default function SmartImage({ src, alt = "", label, icon, hideLabel = false, className = "", imgClassName = "", loading = "lazy" }) {
  const [errored, setErrored] = useState(false);

  if (!src || errored) {
    return (
      <div className={className}>
        <ImagePlaceholder label={label || alt || "Photo coming soon"} icon={icon} hideLabel={hideLabel} className="w-full h-full" />
      </div>
    );
  }

  return (
    <div className={`overflow-hidden ${className}`}>
      <img
        src={src}
        alt={alt}
        loading={loading}
        onError={() => setErrored(true)}
        className={`w-full h-full object-cover ${imgClassName}`}
      />
    </div>
  );
}
