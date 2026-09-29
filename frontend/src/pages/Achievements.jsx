import { useMemo, useState } from "react";
import PageHero from "../components/ui/PageHero";
import Container from "../components/ui/Container";
import SectionHeading from "../components/ui/SectionHeading";
import Reveal from "../components/ui/Reveal";
import Badge from "../components/ui/Badge";
import Icon from "../components/ui/Icon";
import AnimatedCounter from "../components/ui/AnimatedCounter";
import SEO from "../components/utility/SEO";
import { achievements, achievementCategories, boardResults } from "../data/schoolData";

const categoryIcon = {
  Academic: "GraduationCap",
  Scholarship: "Award",
  Sports: "Trophy",
  Cultural: "Sparkles",
};

export default function Achievements() {
  const [activeCategory, setActiveCategory] = useState("All");

  const filtered = useMemo(
    () => (activeCategory === "All" ? achievements : achievements.filter((a) => a.category === activeCategory)),
    [activeCategory]
  );

  return (
    <>
      <SEO
        title="Achievements & Results"
        description="Board results, scholarship qualifiers and sporting achievements at Government Higher Secondary School, Kangayampalayam."
      />
      <PageHero
        eyebrow="Academics"
        title="Achievements & Results"
        description="A record of academic performance and student achievement — sample entries shown until official records are confirmed."
        trail={[{ label: "Academics", to: "/academics" }, { label: "Achievements & Results" }]}
      />

      <section className="py-20 sm:py-28">
        <Container>
          <SectionHeading eyebrow="Board Results" title="Consistency that builds confidence." />
          <div className="mt-10 grid sm:grid-cols-2 gap-6">
            {boardResults.map((yearBlock, i) => (
              <Reveal key={yearBlock.year} delay={i * 0.08}>
                <div className="bg-white rounded-3xl border border-navy/8 shadow-soft p-8">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-heading font-bold text-navy text-lg">{yearBlock.year}</h3>
                    <Badge tone="sample">Sample data</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {yearBlock.entries.map((entry) => (
                      <div key={entry.level} className="text-center bg-sky/60 rounded-2xl py-6 px-3">
                        <p className="text-3xl font-heading font-extrabold text-teal">
                          <AnimatedCounter value={entry.passPercentage} suffix="%" />
                        </p>
                        <p className="text-xs font-medium text-ink/60 mt-2">{entry.level}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      <section className="py-20 sm:py-28 bg-sky/60">
        <Container>
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-10">
            <SectionHeading
              eyebrow="Student Achievements"
              title="Talent, scholarship and sport."
              description="Includes CM Talent Search, NMMS and district-level results. Names shown are generic placeholders."
              className="mb-0"
            />
          </div>

          <div className="flex flex-wrap gap-2.5 mb-10" role="tablist" aria-label="Filter achievements by category">
            {achievementCategories.map((cat) => (
              <button
                key={cat}
                role="tab"
                aria-selected={activeCategory === cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors duration-200 ${
                  activeCategory === cat
                    ? "bg-navy text-white shadow-soft"
                    : "bg-white text-navy/70 border border-navy/10 hover:border-navy/25"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <p className="text-center text-ink/50 py-16">No achievements found in this category yet.</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map((item, i) => (
                <Reveal key={item.id} delay={(i % 3) * 0.06}>
                  <div className="h-full bg-white rounded-2xl border border-navy/8 shadow-soft p-6 flex flex-col">
                    <div className="flex items-center justify-between mb-5">
                      <span className="flex items-center justify-center w-11 h-11 rounded-xl bg-gold/12 text-gold-dark">
                        <Icon name={categoryIcon[item.category] || "Award"} size={20} />
                      </span>
                      <Badge tone="navy">{item.category}</Badge>
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
          )}
        </Container>
      </section>
    </>
  );
}
