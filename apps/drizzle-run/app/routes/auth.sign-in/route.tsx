import { redirect } from "@remix-run/node";
import { type MetaFunction, useLoaderData } from "@remix-run/react";

import { getSupabaseServerClient } from "~/integrations/supabase/client.server";
import { env } from "~/utils/env";
import { handleError } from "~/utils/error";
import {
  QUERY_KEY,
  error,
  path,
  getSearchParams,
  safeRedirect,
} from "~/utils/http";
import { robot } from "~/utils/robot";

export const meta: MetaFunction = () => {
  return robot.private;
};

export async function loader({ request, context }: LoaderFunctionArgs) {
  const redirectTo = safeRedirect(
    getSearchParams(request).get(QUERY_KEY.redirectTo),
  );

  if (context.isAuthenticated) {
    throw redirect(redirectTo);
  }

  try {
    const { data, error } = await getSupabaseServerClient(
      context,
    ).auth.signInWithOAuth({
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
    return error(reason);
  }
}

export default function AuthSignIn() {
  const { error } = useLoaderData<typeof loader>();

  return <div>{JSON.stringify(error, null, 2)}</div>;
}
