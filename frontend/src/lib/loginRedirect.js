import { authStorage } from "./authStorage";

// Who was signed in when the session ended (sign-out or expiry). The login page only sends someone back to the
// page they were on if it is the same person; anyone else (e.g. the next teacher on a shared computer) starts
// on their own dashboard.
export const LAST_USER_KEY = "ghss_last_user";

/** For ProtectedRoute: the login redirect remembers the page together with whose session it was. */
export const lastSignedInUser = () => authStorage.getItem(LAST_USER_KEY);

/** After sign-in: go back to the remembered page only for the same user and role; otherwise the dashboard. */
export function afterLoginPath(state, user) {
  const from = state?.from?.pathname;
  const sameUser = !state?.forUser || state.forUser.toLowerCase() === (user.username || "").toLowerCase();
  return from && sameUser && from.startsWith(`/${user.role}`) ? from : `/${user.role}`;
}
