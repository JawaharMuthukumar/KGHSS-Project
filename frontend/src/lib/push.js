import { api } from "./apiClient";
import { isIOS, isStandalone } from "./installApp";

/**
 * Phone notifications (Web Push). The service worker (/sw.js) shows them even when the portal is closed.
 * Android/desktop Chrome: works in the browser or the installed app. iPhone (iOS 16.4+): only in the app added to
 * the Home Screen — Safari tabs can't receive them, so the UI asks to install first.
 */
export const pushSupported = () =>
  typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

/** iPhone in a Safari tab: push becomes available once the portal is added to the Home Screen. */
export const needsIosInstall = () => isIOS() && !isStandalone();

const toKey = (b64) => {
  const s = (b64 + "=".repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
};

let registration = null;
async function sw() {
  if (!registration) registration = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;
  return registration;
}

/** "on" | "off" | "blocked" (denied in browser settings) | "unsupported" | "install" (iPhone: add to Home Screen first) */
export async function pushState() {
  if (needsIosInstall()) return "install";
  if (!pushSupported()) return "unsupported";
  if (Notification.permission === "denied") return "blocked";
  const reg = await navigator.serviceWorker.getRegistration("/");
  const sub = reg ? await reg.pushManager.getSubscription() : null;
  return sub && Notification.permission === "granted" ? "on" : "off";
}

/** Ask permission and register this device for the signed-in account. Must run from a tap (iPhone requires it). */
export async function enablePush() {
  const { enabled, key } = await api.get("/push/public-key");
  if (!enabled) throw new Error("Phone notifications are not set up on the server yet.");
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return permission === "denied" ? "blocked" : "off";
  const reg = await sw();
  let sub = await reg.pushManager.getSubscription();
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKey(key) });
  await api.post("/push/subscribe", sub.toJSON());
  return "on";
}

/** Stop notifications on this device (also used on sign-out, so the next person on the phone doesn't get them). */
export async function disablePush() {
  if (!pushSupported()) return;
  const reg = await navigator.serviceWorker.getRegistration("/");
  const sub = reg ? await reg.pushManager.getSubscription() : null;
  if (!sub) return;
  try {
    await api.post("/push/unsubscribe", { endpoint: sub.endpoint });
  } catch {
    /* signed out already / offline: the device is still unsubscribed below */
  }
  await sub.unsubscribe();
}

/** Signed in on a device that already allowed notifications: re-link it to this account (e.g. after another user). */
export async function refreshPush() {
  if (!pushSupported() || Notification.permission !== "granted") return;
  try {
    const reg = await sw();
    const sub = await reg.pushManager.getSubscription();
    if (sub) await api.post("/push/subscribe", sub.toJSON());
  } catch {
    /* server push not set up, or offline: nothing to do */
  }
}
