import type { Snapshot } from "@drizzle-lab/visualizer";
import { DrizzleVisualizer, DrizzleVisualizerLegend } from "@drizzle-lab/visualizer";
import { Editor } from "@monaco-editor/react";
import { useActor, useSelector } from "@xstate/react";
import { and, eq } from "drizzle-orm";
import { useEffect, useRef, useState } from "react";
import type { ImperativePanelHandle } from "react-resizable-panels";
import { type MetaArgs, redirect, useLoaderData, useNavigate, useRevalidator } from "react-router";
import { fromPromise } from "xstate";
import { z } from "zod";
import { AnonymousCTA } from "~/components/anonymous-cta";
import { RainLogo } from "~/components/logo";
import { Toolbar } from "~/components/toolbar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { CommandShortcut } from "~/components/ui/command";
import { Icon, type IconName } from "~/components/ui/icon";
import { Input } from "~/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "~/components/ui/resizable";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Separator } from "~/components/ui/separator";
import { Switch } from "~/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/ui/tooltip";
import { Typography } from "~/components/ui/typography";
import { localDb } from "~/database/.client/db";
import { serverDb } from "~/database/.server/db";
import { anonymousCreatorId } from "~/database/shared";
import type { Playground, PlaygroundId } from "~/database/types";
import {
  type DeletePlaygroundActor,
  type DisableRemoteSyncActor,
  type EnableRemoteSyncActor,
  type ForkPlaygroundActor,
  PlaygroundMachine,
  type PushRemoteChangesActor,
  type RemoteSyncState,
  type SnapshotOutput,
  extractSchema,
  inspector,
} from "~/modules/playground/machine.client";
import { useEditorOptions } from "~/modules/playground/options.client";
import { type UserPlaygroundFileName, asFileName } from "~/registry";
import { cn } from "~/utils/cn";
import { env } from "~/utils/env";
import { AppError, handleError } from "~/utils/error";
import { assertActionType, clientRedirect, failure, parseParams, success } from "~/utils/http";
import { robot } from "~/utils/robot";
import { useAsyncFetcher } from "~/utils/use-async-fetcher";
import type { Route } from "./+types/route";
import { PlaygroundSelector } from "./components";

export const meta = (args: MetaArgs<typeof loader>) => {
  let title = args.loaderData?.success.playground?.name;
  const ogUrl = new URL(`${env.APP_URL}/api/og`);
  ogUrl.searchParams.set("v", "1");

  if (args.params.playgroundId) {
    ogUrl.searchParams.set("playgroundId", args.params.playgroundId);
    ogUrl.searchParams.set("updatedAt", args.loaderData?.success.playground?.updatedAt || "");
    title = `${title} - ${env.APP_NAME}`;
  }

  const imgUrl = ogUrl.toString();

  return [
    { title },
    { name: "description", content: "Play with Drizzle in your browser" },
    {
      name: "twitter:title",
      content: title,
    },
    {
      property: "og:title",
      content: title,
    },
    {
      property: "og:image",
      content: imgUrl,
    },
    {
      name: "twitter:image",
      content: imgUrl,
    },
    {
      name: "twitter:card",
      content: "summary_large_image",
    },
    { name: "twitter:site", content: "@DrizzleORM" },
    { name: "twitter:creator", content: "@DrizzleORM" },
    {
      property: "og:url",
      content: `${env.APP_URL}/${args.params.playgroundId || ""}`,
    },
    { property: "og:type", content: "website" },
    { property: "og:site_name", content: env.APP_NAME },
    { property: "og:locale", content: "en_US" },
    ...robot.public,
  ];
};

export const loader = async ({ context, params }: Route.LoaderArgs) => {
  if (!params.playgroundId) {
    throw redirect("/");
  }

  const playground = await serverDb.query.playground
    .findFirst({
      where: (Playground, { eq }) => eq(Playground.id, params.playgroundId as PlaygroundId),
    })
    .execute();

  return success({
    isAuthenticated: context.isAuthenticated,
    currentUserId: context.getAuthSession()?.userId,
    playground,
    remoteSyncEnabled: Boolean(
      context.isAuthenticated && playground && playground.creatorId === context.getAuthSessionOrThrow().userId
    ),
  });
};

