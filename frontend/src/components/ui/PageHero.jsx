import Container from "./Container";
import Breadcrumbs from "./Breadcrumbs";
import Reveal from "./Reveal";

export default function PageHero({ eyebrow, title, description, trail = [], compact = false }) {
  return (
    <section className={`relative bg-heritage-noise text-white overflow-hidden ${compact ? "pt-10 pb-14 sm:pt-12 sm:pb-16" : "pt-14 pb-20 sm:pt-20 sm:pb-24"}`}>
      <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-gold/10 blur-3xl" aria-hidden="true" />
      <div className="absolute -bottom-32 -left-16 w-80 h-80 rounded-full bg-white/5 blur-3xl" aria-hidden="true" />
      <Container className="relative flex flex-col gap-5">
        <Breadcrumbs trail={trail} />
        <Reveal as="div">
          {eyebrow && (
            <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.18em] uppercase px-3 py-1.5 rounded-full bg-white/10 text-gold-light mb-4">
              {eyebrow}
            </span>
          )}
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight text-balance max-w-3xl">
            {title}
          </h1>
          {description && (
            <p className="mt-4 text-base sm:text-lg text-white/75 max-w-2xl leading-relaxed">
              {description}
            </p>
          )}
        </Reveal>
      </Container>
    </section>
  );
}
