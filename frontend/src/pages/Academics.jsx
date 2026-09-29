import PageHero from "../components/ui/PageHero";
import Container from "../components/ui/Container";
import SectionHeading from "../components/ui/SectionHeading";
import Reveal from "../components/ui/Reveal";
import Badge from "../components/ui/Badge";
import Icon from "../components/ui/Icon";
import Button from "../components/ui/Button";
import SEO from "../components/utility/SEO";
import { academicStages, higherSecondaryStreams } from "../data/schoolData";

export default function Academics() {
  return (
    <>
      <SEO
        title="Classes & Streams"
        description="Academic pathways at Government Higher Secondary School, Kangayampalayam — Middle School, Secondary and Higher Secondary, in Tamil and English medium."
      />
      <PageHero
        eyebrow="Academics"
        title="Learning pathways for every stage."
        description="From Class 6 through Class 12, in both Tamil and English medium."
        trail={[{ label: "Academics" }]}
      />

      <section className="py-20 sm:py-28">
        <Container>
          <SectionHeading
            eyebrow="Academic Stages"
            title="Three stages, one continuous journey."
          />
          <div className="mt-10 grid md:grid-cols-3 gap-6">
            {academicStages.map((stage, i) => (
              <Reveal key={stage.id} delay={i * 0.08}>
                <div className="h-full bg-white rounded-3xl border border-navy/8 shadow-soft p-8 flex flex-col">
                  <span className="text-xs font-bold tracking-wider uppercase text-gold-dark">Classes {stage.range}</span>
                  <h3 className="text-xl font-heading font-bold text-navy mt-2 mb-3">{stage.title}</h3>
                  <p className="text-sm text-ink/65 leading-relaxed mb-6 flex-1">{stage.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {stage.mediums.map((m) => (
                      <Badge key={m} tone="teal">{m}</Badge>
                    ))}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      <section className="py-20 sm:py-28 bg-sky/60">
        <Container>
          <div className="grid sm:grid-cols-2 gap-6">
            <Reveal>
              <div className="h-full bg-white rounded-3xl border border-navy/8 shadow-soft p-8">
                <span className="flex items-center justify-center w-12 h-12 rounded-xl bg-navy/6 text-navy mb-5">
                  <Icon name="Languages" size={22} />
                </span>
                <h3 className="font-heading font-bold text-navy text-lg mb-3">Tamil Medium</h3>
                <p className="text-sm text-ink/65 leading-relaxed">
                  Instruction in Tamil across all classes, supporting students who learn best in
                  their mother tongue while building strong English language skills alongside.
                </p>
              </div>
            </Reveal>
            <Reveal delay={0.08}>
              <div className="h-full bg-white rounded-3xl border border-navy/8 shadow-soft p-8">
                <span className="flex items-center justify-center w-12 h-12 rounded-xl bg-navy/6 text-navy mb-5">
                  <Icon name="Globe" size={22} />
                </span>
                <h3 className="font-heading font-bold text-navy text-lg mb-3">English Medium</h3>
                <p className="text-sm text-ink/65 leading-relaxed">
                  Instruction in English across all classes, preparing students for higher
                  education and competitive examinations conducted in English.
                </p>
              </div>
            </Reveal>
          </div>
        </Container>
      </section>

      <section className="py-20 sm:py-28">
        <Container>
          <SectionHeading
            eyebrow="Higher Secondary"
            title="Choose the stream that fits your goals."
            description="Available groups at the Higher Secondary level (Classes 11–12)."
          />
          <div className="mt-10 grid sm:grid-cols-2 gap-6">
            {higherSecondaryStreams.map((stream, i) => (
              <Reveal key={stream.id} delay={i * 0.08}>
                <div className="h-full bg-navy rounded-3xl p-8 text-white">
                  <div className="flex items-center justify-between mb-5">
                    <span className="flex items-center justify-center w-12 h-12 rounded-xl bg-gold/15 text-gold-light">
                      <Icon name="GraduationCap" size={22} />
                    </span>
                    {stream.isSample && <Badge tone="sample">Sample subjects</Badge>}
                  </div>
                  <h3 className="text-xl font-heading font-bold mb-4">{stream.name}</h3>
                  <ul className="flex flex-wrap gap-2">
                    {stream.subjects.map((s) => (
                      <li key={s} className="text-xs font-medium text-white/85 bg-white/10 rounded-full px-3.5 py-2">
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-5 bg-cream border border-navy/10 rounded-2xl px-6 py-5">
            <p className="text-sm text-ink/60 max-w-xl">
              Subject combinations shown are sample content for this prototype and will be
              replaced with the school's confirmed offering.
            </p>
            <Button to="/achievements" variant="outlineDark" className="shrink-0">
              View Board Results
            </Button>
          </Reveal>
        </Container>
      </section>
    </>
  );
}
