import { randomUUID } from "crypto";

import { relations, sql, getTableColumns } from "drizzle-orm";
import {
  mysqlTable,
  serial,
  text,
  int,
  timestamp,
  json,
  foreignKey,
  primaryKey,
  check,
  mysqlView,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  name: text("name"),
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

export const posts = mysqlTable(
  "posts",
  {
    id: serial("id"),
    slug: text("slug")
      .notNull()
      .$default(() => generateSlug()),
    status: text("status", { enum: ["draft", "published"] })
      .default("draft")
      .notNull(),
    content: text("content"),
    authorId: int("author_id")
      .references(() => users.id)
      .notNull(),
    reviewerId: int("reviewer_id"),
    createdAt: timestamp("created_at", {
      mode: "string",
    }).defaultNow(),
    metadata: json("metadata").$type<PostMetadata>(),
    metadata2: json("metadata2")
      .$type<PostMetadata>()
      .default({
        source: "mobile_app",
        value: {
          id: "123",
          tags: ["tag1", "tag2"],
        },
      }),
  },
  (t) => ({
    p: primaryKey({ name: "my pk", columns: [t.id, t.slug] }),
    f: foreignKey({
      name: "my fk",
      columns: [t.authorId],
      foreignColumns: [users.id],
    }),
    c: check("not draft", sql`status <> 'draft'`),
  })
);
export const postsView = mysqlView("posts_view").as((qb) =>
  qb
    .select({
      ...getTableColumns(posts),
    })
    .from(posts)
);

export const postsViewUnsecured = mysqlView("posts_view_unsecured").as((qb) =>
  qb
    .select({
      ...getTableColumns(posts),
    })
    .from(posts)
);

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
