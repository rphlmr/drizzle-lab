/**
 * Write your code here
 * 💡Tip: you can use the `$` global variable to access goodies
 */

import { db } from "./db";
import {} from "./schema";

// 💡 This playground run a seed code in the Seed tab

const result = await db.query.users.findMany({
  with: {
    posts: true,
  },
});

console.log(result);
