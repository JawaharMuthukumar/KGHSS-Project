import Container from "../ui/Container";
import Reveal from "../ui/Reveal";
import Button from "../ui/Button";
import SmartImage from "../ui/SmartImage";
import { schoolInfo } from "../../data/schoolData";

export default function LegacyTeaser() {
  return (
    <section className="py-20 sm:py-28 overflow-hidden">
      <Container>
        <Reveal className="relative bg-navy-dark rounded-3xl overflow-hidden">
          <div className="absolute inset-0">
            <SmartImage
              src="/images/campus-old-block.webp"
              alt="Historic school building"
              className="h-full opacity-30"
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-navy-dark via-navy-dark/85 to-navy-dark/60" />

          <div className="relative px-8 py-16 sm:px-16 sm:py-20 flex flex-col items-center text-center">
            <div className="flex items-center gap-4 sm:gap-8 mb-8">
              <span className="font-heading font-extrabold text-3xl sm:text-5xl text-gold-light">{schoolInfo.foundedYear}</span>
              <span className="w-16 sm:w-28 h-px bg-white/25" />
              <span className="font-heading font-extrabold text-3xl sm:text-5xl text-white">Today</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white text-balance max-w-xl mb-4">
              Nearly a century of learning.
            </h2>
            <p className="text-white/70 max-w-xl leading-relaxed mb-8">
              Generations of students have passed through our gates since {schoolInfo.foundedYear} — each one carrying
              forward a shared story of education, community and character that continues today.
            </p>
            <Button to="/legacy" variant="primary" size="lg" icon="Sparkle">
              Explore Our 100-Year Journey
            </Button>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
