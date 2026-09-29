import { motion, useReducedMotion } from "framer-motion";
import Container from "../ui/Container";
import Button from "../ui/Button";
import Icon from "../ui/Icon";
import { schoolInfo } from "../../data/schoolData";

export default function Hero() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section className="relative -mt-[72px] lg:-mt-[120px] min-h-[92svh] flex items-end overflow-hidden bg-navy-dark">
      {/* Header is sticky (occupies flow height) but transparent here, so Hero
          is pulled up by the header's own height to sit fully behind it. */}
      <motion.div
        className="absolute inset-0"
        initial={{ scale: 1 }}
        animate={prefersReducedMotion ? {} : { scale: 1.08 }}
        transition={{ duration: 22, ease: "easeOut" }}
      >
        <img
          src="/images/hero-building.webp"
          alt="Government Higher Secondary School, Kangayampalayam — main academic block"
          className="w-full h-full object-cover"
        />
      </motion.div>
      <div className="absolute inset-0 bg-gradient-to-t from-navy-dark via-navy-dark/70 to-navy-dark/30" />
      <div className="absolute inset-0 bg-gradient-to-r from-navy-dark/80 via-navy-dark/20 to-transparent" />
      {/* Ensures the header nav stays legible against a bright sky before the header switches to its solid scrolled state */}
      <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-navy-dark/75 to-transparent" />

      {/* Floating accent */}
      <div className="absolute top-28 right-10 sm:right-20 hidden sm:flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-white/90 text-xs font-semibold animate-pulse">
        <Icon name="Sparkle" size={14} className="text-gold-light" />
        Est. {schoolInfo.foundedYear}
      </div>

      <Container className="relative pb-20 pt-40 sm:pb-28 sm:pt-48">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-3xl"
        >
          <span className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold tracking-[0.2em] uppercase px-4 py-2 rounded-full bg-white/10 border border-white/15 text-gold-light mb-6">
            {schoolInfo.name}
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.08] text-balance mb-5">
            Learning with purpose.
            <br />
            Growing with values.
          </h1>
          <p className="text-white/80 text-base sm:text-lg max-w-xl mb-4">{schoolInfo.supportingLine}</p>
          <p className="text-white/70 text-sm sm:text-base max-w-xl mb-9 leading-relaxed">
            Empowering students through quality education, strong values, sports, leadership and
            lifelong learning.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <Button to="/about" variant="primary" size="lg">
              Explore Our School
            </Button>
            <Button to="/legacy" variant="outline" size="lg" icon="Sparkle">
              Our Legacy
            </Button>
          </div>
        </motion.div>
      </Container>

      <motion.div
        className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/60"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.6 }}
      >
        <span className="text-[10px] tracking-[0.3em] uppercase">Scroll</span>
        {!prefersReducedMotion ? (
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          >
            <Icon name="ChevronDown" size={18} />
          </motion.div>
        ) : (
          <Icon name="ChevronDown" size={18} />
        )}
      </motion.div>
    </section>
  );
}
