/**
 * Here you can write any seeding code you want to use in the playground
 * It will be executed first before your playground code
 * 💡Tip: you can use the `$` global variable to access goodies
 */

import { sql } from "drizzle-orm";

import { db } from "./db";

await db.execute(sql`
create or replace function auth.uid() returns uuid as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$ language sql stable;
`);

await db.execute(sql`
GRANT postgres TO authenticated;
`);
