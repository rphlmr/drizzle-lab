/**
 * Here you can write any seeding code you want to use in the playground
 * It will be executed first before your playground code
 * 💡Tip: you can use the `$` global variable to access goodies
 */

import { seed } from "drizzle-seed";

import { db } from "./db";
import { posts, users } from "./schema";

// doc: https://orm.drizzle.team/docs/seed-overview
// @ts-ignore - temporary fix for drizzle-seed
await seed(db, { posts, users });
