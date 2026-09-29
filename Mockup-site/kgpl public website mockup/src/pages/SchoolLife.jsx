import PageHero from "../components/ui/PageHero";
import Container from "../components/ui/Container";
import SectionHeading from "../components/ui/SectionHeading";
import Reveal from "../components/ui/Reveal";
import SmartImage from "../components/ui/SmartImage";
import Icon from "../components/ui/Icon";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import ClubsSection from "../components/sections/ClubsSection";
import SEO from "../components/utility/SEO";

const councilRoles = [
  { role: "Head Boy", name: "[Add name]" },
  { role: "Head Girl", name: "[Add name]" },
  { role: "Sports Captain", name: "[Add name]" },
  { role: "Cultural Secretary", name: "[Add name]" },
];

export default function SchoolLife() {
  return (
    <>
      <SEO
        title="School Life"
        description="Everyday school life at Government Higher Secondary School, Kangayampalayam — assembly, student council, clubs, sports and community activities."
      />
      <PageHero
        eyebrow="School Life"
        title="Life beyond the timetable."
        description="Assemblies, clubs, sports and community service that shape everyday student life."
        trail={[{ label: "School Life" }]}
      />

      <section className="py-20 sm:py-28">
        <Container className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <Reveal>
            <SmartImage
              src="/images/student-assembly.webp"
              alt="Students at morning assembly"
              className="rounded-3xl aspect-[4/3] shadow-card"
            />
          </Reveal>
          <Reveal delay={0.08}>
            <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.18em] uppercase px-3 py-1.5 rounded-full bg-gold/10 text-gold-dark mb-5">
              Every Morning
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-navy leading-tight text-balance mb-5">
              Morning Assembly
            </h2>
            <p className="text-ink/70 leading-relaxed mb-4">
              Each school day begins with a morning assembly — the national anthem, announcements
              and short reflections that bring the whole school together before classes start.
            </p>
            <p className="text-ink/70 leading-relaxed">
              It's a small daily ritual that builds discipline, unity and a shared sense of
              belonging across every class, from Class 6 to Class 12.
            </p>
          </Reveal>
        </Container>
      </section>

      <section id="council" className="py-20 sm:py-28 bg-sky/60 scroll-mt-24">
        <Container>
          <div className="flex items-center gap-3 mb-3">
            <SectionHeading
              eyebrow="Student Leadership"
              title="Student Council"
              description="A student-led body that represents the voice of the student community in school life."
              className="mb-0"
            />
          </div>
          <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {councilRoles.map((member) => (
              <Reveal key={member.role}>
                <div className="bg-white rounded-2xl border border-navy/8 shadow-soft p-6 text-center">
                  <span className="flex items-center justify-center w-12 h-12 rounded-full bg-navy/6 text-navy mx-auto mb-3">
                    <Icon name="UserRound" size={20} />
                  </span>
                  <p className="text-sm font-heading font-semibold text-navy">{member.role}</p>
                  <p className="text-xs text-ink/50 italic mt-1">{member.name}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Badge tone="sample" className="mt-6">Sample council structure — to be updated with confirmed names</Badge>
        </Container>
      </section>

      <ClubsSection />

      <section className="py-20 sm:py-28">
        <Container>
          <SectionHeading
            eyebrow="Beyond Academics"
            title="Sports, culture and community."
            description="Students take part in sport, cultural activities and community service throughout the year."
          />
          <div className="mt-10 grid sm:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl border border-navy/8 shadow-soft p-7">
              <span className="flex items-center justify-center w-11 h-11 rounded-xl bg-gold/12 text-gold-dark mb-4">
                <Icon name="Trophy" size={20} />
              </span>
              <h3 className="font-heading font-semibold text-navy mb-2">Sports</h3>
              <p className="text-sm text-ink/65 leading-relaxed mb-4">
                Kabaddi, Volleyball, Athletics and more, with district-level participation each year.
              </p>
              <Button to="/sports" variant="ghost" size="md">Explore Sports</Button>
            </div>
            <div className="bg-white rounded-2xl border border-navy/8 shadow-soft p-7">
              <span className="flex items-center justify-center w-11 h-11 rounded-xl bg-teal/10 text-teal mb-4">
                <Icon name="Sparkles" size={20} />
              </span>
              <h3 className="font-heading font-semibold text-navy mb-2">Cultural Activities</h3>
              <p className="text-sm text-ink/65 leading-relaxed mb-4">
                Dance, music, art and literary events celebrated during school festivals and days.
              </p>
              <Button to="/gallery" variant="ghost" size="md">See Gallery</Button>
            </div>
            <div className="bg-white rounded-2xl border border-navy/8 shadow-soft p-7">
              <span className="flex items-center justify-center w-11 h-11 rounded-xl bg-navy/6 text-navy mb-4">
                <Icon name="CalendarDays" size={20} />
              </span>
              <h3 className="font-heading font-semibold text-navy mb-2">School Events</h3>
              <p className="text-sm text-ink/65 leading-relaxed mb-4">
                Annual functions, exhibitions and celebrations throughout the academic year.
              </p>
              <Button to="/events" variant="ghost" size="md">View Events</Button>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
