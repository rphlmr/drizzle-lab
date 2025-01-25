import { useEffect, useRef, useState } from "react";

import { Editor } from "@monaco-editor/react";
import { Badge } from "@repo/ui/components/badge";
import { Button, buttonVariants } from "@repo/ui/components/button";
import { Icon } from "@repo/ui/components/icon";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@repo/ui/components/resizable";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/select";
import { Typography } from "@repo/ui/components/typography";
import { cn } from "@repo/ui/utils/cn";
import { useActor } from "@xstate/react";
import type { ImperativePanelHandle } from "react-resizable-panels";
import { useDebounce } from "use-debounce";

import { RainLogo } from "~/components/logo";
import {
  EditorMachine,
  sqlToSchema,
} from "~/modules/playground/machine.client";
import { useEditorOptions } from "~/modules/playground/options.client";
import { asFileName, dialects, type Dialect } from "~/registry";

const sqlExample = `CREATE TABLE IF NOT EXISTS "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text
);

CREATE TABLE IF NOT EXISTS "posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"content" text,
	"author_id" integer NOT NULL
);

CREATE TABLE IF NOT EXISTS "comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"text" text,
	"author_id" integer NOT NULL,
	"post_id" integer NOT NULL
);

DO $$ BEGIN
 ALTER TABLE "posts" ADD CONSTRAINT "posts_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "comments" ADD CONSTRAINT "comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "comments" ADD CONSTRAINT "comments_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
`;

export default function Route() {
  const editorPanelRef = useRef<ImperativePanelHandle>(null);
  const editorOptions = useEditorOptions();
  const [rawSql, setRawSql] = useState<string>(
    () => sessionStorage.getItem("converter.schema.sql") || sqlExample,
  );
  const [debouncedSql] = useDebounce(rawSql, 500);
  const [schema, setSchema] = useState<string>("");
  const [dialect, setDialect] = useState<Dialect>("postgresql");
  const [editor] = useActor(EditorMachine, {
    input: {
      dialect: "postgresql",
      fileTree: {
        "index.ts": "",
        "schema.ts": "",
        "utils.ts": "",
      },
    },
  });
  const [copied, setCopied] = useState(false);
  const isReady = editor.hasTag("started");
  const editorSetupError = editor.context.setupError;

  useEffect(() => {
    if (copied) {
      setTimeout(() => {
        setCopied(false);
      }, 1000);
    }
  }, [copied]);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    sqlToSchema(debouncedSql, dialect)
      .then((schema) => {
        if (!schema) {
          setSchema("");
          return;
        }
        setSchema(schema);
      })
      .catch((cause) => {
        setSchema(cause.message);
      });
  }, [isReady, debouncedSql, dialect]);

  return (
    <ResizablePanelGroup
      autoSaveId="converter"
      direction="horizontal"
      className="relative size-full"
    >
      <ResizablePanel
        ref={editorPanelRef}
        defaultSize={50}
        className="dzl-relative dzl-p-4 dzl-pl-0"
      >
        <div className="dzl-absolute dzl-right-4 dzl-top-4 dzl-z-10 dzl-flex dzl-items-center dzl-gap-1">
          <Select
            value={dialect}
            onValueChange={(value) => setDialect(value as Dialect)}
          >
            <SelectTrigger
              className={buttonVariants({
                variant: "secondary",
                size: "sm",
                className: "dzl-w-fit dzl-h-6",
              })}
            >
              <SelectValue placeholder="Select a dialect" />
            </SelectTrigger>
            <SelectContent>
              {dialects.map((dialect) => (
                <SelectItem key={dialect} value={dialect}>
                  {dialect}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Badge variant="secondary" className="dzl-w-fit">
            SQL schema
          </Badge>
        </div>

        {editor.hasTag("setup") && (
          <div className="dzl-flex dzl-h-full dzl-flex-col dzl-items-center dzl-justify-center dzl-gap-4 dzl-p-4">
            {editor.hasTag("starting") && (
              <>
                <RainLogo className="dzl-h-10 dzl-animate-pulse" />
                <Typography variant="mutedText" className="dzl-animate-pulse">
                  {editor.hasTag("starting:boot") && "Starting editor"}
                  {editor.hasTag("starting:types") && "Loading types"}
                  {editor.hasTag("starting:prepare") && "Preparing playground"}
                </Typography>
              </>
            )}
            {editor.hasTag("start_failed") && editorSetupError && (
              <>
                <RainLogo className="dzl-h-10 dzl-text-red" />
                <p>{editorSetupError.message}</p>
                {editorSetupError.cause ? (
                  <p>{editorSetupError.cause}</p>
                ) : null}
              </>
            )}
          </div>
        )}

        {editor.hasTag("started") && (
          <Editor
            value={rawSql}
            language="sql"
            path="schema.sql"
            theme="tokyo-night"
            options={editorOptions}
            onChange={async (rawSql) => {
              if (!rawSql) {
                setRawSql("");
                return;
              }
              sessionStorage.setItem("converter.schema.sql", rawSql);
              setRawSql(rawSql);
            }}
          />
        )}
      </ResizablePanel>
      <ResizableHandle
        withHandle
        onDoubleClick={() => {
          editorPanelRef.current?.resize(50);
        }}
      />
      <ResizablePanel
        defaultSize={50}
        className="dzl-relative dzl-p-4 dzl-pl-0"
      >
        <Badge
          variant="secondary"
          className="dzl-absolute dzl-right-4 dzl-top-4 dzl-z-10 dzl-flex dzl-w-fit dzl-items-center dzl-gap-1"
        >
          Generated Drizzle schema
          <Button
            size="icon"
            className="dzl-size-fit dzl-rounded-none"
            variant="ghost"
            onClick={() => {
              if (!schema) {
                return;
              }

              navigator.clipboard.writeText(schema);
              setCopied(true);
            }}
          >
            <Icon
              name={copied ? "clipboard-check" : "clipboard"}
              className={cn(copied && "dzl-text-green")}
            />
          </Button>
        </Badge>

        {editor.hasTag("setup") && (
          <div className="dzl-flex dzl-h-full dzl-flex-col dzl-items-center dzl-justify-center dzl-gap-4 dzl-p-4">
            {editor.hasTag("starting") && (
              <>
                <RainLogo className="dzl-h-10 dzl-animate-pulse" />
                <Typography variant="mutedText" className="dzl-animate-pulse">
                  {editor.hasTag("starting:boot") && "Starting editor"}
                  {editor.hasTag("starting:types") && "Loading types"}
                  {editor.hasTag("starting:prepare") && "Preparing playground"}
                </Typography>
              </>
            )}
            {editor.hasTag("start_failed") && editorSetupError && (
              <>
                <RainLogo className="dzl-h-10 dzl-text-red" />
                <p>{editorSetupError.message}</p>
                {editorSetupError.cause ? (
                  <p>{editorSetupError.cause}</p>
                ) : null}
              </>
            )}
          </div>
        )}

        {editor.hasTag("started") && (
          <Editor
            value={schema}
            defaultPath={asFileName("schema.ts")}
            theme="tokyo-night"
            options={editorOptions}
          />
        )}
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
