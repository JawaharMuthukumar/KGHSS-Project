/**
 * Print just one element (not the portal chrome) by copying it, with the app's
 * stylesheets, into a hidden iframe. `orientation` sets the printed page size.
 */
export function printElement(element, { orientation = "landscape", title = document.title } = {}) {
  if (!element) return;
  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
  document.body.appendChild(iframe);

  const styles = [...document.querySelectorAll('style, link[rel="stylesheet"]')].map((n) => n.outerHTML).join("");
  const doc = iframe.contentDocument;
  doc.open();
  doc.write(`<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>${styles}
    <style>@page{size:A4 ${orientation};margin:8mm}body{background:#fff!important;margin:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}</style>
    </head><body>${element.outerHTML}</body></html>`);
  doc.close();

  const run = () => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    setTimeout(() => iframe.remove(), 1000);
  };
  // Give linked stylesheets/fonts a moment to load before printing
  if (doc.readyState === "complete") setTimeout(run, 300);
  else iframe.onload = () => setTimeout(run, 300);
}
