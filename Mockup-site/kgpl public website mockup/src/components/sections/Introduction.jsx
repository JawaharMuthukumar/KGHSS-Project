import Container from "../ui/Container";
import Reveal from "../ui/Reveal";
import SmartImage from "../ui/SmartImage";
import Icon from "../ui/Icon";

const focusPoints = [
  "Academic confidence",
  "Communication",
  "Problem solving",
  "Leadership",
  "Sports",
  "Character",
  "Community responsibility",
];

export default function Introduction() {
  return (
    <section className="py-20 sm:py-28">
      <Container className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        <Reveal className="order-2 lg:order-1">
          <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.18em] uppercase px-3 py-1.5 rounded-full bg-gold/10 text-gold-dark mb-5">
            Who we are
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-navy leading-tight text-balance mb-5">
            Education rooted in values.
            <br />
            Designed for the future.
          </h2>
          <p className="text-ink/70 leading-relaxed mb-4">
            Government Higher Secondary School, Kangayampalayam supports students academically,
            socially and physically. From Class 6 through Class 12, our teachers guide students
            through a curriculum built on strong fundamentals and everyday encouragement.
          </p>
          <p className="text-ink/70 leading-relaxed mb-7">
            Our teaching staff take part in government-supported professional development and
            bring updated teaching approaches into the classroom, so every student is supported
            in the way that suits them best — in Tamil or in English medium.
          </p>
          <ul className="grid grid-cols-2 gap-3">
            {focusPoints.map((point) => (
              <li key={point} className="flex items-center gap-2 text-sm font-medium text-navy/85">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-teal/10 text-teal shrink-0">
                  <Icon name="ChevronRight" size={13} />
                </span>
                {point}
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal delay={0.1} className="order-1 lg:order-2">
          <div className="relative">
            <SmartImage
              src="/images/campus-green-block.webp"
              alt="Students and staff at Government Higher Secondary School, Kangayampalayam"
              className="rounded-3xl aspect-[4/5] sm:aspect-[5/6] shadow-card"
            />
            <div className="absolute -bottom-6 -left-6 hidden sm:flex items-center gap-3 bg-white rounded-2xl shadow-lift border border-navy/8 px-5 py-4">
              <span className="flex items-center justify-center w-11 h-11 rounded-xl bg-gold/15 text-gold-dark">
                <Icon name="GraduationCap" size={22} />
              </span>
              <div>
                <p className="text-lg font-heading font-bold text-navy leading-tight">Since 1927</p>
                <p className="text-xs text-ink/60">Nearly a century of learning</p>
              </div>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
