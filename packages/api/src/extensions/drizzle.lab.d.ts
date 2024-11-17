import type { Config } from "drizzle-kit";
import type { Column, TableConfig } from "drizzle-orm";

import type { DrizzleLab } from "./symbols";

export type JsonShapeDescription<T> = T extends object
  ? T extends Array<any>
    ? `${string}[]`
    : { [K in keyof T]: JsonShapeDescription<T[K]> }
  : T extends number
    ? "number"
    : T extends boolean
      ? "boolean"
      : string;

declare module "drizzle-orm" {
  interface Table<
    T extends TableConfig = TableConfig<Column<any, object, object>>,
  > {
    [DrizzleLab]?: {
      /**
       * Documentation for the table.
       */
      explain?: {
        /**
         * A description of the table.
         */
        description?: string;
        /**
         * A description of each column in the table.
         */
        columns?: {
          [K in keyof T["columns"]]?: string;
        };
        /**
         * A description of each JSON column in the table.
         */
        jsonShapes?: {
          [K in keyof T["columns"] as T["columns"][K]["dataType"] extends "json"
            ? K
            : never]: JsonShapeDescription<T["columns"][K]["_"]["data"]>;
        };
      };
    };
  }
  interface View<
    T extends TableConfig = TableConfig<Column<any, object, object>>,
  > {
    [DrizzleLab]?: {
      /**
       * Documentation for the table.
       */
      explain?: {
        /**
         * A description of the table.
         */
        description?: string;
        /**
         * A description of each column in the table.
         */
        columns?: {
          [K in keyof T["columns"]]?: string;
        };
        /**
         * A description of each JSON column in the table.
         */
        jsonShapes?: {
          [K in keyof T["columns"] as T["columns"][K]["dataType"] extends "json"
            ? K
            : never]: JsonShapeDescription<T["columns"][K]["_"]["data"]>;
        };
      };
    };
  }
}

type LabExtendedConfig = Config & {
  /**
   * Configuration extension for Drizzle Lab.
   */
  lab?: {
    /**
     * A unique identifier for the project in Drizzle Lab.
     *
     * It is used to uniquely identify saved projects configurations
     *
     * It defaults to the name of the project directory.
     */
    projectId?: string;
  };
};

declare module "drizzle-kit" {
  declare function defineConfig(config: LabExtendedConfig): LabExtendedConfig;
}
