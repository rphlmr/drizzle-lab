import { type MetaFunction, redirect } from "react-router";
import { robot } from "~/utils/robot";
import type { Route } from "./+types/route";

export const meta: MetaFunction = () => {
  return robot.private;
};

export function action({ context }: Route.ActionArgs) {
  context.destroyAuthSession();

  throw redirect("/");
}

export default function View() {
  return null;
}
