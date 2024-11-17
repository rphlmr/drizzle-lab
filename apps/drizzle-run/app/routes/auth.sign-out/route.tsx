import { redirect } from "@remix-run/node";
import type { MetaFunction } from "@remix-run/react";

import { robot } from "~/utils/robot";

export const meta: MetaFunction = () => {
  return robot.private;
};

export async function action({ context }: ActionFunctionArgs) {
  context.destroyAuthSession();

  throw redirect("/");
}

export default function SignOut() {
  return null;
}
