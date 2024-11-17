// learn more: https://fly.io/docs/reference/configuration/#services-http_checks
import { json } from "@remix-run/node";
import { sql } from "drizzle-orm";

import { serverDb } from "~/database/.server/db";
import { AppError } from "~/utils/error";
import { data, error } from "~/utils/http";

export async function loader() {
  try {
    await serverDb.execute(sql`select count(*) from ${serverDb.schema.user}`);
    return json(data({ status: "ok" }));
  } catch (cause) {
    return json(
      error(
        new AppError({
          cause,
          message: "Healthcheck failed",
          label: "Healthcheck 🏥",
        }),
      ),
      {
        status: 500,
      },
    );
  }
}
