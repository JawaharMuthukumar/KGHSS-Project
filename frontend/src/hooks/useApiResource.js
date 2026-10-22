import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../lib/apiClient";
import { LIVE_EVENT } from "../context/AlertsContext";

/**
 * Fetches a GET endpoint on mount (and whenever deps change), exposing loading/error/reload.
 * `loading` is only true until the first response for a given path/query arrives — later reloads
 * (e.g. after adding a record) refresh the data in the background without flashing a skeleton.
 * `live` names alert topics ("certificates" | "leave" | "notices"); when the portal's alert poll
 * sees one of them change, the data is re-fetched silently so the page updates without a reload.
 */
export function useApiResource(path, { query, enabled = true, deps = [], live } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(null);
  const loadedKey = useRef(null);

  const reload = useCallback(async () => {
    if (!enabled) return;
    const key = `${path}?${JSON.stringify(query || {})}`;
    if (loadedKey.current !== key) setLoading(true);
    setError(null);
    try {
      const result = await api.get(path, { query });
      setData(result);
      loadedKey.current = key;
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, enabled, ...deps]);

  useEffect(() => {
    reload();
  }, [reload]);

  const liveKey = [].concat(live || []).join(",");
  useEffect(() => {
    if (!liveKey) return undefined;
    const topics = liveKey.split(",");
    const onLive = (e) => {
      if (e.detail.some((topic) => topics.includes(topic))) reload();
    };
    window.addEventListener(LIVE_EVENT, onLive);
    return () => window.removeEventListener(LIVE_EVENT, onLive);
  }, [liveKey, reload]);

  return { data, loading, error, reload, setData };
}
