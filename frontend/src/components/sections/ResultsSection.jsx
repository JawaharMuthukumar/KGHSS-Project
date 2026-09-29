import Container from "../ui/Container";
import SectionHeading from "../ui/SectionHeading";
import Reveal from "../ui/Reveal";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import AnimatedCounter from "../ui/AnimatedCounter";
import { boardResults } from "../../data/schoolData";

export default function ResultsSection() {
  return (
    <section className="py-20 sm:py-28 bg-sky/60">
      <Container>
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-12">
          <SectionHeading
            eyebrow="Results"
            title="Consistency that builds confidence."
            description="Sample year-specific figures shown below — replace with official results as they are published."
            className="mb-0"
          />
          <Button to="/achievements" variant="outlineDark" className="shrink-0">
            View Academic Results
          </Button>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          {boardResults.map((yearBlock, i) => (
            <Reveal key={yearBlock.year} delay={i * 0.08}>
              <div className="bg-white rounded-3xl border border-navy/8 shadow-soft p-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-heading font-bold text-navy text-lg">{yearBlock.year}</h3>
                  <Badge tone="sample">Sample data</Badge>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {yearBlock.entries.map((entry) => (
                    <div key={entry.level} className="text-center bg-cream rounded-2xl py-6 px-3">
                      <p className="text-3xl font-heading font-extrabold text-teal">
                        <AnimatedCounter value={entry.passPercentage} suffix="%" />
                      </p>
                      <p className="text-xs font-medium text-ink/60 mt-2">{entry.level}</p>
                      <p className="text-[11px] text-ink/40 mt-1">Pass Percentage</p>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
