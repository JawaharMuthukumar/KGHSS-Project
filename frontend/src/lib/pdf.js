import { api } from "./apiClient";

/**
 * Open an API PDF in a new tab (the browser's viewer has Print and Save). The tab is opened before the
 * download starts, inside the click, so pop-up blockers allow it.
 */
export async function openPdf(path, query) {
  const tab = window.open("", "_blank");
  try {
    const blob = await api.get(path, query ? { query } : undefined);
    const url = URL.createObjectURL(blob);
    if (tab) tab.location.href = url;
    else window.location.href = url;
  } catch (err) {
    tab?.close();
    throw err;
  }
}

/** Download an API PDF as a file. */
export async function downloadPdf(path, query, filename) {
  const blob = await api.get(path, query ? { query } : undefined);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
