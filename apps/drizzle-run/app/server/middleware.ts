import { createMiddleware } from "hono/factory";
import { getSession } from "remix-hono/session";

import { refreshAccessToken } from "~/modules/auth/service.server";

import { authSessionKey, type FlashData, type SessionData } from "./session";

function isExpiringSoon(expiresAt: number | undefined) {
  if (!expiresAt) {
    return true;
  }

  return (expiresAt - 60 * 0.1) * 1000 < Date.now(); // 1 minute left before token expires
}

/**
 * Refresh access token middleware
 *
 */
export function refreshSession() {
  return createMiddleware(async (c, next) => {
    const session = getSession<SessionData, FlashData>(c);
    const auth = session.get(authSessionKey);

    if (!auth || !isExpiringSoon(auth.expiresAt)) {
      return next();
    }

    try {
      session.set(authSessionKey, await refreshAccessToken(auth.refreshToken));
    } catch (cause) {
      session.flash(
        "errorMessage",
        "You have been logged out. Please log in again.",
      );

      session.unset(authSessionKey);
    }

    return next();
  });
}
