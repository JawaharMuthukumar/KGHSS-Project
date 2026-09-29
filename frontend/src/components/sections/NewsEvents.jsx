import Container from "../ui/Container";
import SectionHeading from "../ui/SectionHeading";
import Reveal from "../ui/Reveal";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import SmartImage from "../ui/SmartImage";
import { events } from "../../data/schoolData";
import { formatDateParts } from "../../utils/formatDate";

export default function NewsEvents() {
  const featured = events.slice(0, 3);

  return (
    <section className="py-20 sm:py-28">
      <Container>
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-12">
          <SectionHeading
            eyebrow="News & Events"
            title="What's happening at school."
            className="mb-0"
          />
          <Button to="/events" variant="outlineDark" className="shrink-0">
            View All Events
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {featured.map((event, i) => {
            const { day, month } = formatDateParts(event.date);
            return (
              <Reveal key={event.id} delay={i * 0.08}>
                <div className="h-full bg-white rounded-2xl border border-navy/8 shadow-soft overflow-hidden flex flex-col">
                  <div className="relative h-44">
                    <SmartImage src={event.image} alt={event.title} label={event.category} className="h-full" />
                    <div className="absolute top-3 left-3 bg-white rounded-xl px-3 py-1.5 text-center shadow-soft">
                      <p className="text-lg font-heading font-extrabold text-navy leading-none">{day}</p>
                      <p className="text-[10px] font-semibold uppercase text-ink/50">{month}</p>
                    </div>
                  </div>
                  <div className="p-6 flex flex-col flex-1">
                    <Badge tone="gold" className="self-start mb-3">{event.category}</Badge>
                    <h3 className="font-heading font-semibold text-navy mb-2">{event.title}</h3>
                    <p className="text-sm text-ink/65 leading-relaxed">{event.description}</p>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
