# @drizzle-lab/api

Fork of Drizzle Kit API - Enhanced with features for schema documentation and visualization.

> [!IMPORTANT]
> This package is a community project based on Drizzle Kit.
> 
> I recommend using [Drizzle Kit](https://github.com/drizzle-team/drizzle-kit) as much as possible.


## Installation

  ```bash
  npm install @drizzle-lab/api
  ```

## Features

- 🔄 Import schema from files or database
- 📝 Document your schema with JSDoc-like syntax
- 📸 Generate snapshot from Drizzle objects
- 🎨 Generate SQL from schema
- 📊 Generate TypeScript from schema
- 🎯 Support for PostgreSQL, MySQL and SQLite

## API Reference

### Extensions

Document your schema with the `explain` function.

Works for tables and views.

  ```typescript
  import { explain } from "@drizzle-lab/api/extensions";
  import { pgTable, text, jsonb } from "drizzle-orm/pg-core";

  export const users = pgTable("users", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    metadata: jsonb("metadata").$type<{ role: string }>(),
  });
  
  explain(users, {
    description: "Users table storing core user information",
    columns: {
      id: "Unique identifier for the user",
      name: "User's full name",
      metadata: "Additional user metadata stored as JSON",
    },
    jsonShapes: {
      metadata: {
        role: "string",
      },
    },
  });
  ```

### PostgreSQL API

Import and transform PostgreSQL schemas:

  ```typescript
  import { importDrizzleConfig } from "@drizzle-lab/api/config/node";
  import { importFromFiles } from "@drizzle-lab/api/pg/node";
  import { 
    importFromDatabase, 
    schemaToSql, 
    snapshotToTypeScript,
    drizzleObjectsToSnapshot
  } from "@drizzle-lab/api/pg";

  // Import schema from config
  const config = await importDrizzleConfig();
  const drizzleObjects = await importFromFiles(config.schema);

  // Import schema from database
  const snapshot = drizzleObjectsToSnapshot(drizzleObjects, config);

  // Generate SQL
  const sql = schemaToSql(schema);

  // Generate TypeScript
  const ts = snapshotToTypeScript(snapshot, "preserve");
  ```

### MySQL API

Import and transform MySQL schemas:

  ```typescript
  import { importDrizzleConfig } from "@drizzle-lab/api/config/node";
  import { importFromFiles } from "@drizzle-lab/api/mysql/node";
  import { 
    importFromDatabase, 
    schemaToSql, 
    snapshotToTypeScript,
    drizzleObjectsToSnapshot
  } from "@drizzle-lab/api/mysql";

  // Import schema from config
  const config = await importDrizzleConfig();
  const drizzleObjects = await importFromFiles(config.schema);

  // Generate snapshot
  const snapshot = drizzleObjectsToSnapshot(drizzleObjects, config);
      
  // Generate SQL
  const sql = schemaToSql(schema);

  // Generate TypeScript
  const ts = snapshotToTypeScript(snapshot, "preserve");
  ```

### SQLite API

Import and transform SQLite schemas:

  ```typescript
  import { importDrizzleConfig } from "@drizzle-lab/api/config/node";
  import { importFromFiles } from "@drizzle-lab/api/sqlite/node";
  import { 
    importFromDatabase, 
    schemaToSql, 
    snapshotToTypeScript,
    drizzleObjectsToSnapshot
  } from "@drizzle-lab/api/sqlite";

  // Import schema from config
  const config = await importDrizzleConfig();
  const drizzleObjects = await importFromFiles(config.schema);

  // Generate snapshot
  const snapshot = drizzleObjectsToSnapshot(drizzleObjects, config);

  // Generate SQL
  const sql = schemaToSql(schema);

  // Generate TypeScript
  const ts = snapshotToTypeScript(snapshot, "preserve");
  ```

### (Optional) Extended Config

  ```typescript
  export default defineConfig({
    // ...
    lab: {
      projectId: "drizzle-lab", // optional, defaults to "drizzle-lab". Used to identify the project in json output
    },
  });
  ```

## Environment Variables
They are all optional.

| Variable | Description | Default |
|----------|-------------|---------|
| `DRIZZLE_LAB_DEBUG` | Enable debug logging | `false` |
| `DRIZZLE_LAB_CWD` | Working directory | `""` |
| `DRIZZLE_LAB_CONFIG_PATH` | Path to config file | `drizzle.config.ts` |
| `DRIZZLE_LAB_SAVE_DIR` | Directory to save output | `./drizzle` |
| `DRIZZLE_LAB_PROJECT_ID` | Project ID to identify the project in json output | `drizzle-lab` |
| `TS_CONFIG_PATH` | Path to tsconfig.json | `./tsconfig.json` |

## License

MIT
