import { useMemo, useState } from "react";
import PageHero from "../components/ui/PageHero";
import Container from "../components/ui/Container";
import Reveal from "../components/ui/Reveal";
import Icon from "../components/ui/Icon";
import SEO from "../components/utility/SEO";
import { useApiResource } from "../hooks/useApiResource";
import { formatDate } from "../utils/formatDate";

export default function Notices() {
  const [search, setSearch] = useState("");
  const { data: notices, loading, error } = useApiResource("/notices");

  const filtered = useMemo(() => {
    return (notices || []).filter((n) => n.title.toLowerCase().includes(search.toLowerCase()));
  }, [notices, search]);

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
          <div className="relative mb-8">
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

          {error && (
            <div className="text-center py-20 flex flex-col items-center gap-3">
              <Icon name="CircleAlert" size={32} className="text-ink/25" />
              <p className="text-ink/50">Could not load notices right now.</p>
            </div>
          )}

          {!error && !loading && filtered.length === 0 && (
            <div className="text-center py-20 flex flex-col items-center gap-3">
              <Icon name="Bell" size={32} className="text-ink/25" />
              <p className="text-ink/50">No notices match your search.</p>
            </div>
          )}

          {!error && filtered.length > 0 && (
            <Reveal className="bg-white rounded-3xl border border-navy/8 shadow-soft divide-y divide-navy/8">
              {filtered.map((notice) => (
                <div key={notice.id} className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-5 px-6 py-5">
                  <span className="text-xs font-semibold text-ink/45 w-24 shrink-0">{formatDate(notice.created_at)}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-navy">{notice.title}</p>
                    <p className="text-sm text-ink/60 mt-1">{notice.body}</p>
                  </div>
                </div>
              ))}
            </Reveal>
          )}
        </Container>
      </section>
    </>
  );
}
