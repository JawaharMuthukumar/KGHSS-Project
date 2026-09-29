import Container from "../ui/Container";
import Reveal from "../ui/Reveal";
import AnimatedCounter from "../ui/AnimatedCounter";
import { quickStats } from "../../data/schoolData";

export default function QuickStats() {
  return (
    <section className="relative -mt-16 sm:-mt-20 z-10">
      <Container>
        <Reveal className="bg-white rounded-3xl shadow-lift border border-navy/8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-px overflow-hidden">
          {quickStats.map((stat) => (
            <div
              key={stat.id}
              className="relative flex flex-col items-center justify-center gap-1 px-4 py-8 bg-white text-center"
            >
              <span className="text-3xl sm:text-4xl font-heading font-extrabold text-navy">
                {stat.value !== null ? (
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                ) : (
                  stat.display
                )}
              </span>
              <span className="text-xs sm:text-sm font-medium text-ink/60">{stat.label}</span>
              {stat.isDummy && (
                <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-amber-400" title="Sample figure" />
              )}
            </div>
          ))}
        </Reveal>
      </Container>
    </section>
  );
}
