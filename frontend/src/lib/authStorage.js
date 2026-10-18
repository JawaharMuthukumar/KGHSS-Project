import { isStandalone } from "./installApp";

/**
 * Where the sign-in token lives. In a browser it's sessionStorage, so each tab has its own login
 * (admin in one tab, teacher in another). The installed phone app has one window and should stay
 * signed in between launches, so there it uses localStorage. Storage access can throw (private
 * mode, blocked site data) — every call is guarded and simply acts as "nothing stored".
 */
const store = () => (isStandalone() ? window.localStorage : window.sessionStorage);

export const authStorage = {
  getItem(key) {
    try {
      return store().getItem(key);
    } catch {
      return null;
    }
  },
  setItem(key, value) {
    try {
      store().setItem(key, value);
    } catch {
      /* storage blocked: the session lasts until reload */
    }
  },
  removeItem(key) {
    try {
      store().removeItem(key);
    } catch {
      /* nothing to clear */
    }
  },
};
