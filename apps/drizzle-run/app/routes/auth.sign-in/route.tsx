import { type MetaFunction, redirect } from "react-router";
import { getSupabaseServerClient } from "~/integrations/supabase/client.server";
import { env } from "~/utils/env";
import { handleError } from "~/utils/error";
import { path, QUERY_KEY, failure, getSearchParams, safeRedirect } from "~/utils/http";
import { robot } from "~/utils/robot";
import type { Route } from "./+types/route";

export const meta: MetaFunction = () => {
  return robot.private;
};

export async function loader({ request, context }: Route.LoaderArgs) {
  const redirectTo = safeRedirect(getSearchParams(request).get(QUERY_KEY.redirectTo));

  if (context.isAuthenticated) {
    throw redirect(redirectTo);
  }

  try {
    const { data, error } = await getSupabaseServerClient(context).auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: path(`${env.APP_URL}/auth/callback`, {
          [QUERY_KEY.redirectTo]: redirectTo,
        }),
      },
    });

    if (error) {
      throw error;
    }

    throw redirect(data.url);
  } catch (cause) {
    const reason = handleError(cause);
    return failure(reason);
  }
}

export default function View({ loaderData }: Route.ComponentProps) {
  const { failure } = loaderData;

  return <div>{JSON.stringify(failure, null, 2)}</div>;
}
