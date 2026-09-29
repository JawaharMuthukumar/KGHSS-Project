import { useState } from "react";
import Container from "../ui/Container";
import SectionHeading from "../ui/SectionHeading";
import Reveal from "../ui/Reveal";
import Button from "../ui/Button";
import SmartImage from "../ui/SmartImage";
import Lightbox from "../ui/Lightbox";
import { galleryImages } from "../../data/schoolData";

export default function GalleryPreview() {
  const [activeIndex, setActiveIndex] = useState(null);
  const featured = galleryImages.slice(0, 6);

  return (
    <section className="py-20 sm:py-28">
      <Container>
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-12">
          <SectionHeading eyebrow="Gallery" title="Moments from campus life." className="mb-0" />
          <Button to="/gallery" variant="outlineDark" className="shrink-0">
            View Full Gallery
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {featured.map((image, i) => (
            <Reveal
              key={image.id}
              delay={(i % 3) * 0.06}
              className={i === 0 ? "col-span-2 row-span-2" : ""}
            >
              <button
                onClick={() => setActiveIndex(i)}
                className={`group relative block w-full overflow-hidden rounded-2xl ${i === 0 ? "aspect-square sm:aspect-auto sm:h-full" : "aspect-square"}`}
                aria-label={`View photo: ${image.caption}`}
              >
                <SmartImage
                  src={image.src}
                  alt={image.caption}
                  label={image.caption}
                  className="h-full"
                  imgClassName="transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-navy-dark/0 group-hover:bg-navy-dark/20 transition-colors duration-300" />
              </button>
            </Reveal>
          ))}
        </div>
      </Container>

      <Lightbox
        images={featured}
        index={activeIndex}
        onClose={() => setActiveIndex(null)}
        onNavigate={setActiveIndex}
      />
    </section>
  );
}
