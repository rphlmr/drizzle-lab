import { Editor } from "@monaco-editor/react";
import { useActor } from "@xstate/react";
import { useEffect, useRef, useState } from "react";
import type { ImperativePanelHandle } from "react-resizable-panels";
import { useDebounce } from "use-debounce";
import { RainLogo } from "~/components/logo";
import { Badge } from "~/components/ui/badge";
import { Button, buttonVariants } from "~/components/ui/button";
import { Icon } from "~/components/ui/icon";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "~/components/ui/resizable";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Typography } from "~/components/ui/typography";
import { EditorMachine, sqlToSchema } from "~/modules/playground/machine.client";
import { useEditorOptions } from "~/modules/playground/options.client";
import { type Dialect, asFileName, dialects } from "~/registry";
import { cn } from "~/utils/cn";

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

export default function View() {
  const editorPanelRef = useRef<ImperativePanelHandle>(null);
  const editorOptions = useEditorOptions();
  const [rawSql, setRawSql] = useState<string>(() => sessionStorage.getItem("converter.schema.sql") || sqlExample);
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
        setSchema((cause instanceof Error ? cause.message : JSON.stringify(cause)) || "An unknown error occurred");
      });
  }, [isReady, debouncedSql, dialect]);

  return (
    <ResizablePanelGroup autoSaveId="converter" direction="horizontal" className="relative size-full">
      <ResizablePanel ref={editorPanelRef} defaultSize={50} className="relative p-4 pl-0">
        <div className="top-4 right-4 z-10 absolute flex items-center gap-1">
          <Select value={dialect} onValueChange={(value) => setDialect(value as Dialect)}>
            <SelectTrigger
              className={buttonVariants({
                variant: "secondary",
                size: "sm",
                className: "w-fit h-6",
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
          <Badge variant="secondary" className="w-fit">
            SQL schema
          </Badge>
        </div>

        {editor.hasTag("setup") && (
          <div className="flex flex-col justify-center items-center gap-4 p-4 h-full">
            {editor.hasTag("starting") && (
              <>
                <RainLogo className="h-10 animate-pulse" />
                <Typography variant="mutedText" className="animate-pulse">
                  {editor.hasTag("starting:boot") && "Starting editor"}
                  {editor.hasTag("starting:types") && "Loading types"}
                  {editor.hasTag("starting:prepare") && "Preparing playground"}
                </Typography>
              </>
            )}
            {editor.hasTag("start_failed") && editorSetupError && (
              <>
                <RainLogo className="h-10 text-red" />
                <p>{editorSetupError.message}</p>
                {editorSetupError.cause ? <p>{editorSetupError.cause}</p> : null}
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
            onChange={(rawSql) => {
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
      <ResizablePanel defaultSize={50} className="relative p-4 pl-0">
        <Badge variant="secondary" className="top-4 right-4 z-10 absolute flex items-center gap-1 w-fit">
          Generated Drizzle schema
          <Button
            size="icon"
            className="rounded-none size-fit"
            variant="ghost"
            onClick={() => {
              if (!schema) {
                return;
              }

              navigator.clipboard.writeText(schema);
              setCopied(true);
            }}
          >
            <Icon name={copied ? "clipboard-check" : "clipboard"} className={cn(copied && "text-green")} />
          </Button>
        </Badge>

        {editor.hasTag("setup") && (
          <div className="flex flex-col justify-center items-center gap-4 p-4 h-full">
            {editor.hasTag("starting") && (
              <>
                <RainLogo className="h-10 animate-pulse" />
                <Typography variant="mutedText" className="animate-pulse">
                  {editor.hasTag("starting:boot") && "Starting editor"}
                  {editor.hasTag("starting:types") && "Loading types"}
                  {editor.hasTag("starting:prepare") && "Preparing playground"}
                </Typography>
              </>
            )}
            {editor.hasTag("start_failed") && editorSetupError && (
              <>
                <RainLogo className="h-10 text-red" />
                <p>{editorSetupError.message}</p>
                {editorSetupError.cause ? <p>{editorSetupError.cause}</p> : null}
              </>
            )}
          </div>
        )}

        {editor.hasTag("started") && (
          <Editor value={schema} defaultPath={asFileName("schema.ts")} theme="tokyo-night" options={editorOptions} />
        )}
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
