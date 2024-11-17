import type { UserId } from "~/database/types";
import {
  getSupabaseServerClient,
  type SupabaseAuthSession,
} from "~/integrations/supabase/client.server";
import { AppError } from "~/utils/error";

const label = "Auth 🔐";

export async function refreshAccessToken(refreshToken?: string) {
  try {
    if (!refreshToken) {
      throw new AppError({
        cause: null,
        message: `Failed to refresh access token`,
        label,
      });
    }

    const { data, error } = await getSupabaseServerClient().auth.refreshSession(
      {
        refresh_token: refreshToken,
      },
    );

    if (error) {
      throw error;
    }

    const { session } = data;

    if (!session) {
      throw new AppError({
        cause: null,
        message: "The refreshed session returned by Supabase is null",
        label,
      });
    }

    return makeAuthSession(session);
  } catch (cause) {
    throw new AppError({
      cause,
      message: `Failed to refresh access token`,
      additionalData: { refreshToken },
      label,
    });
  }
}

export function makeAuthSession(supabaseAuthSession: SupabaseAuthSession) {
  return {
    refreshToken: supabaseAuthSession.refresh_token,
    userId: supabaseAuthSession.user.id as UserId,
    expiresIn: supabaseAuthSession.expires_in,
    expiresAt: supabaseAuthSession.expires_at,
  };
}

export type AuthSession = ReturnType<typeof makeAuthSession>;
