import { sql, eq, getTableColumns } from "drizzle-orm";
import {
  bigint,
  foreignKey,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  pgPolicy,
  pgView,
  pgSchema,
  pgRole,
} from "drizzle-orm/pg-core";

/* ------------------------------ Supabase emulation ------------------------------ */

export const anonRole = pgRole("anon");
export const authenticatedRole = pgRole("authenticated");
export const serviceRole = pgRole("service_role");
export const supabaseAuthAdminRole = pgRole("supabase_auth_admin");
export const auth = pgSchema("auth");
export const authUsers = auth.table("users", {
  id: uuid().primaryKey().notNull(),
});
const authUid = sql`(select auth.uid())`;

/* ------------------------------ public schema; ------------------------------ */

export const rooms = pgTable(
  "rooms",
  {
    id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
    topic: text().notNull(),
  },
  (table) => [
    unique("rooms_topic_key").on(table.topic),
    pgPolicy("authenticated can read rooms", {
      for: "select",
      to: authenticatedRole,
      using: sql`true`,
    }),
    pgPolicy("authenticated can add rooms", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`true`,
    }),
  ],
);

export const profiles = pgTable(
  "profiles",
  {
    id: uuid()
      .primaryKey()
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    email: text().notNull(),
  },
  (table) => [
    pgPolicy("authenticated can view all profiles", {
      for: "select",
      to: authenticatedRole,
      using: sql`true`,
    }),
    pgPolicy("owner can update profile", {
      for: "update",
      to: authenticatedRole,
      using: eq(table.id, authUid),
      withCheck: eq(table.id, authUid),
    }),
  ],
);

export const roomsUsers = pgTable(
  "rooms_users",
  {
    userId: uuid().notNull(),
    roomTopic: text().notNull(),
    joinedAt: timestamp({
      mode: "string",
      precision: 3,
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [authUsers.id],
      name: "rooms_users_user_id_fk",
    }),
    foreignKey({
      columns: [table.roomTopic],
      foreignColumns: [rooms.topic],
      name: "rooms_users_room_topic_fk",
    }),
    pgPolicy("authenticated can read rooms_users", {
      for: "select",
      to: authenticatedRole,
      using: sql`true`,
    }),
    pgPolicy("authenticated can add rooms_users", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`true`,
    }),
  ],
);

export const roomsUsersProfiles = pgView("rooms_users_profiles")
  .with({
    securityInvoker: true,
  })
  .as((qb) =>
    qb
      .select({
        ...getTableColumns(roomsUsers),
        email: profiles.email,
      })
      .from(roomsUsers)
      .innerJoin(profiles, eq(roomsUsers.userId, profiles.id)),
  );