export async function clientLoader({ serverLoader, params }: Route.ClientLoaderArgs) {
  if (!params.playgroundId) {
    throw clientRedirect("/");
  }

  try {
    const { success: serverData } = await serverLoader();
    const serverPlayground = serverData.playground;
    const isAuthenticated = serverData.isAuthenticated;
    const localPlayground = await localDb.query.playground.findFirst({
      where: (Playground, { eq, and, gt }) =>
        and(
          eq(Playground.id, params.playgroundId as PlaygroundId),
          serverPlayground ? gt(Playground.updatedAt, serverPlayground.updatedAt) : undefined
        ),
    });

    const playground = localPlayground || serverPlayground;

    if (!playground) {
      throw clientRedirect("/");
    }

    let remoteSyncState: RemoteSyncState = "synced";

    if (localPlayground) {
      remoteSyncState = "out-of-sync";
    }

    if (!isAuthenticated && !serverPlayground) {
      playground.creatorId = anonymousCreatorId;
    }

    const isMacOs = navigator.userAgent.includes("Macintosh") || navigator.userAgent.includes("Mac OS");
    const currentUserId = serverData.currentUserId;
    const isCurrentUserPlayground =
      playground.creatorId === currentUserId || playground.creatorId === anonymousCreatorId;
    const readOnly = !isCurrentUserPlayground;

    return success({
      remoteSyncEnabled: serverData.remoteSyncEnabled,
      remoteSyncState,
      currentUserId,
      isAuthenticated,
      playground,
      serverPlayground,
      isMacOs,
      isCurrentUserPlayground,
      readOnly,
    });
  } catch (cause) {
    const reason = handleError(cause);
    throw failure(reason);
  }
}

clientLoader.hydrate = true;

type ServerActionPayload =
  | {
      type: "enable-remote-sync";
      payload: Playground;
    }
  | {
      type: "disable-remote-sync";
    }
  | {
      type: "push-changes";
      payload: Playground;
    }
  | {
      type: "delete-playground";
    };

export async function action({ request, context, params }: Route.ActionArgs) {
  const session = context.getAuthSessionOrThrow();

  try {
    const { playgroundId } = parseParams(
      params,
      z.object({
        playgroundId: z.string().min(1),
      })
    );

    const submission = (await request.clone().json()) as ServerActionPayload;

    switch (submission.type) {
      case "enable-remote-sync": {
        await serverDb
          .insert(serverDb.schema.playground)
          .values({
            ...submission.payload,
            creatorId: session.userId,
          })
          .catch((cause) => {
            throw new AppError({
              cause,
              message: "Failed to create playground",
              label: "Playground 📦",
              additionalData: {
                userId: session.userId,
              },
            });
          });
        return success({ type: submission.type, creatorId: session.userId });
      }
      case "disable-remote-sync": {
        await serverDb
          .delete(serverDb.schema.playground)
          .where(
            and(
              eq(serverDb.schema.playground.id, playgroundId as PlaygroundId),
              eq(serverDb.schema.playground.creatorId, session.userId)
            )
          )
          .catch((cause) => {
            throw new AppError({
              cause,
              message: "Failed to delete playground",
              label: "Playground 📦",
              additionalData: {
                userId: session.userId,
                playgroundId,
              },
            });
          });
        return success({ type: submission.type });
      }
      case "push-changes": {
        await serverDb
          .update(serverDb.schema.playground)
          .set({
            content: submission.payload.content,
            name: submission.payload.name,
            description: submission.payload.description,
            updatedAt: submission.payload.updatedAt,
          })
          .where(
            and(
              eq(serverDb.schema.playground.id, playgroundId as PlaygroundId),
              eq(serverDb.schema.playground.creatorId, session.userId)
            )
          )
          .catch((cause) => {
            throw new AppError({
              cause,
              message: "Failed to update playground",
              label: "Playground 📦",
              additionalData: {
                userId: session.userId,
              },
            });
          });
        return success({ type: submission.type });
      }
      case "delete-playground": {
        await serverDb
          .delete(serverDb.schema.playground)
          .where(
            and(
              eq(serverDb.schema.playground.id, playgroundId as PlaygroundId),
              eq(serverDb.schema.playground.creatorId, session.userId)
            )
          )
          .catch((cause) => {
            throw new AppError({
              cause,
              message: "Failed to delete playground",
              label: "Playground 📦",
              additionalData: {
                userId: session.userId,
                playgroundId,
              },
            });
          });
        return success({ type: submission.type });
      }
    }
  } catch (cause) {
    const reason = handleError(cause);
    return failure(reason);
  }
}

