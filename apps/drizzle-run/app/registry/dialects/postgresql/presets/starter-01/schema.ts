/**
 * This is the schema for the database.
 * 💡Tip: you can use the `$` global variable to access goodies
 * Do not forget to `export` your tables 😅
 */

import { relations } from "drizzle-orm";
import { integer, text, pgTable, timestamp, AnyPgColumn } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  name: text().notNull(),
  createdAt: timestamp("created_at", { precision: 3 }).notNull().defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
}));

export const posts = pgTable("posts", {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  content: text().notNull(),
  authorId: integer("author_id")
    .notNull()
    .references((): AnyPgColumn => users.id),
  createdAt: timestamp("created_at", { precision: 3 }).notNull().defaultNow(),
});

export const postsRelations = relations(posts, ({ one }) => ({
  author: one(users, { fields: [posts.authorId], references: [users.id] }),
}));
