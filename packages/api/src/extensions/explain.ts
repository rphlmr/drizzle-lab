import type { View, Table } from "drizzle-orm";

import type { JsonShapeDescription } from "./drizzle.lab";
import { DrizzleLab } from "./symbols";

/**
 * Extend a table or a view with additional descriptions that can be used to generate documentation.
 */
export function explain<
  T extends Table | View,
  Columns extends T extends Table
    ? T["_"]["columns"]
    : T extends View
      ? T["_"]["selectedFields"]
      : never,
>(
  tableOrView: T,
  explain: T extends Table
    ? {
        /**
         * A description of the table.
         */
        description?: string;
        /**
         * A description of each column in the table.
         */
        columns?: {
          [K in keyof Columns]?: string;
        };
        /**
         * A description of each JSON column in the table.
         */
        jsonShapes?: {
          [K in keyof T["_"]["columns"] as T["_"]["columns"][K]["dataType"] extends "json"
            ? K
            : never]: JsonShapeDescription<T["_"]["columns"][K]["_"]["data"]>;
        };
      }
    : {
        /**
         * A description of the table.
         */
        description?: string;
        /**
         * A description of each column in the table.
         */
        columns?: {
          [K in keyof Columns]?: string;
        };
      },
) {
  tableOrView[DrizzleLab] = { explain };
  return tableOrView;
}
