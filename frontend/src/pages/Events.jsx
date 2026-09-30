import { useMemo, useState } from "react";
import PageHero from "../components/ui/PageHero";
import Container from "../components/ui/Container";
import Reveal from "../components/ui/Reveal";
import Badge from "../components/ui/Badge";
import SmartImage from "../components/ui/SmartImage";
import Icon from "../components/ui/Icon";
import SEO from "../components/utility/SEO";
import { useApiResource } from "../hooks/useApiResource";
import { formatDate, formatDateParts } from "../utils/formatDate";

const statusTabs = [
  { id: "all", label: "All Events" },
  { id: "upcoming", label: "Upcoming Events" },
  { id: "past", label: "Past Events" },
];

function eventStatus(eventDate) {
  if (!eventDate) return "upcoming";
  return new Date(eventDate) >= new Date(new Date().toDateString()) ? "upcoming" : "past";
}

export default function Events() {
  const { data: events, loading, error } = useApiResource("/events");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [month, setMonth] = useState("all");

  const months = useMemo(() => {
    const set = new Set((events || []).filter((e) => e.event_date).map((e) => new Date(e.event_date).getMonth()));
    return Array.from(set).sort((a, b) => a - b);
  }, [events]);

  const filtered = useMemo(() => {
    return (events || [])
      .filter((e) => status === "all" || eventStatus(e.event_date) === status)
      .filter((e) => month === "all" || (e.event_date && new Date(e.event_date).getMonth() === Number(month)))
      .filter((e) => e.title.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => new Date(b.event_date || 0) - new Date(a.event_date || 0));
  }, [events, status, search, month]);

  return (
    <>
      <SEO
        title="Events"
        description="Upcoming and past events at Government Higher Secondary School, Kangayampalayam."
      />
      <PageHero
        eyebrow="School Life"
        title="Events"
        description="Everything happening across the school calendar — from sports meets to community activities."
        trail={[{ label: "School Life", to: "/school-life" }, { label: "Events" }]}
      />

      <section className="py-16 sm:py-20">
        <Container>
          <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-6 mb-10">
            <div className="flex gap-2 flex-wrap">
              {statusTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setStatus(tab.id)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors duration-200 ${
                    status === tab.id
                      ? "bg-navy text-white shadow-soft"
                      : "bg-white text-navy/70 border border-navy/10 hover:border-navy/25"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex flex-1 flex-col sm:flex-row gap-3 lg:justify-end">
              <div className="relative flex-1 sm:max-w-xs">
                <Icon name="Search" size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/35" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search events..."
                  aria-label="Search events"
                  className="w-full pl-10 pr-4 py-2.5 rounded-full border border-navy/12 bg-white text-sm text-navy placeholder:text-ink/35 focus:border-gold outline-none"
                />
              </div>
              <select
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                aria-label="Filter by month"
                className="px-4 py-2.5 rounded-full border border-navy/12 bg-white text-sm text-navy outline-none focus:border-gold"
              >
                <option value="all">All Months</option>
                {months.map((m) => (
                  <option key={m} value={m}>
                    {new Date(2000, m, 1).toLocaleDateString("en-IN", { month: "long" })}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <div className="text-center py-20 flex flex-col items-center gap-3">
              <Icon name="CircleAlert" size={34} className="text-ink/25" />
              <p className="text-ink/50">Could not load events right now.</p>
            </div>
          )}

          {!error && !loading && filtered.length === 0 && (
            <div className="text-center py-20 flex flex-col items-center gap-3">
              <Icon name="CalendarDays" size={34} className="text-ink/25" />
              <p className="text-ink/50">No events match your search right now.</p>
            </div>
          )}

          {!error && filtered.length > 0 && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map((event, i) => {
                const { day, month: monthLabel } = formatDateParts(event.event_date);
                const eStatus = eventStatus(event.event_date);
                return (
                  <Reveal key={event.id} delay={(i % 3) * 0.06}>
                    <div className="h-full bg-white rounded-2xl border border-navy/8 shadow-soft overflow-hidden flex flex-col">
                      <div className="relative h-40">
                        <SmartImage alt={event.title} label={event.title} className="h-full" />
                        <div className="absolute top-3 left-3 bg-white rounded-xl px-3 py-1.5 text-center shadow-soft">
                          <p className="text-lg font-heading font-extrabold text-navy leading-none">{day}</p>
                          <p className="text-[10px] font-semibold uppercase text-ink/50">{monthLabel}</p>
                        </div>
                        <Badge tone={eStatus === "upcoming" ? "gold" : "navy"} className="absolute top-3 right-3">
                          {eStatus === "upcoming" ? "Upcoming" : "Past"}
                        </Badge>
                      </div>
                      <div className="p-6 flex flex-col flex-1">
                        <h3 className="font-heading font-semibold text-navy mb-2">{event.title}</h3>
                        <p className="text-sm text-ink/65 leading-relaxed mb-4 flex-1">{event.description}</p>
                        <p className="text-xs text-ink/40 pt-3 border-t border-navy/8">{formatDate(event.event_date)}</p>
                      </div>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          )}
        </Container>
      </section>
    </>
  );
}
