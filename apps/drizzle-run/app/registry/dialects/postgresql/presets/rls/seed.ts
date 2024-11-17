/**
 * Here you can write any seeding code you want to use in the playground
 * It will be executed first before your playground code
 * 💡Tip: you can use the `$` global variable to access goodies
 */

import { db } from "./db";
import { posts, users } from "./schema";

/* ------------------------------- Create user ------------------------------ */

const [{ userId }] = await db
  .insert(users)
  .values({
    name: $.random.fullName(),
  })
  .returning({ userId: users.id });

/* ------------------------------- Create post ------------------------------ */

await db.insert(posts).values({
  authorId: userId,
  content: $.random.lorem(),
});
