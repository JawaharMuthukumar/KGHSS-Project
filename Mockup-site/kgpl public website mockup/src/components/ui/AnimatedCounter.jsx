import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "framer-motion";

export default function AnimatedCounter({ value, suffix = "", duration = 1.4, className = "" }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });
  const prefersReducedMotion = useReducedMotion();
  const [display, setDisplay] = useState(prefersReducedMotion ? value : 0);

  useEffect(() => {
    if (!isInView || prefersReducedMotion || typeof value !== "number") return;

    let raf;
    const start = performance.now();
    const from = 0;

    const tick = (now) => {
      const elapsed = (now - start) / 1000;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + (value - from) * eased));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isInView, value, duration, prefersReducedMotion]);

  return (
    <span ref={ref} className={className}>
      {typeof value === "number" ? display : value}
      {suffix}
    </span>
  );
}
