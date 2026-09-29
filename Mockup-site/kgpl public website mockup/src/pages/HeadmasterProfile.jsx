import PageHero from "../components/ui/PageHero";
import Container from "../components/ui/Container";
import Reveal from "../components/ui/Reveal";
import Icon from "../components/ui/Icon";
import Badge from "../components/ui/Badge";
import SectionHeading from "../components/ui/SectionHeading";
import SEO from "../components/utility/SEO";
import { headmaster } from "../data/schoolData";

export default function HeadmasterProfile() {
  return (
    <>
      <SEO
        title="Headmaster's Profile"
        description="Message and leadership priorities from Headmaster Martin Devasagayam, Government Higher Secondary School, Kangayampalayam."
      />
      <PageHero
        eyebrow="Leadership"
        title="Headmaster's Profile"
        description="Meet the leadership behind our school's day-to-day life and long-term direction."
        trail={[{ label: "About", to: "/about" }, { label: "Headmaster's Profile" }]}
      />

      <section className="py-20 sm:py-28">
        <Container className="grid lg:grid-cols-[320px_1fr] gap-10 lg:gap-14">
          <Reveal>
            <div className="bg-white rounded-3xl border border-navy/8 shadow-soft p-8 text-center lg:sticky lg:top-28">
              <div className="w-32 h-32 mx-auto rounded-full bg-heritage-gradient border-2 border-gold/30 flex items-center justify-center mb-5">
                <Icon name="UserRound" size={54} className="text-gold-light" strokeWidth={1.3} />
              </div>
              <h2 className="text-xl font-heading font-bold text-navy">{headmaster.name}</h2>
              <p className="text-sm text-ink/55 mb-6">Headmaster</p>
              <div className="text-left space-y-4 border-t border-navy/8 pt-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink/40 mb-1">Qualification</p>
                  <p className="text-sm text-navy/80 italic">{headmaster.qualification}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink/40 mb-1">Experience</p>
                  <p className="text-sm text-navy/80 italic">{headmaster.experience}</p>
                </div>
              </div>
              <p className="text-[11px] text-ink/40 mt-5 leading-relaxed">
                Placeholder fields shown until officially confirmed details are provided.
              </p>
            </div>
          </Reveal>

          <div className="flex flex-col gap-14">
            <Reveal>
              <div className="flex items-center gap-3 mb-5">
                <h3 className="text-2xl font-heading font-bold text-navy">Headmaster's Message</h3>
                {headmaster.message.isSample && <Badge tone="sample">Sample content</Badge>}
              </div>
              <div className="relative bg-cream rounded-3xl border border-navy/8 p-8 sm:p-10">
                <Icon name="Quote" size={34} className="text-gold/40 mb-4" />
                <div className="space-y-4">
                  {headmaster.message.full.map((para, i) => (
                    <p key={i} className="text-ink/75 leading-relaxed text-base">{para}</p>
                  ))}
                </div>
                <p className="mt-6 font-heading font-semibold text-navy">— {headmaster.name}</p>
              </div>
            </Reveal>

            <Reveal delay={0.08}>
              <h3 className="text-2xl font-heading font-bold text-navy mb-3">Educational Philosophy</h3>
              <p className="text-ink/70 leading-relaxed max-w-2xl">
                A belief that every student can succeed when given structure, encouragement and
                genuine attention — combining strong academic fundamentals with opportunities in
                sports, the arts and community service to develop the whole child.
              </p>
            </Reveal>

            <Reveal delay={0.12}>
              <SectionHeading
                eyebrow="Priorities"
                title="Leadership Focus Areas"
                description="Where day-to-day leadership attention is directed across the school."
              />
              <div className="mt-8 grid sm:grid-cols-2 gap-4">
                {headmaster.focusAreas.map((area) => (
                  <div key={area.title} className="flex items-start gap-4 bg-white rounded-2xl border border-navy/8 shadow-soft p-5">
                    <span className="flex items-center justify-center w-11 h-11 rounded-xl bg-teal/10 text-teal shrink-0">
                      <Icon name={area.icon} size={20} />
                    </span>
                    <div>
                      <h4 className="font-heading font-semibold text-navy text-sm mb-1">{area.title}</h4>
                      <p className="text-sm text-ink/60 leading-relaxed">{area.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </Container>
      </section>
    </>
  );
}
