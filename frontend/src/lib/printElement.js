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

  // Wait for something to finish loading, but never hang the print button (fallback after `ms`).
  const settle = (ready, attach, ms = 5000) =>
    ready ? null : new Promise((done) => { attach(done); setTimeout(done, ms); });

  let printed = false;
  const run = async () => {
    if (printed) return;
    printed = true;
    // In the deployed site the app's CSS is a <link>ed file (in development it is inline <style>), so the copy
    // has to load it before printing — otherwise the card prints unstyled with full-size logos.
    await Promise.all(
      [...doc.querySelectorAll('link[rel="stylesheet"]')].map((l) => settle(l.sheet, (done) => { l.onload = l.onerror = done; }))
    );
    // Logos are <img>s: wait for them so they are never missing from the printout
    await Promise.all([...doc.images].map((img) => settle(img.complete, (done) => { img.onload = img.onerror = done; })));
    try {
      await doc.fonts?.ready; // Tamil web font
    } catch {
      /* older browsers: print with what is loaded */
    }
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    setTimeout(() => iframe.remove(), 1000);
  };
  setTimeout(run, 50);
}
