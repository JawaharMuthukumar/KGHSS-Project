import { useState } from "react";
import Container from "../ui/Container";
import SectionHeading from "../ui/SectionHeading";
import Reveal from "../ui/Reveal";
import Lightbox from "../ui/Lightbox";
import { useApiResource } from "../../hooks/useApiResource";
import { resolveMediaUrl } from "../../lib/apiClient";
import { formatDate } from "../../utils/formatDate";

/** Latest admin posts for one public page (e.g. "Quarterly Exam Toppers" on Achievements). Renders nothing when empty. */
export default function PagePosts({ page, eyebrow = "Latest Updates", title = "From the school." }) {
  const { data: posts } = useApiResource("/posts", { query: { page } });
  const [viewer, setViewer] = useState({ images: [], index: null });

  if (!posts || posts.length === 0) return null;

  const openViewer = (post, index) =>
    setViewer({
      images: post.images.map((img) => ({ id: img.id, src: resolveMediaUrl(img.media_url), caption: img.caption })),
      index,
    });

  return (
    <section className="py-16 sm:py-20">
      <Container>
        <SectionHeading eyebrow={eyebrow} title={title} />
        <div className="mt-10 flex flex-col gap-6">
          {posts.map((post) => (
            <Reveal key={post.id}>
              <article className="bg-white rounded-3xl border border-navy/8 shadow-soft p-6 sm:p-8">
                <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
                  <h3 className="font-heading font-bold text-navy text-lg sm:text-xl">{post.title}</h3>
                  {post.created_at && <span className="text-xs font-medium text-ink/45">{formatDate(post.created_at)}</span>}
                </div>
                {post.body && <p className="text-sm sm:text-base text-ink/70 leading-relaxed whitespace-pre-line">{post.body}</p>}
                {post.images.length > 0 && (
                  <div className={`grid gap-4 ${post.body ? "mt-6" : ""} ${gridCols(post.images.length)}`}>
                    {post.images.map((img, i) => (
                      <figure key={img.id} className="flex flex-col">
                        <button
                          type="button"
                          onClick={() => openViewer(post, i)}
                          className="block overflow-hidden rounded-2xl bg-sky/60 aspect-[4/5] focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                          aria-label={img.caption ? `View ${img.caption}` : "View image"}
                        >
                          <img
                            src={resolveMediaUrl(img.media_url)}
                            alt={img.caption || post.title}
                            loading="lazy"
                            className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                          />
                        </button>
                        {img.caption && (
                          <figcaption className="mt-2.5 text-center text-sm font-semibold text-navy whitespace-pre-line">{img.caption}</figcaption>
                        )}
                      </figure>
                    ))}
                  </div>
                )}
              </article>
            </Reveal>
          ))}
        </div>
      </Container>
      <Lightbox
        images={viewer.images}
        index={viewer.index}
        onClose={() => setViewer((v) => ({ ...v, index: null }))}
        onNavigate={(index) => setViewer((v) => ({ ...v, index }))}
      />
    </section>
  );
}

function gridCols(count) {
  if (count === 1) return "grid-cols-1 max-w-sm";
  if (count === 2) return "grid-cols-2 max-w-2xl";
  return "grid-cols-2 sm:grid-cols-3";
}
