import Container from "../ui/Container";
import SectionHeading from "../ui/SectionHeading";
import Reveal from "../ui/Reveal";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import Icon from "../ui/Icon";
import { achievements } from "../../data/schoolData";

const categoryIcon = {
  Academic: "GraduationCap",
  Scholarship: "Award",
  Sports: "Trophy",
  Cultural: "Sparkles",
};

export default function AchievementsPreview() {
  const featured = achievements.slice(0, 3);

  return (
    <section className="py-20 sm:py-28">
      <Container>
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-12">
          <SectionHeading
            eyebrow="Achievements"
            title="Students who make us proud."
            description="Generic placeholder names shown below — real student achievements will replace these entries."
            className="mb-0"
          />
          <Button to="/achievements" variant="outlineDark" className="shrink-0">
            View all achievements
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {featured.map((item, i) => (
            <Reveal key={item.id} delay={i * 0.08}>
              <div className="h-full bg-white rounded-2xl border border-navy/8 shadow-soft p-7 flex flex-col">
                <div className="flex items-center justify-between mb-5">
                  <span className="flex items-center justify-center w-11 h-11 rounded-xl bg-gold/12 text-gold-dark">
                    <Icon name={categoryIcon[item.category] || "Award"} size={20} />
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
  );
}
