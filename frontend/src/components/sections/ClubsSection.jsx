import Container from "../ui/Container";
import SectionHeading from "../ui/SectionHeading";
import Reveal from "../ui/Reveal";
import Badge from "../ui/Badge";
import Icon from "../ui/Icon";
import { clubs } from "../../data/schoolData";

export default function ClubsSection() {
  return (
    <section id="clubs" className="py-20 sm:py-28 bg-sky/60 scroll-mt-24">
      <Container>
        <SectionHeading
          eyebrow="Student Clubs"
          title="Leadership, service and curiosity."
          description="NSS, NCC and the Sports Club are confirmed active clubs; others reflect a sample structure that can be updated."
        />
        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {clubs.map((club, i) => (
            <Reveal key={club.name} delay={(i % 3) * 0.08}>
              <div className="h-full bg-white rounded-2xl border border-navy/8 shadow-soft p-6">
                <div className="flex items-start justify-between mb-4">
                  <span className="flex items-center justify-center w-12 h-12 rounded-xl bg-navy/6 text-navy">
                    <Icon name={club.icon} size={22} />
                  </span>
                  {club.isSample && <Badge tone="sample">Sample</Badge>}
                </div>
                <h3 className="font-heading font-bold text-navy mb-1">{club.name}</h3>
                <p className="text-xs text-ink/50 mb-3">{club.fullName}</p>
                <p className="text-sm text-ink/65 leading-relaxed">{club.description}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
