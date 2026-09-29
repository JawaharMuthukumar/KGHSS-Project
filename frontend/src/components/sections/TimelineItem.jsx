import Reveal from "../ui/Reveal";
import Badge from "../ui/Badge";
import SmartImage from "../ui/SmartImage";

export default function TimelineItem({ item, index }) {
  const isRight = index % 2 === 1;

  return (
    <div className="relative lg:grid lg:grid-cols-2 lg:gap-x-16">
      <span
        className="absolute left-6 lg:left-1/2 top-1.5 -translate-x-1/2 z-10 flex items-center justify-center w-5 h-5 rounded-full bg-gold border-4 border-cream shadow-soft"
        aria-hidden="true"
      />

      <div className={isRight ? "lg:order-2" : "lg:order-1"}>
        <Reveal y={28} className="pl-16 lg:pl-0">
          <Card item={item} align={isRight ? "left" : "right"} />
        </Reveal>
      </div>
      <div className={isRight ? "lg:order-1" : "lg:order-2"} aria-hidden="true" />
    </div>
  );
}

function Card({ item, align }) {
  const isTextRight = align === "right";

  return (
    <div className={`mb-14 lg:mb-24 max-w-md ${isTextRight ? "lg:ml-auto lg:text-right" : ""}`}>
      <div className={`flex items-center gap-3 mb-3 ${isTextRight ? "lg:flex-row-reverse" : ""}`}>
        <span className="text-2xl sm:text-3xl font-heading font-extrabold text-navy">{item.year}</span>
        {item.isDummy && <Badge tone="sample">Sample milestone</Badge>}
      </div>
      <div className="bg-white rounded-2xl border border-navy/8 shadow-soft overflow-hidden">
        {item.image && (
          <SmartImage src={item.image} alt={item.title} className="h-40" />
        )}
        <div className="p-6">
          <h3 className="font-heading font-bold text-navy text-lg mb-2">{item.title}</h3>
          <p className="text-sm text-ink/65 leading-relaxed">{item.description}</p>
        </div>
      </div>
    </div>
  );
}
