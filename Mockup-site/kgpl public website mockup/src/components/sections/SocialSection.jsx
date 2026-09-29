import Container from "../ui/Container";
import SectionHeading from "../ui/SectionHeading";
import Reveal from "../ui/Reveal";
import Icon from "../ui/Icon";
import { schoolInfo } from "../../data/schoolData";

export default function SocialSection() {
  const { youtube, facebook } = schoolInfo.socialMedia;

  return (
    <section className="py-20 sm:py-28 bg-sky/60">
      <Container>
        <SectionHeading
          eyebrow="Stay Connected"
          title="Follow Our School Journey"
          align="center"
          description="Stay connected with school events, student activities, achievements, celebrations and campus updates."
        />

        <div className="mt-12 grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
          <Reveal>
            <a
              href={youtube.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col h-full bg-white rounded-3xl border border-navy/8 shadow-soft p-8 transition-all duration-300 hover:shadow-lift hover:-translate-y-1"
            >
              <div className="flex items-center justify-between mb-6">
                <span className="flex items-center justify-center w-14 h-14 rounded-2xl bg-red-500/10 text-red-600">
                  <Icon name="Youtube" size={26} />
                </span>
                <span className="text-xs font-semibold text-ink/50">{youtube.subscribers} Subscribers</span>
              </div>
              <h3 className="font-heading font-bold text-navy text-lg mb-2">YouTube</h3>
              <p className="text-sm text-ink/65 leading-relaxed mb-6 flex-1">
                Watch highlights from school events, student activities, celebrations and educational programmes.
              </p>
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy group-hover:text-gold-dark transition-colors">
                Visit YouTube
                <Icon name="ArrowUpRight" size={15} className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </span>
            </a>
          </Reveal>

          {facebook.url ? (
            <Reveal delay={0.08}>
              <a
                href={facebook.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col h-full bg-white rounded-3xl border border-navy/8 shadow-soft p-8 transition-all duration-300 hover:shadow-lift hover:-translate-y-1"
              >
                <span className="flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-500/10 text-blue-600 mb-6">
                  <Icon name="Facebook" size={26} />
                </span>
                <h3 className="font-heading font-bold text-navy text-lg mb-2">Facebook</h3>
                <p className="text-sm text-ink/65 leading-relaxed mb-6 flex-1">
                  Follow our page for school announcements, photos and community updates.
                </p>
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy group-hover:text-gold-dark transition-colors">
                  Visit Facebook
                  <Icon name="ArrowUpRight" size={15} />
                </span>
              </a>
            </Reveal>
          ) : (
            <Reveal delay={0.08}>
              <div className="flex flex-col h-full bg-white/60 rounded-3xl border border-dashed border-navy/15 p-8 items-start justify-center text-center sm:text-left">
                <span className="flex items-center justify-center w-14 h-14 rounded-2xl bg-navy/5 text-navy/40 mb-6">
                  <Icon name="Facebook" size={26} />
                </span>
                <h3 className="font-heading font-semibold text-navy/50 text-lg mb-2">Facebook — Coming Soon</h3>
                <p className="text-sm text-ink/45 leading-relaxed">
                  Our official Facebook page link will appear here once confirmed.
                </p>
              </div>
            </Reveal>
          )}
        </div>
      </Container>
    </section>
  );
}
