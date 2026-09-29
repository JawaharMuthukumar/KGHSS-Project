import PageHero from "../components/ui/PageHero";
import Container from "../components/ui/Container";
import Reveal from "../components/ui/Reveal";
import SmartImage from "../components/ui/SmartImage";
import Icon from "../components/ui/Icon";
import SectionHeading from "../components/ui/SectionHeading";
import SEO from "../components/utility/SEO";
import { schoolInfo, missionStatement, visionStatement, coreValues } from "../data/schoolData";

const quickFacts = [
  { icon: "Calendar", label: "Founded", value: schoolInfo.foundedYear },
  { icon: "MapPin", label: "Location", value: `${schoolInfo.location.village}, ${schoolInfo.location.block}` },
  { icon: "Building2", label: "Management", value: "Government" },
  { icon: "Users", label: "Structure", value: "Co-Educational" },
  { icon: "Languages", label: "Medium", value: "Tamil & English" },
  { icon: "GraduationCap", label: "Classes", value: schoolInfo.classesLabel },
];

export default function AboutOurStory() {
  return (
    <>
      <SEO
        title="Our Story"
        description="Founded in 1927, Government Higher Secondary School, Kangayampalayam has served the Sulur community in Coimbatore District for nearly a century."
      />
      <PageHero
        eyebrow="About Us"
        title="Our Story"
        description="Nearly a century of education, community and opportunity in Kangayampalayam."
        trail={[{ label: "About" }]}
      />

      <section className="py-20 sm:py-28">
        <Container className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <Reveal>
            <SmartImage
              src="/images/school-signboard.webp"
              alt="Government Higher Secondary School, Kangayampalayam entrance building"
              className="rounded-3xl aspect-[4/5] sm:aspect-[5/6] shadow-card"
            />
          </Reveal>
          <Reveal delay={0.08}>
            <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.18em] uppercase px-3 py-1.5 rounded-full bg-gold/10 text-gold-dark mb-5">
              Since {schoolInfo.foundedYear}
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-navy leading-tight text-balance mb-5">
              A school built by, and for, its community.
            </h2>
            <p className="text-ink/70 leading-relaxed mb-4">
              Government Higher Secondary School, Kangayampalayam has served the villages around
              Sulur Block, in Coimbatore District, Tamil Nadu, for nearly a century. As a
              government-managed, co-educational institution, the school has remained committed
              to one purpose: making quality education accessible to every child in the
              community, regardless of background.
            </p>
            <p className="text-ink/70 leading-relaxed mb-4">
              Today, the school offers Classes 6 through 12 in both Tamil and English medium,
              giving families the choice that suits their child best. Beyond the classroom,
              students build discipline, confidence and character through sports, clubs and
              community activities such as NSS and NCC.
            </p>
            <p className="text-ink/70 leading-relaxed">
              Generation after generation, the school has stood for the same values — education,
              community, discipline, opportunity, academic development, sports and character —
              and continues to carry them forward into its second century.
            </p>
          </Reveal>
        </Container>
      </section>

      <section className="py-16 bg-sky/60">
        <Container>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {quickFacts.map((fact, i) => (
              <Reveal key={fact.label} delay={i * 0.05}>
                <div className="h-full bg-white rounded-2xl border border-navy/8 shadow-soft p-5 text-center flex flex-col items-center gap-2.5">
                  <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-navy/6 text-navy">
                    <Icon name={fact.icon} size={18} />
                  </span>
                  <p className="text-sm font-bold text-navy leading-tight">{fact.value}</p>
                  <p className="text-[11px] text-ink/50 uppercase tracking-wide">{fact.label}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      <section className="py-20 sm:py-28">
        <Container>
          <div className="grid md:grid-cols-2 gap-6 mb-16">
            <Reveal>
              <div className="h-full bg-navy rounded-3xl p-8 sm:p-10 text-white">
                <span className="flex items-center justify-center w-12 h-12 rounded-xl bg-gold/15 text-gold-light mb-6">
                  <Icon name="Target" size={22} />
                </span>
                <h3 className="text-xl font-heading font-bold mb-3">Our Mission</h3>
                <p className="text-white/75 leading-relaxed">{missionStatement}</p>
              </div>
            </Reveal>
            <Reveal delay={0.08}>
              <div className="h-full bg-teal rounded-3xl p-8 sm:p-10 text-white">
                <span className="flex items-center justify-center w-12 h-12 rounded-xl bg-white/15 text-white mb-6">
                  <Icon name="Sparkles" size={22} />
                </span>
                <h3 className="text-xl font-heading font-bold mb-3">Our Vision</h3>
                <p className="text-white/75 leading-relaxed">{visionStatement}</p>
              </div>
            </Reveal>
          </div>

          <SectionHeading eyebrow="What guides us" title="Our Core Values" align="center" />
          <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {coreValues.map((value, i) => (
              <Reveal key={value.title} delay={(i % 4) * 0.06}>
                <div className="h-full bg-white rounded-2xl border border-navy/8 shadow-soft p-6 text-center flex flex-col items-center gap-3">
                  <span className="flex items-center justify-center w-12 h-12 rounded-full bg-gold/12 text-gold-dark">
                    <Icon name={value.icon} size={20} />
                  </span>
                  <p className="font-heading font-semibold text-navy text-sm">{value.title}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}
