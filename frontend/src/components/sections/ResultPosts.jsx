import { useMemo, useState } from "react";
import Container from "../ui/Container";
import SectionHeading from "../ui/SectionHeading";
import Reveal from "../ui/Reveal";
import { useApiResource } from "../../hooks/useApiResource";
import { resolveMediaUrl } from "../../lib/apiClient";
import { formatDate } from "../../utils/formatDate";
import { RESULT_CLASSES, resultClassLabel, percentage } from "../../constants/posts";

const rankStyle = ["bg-gold text-navy-dark", "bg-slate-300 text-navy-dark", "bg-amber-700/80 text-white"];

/** Class-wise toppers posted by the admin as "Results" posts. Renders nothing when there are none. */
export default function ResultPosts() {
  const { data: posts } = useApiResource("/posts", { query: { page: "results" } });
  const [activeClass, setActiveClass] = useState("All");

  // Classes that have at least one post, highest standard first.
  const classes = useMemo(
    () => RESULT_CLASSES.filter((c) => (posts || []).some((p) => p.class_label === c.value)),
    [posts]
  );

  if (!posts || posts.length === 0) return null;

  const visibleClasses = activeClass === "All" ? classes : classes.filter((c) => c.value === activeClass);

  return (
    <section className="py-16 sm:py-20">
      <Container>
        <SectionHeading eyebrow="Results" title="Class-wise toppers." />

        {classes.length > 1 && (
          <div className="flex flex-wrap gap-2.5 mt-8" role="tablist" aria-label="Filter results by class">
            {[{ value: "All", label: "All Classes" }, ...classes].map((c) => (
              <button
                key={c.value}
                role="tab"
                aria-selected={activeClass === c.value}
                onClick={() => setActiveClass(c.value)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors duration-200 ${
                  activeClass === c.value ? "bg-navy text-white shadow-soft" : "bg-white text-navy/70 border border-navy/10 hover:border-navy/25"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        )}

        <div className="mt-10 flex flex-col gap-10">
          {visibleClasses.map((c) => (
            <div key={c.value}>
              <h3 className="font-heading font-bold text-navy text-xl mb-5">{c.label}</h3>
              <div className="flex flex-col gap-6">
                {posts
                  .filter((p) => p.class_label === c.value)
                  .map((post) => (
                    <ResultCard key={post.id} post={post} />
                  ))}
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

function ResultCard({ post }) {
  const toppers = [...post.images].sort((a, b) => b.obtained_marks - a.obtained_marks);
  return (
    <Reveal>
      <article className="bg-white rounded-3xl border border-navy/8 shadow-soft p-6 sm:p-8">
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
          <h4 className="font-heading font-bold text-navy text-lg">{post.title}</h4>
          <span className="text-xs font-medium text-ink/45">
            {resultClassLabel(post.class_label)} · Total {post.total_marks}
            {post.created_at && ` · ${formatDate(post.created_at)}`}
          </span>
        </div>
        {post.body && <p className="text-sm text-ink/70 leading-relaxed whitespace-pre-line">{post.body}</p>}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-5">
          {toppers.map((t, i) => (
            <div key={t.id} className="relative flex flex-col items-center text-center bg-sky/50 rounded-2xl p-4">
              <span
                className={`absolute top-3 left-3 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-soft ${
                  rankStyle[i] || "bg-white text-navy"
                }`}
              >
                {i + 1}
              </span>
              <img
                src={resolveMediaUrl(t.media_url)}
                alt={t.student_name}
                loading="lazy"
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border-4 border-white shadow-soft"
              />
              <p className="mt-3 font-heading font-semibold text-navy">{t.student_name}</p>
              <p className="text-2xl font-heading font-extrabold text-teal mt-1">
                {t.obtained_marks}
                <span className="text-sm font-semibold text-ink/45">/{post.total_marks}</span>
              </p>
              <p className="text-xs font-medium text-ink/55">{percentage(t.obtained_marks, post.total_marks)}%</p>
            </div>
          ))}
        </div>
      </article>
    </Reveal>
  );
}
