import { type MetaFunction, redirect } from "react-router";
import { serverDb } from "~/database/.server/db";
import type { UserId } from "~/database/types";
import { getSupabaseServerClient } from "~/integrations/supabase/client.server";
import { makeAuthSession } from "~/modules/auth/service.server";
import { AppError, handleError } from "~/utils/error";
import { QUERY_KEY, failure, getSearchParams, safeRedirect } from "~/utils/http";
import { robot } from "~/utils/robot";
import type { Route } from "./+types/route";

export const meta: MetaFunction = () => {
  return robot.private;
};

export async function loader({ request, context }: Route.LoaderArgs) {
  if (context.isAuthenticated) {
    throw redirect("/");
  }

  const searchParams = getSearchParams(request);
  const code = searchParams.get("code");

  try {
    if (!code) {
      throw new AppError({
        cause: null,
        status: 400,
        message: "Missing code to exchange",
        label: "Bad request 🚫",
      });
    }

    const { error, data } = await getSupabaseServerClient(context).auth.exchangeCodeForSession(code);

    if (error) {
      throw error;
    }

    await serverDb
      .insert(serverDb.schema.user)
      .values({
        id: data.user.id as UserId,
        username: data.user.user_metadata["preferred_username"] || data.user.user_metadata["username"],
        fullName: data.user.user_metadata["full_name"],
        avatarUrl: data.user.user_metadata["avatar_url"],
      })
      .onConflictDoNothing();

    context.setAuthSession(makeAuthSession(data.session));

    throw redirect(safeRedirect(searchParams.get(QUERY_KEY.redirectTo)));
  } catch (cause) {
    const reason = handleError(cause);
    return failure(reason);
  }
}

export default function View({ loaderData }: Route.ComponentProps) {
  const { failure } = loaderData;

  return <div>{JSON.stringify(failure, null, 2)}</div>;
}
