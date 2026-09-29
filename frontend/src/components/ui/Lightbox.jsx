import { useCallback, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Icon from "./Icon";

export default function Lightbox({ images, index, onClose, onNavigate }) {
  const open = index !== null && index >= 0;
  const current = open ? images[index] : null;

  const goTo = useCallback(
    (dir) => {
      if (!open) return;
      const next = (index + dir + images.length) % images.length;
      onNavigate(next);
    },
    [index, images.length, onNavigate, open]
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") goTo(1);
      if (e.key === "ArrowLeft") goTo(-1);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose, goTo]);

  return (
    <AnimatePresence>
      {open && current && (
        <motion.div
          className="fixed inset-0 z-[70] bg-navy-dark/95 backdrop-blur-sm flex items-center justify-center px-4 py-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          role="dialog"
          aria-modal="true"
          aria-label="Image viewer"
          onClick={onClose}
        >
          <button
            onClick={onClose}
            aria-label="Close image viewer"
            className="absolute top-5 right-5 sm:top-8 sm:right-8 z-10 flex items-center justify-center w-11 h-11 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            <Icon name="X" size={22} />
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); goTo(-1); }}
            aria-label="Previous image"
            className="absolute left-3 sm:left-6 z-10 flex items-center justify-center w-11 h-11 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            <Icon name="ChevronLeft" size={22} />
          </button>

          <motion.figure
            key={current.id || current.src}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="max-w-4xl max-h-[80vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={current.src}
              alt={current.caption || ""}
              className="max-h-[70vh] w-auto rounded-2xl shadow-lift object-contain"
            />
            {current.caption && (
              <figcaption className="mt-4 text-white/80 text-sm text-center">{current.caption}</figcaption>
            )}
          </motion.figure>

          <button
            onClick={(e) => { e.stopPropagation(); goTo(1); }}
            aria-label="Next image"
            className="absolute right-3 sm:right-6 z-10 flex items-center justify-center w-11 h-11 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            <Icon name="ChevronRight" size={22} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
