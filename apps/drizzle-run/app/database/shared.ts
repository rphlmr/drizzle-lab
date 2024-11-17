import { createId } from "@paralleldrive/cuid2";
import { jsonb, text, timestamp, uuid } from "drizzle-orm/pg-core";

import type { PlaygroundId, UserId } from "~/database/types";
import { now } from "~/database/utils";
import { dialects, type UserPlaygroundFileTree } from "~/registry";

export const anonymousCreatorId =
  "00000000-0000-0000-0000-000000000000" as UserId;

export const playgroundColumns = {
  id: text("id")
    .$type<PlaygroundId>()
    .primaryKey()
    .notNull()
    .$defaultFn(() => createId() as PlaygroundId),
  name: text("name").notNull(),
  description: text("description"),
  dialect: text("dialect", { enum: dialects }).notNull(),
  content: jsonb("content").$type<UserPlaygroundFileTree>().notNull(),
  creatorId: uuid("creator_id")
    .$type<UserId>()
    .$defaultFn(() => anonymousCreatorId),
  createdAt: timestamp("created_at", {
    mode: "string",
    precision: 3,
  })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", {
    mode: "string",
    precision: 3,
  })
    .notNull()
    .$onUpdate(now),
  forkedFromId: text("forked_from_id").$type<PlaygroundId>(),
};
