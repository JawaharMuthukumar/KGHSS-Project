import { useState } from "react";
import PortalPageHeader from "../../components/portal/PortalPageHeader";
import Card from "../../components/ui/Card";
import Icon from "../../components/ui/Icon";
import Banner from "../../components/portal/Banner";
import { useApiResource } from "../../hooks/useApiResource";
import { api } from "../../lib/apiClient";
import { formatDate } from "../../utils/formatDate";

export default function Complaints() {
  const { data: threads, loading, error, reload } = useApiResource("/complaints");
  const [activeId, setActiveId] = useState(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const active = (threads || []).find((t) => t.id === activeId) || threads?.[0];

  const handleSend = async (e) => {
    e.preventDefault();
    if (!message.trim() || !active) return;
    setSending(true);
    try {
      await api.post("/complaints/messages", { body: message.trim() }, { query: { student_id: active.student_id } });
      setMessage("");
      reload();
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <PortalPageHeader title="Complaints" description="Private student complaint threads." />

      {error && <Banner tone="error" className="mb-4">{error.message}</Banner>}
      {!loading && (threads || []).length === 0 && <Card className="p-8 text-center text-navy/50">No complaint threads yet.</Card>}

      {(threads || []).length > 0 && (
        <div className="grid lg:grid-cols-3 gap-5 h-[32rem]">
          <Card className="p-0 overflow-y-auto lg:col-span-1">
            {threads.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveId(t.id)}
                className={`w-full text-left px-4 py-3.5 border-b border-navy/6 last:border-0 transition-colors ${
                  active?.id === t.id ? "bg-gold/10" : "hover:bg-navy/[0.02]"
                }`}
              >
                <p className="text-sm font-semibold text-navy truncate">{t.student_name}</p>
                <p className="text-xs text-navy/45 truncate mt-0.5">
                  {t.messages[t.messages.length - 1]?.body || "No messages"}
                </p>
              </button>
            ))}
          </Card>

          <Card className="p-0 flex flex-col lg:col-span-2 overflow-hidden">
            {active && (
              <>
                <div className="px-4 py-3.5 border-b border-navy/8 shrink-0">
                  <p className="text-sm font-semibold text-navy">{active.student_name}</p>
                </div>
                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
                  {active.messages.map((m) => (
                    <div key={m.id} className={`flex ${m.sender_role === "admin" ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${
                          m.sender_role === "admin" ? "bg-gold text-navy-dark" : "bg-navy/8 text-navy"
                        }`}
                      >
                        <p>{m.body}</p>
                        <p className="text-[10px] opacity-60 mt-1">{formatDate(m.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <form onSubmit={handleSend} className="p-3 border-t border-navy/8 flex items-center gap-2 shrink-0">
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type a reply…"
                    className="flex-1 px-3.5 py-2.5 rounded-full border border-navy/15 text-sm outline-none focus:border-gold"
                  />
                  <button
                    type="submit"
                    disabled={sending || !message.trim()}
                    className="flex items-center justify-center w-10 h-10 rounded-full bg-gold text-navy-dark disabled:opacity-50 shrink-0"
                    aria-label="Send"
                  >
                    <Icon name="Send" size={16} />
                  </button>
                </form>
              </>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
