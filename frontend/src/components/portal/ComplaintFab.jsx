import { useEffect, useRef, useState } from "react";
import Icon from "../ui/Icon";
import { api } from "../../lib/apiClient";
import { formatDate } from "../../utils/formatDate";

export default function ComplaintFab() {
  const [open, setOpen] = useState(false);
  const [thread, setThread] = useState(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  const load = () => {
    api
      .get("/complaints")
      .then((threads) => setThread(threads[0] || null))
      .catch(() => {});
  };

  useEffect(() => {
    if (!open) return;
    load();
    const interval = setInterval(load, 4000);
    return () => clearInterval(interval);
  }, [open]);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread, open]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSending(true);
    try {
      await api.post("/complaints/messages", { body: message.trim() });
      setMessage("");
      load();
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {open && (
        <div className="fixed bottom-44 lg:bottom-24 right-4 lg:right-5 z-50 w-[22rem] max-w-[calc(100vw-2rem)] h-[28rem] max-h-[calc(100svh-14rem)] lg:max-h-none bg-white rounded-3xl shadow-2xl border border-navy/10 flex flex-col overflow-hidden">
          <div className="bg-navy-dark text-white px-4 py-3 flex items-center justify-between gap-3 shrink-0">
            <div className="min-w-0">
              <p className="font-heading font-bold text-sm">Complaint Box</p>
              <p className="text-[11px] text-white/60">Direct talk to the Head Master</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="shrink-0">
              <Icon name="X" size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
            {!thread?.messages?.length && (
              <p className="text-xs text-navy/45 text-center mt-6">No messages yet. Send a message to start.</p>
            )}
            {(thread?.messages || []).map((m) => (
              <div key={m.id} className={`flex ${m.sender_role === "student" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${
                    m.sender_role === "student" ? "bg-gold text-navy-dark" : "bg-navy/8 text-navy"
                  }`}
                >
                  <p>{m.body}</p>
                  <p className="text-[10px] opacity-60 mt-1">{formatDate(m.created_at)}</p>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          <form onSubmit={handleSend} className="p-3 border-t border-navy/8 flex items-center gap-2 shrink-0">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type a message…"
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
        </div>
      )}

      <div className="group fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] lg:bottom-5 right-4 lg:right-5 z-40">
        {/* Hover / keyboard-focus label so students know what the round button is */}
        {!open && (
          <span
            role="tooltip"
            className="pointer-events-none absolute right-full top-1/2 -translate-y-1/2 mr-3 whitespace-nowrap rounded-xl bg-navy-dark px-3.5 py-2 text-white shadow-lg opacity-0 translate-x-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0 group-focus-within:opacity-100 group-focus-within:translate-x-0"
          >
            <span className="block text-sm font-semibold leading-tight">Complaint Box</span>
            <span className="block text-[11px] text-white/65 leading-tight">Direct talk to the Head Master</span>
          </span>
        )}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center justify-center w-14 h-14 rounded-full bg-gold text-navy-dark shadow-xl hover:bg-gold-light transition-colors"
          aria-label={open ? "Close complaint box" : "Complaint Box — direct talk to the Head Master"}
        >
          <Icon name={open ? "X" : "MessageCircleHeart"} size={22} />
        </button>
      </div>
    </>
  );
}
