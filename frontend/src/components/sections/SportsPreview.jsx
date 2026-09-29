import Container from "../ui/Container";
import SectionHeading from "../ui/SectionHeading";
import Reveal from "../ui/Reveal";
import Button from "../ui/Button";
import Icon from "../ui/Icon";
import { sportsList, sportsPhilosophy } from "../../data/schoolData";

export default function SportsPreview() {
  return (
    <section className="py-20 sm:py-28 overflow-hidden">
      <Container>
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-10">
          <SectionHeading
            eyebrow="Sports"
            title="Beyond the classroom."
            description={sportsPhilosophy}
            className="mb-0 max-w-2xl"
          />
          <Button to="/sports" variant="outlineDark" className="shrink-0">
            Explore Sports
          </Button>
        </div>
      </Container>

      <Reveal className="container-page">
        <div className="flex flex-wrap gap-3">
          {sportsList.map((sport) => (
            <div
              key={sport.name}
              className="group flex items-center gap-2.5 bg-white border border-navy/10 rounded-full pl-3 pr-5 py-2.5 shadow-soft transition-all duration-300 hover:border-gold/40 hover:shadow-card hover:-translate-y-0.5"
            >
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-teal/10 text-teal group-hover:bg-gold/15 group-hover:text-gold-dark transition-colors">
                <Icon name={sport.icon} size={16} />
              </span>
              <span className="text-sm font-semibold text-navy">{sport.name}</span>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
