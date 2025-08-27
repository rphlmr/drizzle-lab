import type { href } from "react-router";

interface RouteComponentProps {
  matches: Array<{ id: string; data: unknown } | undefined>;
}

declare global {
  type Prettify<T> = {
    [K in keyof T]: T[K];
    // eslint-disable-next-line @typescript-eslint/ban-types
  } & {};

  type RoutePath = Parameters<typeof href>[0];

  /**
   * Helper type to extract matching route IDs from a Route type.
   * Usage: RouteIdMatch<Route.ComponentProps>
   */
  type RouteIdMatch<T extends RouteComponentProps> = Extract<
    NonNullable<T["matches"][number]>,
    { id: string } & { data: {} }
  >["id"];

  type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
  };

  type PartialValues<T> = {
    [P in keyof T]: DeepPartial<T[P]>;
  };
}
