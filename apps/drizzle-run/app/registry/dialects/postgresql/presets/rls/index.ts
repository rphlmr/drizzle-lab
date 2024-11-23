/**
 * Write your code here
 * 💡Tip: you can use the `$` global variable to access goodies
 */

import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";

import { db as admin } from "./db";
import * as schema from "./schema";
import { createDrizzle } from "./utils";

const userId1 = $.random.uuid();
const userId2 = $.random.uuid();

const client = drizzle({
  client: admin.$client,
  schema,
  casing: "snake_case",
});

const db = createDrizzle({ role: "authenticated", sub: userId1 }, { admin, client });

await db.admin.insert(schema.authUsers).values([
  {
    id: userId1,
  },
  {
    id: userId2,
  },
]);

await db.admin.insert(schema.profiles).values({
  id: userId1,
  email: "demo@mail.com",
});

console.log(
  "insert allowed",
  await db.rls(async (tx) => tx.insert(schema.rooms).values({ topic: "user room" }).returning()),
);

console.log(
  "user can not edit other profile. Before",
  await db.admin.query.profiles.findMany(),
  await db.rls(async (tx) => {
    await tx.update(schema.profiles).set({ email: "nope" }).where(eq(schema.profiles.id, userId2));
  }),
  "after",
  await db.admin.query.profiles.findMany(),
);

const dbAnonymous = createDrizzle({ role: "anon" }, { admin, client });

console.log("anonymous can not read");
console.log(await dbAnonymous.rls(async (tx) => tx.select().from(schema.rooms)));
