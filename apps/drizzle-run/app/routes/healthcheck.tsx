// learn more: https://fly.io/docs/reference/configuration/#services-http_checks
import { sql } from "drizzle-orm";

import { serverDb } from "~/database/.server/db";
import { AppError } from "~/utils/error";
import { failure, success } from "~/utils/http";

export async function loader() {
  try {
    await serverDb.execute(sql`select count(*) from ${serverDb.schema.user}`);
    return success({ status: "ok" });
  } catch (cause) {
    return failure(
      new AppError({
        cause,
        message: "Healthcheck failed",
        label: "Healthcheck 🏥",
      })
    );
  }
}
