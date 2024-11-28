# Drizzle Lab CLI

## Commands

### `npx drizzle-lab visualizer`

```sh
Usage:
  Drizzle Lab CLI visualizer [flags]

Flags:
  -c, --config string       Path to drizzle config file
      --debug               Enable log output (default: false)
      --save-dir string     Directory to save the visualizer data (default: ".drizzle")
      --project-id string   A unique identifier for the current visualized project. It is used as filename to save the visualizer state. (default: "visualizer")
      --ts-config string    Path to tsconfig.json. It is used to resolve TypeScript paths aliases. (default: "./tsconfig.json")
  -p, --port number         Port to run visualizer on (default: 64738)
  -e, --env-path string     Path to a .env file

Global flags:
  -h, --help      help for visualizer
  -v, --version   version for Drizzle Lab CLI
```

### `npx drizzle-lab generate`

```sh
Usage:
  Drizzle Lab CLI generate [command]

Available Commands:
  snapshot   Generate the snapshot for the current schema
  sql        Generate the SQL for the current schema

Flags:
  -c, --config string   Path to drizzle config file
      --debug           Enable log output (default: false)

Global flags:
  -h, --help      help for generate
  -v, --version   version for Drizzle Lab CLI
```

### `npx drizzle-lab`

```sh
Usage:
  Drizzle Lab CLI [command]

Available Commands:
  visualizer   
  generate     

Flags:
  -h, --help      help for Drizzle Lab CLI
  -v, --version   version for Drizzle Lab CLI
```