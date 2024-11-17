import { relations } from "drizzle-orm";

import { playground, user } from "./schema";

/* -- User -- */

const userRelations = relations(user, ({ many }) => ({
  playgrounds: many(playground),
}));

/* -- Playground -- */

const playgroundRelations = relations(playground, ({ one }) => ({
  creator: one(user, {
    fields: [playground.creatorId],
    references: [user.id],
  }),
  forkedFrom: one(playground, {
    fields: [playground.forkedFromId],
    references: [playground.id],
  }),
}));

export { userRelations, playgroundRelations };