export default function View() {
  const {
    success: { playground },
  } = useLoaderData<typeof clientLoader>();

  return <Play key={playground.id} />;
}

function Play() {
  const {
    success: {
      playground,
      isAuthenticated,
      remoteSyncEnabled,
      currentUserId,
      remoteSyncState,
      isMacOs,
      isCurrentUserPlayground,
      readOnly,
      serverPlayground,
    },
  } = useLoaderData<typeof clientLoader>();
  const { revalidate } = useRevalidator();
  const editorPanelRef = useRef<ImperativePanelHandle>(null);
  const [rightPanelTab, setRightPanelTab] = useState<"output" | "visualizer" | string>("output");
  const editorOptions = useEditorOptions();
  const pushRemoteChanges = usePushRemoteChangesActor();
  const enableRemoteSync = useEnableRemoteSyncActor();
  const disableRemoteSync = useDisableRemoteSyncActor();
  const forkPlayground = useForkPlaygroundActor();
  const deletePlayground = useDeletePlaygroundActor();
  const [state, send] = useActor(
    PlaygroundMachine.provide({
      actors: {
        enableRemoteSync,
        disableRemoteSync,
        pushRemoteChanges,
        forkPlayground,
        deletePlayground,
      },
    }),
    {
      input: { playground, remoteSyncEnabled, currentUserId, remoteSyncState },
      inspect: env.NODE_ENV === "development" ? inspector.inspect : undefined,
    }
  );
  const [enableDebug, setEnableDebug] = useState(false);
  const editor = useSelector(state.context.module.editor, (s) => s);
  const isReady = editor.hasTag("started");
  const editorSetupError = editor.context.setupError;
  const currentTab = editor.context.tab.current;
  const defaultFileName = "index.ts";
  const playgroundRunner = useSelector(state.context.module.playgroundRunner, (s) => s);
  const [snapshot, setSnapshot] = useState<Snapshot | undefined>(undefined);
  const rawSchema = editor.context.fileTree["schema.ts"];

  useEffect(() => {
    if (!isReady) {
      return;
    }

    extractSchema().then((schema) => {
      if (!schema) {
        return;
      }
      setSnapshot(schema);
    });
  }, [isReady, rawSchema]);

  let outputs = [...playgroundRunner.context.outputs];

  if (!enableDebug) {
    const hasOnlyDebugOutputs = outputs.length > 0;
    outputs = outputs.filter((o) => !o.isDebug);
    if (hasOnlyDebugOutputs && outputs.length === 0 && playgroundRunner.hasTag("idle")) {
      outputs.push({
        id: "no-output",
        type: "string",
        html: `<div class="text-muted-foreground text-center">No output</div>`,
        time: Date.now(),
        fileName: "index",
        raw: null,
        isDebug: false,
      });
    }
  }

  if (outputs.length === 0 && playgroundRunner.hasTag("running") && playgroundRunner.context.history[0]) {
    outputs.push(...playgroundRunner.context.history[0]);
  }

  const [copied, setCopied] = useState(false);
  const meta = isMacOs ? "⌘" : "Ctrl+";
  const alt = isMacOs ? "⌥" : "Alt+";
  const shift = isMacOs ? "⇧" : "Shift+";

  if (playgroundRunner.context.error) {
    console.error("Playground runner error", playgroundRunner.context.error);
  }

  if (editor.context.setupError) {
    console.error("Editor setup error", editor.context.setupError);
  }

  if (editor.context.error) {
    console.error("Editor error", editor.context.error);
  }

  if (state.context.error) {
    console.error("Playground error", state.context.error);
  }

  if (state.context.remoteSync.error) {
    console.error("Remote sync error", state.context.remoteSync.error);
  }

  if (state.context.save.error) {
    console.error("Local save error", state.context.remoteSync.error);
  }

  return (
    <>
      <Toolbar>
        {isAuthenticated && state.context.remoteSync.enabled && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                className="relative"
                disabled={state.context.remoteSync.status === "synced" || state.hasTag("remoteSync:pushing")}
                onClick={() => {
                  send({ type: "remoteSync.push" });
                }}
              >
                <Icon
                  name="cloud-upload"
                  size="md"
                  className={cn(
                    "opacity-50",
                    state.context.remoteSync.status === "out-of-sync" && "text-green opacity-100",
                    state.hasTag("remoteSync:pushing") && "animate-pulse cursor-wait"
                  )}
                >
                  <span className={cn(state.context.remoteSync.status === "out-of-sync" && "text-green")}>
                    {state.context.remoteSync.status === "synced" ? "Up to date" : "Push your changes"}
                  </span>
                </Icon>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Push your changes remotely</TooltipContent>
          </Tooltip>
        )}
        <Popover>
          <Tooltip>
            <PopoverTrigger asChild>
              <TooltipTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Icon
                    name="share-2"
                    size="md"
                    className={cn("opacity-50", state.context.remoteSync.enabled && "text-green opacity-100")}
                  >
                    {state.context.remoteSync.enabled ? "Shared" : "Share"}
                  </Icon>
                </Button>
              </TooltipTrigger>
            </PopoverTrigger>
            <TooltipContent>Share your playground</TooltipContent>
          </Tooltip>
          <PopoverContent className="w-fit">
            {isAuthenticated ? (
              isCurrentUserPlayground ? (
                <div className="flex flex-col justify-center items-center gap-4">
                  <Badge variant="secondary">{state.context.remoteSync.enabled ? "Shared" : "Local only"}</Badge>
                  <div className="flex items-center gap-4">
                    <Icon
                      name="cloud-off"
                      size="md"
                      className={cn(
                        state.context.remoteSync.enabled ? "opacity-50" : "opacity-100",
                        !state.context.remoteSync.enabled && state.hasTag("remoteSync:processing") && "animate-pulse"
                      )}
                    />
                    <Switch
                      id="toggle-share"
                      className={cn(state.hasTag("remoteSync:processing") && "cursor-wait")}
                      checked={state.context.remoteSync.enabled}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          send({ type: "remoteSync.on" });
                        } else {
                          send({ type: "remoteSync.off" });
                        }
                      }}
                    />
                    <Icon
                      name="cloud"
                      size="md"
                      className={cn(
                        state.context.remoteSync.enabled ? "text-green" : "opacity-50",
                        state.context.remoteSync.enabled && state.hasTag("remoteSync:processing") && "animate-pulse"
                      )}
                    />
                  </div>
                  {state.context.remoteSync.enabled && (
                    <div className="flex items-center gap-2">
                      <Input
                        readOnly
                        value={`${env.APP_URL}/${playground.id}`}
                        onClick={(e) => {
                          e.currentTarget.select();
                        }}
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          setCopied(true);
                          navigator.clipboard.writeText(`${env.APP_URL}/${playground.id}`);
                        }}
                      >
                        <Icon name={copied ? "clipboard-check" : "clipboard"} size="md" />
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col justify-center items-center gap-4">
                  <Typography variant="mutedText">You are not the creator of this playground</Typography>
                  <Button variant="secondary" onClick={() => send({ type: "fork" })}>
                    <Icon name="git-fork" size="md">
                      Fork
                    </Icon>
                  </Button>
                </div>
              )
            ) : (
              <AnonymousCTA />
            )}
          </PopoverContent>
        </Popover>
        <PlaygroundSelector
          metadata={state.context.metadata}
          onFork={() => send({ type: "fork" })}
          onEdit={(name) => {
            send({ type: "edit", name });
            revalidate();
          }}
          onDiscardChanges={() => {
            if (!serverPlayground) {
              return;
            }
            send({ type: "localSave.discard", serverPlayground });
          }}
          onDelete={() => send({ type: "delete" })}
          hasPendingChanges={state.context.remoteSync.enabled && state.context.remoteSync.status === "out-of-sync"}
          readOnly={readOnly}
        />
      </Toolbar>
      <ResizablePanelGroup
        autoSaveId="playground"
        direction="horizontal"
        className="flex flex-col gap-2 p-4 h-full overflow-hidden"
      >
        <ResizablePanel ref={editorPanelRef} defaultSize={60} className="flex flex-col gap-4 p-0.5">
          <div className="flex flex-wrap justify-between gap-1">
            <ToggleGroup
              disabled={editor.hasTag("setup")}
              type="single"
              className="flex-wrap justify-start w-fit"
              variant="outline"
              defaultValue={defaultFileName}
              value={currentTab}
              onValueChange={(fileName: UserPlaygroundFileName) => {
                if (!fileName) {
                  return;
                }

                send({
                  type: "editor.file.open",
                  fileName,
                });
              }}
            >
              <ToggleGroupItem value={asFileName("index.ts")} className="gap-2 shrink-0">
                <Icon name="code" size="md" />
                <span>
                  Code <CommandShortcut>{`${meta}1`}</CommandShortcut>
                </span>
              </ToggleGroupItem>
              <ToggleGroupItem value={asFileName("schema.ts")} className="gap-2 shrink-0">
                <Icon name="database" size="md" />
                <span>
                  Schema <CommandShortcut>{`${meta}2`}</CommandShortcut>
                </span>
              </ToggleGroupItem>
              <ToggleGroupItem value={asFileName("utils.ts")} className="gap-2 shrink-0">
                <Icon name="wrench" size="md" />
                <span>
                  Utils <CommandShortcut>{`${meta}3`}</CommandShortcut>
                </span>
              </ToggleGroupItem>
              <ToggleGroupItem value={asFileName("seed.ts")} className="gap-2 shrink-0">
                <Icon name="sprout" size="md" />
                <span>
                  Seed <CommandShortcut>{`${meta}4`}</CommandShortcut>
                </span>
              </ToggleGroupItem>
            </ToggleGroup>
            <div className="flex items-center gap-1">
              <Popover>
                <Tooltip>
                  <PopoverTrigger asChild>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="icon">
                        <Icon name="book-text" size="md" />
                      </Button>
                    </TooltipTrigger>
                  </PopoverTrigger>
                  <TooltipContent>Guide</TooltipContent>
                </Tooltip>
                <PopoverContent className="w-fit">
                  <Typography variant="largeText">Guide</Typography>
                  <Separator />
                  <Typography>
                    You have access to a magic global variable <Typography variant="inlineCode">$</Typography>
                  </Typography>
                  <Typography>
                    It includes a <Typography variant="inlineCode">random</Typography> generator you can use in any tabs
                  </Typography>
                  <div className="flex flex-col gap-2">
                    <Typography variant="mutedText">Example: </Typography>
                    <Typography variant="inlineCode" className="w-fit">
                      {/* biome-ignore lint/suspicious/noCommentText: <explanation> */}
                      $.random.uuid() // → a random uuid
                    </Typography>
                    <Typography variant="inlineCode" className="w-fit">
                      {/* biome-ignore lint/suspicious/noCommentText: <explanation> */}
                      $.random.array(5,$.random.uuid) // → a random array of 5 uuids
                    </Typography>
                  </div>
                </PopoverContent>
              </Popover>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    disabled={editor.hasTag("setup")}
                    variant="outline"
                    size="icon"
                    onClick={() => send({ type: "editor.file.format" })}
                    className="shrink-0"
                  >
                    <Icon name="wand-sparkles" size="md" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Format the code <CommandShortcut>{`${alt}⇧F`}</CommandShortcut>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
          <div className="relative bg-muted/50 p-2 pl-0 rounded-xl h-full">
            <Badge variant="secondary" className="top-4 right-4 z-10 absolute w-fit">
              Editor
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
              <Editor
                keepCurrentModel
                defaultPath={defaultFileName}
                theme="tokyo-night"
                options={editorOptions}
                onChange={(content) => {
                  send({ type: "editor.file.change", content });
                }}
              />
            )}
          </div>
        </ResizablePanel>
        <ResizableHandle
          withHandle
          className="bg-transparent"
          onDoubleClick={() => {
            editorPanelRef.current?.resize(60);
          }}
        />
        <ResizablePanel defaultSize={40} className="flex flex-col gap-4 p-0.5">
          <Tabs value={rightPanelTab} onValueChange={setRightPanelTab} className="flex flex-col gap-4 size-full">
            <div className="flex flex-wrap items-center gap-2 w-full">
              <TabsList>
                <Tooltip>
                  <TabsTrigger value="output" asChild>
                    <TooltipTrigger>
                      <Icon name="square-terminal" size="md" className={cn("group-data-[state=active]:text-green")} />
                    </TooltipTrigger>
                  </TabsTrigger>
                  <TooltipContent>Playground output</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TabsTrigger value="visualizer" asChild>
                    <TooltipTrigger>
                      <Icon name="camera" size="md" className={cn("group-data-[state=active]:text-green")} />
                    </TooltipTrigger>
                  </TabsTrigger>
                  <TooltipContent>Schema visualizer</TooltipContent>
                </Tooltip>
              </TabsList>

              {rightPanelTab === "output" && (
                <div className="flex flex-wrap justify-between items-center gap-1 grow">
                  <div className="flex items-center gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          disabled={editor.hasTag("setup")}
                          variant="outline"
                          onClick={() => send({ type: "run" })}
                          className={cn("gap-2 shrink-0")}
                          aria-label="Run the code"
                        >
                          <Icon
                            name={playgroundRunner.hasTag("running") ? "loader-pinwheel" : "play"}
                            size="md"
                            className={cn("text-green", playgroundRunner.hasTag("running") && "animate-spin")}
                          />
                          <span>
                            Run <CommandShortcut>{`${meta}${shift}D`}</CommandShortcut>
                          </span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Run the code</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant={enableDebug ? "secondary" : "outline"}
                          size="icon"
                          onClick={() => setEnableDebug((prev) => !prev)}
                          aria-label="Show debug output"
                          className="shrink-0"
                        >
                          <Icon
                            name="bug-off"
                            size="md"
                            className={cn(enableDebug ? "hidden" : "text-muted-foreground")}
                          />
                          <Icon name="bug" size="md" className={cn(enableDebug ? "text-blue" : "hidden")} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Show or hide debug outputs</TooltipContent>
                    </Tooltip>
                  </div>

                  <Tooltip>
                    <Select
                      key={String(playgroundRunner.hasTag("running"))}
                      disabled={playgroundRunner.context.history.length === 0}
                      onValueChange={(value) => {
                        send({
                          type: "playgroundRunner.outputs.history.load",
                          index: Number(value),
                        });
                      }}
                    >
                      <TooltipTrigger asChild>
                        <SelectTrigger className="w-fit shrink-0">
                          <SelectValue placeholder="Latest" />
                        </SelectTrigger>
                      </TooltipTrigger>
                      <SelectContent>
                        {playgroundRunner.context.history.map((_, version) => (
                          <SelectItem key={version} value={String(version)}>
                            {version === 0 ? "Latest" : `Run #${playgroundRunner.context.history.length - version}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <TooltipContent>Show previous run outputs</TooltipContent>
                  </Tooltip>
                </div>
              )}
            </div>
            <TabsContent value="output" asChild className="mt-0">
              <div className="relative flex flex-col bg-muted/50 rounded-xl h-full overflow-hidden">
                <Badge
                  variant="secondary"
                  className={cn(
                    "top-4 right-4 z-50 absolute w-fit",
                    playgroundRunner.hasTag("running") && "animate-pulse"
                  )}
                >
                  {playgroundRunner.hasTag("idle") && "Output"}
                  {playgroundRunner.hasTag("running") && "Executing playground"}
                </Badge>
                <div className="z-10 flex flex-col flex-1 gap-4 p-2 overflow-x-hidden overflow-y-auto scroll-smooth scrollbar-thin scrollbar-track-transparent scrollbar-thumb-primary">
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

                  {isReady && outputs.length === 0 && (
                    <div className="flex flex-col justify-center items-center gap-4 h-full">
                      <RainLogo className="h-10" />

                      <Button
                        disabled={editor.hasTag("setup")}
                        variant="secondary"
                        onClick={() => send({ type: "run" })}
                        className={cn("gap-2")}
                        aria-label="Run the code"
                      >
                        <Icon
                          name={playgroundRunner.hasTag("running") ? "loader-pinwheel" : "play"}
                          size="md"
                          className={cn("text-green", playgroundRunner.hasTag("running") && "animate-spin")}
                        />
                        <span>{playgroundRunner.hasTag("running") ? "Running" : "Run"}</span>
                      </Button>

                      <Typography variant="mutedText" className="text-center">
                        With great power comes great responsibility
                      </Typography>
                    </div>
                  )}

                  {outputs.length > 0 &&
                    outputs.map((output) => {
                      if (output.isDebug && !enableDebug) {
                        return null;
                      }

                      return <Output key={output.id} output={output} />;
                    })}
                </div>
              </div>
            </TabsContent>
            <TabsContent value="visualizer" asChild className="mt-0">
              {snapshot && (
                <div className="flex flex-col bg-muted/50 rounded-xl h-full">
                  <DrizzleVisualizer snapshot={snapshot} loading={!isReady} showMiniMap={false} />
                  <DrizzleVisualizerLegend />
                </div>
              )}
            </TabsContent>
          </Tabs>
        </ResizablePanel>
      </ResizablePanelGroup>
    </>
  );
}

function useEnableRemoteSyncActor() {
  const fetcher = useAsyncFetcher<typeof action>();

  return fromPromise(async ({ input }) => {
    const payload = {
      type: "enable-remote-sync",
      payload: input,
    } satisfies ServerActionPayload;

    const result = await fetcher.submit(payload, {
      method: "POST",
      encType: "application/json",
    });

    assertActionType(result.type, payload.type);

    return result.creatorId;
  }) satisfies EnableRemoteSyncActor;
}

function useDisableRemoteSyncActor() {
  const fetcher = useAsyncFetcher<typeof action>();

  return fromPromise(async () => {
    const payload = {
      type: "disable-remote-sync",
    } satisfies ServerActionPayload;

    const result = await fetcher.submit(payload, {
      method: "POST",
      encType: "application/json",
    });

    assertActionType(result.type, payload.type);
  }) satisfies DisableRemoteSyncActor;
}

function usePushRemoteChangesActor() {
  const fetcher = useAsyncFetcher<typeof action>();

  return fromPromise(async ({ input }) => {
    const payload = {
      type: "push-changes",
      payload: input,
    } satisfies ServerActionPayload;

    const result = await fetcher.submit(payload, {
      method: "POST",
      encType: "application/json",
    });

    assertActionType(result.type, payload.type);
  }) satisfies PushRemoteChangesActor;
}

function useForkPlaygroundActor() {
  const navigate = useNavigate();

  return fromPromise(async ({ input }) => {
    const { playground, userId } = input;
    const results = await localDb
      .insert(localDb.schema.playground)
      .values({
        name: `(fork) ${playground.name}`,
        content: playground.content,
        dialect: playground.dialect,
        description: playground.description,
        forkedFromId: playground.id,
        creatorId: userId,
      })
      .returning({ id: localDb.schema.playground.id });

    const { id } = results.at(0)!;

    navigate(`/${id}`);
  }) satisfies ForkPlaygroundActor;
}

function useDeletePlaygroundActor() {
  const { revalidate } = useRevalidator();
  const fetcher = useAsyncFetcher<typeof action>();

  return fromPromise(async ({ input }) => {
    const { playgroundId, isRemotelySynced } = input;

    if (isRemotelySynced) {
      const payload = {
        type: "delete-playground",
      } satisfies ServerActionPayload;

      const result = await fetcher.submit(payload, {
        method: "POST",
        encType: "application/json",
      });

      assertActionType(result.type, payload.type);
    }

    await localDb.delete(localDb.schema.playground).where(eq(localDb.schema.playground.id, playgroundId));

    revalidate();
  }) satisfies DeletePlaygroundActor;
}

function Output({ output }: { output: SnapshotOutput }) {
  const { html, id, time, type, isDebug, fileName, raw } = output;
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (copied) {
      setTimeout(() => {
        setCopied(false);
      }, 1000);
    }
  }, [copied]);

  let fileIconName: IconName | undefined = undefined;

  switch (fileName) {
    case "index":
      fileIconName = "code";
      break;
    case "schema":
      fileIconName = "database";
      break;
    case "utils":
      fileIconName = "wrench";
      break;
    case "seed":
      fileIconName = "sprout";
      break;
  }

  return (
    <div
      key={id}
      className={cn(
        "flex flex-col gap-2 bg-accent/70 hover:bg-accent p-4 pb-0 rounded-lg transition-colors",
        type === "error" && "border border-red"
      )}
    >
      <div className="flex items-center gap-2">
        <Button
          size="icon"
          className="rounded-none size-fit"
          variant="ghost"
          onClick={() => {
            if (!raw) {
              return;
            }

            navigator.clipboard.writeText(JSON.stringify(raw, null, 2));
            setCopied(true);
          }}
        >
          <Icon name={copied ? "clipboard-check" : "clipboard"} className={cn(copied && "text-green")} />
        </Button>

        <time className="text-muted-foreground text-xs">{new Date(time).toLocaleString()}</time>

        {isDebug && <Icon name="bug" className="text-blue" />}

        {fileName && fileIconName && (
          <Icon name={fileIconName} className="text-muted-foreground">
            <span className="text-muted-foreground text-xs">{fileName === "index" ? "code" : fileName}</span>
          </Icon>
        )}
      </div>

      <div
        className="pb-4 overflow-x-auto scroll-smooth scrollbar-thin scrollbar-track-transparent scrollbar-thumb-primary"
        dangerouslySetInnerHTML={{
          __html: html,
        }}
      />
    </div>
  );
}
