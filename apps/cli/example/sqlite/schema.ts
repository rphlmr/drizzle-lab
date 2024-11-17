import { randomUUID } from "crypto";

import { explain } from "@drizzle-lab/api/extensions";
import { relations, sql, getTableColumns } from "drizzle-orm";
import {
  integer,
  sqliteTable,
  text,
  foreignKey,
  primaryKey,
  check,
  sqliteView,
} from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name"),
});

explain(users, {
  description: "My super Users table",
  columns: {
    id: "Auto incrementing ID",
  },
});

export const usersRelations = relations(users, ({ many }) => ({
  author: many(posts, { relationName: "author" }),
  reviewer: many(posts, { relationName: "reviewer" }),
}));

function generateSlug() {
  return randomUUID();
}

type PostMetadata = {
  source: "mobile_app" | "web_app";
  value: {
    id: string;
    tags: string[];
  };
};

export const posts = sqliteTable(
  "posts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    slug: text("slug")
      .notNull()
      .$default(() => generateSlug()),
    status: text("status", { enum: ["draft", "published"] })
      .default("draft")
      .notNull(),
    content: text("content"),
    public: integer({ mode: "boolean" }),
    authorId: integer("author_id")
      .references(() => users.id)
      .notNull(),
    reviewerId: integer("reviewer_id"),
    createdAt: integer("created_at", {
      mode: "timestamp_ms",
    }).default(sql`(CURRENT_TIMESTAMP)`),
    metadata: text("metadata", { mode: "json" }).$type<PostMetadata>(),
  },
  (t) => ({
    pk: primaryKey({ name: "my pk", columns: [t.id, t.slug] }),
    fk: foreignKey({
      name: "my fk",
      columns: [t.authorId],
      foreignColumns: [users.id],
    }),
    check: check("not draft", sql`status <> 'draft'`),
  }),
);

explain(posts, {
  description: "My Posts table is awesome",
  columns: {
    id: "Auto incrementing ID",
  },
  jsonShapes: {
    metadata: {
      source: "mobile_app | web_app",
      value: {
        id: "string",
        tags: "string[]",
      },
    },
  },
});

export const postsView = sqliteView("posts_view").as((qb) =>
  qb
    .select({
      ...getTableColumns(posts),
    })
    .from(posts),
);

explain(postsView, {
  description: "Posts view",
  columns: {
    id: "Auto incrementing ID",
  },
});

export const postsRelations = relations(posts, ({ one }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
    relationName: "author",
  }),
  reviewer: one(users, {
    fields: [posts.reviewerId],
    references: [users.id],
    relationName: "reviewer",
  }),
}));
