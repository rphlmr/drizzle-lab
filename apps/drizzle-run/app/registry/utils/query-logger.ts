import type { Query } from "drizzle-orm/sql";

export type QueryLog = Query & {
  type: "query-log";
};

export function isQueryLog(data: unknown): data is QueryLog {
  return data != null && (data as QueryLog).type === "query-log";
}
