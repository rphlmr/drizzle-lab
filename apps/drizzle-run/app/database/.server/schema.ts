import { type SQL, sql } from "drizzle-orm";
import {
  customType,
  index,
  pgSchema,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { playgroundColumns } from "~/database/shared";
import type { UserId } from "~/database/types";

/* -- Supabase -- */
// 💡 We are not creating any schema here, just declaring it to be able to reference user id

const SupabaseAuthSchema = pgSchema("auth");

const SupabaseAuthUsers = SupabaseAuthSchema.table("users", {
  id: uuid("id").primaryKey().notNull(),
});

/* -- Drizzle Run -- */

/* -- User -- */

const user = pgTable(
  "user",
  {
    id: uuid("id")
      .$type<UserId>()
      .primaryKey()
      .notNull()
      .references(() => SupabaseAuthUsers.id, { onDelete: "cascade" }),
    username: text("username").notNull().unique(),
    fullName: text("full_name"),
    avatarUrl: text("avatar_url"),
    joinedAt: timestamp("joined_at", {
      mode: "string",
      precision: 3,
    })
      .notNull()
      .defaultNow(),
  },
  (table) => {
    return {
      usernameIdx: index("username_idx").on(table.username),
    };
  },
);

/* -- Playground -- */
const tsVector = customType<{ data: string }>({
  dataType() {
    return "tsvector";
  },
});

const playground = pgTable(
  "playground",
  {
    ...playgroundColumns,
    fts: tsVector("fts").generatedAlwaysAs(
      (): SQL =>
        sql`to_tsvector('english',coalesce(${playground.name}, '') || ' ' || coalesce(${playground.description}, ''))`,
    ),
    creatorId: uuid("creator_id")
      .$type<UserId>()
      .references(() => user.id, { onDelete: "set null" }),
  },
  (table) => {
    return {
      dialectIdx: index("dialect_idx").on(table.dialect),
      playgroundSearchIndex: index("playground_search_index").using(
        "gin",
        table.fts,
      ),
    };
  },
);

export { user, playground };
