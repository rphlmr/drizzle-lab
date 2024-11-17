import { useEffect, useRef, useState } from "react";

import { Editor } from "@monaco-editor/react";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Icon } from "@repo/ui/components/icon";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@repo/ui/components/resizable";
import { Typography } from "@repo/ui/components/typography";
import { cn } from "@repo/ui/utils/cn";
import { useActor } from "@xstate/react";
import type { ImperativePanelHandle } from "react-resizable-panels";

import { RainLogo } from "~/components/logo";
import {
  EditorMachine,
  schemaToSql,
} from "~/modules/playground/machine.client";
import { useEditorOptions } from "~/modules/playground/options.client";
import { asFileName } from "~/registry";

const schemaExample = `// This is an example of a Drizzle schema
// https://orm.drizzle.team/docs/sql-schema-declaration

import { pgTable, serial, text, integer } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name"),
});

export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
}));

export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  content: text("content"),
  authorId: integer("author_id")
    .notNull()
    .references(() => users.id),
});

export const postsRelations = relations(posts, ({ one }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
}));

export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  text: text("text"),
  authorId: integer("author_id")
    .notNull()
    .references(() => users.id),
  postId: integer("post_id")
    .notNull()
    .references(() => posts.id),
});

export const commentsRelations = relations(comments, ({ one }) => ({
  post: one(posts, {
    fields: [comments.postId],
    references: [posts.id],
  }),
}));
`;

export default function Route() {
  const editorPanelRef = useRef<ImperativePanelHandle>(null);
  const editorOptions = useEditorOptions();
  const [rawSchema, setRawSchema] = useState<string>(
    () => sessionStorage.getItem("converter.schema.ts") || schemaExample,
  );
  const [sql, setSql] = useState<string>("");
  const [editor] = useActor(EditorMachine, {
    input: {
      dialect: "postgresql",
      fileTree: {
        "index.ts": "",
        "schema.ts": rawSchema,
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

    schemaToSql()
      .then((sql) => {
        if (!sql) {
          setSql("");
          return;
        }
        setSql(sql);
      })
      .catch((cause) => {
        setSql(cause.message);
      });
  }, [isReady, rawSchema]);

  return (
    <ResizablePanelGroup
      autoSaveId="converter"
      direction="horizontal"
      className="relative size-full"
    >
      <ResizablePanel
        ref={editorPanelRef}
        defaultSize={50}
        className="relative p-4 pl-0"
      >
        <Badge
          variant="secondary"
          className="absolute right-4 top-4 z-10 w-fit"
        >
          Drizzle Schema
        </Badge>

        {editor.hasTag("setup") && (
          <div className="flex h-full flex-col items-center justify-center gap-4 p-4">
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
                {editorSetupError.cause ? (
                  <p>{editorSetupError.cause}</p>
                ) : null}
              </>
            )}
          </div>
        )}

        {editor.hasTag("started") && (
          <Editor
            defaultPath={asFileName("schema.ts")}
            theme="tokyo-night"
            options={editorOptions}
            onChange={async (rawSchema) => {
              if (!rawSchema) {
                setRawSchema("");
                return;
              }
              sessionStorage.setItem("converter.schema.ts", rawSchema);
              setRawSchema(rawSchema);
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
        <Badge
          variant="secondary"
          className="absolute right-4 top-4 z-10 flex w-fit items-center gap-1"
        >
          Generated SQL
          <Button
            size="icon"
            className="size-fit rounded-none"
            variant="ghost"
            onClick={() => {
              if (!sql) {
                return;
              }

              navigator.clipboard.writeText(sql);
              setCopied(true);
            }}
          >
            <Icon
              name={copied ? "clipboard-check" : "clipboard"}
              className={cn(copied && "text-green")}
            />
          </Button>
        </Badge>

        {editor.hasTag("setup") && (
          <div className="flex h-full flex-col items-center justify-center gap-4 p-4">
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
                {editorSetupError.cause ? (
                  <p>{editorSetupError.cause}</p>
                ) : null}
              </>
            )}
          </div>
        )}

        {editor.hasTag("started") && (
          <Editor
            value={sql}
            language="sql"
            path="schema.sql"
            theme="tokyo-night"
            options={editorOptions}
          />
        )}
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
