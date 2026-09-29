import Container from "../ui/Container";
import SectionHeading from "../ui/SectionHeading";
import Reveal from "../ui/Reveal";
import Button from "../ui/Button";
import Icon from "../ui/Icon";
import { alumniInfo, ptaInfo } from "../../data/schoolData";

export default function AlumniPTA() {
  return (
    <section className="py-20 sm:py-28 bg-sky/60">
      <Container>
        <SectionHeading
          eyebrow="Our Community"
          title="Generations, connected."
          align="center"
          description="Two communities that keep our school strong — past students and present families."
        />
        <div className="mt-12 grid sm:grid-cols-2 gap-6">
          <Reveal>
            <div className="h-full bg-white rounded-3xl border border-navy/8 shadow-soft p-8 sm:p-10 flex flex-col">
              <span className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gold/12 text-gold-dark mb-6">
                <Icon name="Users" size={26} />
              </span>
              <h3 className="text-xl font-heading font-bold text-navy mb-3">{alumniInfo.title}</h3>
              <p className="text-sm text-ink/65 leading-relaxed mb-6 flex-1">{alumniInfo.description}</p>
              <Button to="/alumni" variant="navy" className="self-start">Explore Alumni</Button>
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <div className="h-full bg-white rounded-3xl border border-navy/8 shadow-soft p-8 sm:p-10 flex flex-col">
              <span className="flex items-center justify-center w-14 h-14 rounded-2xl bg-teal/12 text-teal mb-6">
                <Icon name="HeartHandshake" size={26} />
              </span>
              <h3 className="text-xl font-heading font-bold text-navy mb-3">{ptaInfo.title}</h3>
              <p className="text-sm text-ink/65 leading-relaxed mb-6 flex-1">{ptaInfo.description}</p>
              <Button to="/pta" variant="navy" className="self-start">Know Our PTA</Button>
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
