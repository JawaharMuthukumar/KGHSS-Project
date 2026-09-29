import { useMemo, useState } from "react";
import PageHero from "../components/ui/PageHero";
import Container from "../components/ui/Container";
import Reveal from "../components/ui/Reveal";
import Badge from "../components/ui/Badge";
import Icon from "../components/ui/Icon";
import SEO from "../components/utility/SEO";
import { notices, noticeCategories } from "../data/schoolData";
import { formatDate } from "../utils/formatDate";

const categoryTone = { Important: "gold", Academic: "teal", Event: "navy", General: "navy" };

export default function Notices() {
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return notices
      .filter((n) => category === "All" || n.category === category)
      .filter((n) => n.title.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [category, search]);

  return (
    <>
      <SEO
        title="Notice Board"
        description="Notices and announcements from Government Higher Secondary School, Kangayampalayam."
      />
      <PageHero
        eyebrow="School Life"
        title="Notice Board"
        description="Announcements, schedules and important updates from school administration."
        trail={[{ label: "School Life", to: "/school-life" }, { label: "Notices" }]}
      />

      <section className="py-16 sm:py-20">
        <Container className="max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row gap-3 mb-8">
            <div className="relative flex-1">
              <Icon name="Search" size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/35" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search notices..."
                aria-label="Search notices"
                className="w-full pl-10 pr-4 py-2.5 rounded-full border border-navy/12 bg-white text-sm text-navy placeholder:text-ink/35 focus:border-gold outline-none"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {noticeCategories.map((cat) => (
                <button
                  key={cat}
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
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-20 flex flex-col items-center gap-3">
              <Icon name="Bell" size={32} className="text-ink/25" />
              <p className="text-ink/50">No notices match your search.</p>
            </div>
          ) : (
            <Reveal className="bg-white rounded-3xl border border-navy/8 shadow-soft divide-y divide-navy/8">
              {filtered.map((notice) => (
                <div key={notice.id} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5 px-6 py-5">
                  <span className="text-xs font-semibold text-ink/45 w-24 shrink-0">{formatDate(notice.date)}</span>
                  <Badge tone={categoryTone[notice.category] || "navy"} className="shrink-0">{notice.category}</Badge>
                  <p className="text-sm font-medium text-navy flex-1">{notice.title}</p>
                  {notice.fileUrl ? (
                    <a
                      href={notice.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-navy hover:text-gold-dark shrink-0"
                    >
                      <Icon name="FileText" size={15} /> View
                    </a>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs text-ink/35 shrink-0" title="Document to be uploaded">
                      <Icon name="FileText" size={15} /> Coming soon
                    </span>
                  )}
                </div>
              ))}
            </Reveal>
          )}
        </Container>
      </section>
    </>
  );
}
