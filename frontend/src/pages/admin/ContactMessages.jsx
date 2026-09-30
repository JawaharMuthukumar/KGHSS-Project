import PortalPageHeader from "../../components/portal/PortalPageHeader";
import Card from "../../components/ui/Card";
import Banner from "../../components/portal/Banner";
import { useApiResource } from "../../hooks/useApiResource";
import { formatDate } from "../../utils/formatDate";

export default function ContactMessages() {
  const { data: messages, loading, error } = useApiResource("/contact-messages");

  return (
    <div>
      <PortalPageHeader title="Contact Inbox" description="Messages submitted from the public website." />

      {error && <Banner tone="error" className="mb-4">{error.message}</Banner>}

      <Card className="p-0 overflow-hidden">
        {!loading && (messages || []).length === 0 && <p className="p-8 text-center text-sm text-navy/50">No messages yet.</p>}
        <div className="divide-y divide-navy/6">
          {(messages || []).map((m) => (
            <div key={m.id} className="p-5">
              <div className="flex items-center justify-between gap-3 mb-1.5">
                <p className="text-sm font-semibold text-navy">{m.name}</p>
                <p className="text-xs text-navy/40">{formatDate(m.created_at)}</p>
              </div>
              <p className="text-xs text-navy/50 mb-2">
                {m.email}
                {m.phone && ` · ${m.phone}`}
                {m.subject && ` · ${m.subject}`}
              </p>
              <p className="text-sm text-navy/70">{m.message}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
