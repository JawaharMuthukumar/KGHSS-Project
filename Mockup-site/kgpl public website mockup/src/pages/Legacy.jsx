import { useRef } from "react";
import { motion, useScroll, useSpring } from "framer-motion";
import Container from "../components/ui/Container";
import Reveal from "../components/ui/Reveal";
import Breadcrumbs from "../components/ui/Breadcrumbs";
import Badge from "../components/ui/Badge";
import Icon from "../components/ui/Icon";
import Button from "../components/ui/Button";
import TimelineItem from "../components/sections/TimelineItem";
import SEO from "../components/utility/SEO";
import { legacyTimeline, centenaryBlocks, schoolInfo } from "../data/schoolData";

export default function Legacy() {
  const timelineRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: timelineRef,
    offset: ["start 0.75", "end 0.4"],
  });
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 });

  return (
    <>
      <SEO
        title="Towards 100 Years"
        description="An interactive timeline of Government Higher Secondary School, Kangayampalayam, from its founding in 1927 towards its centenary."
      />

      <section className="relative bg-heritage-noise text-white overflow-hidden pt-14 pb-24 sm:pt-20 sm:pb-32">
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-gold/10 blur-3xl" aria-hidden="true" />
        <div className="absolute -bottom-32 -left-16 w-96 h-96 rounded-full bg-white/5 blur-3xl" aria-hidden="true" />
        <Container className="relative flex flex-col items-center text-center gap-6">
          <Breadcrumbs trail={[{ label: "100 Years Legacy" }]} />
          <Reveal className="flex flex-col items-center gap-6">
            <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.2em] uppercase px-4 py-2 rounded-full bg-white/10 border border-white/15 text-gold-light">
              <Icon name="Sparkle" size={14} />
              Towards 100 Years
            </span>
            <h1 className="text-3xl sm:text-5xl font-bold leading-tight text-balance max-w-3xl">
              100 Years of Learning, Community & Progress
            </h1>
            <p className="text-white/75 max-w-2xl text-base sm:text-lg leading-relaxed">
              From humble beginnings in {schoolInfo.foundedYear} to a modern higher secondary
              school serving generations of students.
            </p>
            <div className="flex items-center gap-4 sm:gap-8 mt-2">
              <span className="font-heading font-extrabold text-2xl sm:text-4xl text-gold-light">{schoolInfo.foundedYear}</span>
              <span className="w-14 sm:w-24 h-px bg-white/25" />
              <span className="font-heading font-extrabold text-2xl sm:text-4xl text-white">2027</span>
            </div>
          </Reveal>
        </Container>
      </section>

      <section className="py-20 sm:py-28" ref={timelineRef}>
        <Container>
          <div className="relative">
            <div className="absolute left-6 lg:left-1/2 top-0 bottom-0 w-0.5 bg-navy/10 lg:-translate-x-1/2" aria-hidden="true" />
            <motion.div
              className="absolute left-6 lg:left-1/2 top-0 w-0.5 bg-gold lg:-translate-x-1/2 origin-top h-full"
              style={{ scaleY: progress }}
              aria-hidden="true"
            />

            <div className="flex flex-col">
              {legacyTimeline.map((item, i) => (
                <TimelineItem key={item.year} item={item} index={i} />
              ))}
            </div>
          </div>
        </Container>
      </section>

      <section className="py-20 sm:py-28 bg-sky/60">
        <Container>
          <Reveal className="text-center max-w-2xl mx-auto mb-12">
            <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.18em] uppercase px-3 py-1.5 rounded-full bg-gold/10 text-gold-dark mb-5">
              Join the Story
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-navy leading-tight text-balance mb-4">
              Be Part of Our Centenary Story
            </h2>
            <p className="text-ink/70 leading-relaxed">
              As we approach 100 years, we're gathering memories, photographs and messages from
              across the decades. Sample content below shows how these contributions will be
              presented.
            </p>
          </Reveal>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {centenaryBlocks.map((block, i) => (
              <Reveal key={block.title} delay={i * 0.07}>
                <div className="h-full bg-white rounded-2xl border border-navy/8 shadow-soft p-6 text-center flex flex-col items-center gap-3">
                  <span className="flex items-center justify-center w-12 h-12 rounded-full bg-gold/12 text-gold-dark">
                    <Icon name={block.icon} size={20} />
                  </span>
                  <p className="font-heading font-semibold text-navy text-sm">{block.title}</p>
                  <p className="text-xs text-ink/55 leading-relaxed">{block.description}</p>
                  {block.isSample && <Badge tone="sample">Sample</Badge>}
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal className="flex flex-col items-center gap-5 mt-14 text-center">
            <p className="text-ink/60 max-w-lg">
              Are you a former student with a memory or photograph to share? We'd love to include
              it as part of our centenary archive.
            </p>
            <Button to="/alumni" variant="navy" size="lg">Share Your Story</Button>
          </Reveal>
        </Container>
      </section>
    </>
  );
}
