import { sql } from "drizzle-orm/sql";

export function now() {
  return sql<string>`now()`;
}
