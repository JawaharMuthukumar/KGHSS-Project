import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/apiClient";

/** Fetches a GET endpoint on mount (and whenever deps change), exposing loading/error/reload. */
export function useApiResource(path, { query, enabled = true, deps = [] } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const result = await api.get(path, { query });
      setData(result);
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

  return { data, loading, error, reload, setData };
}
