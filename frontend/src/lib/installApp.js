/**
 * Phone "app" install, offered only to signed-in portal users.
 *
 * index.html carries no manifest, so browsers don't offer an install on the public website. After
 * sign-in the portal calls `enableAppInstall(role)`, which links that role's manifest (start_url
 * /admin, /teacher or /student). Chrome/Android then fires `beforeinstallprompt`; we keep the event
 * so our own "Install app" banner can trigger it. iPhone Safari has no such event — users add it from
 * the Share menu, so the banner shows those steps instead.
 */

let deferredPrompt = null;
const listeners = new Set();
const notify = () => listeners.forEach((fn) => fn());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); // no browser mini-bar; the portal banner asks instead
    deferredPrompt = e;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    notify();
  });
}

/** Running as the installed app (home-screen icon), not in a browser tab. */
export function isStandalone() {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

export const isIOS = () =>
  typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent);

const APP_TITLES = { admin: "KGP Admin", teacher: "KGP Teacher", student: "KGP Student" };

/** Add the role's manifest + iOS home-screen tags; returns a cleanup that removes them (on sign-out). */
export function enableAppInstall(role) {
  document.querySelectorAll("[data-portal-app]").forEach((el) => el.remove());
  const tags = [
    ["link", { rel: "manifest", href: `/manifest-${role}.webmanifest` }],
    ["link", { rel: "apple-touch-icon", href: "/icons/apple-touch-icon.png" }],
    ["meta", { name: "mobile-web-app-capable", content: "yes" }],
    ["meta", { name: "apple-mobile-web-app-capable", content: "yes" }],
    ["meta", { name: "apple-mobile-web-app-status-bar-style", content: "default" }],
    ["meta", { name: "apple-mobile-web-app-title", content: APP_TITLES[role] || "GHSS KGP" }],
  ].map(([tag, attrs]) => {
    const el = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    el.dataset.portalApp = "true";
    document.head.appendChild(el);
    return el;
  });
  return () => tags.forEach((el) => el.remove());
}

export const canPromptInstall = () => Boolean(deferredPrompt);

/** Show the browser's install dialog; resolves true if the user accepted. */
export async function promptInstall() {
  if (!deferredPrompt) return false;
  const event = deferredPrompt;
  deferredPrompt = null;
  event.prompt();
  const { outcome } = await event.userChoice;
  notify();
  return outcome === "accepted";
}

export function subscribeInstall(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
