import { api } from "./apiClient";

/** Phones / tablets: their browsers show a PDF opened in a tab as a flat image with no Print option. */
const isMobile = () =>
  typeof window !== "undefined" &&
  (window.matchMedia?.("(pointer: coarse)").matches || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || ""));

function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/**
 * Open an API PDF to view / print. Computers: a new tab (the browser's viewer has Print and Save); the tab is
 * opened inside the click so pop-up blockers allow it. Phones: the phone's print screen opens straight away
 * (printer, copies, Save as PDF) — see pdfPrint.js; `filename` is only used if that fails and the file is saved.
 */
export async function openPdf(path, query, filename = "document.pdf") {
  if (isMobile()) {
    const blob = await api.get(path, query ? { query } : undefined);
    try {
      const { printPdfBlob } = await import("./pdfPrint");
      await printPdfBlob(blob);
    } catch {
      saveBlob(blob, filename); // very old phone browser: fall back to the PDF app
    }
    return;
  }
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

/** Only look at an API PDF: a new tab on computers; on phones the phone's PDF viewer (no print screen). */
export async function viewPdf(path, query, filename = "document.pdf") {
  if (isMobile()) {
    saveBlob(await api.get(path, query ? { query } : undefined), filename);
    return;
  }
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

/** Straight to the print screen (printer, copies, Save as PDF) on computers and phones alike — see pdfPrint.js. */
export async function printPdf(path, query) {
  const blob = await api.get(path, query ? { query } : undefined);
  const { printPdfBlob } = await import("./pdfPrint");
  await printPdfBlob(blob);
}

/** Download an API PDF as a file. */
export async function downloadPdf(path, query, filename) {
  saveBlob(await api.get(path, query ? { query } : undefined), filename);
}
