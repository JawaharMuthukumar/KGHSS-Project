import { useMemo, useState } from "react";
import PageHero from "../components/ui/PageHero";
import Container from "../components/ui/Container";
import Reveal from "../components/ui/Reveal";
import GalleryTile from "../components/ui/GalleryTile";
import Lightbox from "../components/ui/Lightbox";
import Icon from "../components/ui/Icon";
import SEO from "../components/utility/SEO";
import { galleryImages, galleryCategories } from "../data/schoolData";

export default function Gallery() {
  const [category, setCategory] = useState("All");
  const [activeIndex, setActiveIndex] = useState(null);

  const filtered = useMemo(
    () => (category === "All" ? galleryImages : galleryImages.filter((img) => img.category === category)),
    [category]
  );

  return (
    <>
      <SEO
        title="Gallery"
        description="Photo gallery of campus, academics, sports, events and celebrations at Government Higher Secondary School, Kangayampalayam."
      />
      <PageHero
        eyebrow="Gallery"
        title="Moments from campus life."
        description="A growing collection of photographs across campus, academics, sports and school events."
        trail={[{ label: "Gallery" }]}
      />

      <section className="py-16 sm:py-20">
        <Container>
          <div className="flex flex-wrap gap-2.5 mb-10" role="tablist" aria-label="Filter gallery by category">
            {galleryCategories.map((cat) => (
              <button
                key={cat}
                role="tab"
                aria-selected={category === cat}
                onClick={() => setCategory(cat)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors duration-200 ${
                  category === cat
                    ? "bg-navy text-white shadow-soft"
                    : "bg-white text-navy/70 border border-navy/10 hover:border-navy/25"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-20 flex flex-col items-center gap-3">
              <Icon name="ImageIcon" size={32} className="text-ink/25" />
              <p className="text-ink/50">No photos in this category yet.</p>
            </div>
          ) : (
            <div className="columns-2 sm:columns-3 lg:columns-4 gap-4 [column-fill:_balance]">
              {filtered.map((image, i) => (
                <Reveal key={image.id} delay={(i % 4) * 0.05} className="mb-4 break-inside-avoid">
                  <GalleryTile image={image} onClick={() => setActiveIndex(i)} />
                </Reveal>
              ))}
            </div>
          )}
        </Container>
      </section>

      <Lightbox
        images={filtered}
        index={activeIndex}
        onClose={() => setActiveIndex(null)}
        onNavigate={setActiveIndex}
      />
    </>
  );
}
