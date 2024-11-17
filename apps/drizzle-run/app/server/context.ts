import type { HonoServerOptions } from "react-router-hono-server/node";
import { getSession } from "remix-hono/session";

import { AppError } from "~/utils/error";

import {
  authSessionKey,
  codeVerifierKey,
  type FlashData,
  type SessionData,
} from "./session";

/**
 * Declare our loaders and actions context type
 */
declare module "@remix-run/node" {
  interface AppLoadContext {
    /**
     * The app version from the build assets
     */
    readonly appVersion: string;
    /**
     * Whether the user is authenticated or not
     */
    isAuthenticated: boolean;
    /**
     * Get the current auth session or throw if the user is not logged
     *
     * @returns The session
     */
    getAuthSessionOrThrow(): SessionData["auth"];
    /**
     * Get the current auth session if it exists
     *
     *
     * @returns The session
     */
    getAuthSession(): SessionData["auth"] | undefined;
    /**
     * Set the session to the session storage
     *
     * It will then be automatically handled by the session middleware
     *
     * @param authSession - The auth session to commit
     */
    setAuthSession(authSession: SessionData["auth"]): void;
    /**
     * Destroy the session from the session storage middleware
     *
     * It will then be automatically handled by the session middleware
     */
    destroyAuthSession(): void;
    getCodeVerifier(): SessionData["code-verifier"];
    setCodeVerifier(codeVerifier: string): void;
    destroyCodeVerifier(): void;
    /**
     * The flash error message related to session
     */
    errorMessage: string | null;
  }
}

export const getLoadContext: HonoServerOptions["getLoadContext"] = (
  c,
  { build },
) => {
  const session = getSession<SessionData, FlashData>(c);

  return {
    appVersion: build.assets.version,
    isAuthenticated: session.has(authSessionKey),
    // we could ensure that session.get() match a specific shape
    // let's trust our system for now
    getAuthSessionOrThrow: () => {
      const auth = session.get(authSessionKey);

      if (!auth) {
        throw new AppError({
          cause: null,
          message:
            "There is no session here. This should not happen because if you require it, this route should be mark as protected and catch by the protect middleware.",
          status: 403,
          additionalData: {
            path: c.req.path,
          },
          label: "Dev error 🤦‍♂️",
        });
      }

      return auth;
    },
    getAuthSession: () => {
      return session.get(authSessionKey);
    },
    setAuthSession: (authSession) => {
      session.set(authSessionKey, authSession);
    },
    destroyAuthSession: () => {
      session.unset(authSessionKey);
    },
    getCodeVerifier: () => {
      return session.get(codeVerifierKey) || null;
    },
    setCodeVerifier: (codeVerifier) => {
      session.set(codeVerifierKey, codeVerifier);
    },
    destroyCodeVerifier: () => {
      session.unset(codeVerifierKey);
    },
    errorMessage: session.get("errorMessage") || null,
  };
};
