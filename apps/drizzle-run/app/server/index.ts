import { createHonoServer } from "react-router-hono-server/node";
import { session } from "remix-hono/session";

import { getLoadContext } from "./context";
import { refreshSession } from "./middleware";
import { createSessionStorage } from "./session";

export default createHonoServer({
  getLoadContext,
  configure(server) {
    server.use(
      session({
        autoCommit: true,
        createSessionStorage() {
          const sessionStorage = createSessionStorage();

          return {
            ...sessionStorage,
            // If a user doesn't come back to the app within 30 days, their session will be deleted.
            commitSession(session) {
              return sessionStorage.commitSession(session, {
                maxAge: 60 * 60 * 24 * 365, // 1 year
              });
            },
          };
        },
      })
    );

    server.use(refreshSession());
  },
});
