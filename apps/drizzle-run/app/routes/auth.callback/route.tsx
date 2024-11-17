import { redirect } from "@remix-run/node";
import { type MetaFunction, useLoaderData } from "@remix-run/react";

import { serverDb } from "~/database/.server/db";
import type { UserId } from "~/database/types";
import { getSupabaseServerClient } from "~/integrations/supabase/client.server";
import { makeAuthSession } from "~/modules/auth/service.server";
import { AppError, handleError } from "~/utils/error";
import { QUERY_KEY, error, getSearchParams, safeRedirect } from "~/utils/http";
import { robot } from "~/utils/robot";

export const meta: MetaFunction = () => {
  return robot.private;
};

export async function loader({ request, context }: LoaderFunctionArgs) {
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

    const { error, data } =
      await getSupabaseServerClient(context).auth.exchangeCodeForSession(code);

    if (error) {
      throw error;
    }

    await serverDb
      .insert(serverDb.schema.user)
      .values({
        id: data.user.id as UserId,
        username:
          data.user.user_metadata["preferred_username"] ||
          data.user.user_metadata["username"],
        fullName: data.user.user_metadata["full_name"],
        avatarUrl: data.user.user_metadata["avatar_url"],
      })
      .onConflictDoNothing();

    context.setAuthSession(makeAuthSession(data.session));

    throw redirect(safeRedirect(searchParams.get(QUERY_KEY.redirectTo)));
  } catch (cause) {
    const reason = handleError(cause);
    return error(reason);
  }
}

export default function AuthCallback() {
  const { error } = useLoaderData<typeof loader>();

  return <div>{JSON.stringify(error, null, 2)}</div>;
}
