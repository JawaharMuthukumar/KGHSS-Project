/**
 * Print a PDF on a phone through the phone's own print screen (printer choice, copies, pages).
 * Mobile browsers can't show a PDF inside the page, so window.print() on a PDF tab gives no print dialog.
 * Instead every PDF page is drawn to an image (pdf.js, loaded only when needed), the images are placed in a
 * print-only layer over the app, and the normal page print is opened — exactly like printing on a computer.
 */
const PRINT_ROOT_ID = "pdf-print-root";
const STYLE_ID = "pdf-print-style";

async function renderPages(blob) {
  const pdfjs = await import("pdfjs-dist");
  const { default: workerUrl } = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) }).promise;
  const pages = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const viewport = page.getViewport({ scale: 2 }); // ~150 dpi on A4: sharp text, reasonable memory on phones
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
    pages.push(canvas.toDataURL("image/jpeg", 0.92));
    page.cleanup();
  }
  await doc.destroy();
  return pages;
}

function cleanup() {
  document.getElementById(PRINT_ROOT_ID)?.remove();
  document.getElementById(STYLE_ID)?.remove();
}

export async function printPdfBlob(blob) {
  const images = await renderPages(blob);
  cleanup();
  const style = document.createElement("style");
  style.id = STYLE_ID;
  // On paper only the PDF pages show; the app underneath is hidden. On screen the layer stays hidden.
  style.textContent = `
    #${PRINT_ROOT_ID} { display: none; }
    @media print {
      @page { margin: 0; }
      body > *:not(#${PRINT_ROOT_ID}) { display: none !important; }
      #${PRINT_ROOT_ID} { display: block; }
      #${PRINT_ROOT_ID} img { display: block; width: 100%; height: auto; page-break-after: always; break-after: page; }
      #${PRINT_ROOT_ID} img:last-child { page-break-after: auto; break-after: auto; }
    }`;
  document.head.appendChild(style);
  const root = document.createElement("div");
  root.id = PRINT_ROOT_ID;
  root.innerHTML = images.map((src) => `<img src="${src}" alt="">`).join("");
  document.body.appendChild(root);
  await Promise.all([...root.querySelectorAll("img")].map((img) => (img.complete ? null : new Promise((done) => { img.onload = img.onerror = done; }))));
  window.addEventListener("afterprint", cleanup, { once: true });
  setTimeout(cleanup, 120000); // in case the browser never fires afterprint
  window.print();
}
