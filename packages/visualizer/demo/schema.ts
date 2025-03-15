import { getTableColumns, relations, sql } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import {
  check,
  foreignKey,
  integer,
  jsonb,
  numeric,
  pgTable,
  pgView,
  primaryKey,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name"),
});

export const usersRelations = relations(users, ({ many }) => ({
  author: many(posts, { relationName: "author" }),
  reviewer: many(posts, { relationName: "reviewer" }),
}));

function generateSlug() {
  return Math.random().toString(36).substring(2, 15);
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
  ]
).enableRLS();

export const postsView = pgView("posts_view")
  .with({
    securityInvoker: true,
  })
  .as((qb) =>
    qb
      .select({
        ...getTableColumns(posts),
      })
      .from(posts)
  );

export const postsViewUnsecured = pgView("posts_view_unsecured").as((qb) =>
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

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  description: text("description"),
  categoryId: integer("category_id").references(() => categories.id),
});

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  parentId: integer("parent_id").references((): AnyPgColumn => categories.id),
});

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  status: text("status", {
    enum: ["pending", "processing", "shipped", "delivered"],
  }).notNull(),
  orderDate: timestamp("order_date").defaultNow(),
});

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id")
    .references(() => orders.id)
    .notNull(),
  productId: integer("product_id")
    .references(() => products.id)
    .notNull(),
  quantity: integer("quantity").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
});

export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  productId: integer("product_id")
    .references(() => products.id)
    .notNull(),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const inventory = pgTable("inventory", {
  id: serial("id").primaryKey(),
  productId: integer("product_id")
    .references(() => products.id)
    .notNull(),
  quantity: integer("quantity").notNull(),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

export const suppliers = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  contactPerson: text("contact_person"),
  email: text("email"),
  phone: text("phone"),
});

export const productSuppliers = pgTable("product_suppliers", {
  id: serial("id").primaryKey(),
  productId: integer("product_id")
    .references(() => products.id)
    .notNull(),
  supplierId: integer("supplier_id")
    .references(() => suppliers.id)
    .notNull(),
  cost: numeric("cost", { precision: 10, scale: 2 }).notNull(),
});

export const shippingAddresses = pgTable("shipping_addresses", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  address: text("address").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  country: text("country").notNull(),
  postalCode: text("postal_code").notNull(),
});

export const promotions = pgTable("promotions", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  discountPercentage: numeric("discount_percentage", {
    precision: 5,
    scale: 2,
  }).notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
});

export const wishlist = pgTable("wishlist", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  productId: integer("product_id")
    .references(() => products.id)
    .notNull(),
  addedAt: timestamp("added_at").defaultNow(),
});

export const productTags = pgTable("product_tags", {
  id: serial("id").primaryKey(),
  productId: integer("product_id")
    .references(() => products.id)
    .notNull(),
  tag: text("tag").notNull(),
});

export const tableWithLongColumnName1 = pgTable("table_with_long_column_name_1", {
  id: serial("id").primaryKey(),
  thisIsAReallyLongColumnNameThatIsExactlySixtyFourCharactersLong: text(
    "this_is_a_really_long_column_name_that_is_exactly_sixty_four_characters_long"
  ),
  authorId: integer("author_id")
    .references(() => users.id)
    .notNull(),
});

export const tableWithLongColumnName2 = pgTable("table_with_long_column_name_2", {
  id: serial("id").primaryKey(),
  anotherExtremelyLongColumnNameThatIsAlsoSixtyFourCharactersLong: integer(
    "another_extremely_long_column_name_that_is_also_sixty_four_characters_long"
  ),
  authorId: integer("author_id")
    .references(() => users.id)
    .notNull(),
});
