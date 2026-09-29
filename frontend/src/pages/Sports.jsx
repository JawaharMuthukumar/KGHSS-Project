import PageHero from "../components/ui/PageHero";
import Container from "../components/ui/Container";
import SectionHeading from "../components/ui/SectionHeading";
import Reveal from "../components/ui/Reveal";
import Badge from "../components/ui/Badge";
import Icon from "../components/ui/Icon";
import SmartImage from "../components/ui/SmartImage";
import SEO from "../components/utility/SEO";
import { sportsList, sportsPhilosophy, achievements } from "../data/schoolData";

const sportsAchievements = achievements.filter((a) => a.category === "Sports");

export default function Sports() {
  return (
    <>
      <SEO
        title="Sports"
        description="Sports at Government Higher Secondary School, Kangayampalayam — Kabaddi, Volleyball, Athletics and more, with district-level participation."
      />
      <PageHero
        eyebrow="School Life"
        title="Beyond the classroom."
        description={sportsPhilosophy}
        trail={[{ label: "School Life", to: "/school-life" }, { label: "Sports" }]}
      />

      <section className="py-20 sm:py-28">
        <Container>
          <SectionHeading eyebrow="Our Sports" title="Sports offered at our school." />
          <div className="mt-10 flex flex-wrap gap-3">
            {sportsList.map((sport) => (
              <Reveal key={sport.name}>
                <div className="group flex items-center gap-2.5 bg-white border border-navy/10 rounded-full pl-3 pr-5 py-2.5 shadow-soft transition-all duration-300 hover:border-gold/40 hover:shadow-card hover:-translate-y-0.5">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-teal/10 text-teal group-hover:bg-gold/15 group-hover:text-gold-dark transition-colors">
                    <Icon name={sport.icon} size={16} />
                  </span>
                  <span className="text-sm font-semibold text-navy">{sport.name}</span>
                </div>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      <section className="py-20 sm:py-28 bg-sky/60">
        <Container className="grid lg:grid-cols-2 gap-12 items-center">
          <Reveal>
            <SmartImage
              src="/images/campus-courtyard-3.webp"
              alt="School sports ground"
              className="rounded-3xl aspect-[4/3] shadow-card"
            />
          </Reveal>
          <Reveal delay={0.08}>
            <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.18em] uppercase px-3 py-1.5 rounded-full bg-gold/10 text-gold-dark mb-5">
              Training & Participation
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-navy leading-tight text-balance mb-5">
              District-level competition, every year.
            </h2>
            <p className="text-ink/70 leading-relaxed mb-4">
              Regular physical education and team practice prepare students to represent the
              school at district-level tournaments across multiple sports.
            </p>
            <p className="text-ink/70 leading-relaxed">
              The Annual Sports Meet is a highlight of the school calendar, bringing together
              track, field and team events for students across every class.
            </p>
          </Reveal>
        </Container>
      </section>

      <section className="py-20 sm:py-28">
        <Container>
          <SectionHeading
            eyebrow="Achievements"
            title="Sporting achievements."
            description="Generic placeholder names shown below — replace with confirmed student achievements."
          />
          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {sportsAchievements.map((item, i) => (
              <Reveal key={item.id} delay={(i % 3) * 0.08}>
                <div className="h-full bg-white rounded-2xl border border-navy/8 shadow-soft p-6 flex flex-col">
                  <div className="flex items-center justify-between mb-5">
                    <span className="flex items-center justify-center w-11 h-11 rounded-xl bg-gold/12 text-gold-dark">
                      <Icon name="Trophy" size={20} />
                    </span>
                    <Badge tone="sample">Sample</Badge>
                  </div>
                  <h3 className="font-heading font-semibold text-navy mb-1.5">{item.title}</h3>
                  <p className="text-sm text-ink/65 leading-relaxed mb-5 flex-1">{item.description}</p>
                  <div className="flex items-center justify-between text-xs font-medium text-ink/50 pt-4 border-t border-navy/8">
                    <span>{item.student} · {item.classLabel}</span>
                    <span>{item.year}</span>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}
