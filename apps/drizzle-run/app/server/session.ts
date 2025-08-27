import { createCookieSessionStorage } from "react-router";
import type { AuthSession } from "~/modules/auth/service.server";
import { env } from "~/utils/env";

export const authSessionKey = "auth";
export const codeVerifierKey = "code-verifier";

export type SessionData = {
  [authSessionKey]: AuthSession;
  [codeVerifierKey]: string | null;
};

export type FlashData = { errorMessage: string };

/** Creates a session storage */
export function createSessionStorage() {
  return createCookieSessionStorage({
    cookie: {
      name: "session",
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secrets: [env.SESSION_SECRET],
      secure: env.NODE_ENV === "production",
    },
  });
}
