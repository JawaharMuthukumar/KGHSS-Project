import { useState } from "react";
import ImagePlaceholder from "./ImagePlaceholder";

/**
 * Masonry-friendly gallery tile: unlike SmartImage it does not force a crop,
 * so real photos keep their natural aspect ratio in a columns-based layout.
 */
export default function GalleryTile({ image, onClick }) {
  const [errored, setErrored] = useState(false);
  const showPlaceholder = !image.src || errored;

  return (
    <button
      onClick={onClick}
      className="group relative block w-full overflow-hidden rounded-2xl"
      aria-label={`View photo: ${image.caption}`}
    >
      {showPlaceholder ? (
        <ImagePlaceholder label={image.caption} className="aspect-square" />
      ) : (
        <img
          src={image.src}
          alt={image.caption}
          loading="lazy"
          onError={() => setErrored(true)}
          className="w-full h-auto transition-transform duration-500 group-hover:scale-110"
        />
      )}
      <div className="absolute inset-0 bg-navy-dark/0 group-hover:bg-navy-dark/25 transition-colors duration-300 flex items-end p-3 opacity-0 group-hover:opacity-100">
        <span className="text-white text-xs font-medium">{image.caption}</span>
      </div>
    </button>
  );
}
