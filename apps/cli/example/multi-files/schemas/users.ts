import { explain } from "@drizzle-lab/api/extensions";
import { pgTable, serial, text } from "drizzle-orm/pg-core";

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
