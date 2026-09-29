import Container from "../ui/Container";
import SectionHeading from "../ui/SectionHeading";
import Reveal from "../ui/Reveal";
import SmartImage from "../ui/SmartImage";
import Button from "../ui/Button";
import Icon from "../ui/Icon";
import { facilities, safetyStatement } from "../../data/schoolData";

export default function FacilitiesPreview() {
  const featured = facilities.slice(0, 6);

  return (
    <section className="py-20 sm:py-28 bg-sky/60">
      <Container>
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-12">
          <SectionHeading
            eyebrow="Campus & Facilities"
            title="A campus built for learning."
            className="mb-0"
          />
          <Button to="/about/facilities" variant="outlineDark" className="shrink-0">
            Explore Facilities & Safety
          </Button>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
          {featured.map((facility, i) => (
            <Reveal key={facility.title} delay={(i % 3) * 0.08}>
              <div className="group relative rounded-2xl overflow-hidden shadow-soft h-64">
                <SmartImage
                  src={facility.image}
                  alt={facility.title}
                  label={facility.title}
                  icon={facility.icon}
                  hideLabel
                  className="absolute inset-0 h-full"
                  imgClassName="transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-navy-dark/85 via-navy-dark/10 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
                  <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/15 backdrop-blur-sm mb-2">
                    <Icon name={facility.icon} size={17} />
                  </span>
                  <h3 className="font-heading font-semibold text-sm">{facility.title}</h3>
                  <p className="text-xs text-white/70 mt-1 leading-snug line-clamp-2">{facility.description}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal className="flex items-start gap-3 bg-white rounded-2xl border border-navy/8 shadow-soft p-6 max-w-3xl">
          <Icon name="ShieldCheck" size={22} className="text-teal shrink-0 mt-0.5" />
          <p className="text-sm text-ink/70 leading-relaxed">{safetyStatement}</p>
        </Reveal>
      </Container>
    </section>
  );
}
