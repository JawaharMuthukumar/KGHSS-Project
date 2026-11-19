import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { api } from "../lib/apiClient";
import { useToast } from "../components/ui/Toast";

/** Fired on window with `detail` = changed topics; useApiResource({ live }) listens for it. */
export const LIVE_EVENT = "kghss:live";

const POLL_MS = 10000;
const NOTICE_PATHS = { teacher: "/teacher/notices", student: "/student/notices" };

const AlertsContext = createContext({ counts: {}, items: [], profileMissing: [], unreadNotices: 0, refresh: () => {} });

const seenKey = (username) => `kghss.noticeSeen.${username}`;
function readSeen(username) {
  try {
    const raw = localStorage.getItem(seenKey(username));
    return raw == null ? null : Number(raw);
  } catch {
    return null;
  }
}
function writeSeen(username, id) {
  try {
    localStorage.setItem(seenKey(username), String(id));
  } catch {
    /* storage blocked: unread badge just resets next visit */
  }
}

// Info-only items (e.g. "certificate ready") stop counting once the user has opened the page they point to.
const clearedKey = (username) => `kghss.alertsCleared.${username}`;
function readCleared(username) {
  try {
    return new Set(JSON.parse(localStorage.getItem(clearedKey(username)) || "[]"));
  } catch {
    return new Set();
  }
}
function writeCleared(username, keys) {
  try {
    localStorage.setItem(clearedKey(username), JSON.stringify([...keys].slice(-100)));
  } catch {
    /* storage blocked: the badge clears again on the next visit to the page */
  }
}

/**
 * Polls /portal/alerts while the tab is visible. New requests/notices pop a clickable toast,
 * badge counts feed the sidebar and bell, and changed topics are broadcast so open pages refresh.
 */
export function AlertsProvider({ role, username, children }) {
  const toast = useToast();
  const { pathname } = useLocation();
  const [state, setState] = useState({ counts: {}, items: [], notices: [], profileMissing: [] });
  const [seenNoticeId, setSeenNoticeId] = useState(() => readSeen(username));
  const [cleared, setCleared] = useState(() => readCleared(username));
  const previous = useRef(null); // last poll: { versions, keys, maxNotice }
  const noticePath = NOTICE_PATHS[role];
  const onNoticePage = Boolean(noticePath) && pathname.startsWith(noticePath);
  const onNoticePageRef = useRef(onNoticePage);
  onNoticePageRef.current = onNoticePage;

  const poll = useCallback(async () => {
    let data;
    try {
      data = await api.get("/portal/alerts");
    } catch {
      return; // offline / server asleep: try again next tick
    }
    const keys = new Set(data.items.map((i) => i.key));
    const maxNotice = data.notices.length ? data.notices[0].id : 0;
    const prev = previous.current;

    if (prev) {
      const changed = Object.keys(data.versions).filter((t) => data.versions[t] !== prev.versions[t]);
      if (changed.length) window.dispatchEvent(new CustomEvent(LIVE_EVENT, { detail: changed }));

      data.items
        .filter((i) => !prev.keys.has(i.key))
        .slice(0, 3)
        .forEach((i) => toast.info(i.title, { detail: i.detail, to: i.to }));

      if (noticePath && !onNoticePageRef.current) {
        data.notices
          .filter((n) => n.id > prev.maxNotice)
          .slice(0, 2)
          .forEach((n) => toast.info("New notice", { detail: n.title, to: noticePath }));
      }
    } else if (readSeen(username) == null) {
      // First visit ever: start counting from now instead of flagging every old notice.
      writeSeen(username, maxNotice);
      setSeenNoticeId(maxNotice);
    }

    previous.current = { versions: data.versions, keys, maxNotice };
    setState({ counts: data.counts, items: data.items, notices: data.notices, profileMissing: data.profile_missing || [] });
  }, [toast, noticePath, username]);

  useEffect(() => {
    poll();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") poll();
    }, POLL_MS);
    const onVisible = () => document.visibilityState === "visible" && poll();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [poll]);

  // Opening the notices page marks everything listed as read.
  const latestNotice = state.notices[0]?.id || 0;
  useEffect(() => {
    if (onNoticePage && latestNotice && latestNotice !== seenNoticeId) {
      writeSeen(username, latestNotice);
      setSeenNoticeId(latestNotice);
    }
  }, [onNoticePage, latestNotice, seenNoticeId, username]);

  // Being on the page an info-only item points to marks it as seen.
  useEffect(() => {
    const fresh = state.items.filter((i) => i.clear_on_visit && !cleared.has(i.key) && pathname.startsWith(i.to));
    if (!fresh.length) return;
    const next = new Set(cleared);
    fresh.forEach((i) => next.add(i.key));
    writeCleared(username, next);
    setCleared(next);
  }, [state.items, pathname, cleared, username]);

  const visibleItems = state.items.filter((i) => !(i.clear_on_visit && cleared.has(i.key)));
  const certificateCount = visibleItems.filter((i) => i.kind === "certificate" && !i.silent_badge).length;

  const unread = noticePath ? state.notices.filter((n) => n.id > (seenNoticeId ?? Infinity)) : [];
  const unreadNotices = unread.length;
  // Unread notices per posting teacher (teacher id → count), for badges next to a teacher's name.
  const unreadByTeacher = {};
  unread.forEach((n) => {
    if (n.author_teacher_id) unreadByTeacher[n.author_teacher_id] = (unreadByTeacher[n.author_teacher_id] || 0) + 1;
  });
  const unreadKey = JSON.stringify(unreadByTeacher);

  const value = useMemo(
    () => ({
      counts: { ...state.counts, certificates: certificateCount, notices: unreadNotices },
      items: visibleItems,
      profileMissing: state.profileMissing,
      unreadNotices,
      unreadByTeacher: JSON.parse(unreadKey),
      noticePath,
      refresh: poll,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- visibleItems/certificateCount derive from state + cleared
    [state, cleared, unreadNotices, unreadKey, noticePath, poll]
  );

  return <AlertsContext.Provider value={value}>{children}</AlertsContext.Provider>;
}

export function useAlerts() {
  return useContext(AlertsContext);
}
