import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Icon from "../ui/Icon";

export default function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 480);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.2 }}
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="Back to top"
          className="fixed bottom-6 right-5 sm:bottom-8 sm:right-8 z-40 flex items-center justify-center w-12 h-12 rounded-full bg-navy text-gold-light shadow-lift hover:bg-navy-dark transition-colors"
          style={{ marginBottom: "env(safe-area-inset-bottom, 0px)" }}
        >
          <Icon name="ChevronUp" size={22} />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
