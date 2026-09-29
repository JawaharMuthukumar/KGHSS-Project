import Container from "../ui/Container";
import SectionHeading from "../ui/SectionHeading";
import Reveal from "../ui/Reveal";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import Icon from "../ui/Icon";
import { academicStages, higherSecondaryStreams } from "../../data/schoolData";

export default function AcademicsPreview() {
  return (
    <section className="py-20 sm:py-28">
      <Container>
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-12">
          <SectionHeading
            eyebrow="Academics"
            title="Learning pathways for every stage."
            description="From foundational middle school years to specialised higher secondary streams."
            className="mb-0"
          />
          <Button to="/academics" variant="outlineDark" className="shrink-0">
            View Full Academics
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-5 mb-10">
          {academicStages.map((stage, i) => (
            <Reveal key={stage.id} delay={i * 0.08}>
              <div className="h-full bg-white rounded-2xl border border-navy/8 shadow-soft p-7">
                <span className="text-xs font-bold tracking-wider uppercase text-gold-dark">Classes {stage.range}</span>
                <h3 className="text-xl font-heading font-bold text-navy mt-2 mb-3">{stage.title}</h3>
                <p className="text-sm text-ink/65 leading-relaxed mb-5">{stage.description}</p>
                <div className="flex flex-wrap gap-2">
                  {stage.mediums.map((m) => (
                    <Badge key={m} tone="teal">{m}</Badge>
                  ))}
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal>
          <div className="bg-navy rounded-3xl p-8 sm:p-10">
            <div className="flex items-center gap-2 mb-6">
              <Icon name="Sparkles" size={18} className="text-gold-light" />
              <h3 className="text-white font-heading font-semibold text-lg">Higher Secondary Streams</h3>
            </div>
            <div className="grid sm:grid-cols-2 gap-5">
              {higherSecondaryStreams.map((stream) => (
                <div key={stream.id} className="bg-white/5 border border-white/10 rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-white font-semibold">{stream.name}</h4>
                    {stream.isSample && <Badge tone="sample">Sample subjects</Badge>}
                  </div>
                  <ul className="flex flex-wrap gap-2">
                    {stream.subjects.map((s) => (
                      <li key={s} className="text-xs font-medium text-white/80 bg-white/10 rounded-full px-3 py-1.5">
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
