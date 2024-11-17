import { createClient, type SupportedStorage } from "@supabase/supabase-js";

export type {
  AuthSession as SupabaseAuthSession,
  User as SupabaseAuthAccount,
} from "@supabase/supabase-js";

import { env } from "~/utils/env";

const codeVerifier = "code-verifier";

/**
 * Create a storage provider. Used to only store the code verifier during the login flow.
 */
function createStorage(context?: AppLoadContext): SupportedStorage | undefined {
  if (!context) {
    return undefined;
  }

  return {
    getItem(key) {
      if (key.endsWith(codeVerifier)) {
        return context.getCodeVerifier();
      }
      return null;
    },
    setItem(key, value) {
      if (key.endsWith(codeVerifier)) {
        context.setCodeVerifier(value);
      }
    },
    removeItem(key) {
      if (key.endsWith(codeVerifier)) {
        context.destroyCodeVerifier();
      }
    },
  };
}

export function getSupabaseServerClient(context?: AppLoadContext) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: {
      flowType: "pkce",
      autoRefreshToken: false,
      storage: createStorage(context),
    },
  });
}
