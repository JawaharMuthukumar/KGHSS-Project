import Reveal from "./Reveal";

export default function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  light = false,
  className = "",
}) {
  const alignClass = align === "center" ? "items-center text-center mx-auto" : "items-start text-left";

  return (
    <Reveal className={`flex flex-col gap-4 max-w-2xl ${alignClass} ${className}`}>
      {eyebrow && (
        <span
          className={`inline-flex items-center gap-2 text-xs font-semibold tracking-[0.18em] uppercase px-3 py-1.5 rounded-full ${
            light ? "bg-white/10 text-gold-light" : "bg-gold/10 text-gold-dark"
          }`}
        >
          {eyebrow}
        </span>
      )}
      <h2
        className={`text-3xl sm:text-4xl font-bold leading-tight text-balance ${
          light ? "text-white" : "text-navy"
        }`}
      >
        {title}
      </h2>
      {description && (
        <p className={`text-base sm:text-lg leading-relaxed ${light ? "text-white/75" : "text-ink/70"}`}>
          {description}
        </p>
      )}
    </Reveal>
  );
}
