import { randomUUID } from "crypto";

import { explain } from "@drizzle-lab/api/extensions";
import { sql, getTableColumns } from "drizzle-orm";
import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  jsonb,
  foreignKey,
  primaryKey,
  check,
  pgView,
} from "drizzle-orm/pg-core";

import { users } from "../../package-users/database/schema";

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

export const posts = pgTable(
  "posts",
  {
    id: serial("id"),
    slug: text("slug")
      .notNull()
      .$default(() => generateSlug()),
    status: text("status", { enum: ["draft", "published", "archived"] })
      .default("draft")
      .notNull(),
    content: text("content"),
    authorId: integer("author_id")
      .references(() => users.id)
      .notNull(),
    reviewerId: integer("reviewer_id"),
    createdAt: timestamp("created_at", {
      mode: "string",
      precision: 3,
    }).defaultNow(),
    metadata: jsonb("metadata").$type<PostMetadata>(),
  },
  (t) => [
    primaryKey({ name: "my pk", columns: [t.id, t.slug] }),
    foreignKey({
      name: "my fk",
      columns: [t.authorId],
      foreignColumns: [users.id],
    }),
    check("not draft", sql`status <> 'draft'`),
  ],
).enableRLS();

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

export const postsView = pgView("posts_view")
  .with({
    securityInvoker: true,
  })
  .as((qb) =>
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

export const postsViewUnsecured = pgView("posts_view_unsecured").as((qb) =>
  qb
    .select({
      ...getTableColumns(posts),
    })
    .from(posts),
);