import PageHero from "../components/ui/PageHero";
import Container from "../components/ui/Container";
import SectionHeading from "../components/ui/SectionHeading";
import Reveal from "../components/ui/Reveal";
import Badge from "../components/ui/Badge";
import Icon from "../components/ui/Icon";
import SEO from "../components/utility/SEO";
import { ptaInfo } from "../data/schoolData";

export default function PTA() {
  return (
    <>
      <SEO
        title="Parent-Teacher Association"
        description="The Parent-Teacher Association of Government Higher Secondary School, Kangayampalayam — building stronger communication between families, teachers and the school."
      />
      <PageHero
        eyebrow="Community"
        title={ptaInfo.title}
        description={ptaInfo.description}
        trail={[{ label: "Alumni & PTA", to: "/alumni" }, { label: "PTA" }]}
      />

      <section className="py-20 sm:py-28">
        <Container className="grid lg:grid-cols-2 gap-12 lg:gap-16">
          <Reveal>
            <SectionHeading eyebrow="Purpose" title="Why the PTA matters." className="mb-0" />
            <ul className="mt-8 space-y-4">
              {ptaInfo.purpose.map((point) => (
                <li key={point} className="flex items-start gap-3 text-ink/70 leading-relaxed">
                  <span className="flex items-center justify-center w-7 h-7 rounded-full bg-teal/10 text-teal shrink-0 mt-0.5">
                    <Icon name="ChevronRight" size={14} />
                  </span>
                  {point}
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={0.08}>
            <div className="bg-navy rounded-3xl p-8 sm:p-10 text-white h-full">
              <span className="flex items-center justify-center w-12 h-12 rounded-xl bg-gold/15 text-gold-light mb-6">
                <Icon name="CalendarDays" size={22} />
              </span>
              <h3 className="text-lg font-heading font-bold mb-3">Meetings</h3>
              <p className="text-white/75 leading-relaxed mb-8">{ptaInfo.meetingCadence}</p>

              <h3 className="text-lg font-heading font-bold mb-3">Communication</h3>
              <p className="text-white/75 leading-relaxed">
                Parents are kept informed through notices, meetings and direct communication with
                class teachers, ensuring every family stays connected to their child's progress.
              </p>
            </div>
          </Reveal>
        </Container>
      </section>

      <section className="py-20 sm:py-28 bg-sky/60">
        <Container>
          <div className="flex items-center gap-3 mb-3">
            <SectionHeading eyebrow="Committee" title="PTA Committee" description="Sample committee structure shown below." className="mb-0" />
          </div>
          <div className="mt-10 grid sm:grid-cols-3 gap-5">
            {ptaInfo.committee.map((member) => (
              <Reveal key={member.role}>
                <div className="bg-white rounded-2xl border border-navy/8 shadow-soft p-7 text-center">
                  <span className="flex items-center justify-center w-14 h-14 rounded-full bg-navy/6 text-navy mx-auto mb-4">
                    <Icon name="UserRound" size={24} />
                  </span>
                  <p className="font-heading font-semibold text-navy">{member.role}</p>
                  <p className="text-sm text-ink/50 italic mt-1">{member.name}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Badge tone="sample" className="mt-6">Sample structure — to be updated with the confirmed PTA committee</Badge>
        </Container>
      </section>
    </>
  );
}
