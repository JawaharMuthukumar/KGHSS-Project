import PageHero from "../components/ui/PageHero";
import Container from "../components/ui/Container";
import Reveal from "../components/ui/Reveal";
import SmartImage from "../components/ui/SmartImage";
import Icon from "../components/ui/Icon";
import SEO from "../components/utility/SEO";
import { facilities, safetyStatement } from "../data/schoolData";

export default function FacilitiesSafety() {
  return (
    <>
      <SEO
        title="Facilities & Safety"
        description="Campus facilities and student safety measures at Government Higher Secondary School, Kangayampalayam, including library, laboratories and CCTV monitoring."
      />
      <PageHero
        eyebrow="About Us"
        title="Facilities & Safety"
        description="A campus equipped for learning, sport and everyday student life — with structured safety measures throughout the school day."
        trail={[{ label: "About", to: "/about" }, { label: "Facilities & Safety" }]}
      />

      <section className="py-20 sm:py-28">
        <Container>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {facilities.map((facility, i) => (
              <Reveal key={facility.title} delay={(i % 3) * 0.07}>
                <div className="h-full bg-white rounded-3xl border border-navy/8 shadow-soft overflow-hidden">
                  <div className="h-48 relative">
                    <SmartImage
                      src={facility.image}
                      alt={facility.title}
                      label={facility.title}
                      icon={facility.icon}
                      hideLabel
                      className="h-full"
                    />
                  </div>
                  <div className="p-6">
                    <span className="flex items-center justify-center w-11 h-11 rounded-xl bg-navy/6 text-navy mb-4">
                      <Icon name={facility.icon} size={20} />
                    </span>
                    <h3 className="font-heading font-semibold text-navy mb-2">{facility.title}</h3>
                    <p className="text-sm text-ink/65 leading-relaxed">{facility.description}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      <section className="py-16 sm:py-20 bg-heritage-noise">
        <Container>
          <Reveal className="max-w-3xl mx-auto text-center flex flex-col items-center gap-5">
            <span className="flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 border border-white/15 text-gold-light">
              <Icon name="ShieldCheck" size={30} />
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white text-balance">
              A structured approach to campus safety.
            </h2>
            <p className="text-white/75 leading-relaxed">{safetyStatement}</p>
            <p className="text-white/55 text-sm leading-relaxed">
              Safety practices are reviewed and maintained by school administration as part of
              routine campus management. This page will be updated with further specific detail
              as it is confirmed.
            </p>
          </Reveal>
        </Container>
      </section>
    </>
  );
}
