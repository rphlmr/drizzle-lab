import { randomUUID } from "crypto";

import { explain } from "@drizzle-lab/api/extensions";
import { relations, sql, getTableColumns } from "drizzle-orm";
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

import { info } from "@/example/pg/external";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
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

export const posts = pgTable(
  "posts",
  {
    id: serial("id"),
    slug: text("slug")
      .notNull()
      .$default(() => generateSlug()),
    status: text("status", { enum: ["draft", "published"] })
      .default("draft")
      .notNull(),
    content: text("content").$defaultFn(() => info),
    authorId: integer("author_id")
      .references(() => users.id)
      .notNull(),
    reviewerId: integer("reviewer_id"),
    createdAt: timestamp("created_at", {
      mode: "string",
      precision: 3,
    }).defaultNow(),
    metadata: jsonb("metadata").$type<PostMetadata>(),
    metadata2: jsonb("metadata2")
      .$type<PostMetadata>()
      .default({
        source: "mobile_app",
        value: {
          id: "123",
          tags: ["tag1", "tag2"],
        },
      }),
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
    metadata2: {
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
