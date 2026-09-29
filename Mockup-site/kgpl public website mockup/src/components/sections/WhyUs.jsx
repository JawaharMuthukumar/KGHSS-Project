import Container from "../ui/Container";
import SectionHeading from "../ui/SectionHeading";
import Reveal from "../ui/Reveal";
import Icon from "../ui/Icon";
import { whyUsFeatures } from "../../data/schoolData";

export default function WhyUs() {
  return (
    <section className="py-20 sm:py-28 bg-sky/60">
      <Container>
        <SectionHeading
          eyebrow="Why our school"
          title="What makes our school different."
          description="A blend of academics, values and opportunity built for every student who walks through our gates."
        />
        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {whyUsFeatures.map((feature, i) => (
            <Reveal key={feature.title} delay={(i % 4) * 0.06}>
              <div className="group bg-white rounded-2xl border border-navy/8 shadow-soft p-6 h-full transition-all duration-300 hover:shadow-lift hover:-translate-y-1">
                <span className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-navy/6 text-navy mb-5 transition-colors duration-300 group-hover:bg-gold/15 group-hover:text-gold-dark">
                  <Icon name={feature.icon} size={22} />
                </span>
                <h3 className="font-heading font-semibold text-navy text-base mb-2">{feature.title}</h3>
                <p className="text-sm text-ink/65 leading-relaxed">{feature.description}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
