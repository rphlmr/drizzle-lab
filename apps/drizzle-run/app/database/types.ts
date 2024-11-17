import type * as clientSchema from "~/database/.client/schema";
import type * as serverSchema from "~/database/.server/schema";

/* -- Brands -- */
export type UserId = Brand<string, "UserId">;
export type PlaygroundId = Brand<string, "PlaygroundId">;

/* -- Models -- */
export type User = typeof serverSchema.user.$inferSelect;
export type Playground = Omit<
  typeof serverSchema.playground.$inferSelect,
  "fts"
> &
  typeof clientSchema.playground.$inferSelect;
