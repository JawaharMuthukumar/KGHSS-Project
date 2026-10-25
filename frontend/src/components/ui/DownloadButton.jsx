import { useState } from "react";
import Icon from "./Icon";
import { useToast } from "./Toast";
import { downloadFile } from "../../lib/download";
import { ApiError } from "../../lib/apiClient";

/** "⬇ Download CSV" button for an /exports/... file (opens in Excel). */
export default function DownloadButton({ path, query, filename, label = "Download CSV", className = "" }) {
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const click = async () => {
    setBusy(true);
    try {
      await downloadFile(path, { query, filename });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not download the file. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={click}
      disabled={busy}
      className={`flex items-center justify-center gap-1.5 text-xs font-semibold text-navy border border-navy/15 px-3 py-2 rounded-full hover:bg-navy/5 disabled:opacity-60 ${className}`}
    >
      <Icon name={busy ? "Loader2" : "Download"} size={14} className={busy ? "animate-spin" : ""} />
      {busy ? "Preparing…" : label}
    </button>
  );
}
