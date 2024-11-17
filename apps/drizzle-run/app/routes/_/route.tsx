import { Suspense, useEffect, useState } from "react";

import {
  Await,
  Form,
  NavLink,
  Outlet,
  useLoaderData,
  useLocation,
  useNavigate,
  useRevalidator,
  useRouteLoaderData,
} from "@remix-run/react";
import { Alert, AlertDescription, AlertTitle } from "@repo/ui/components/alert";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@repo/ui/components/alert-dialog";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@repo/ui/components/avatar";
import { Badge } from "@repo/ui/components/badge";
import { Button, buttonVariants } from "@repo/ui/components/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@repo/ui/components/command";
import { Dialog, DialogContent } from "@repo/ui/components/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { Icon, type IconName } from "@repo/ui/components/icon";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@repo/ui/components/popover";
import { Skeleton } from "@repo/ui/components/skeleton";
import { Typography } from "@repo/ui/components/typography";
import { cn } from "@repo/ui/utils/cn";
import { sql } from "drizzle-orm";
import { useParams } from "react-router";

import { AnonymousCTA } from "~/components/anonymous-cta";
import { DrizzleLogo, RainLogo } from "~/components/logo";
import { ToolbarOutlet } from "~/components/toolbar";
import { localDb } from "~/database/.client/db";
import { serverDb } from "~/database/.server/db";
import type { User } from "~/database/types";
import { EditorOptionsDialog } from "~/modules/playground/options.client";
import { getDrizzleVersion } from "~/registry";
import { NewPlaygroundWizard } from "~/routes/api.playground/route";
import { handleError } from "~/utils/error";
import { data, error } from "~/utils/http";
import type { Closable } from "~/utils/use-dialog";
import { useDialog } from "~/utils/use-dialog";
import { useIsMobileAppLayout } from "~/utils/use-is-mobile-app-layout";

export const loader = async ({ context }: LoaderFunctionArgs) => {
  try {
    let user: Promise<User | undefined> | undefined;

    if (context.isAuthenticated) {
      user = serverDb.query.user
        .findFirst({
          where: (User, { eq }) =>
            eq(User.id, context.getAuthSessionOrThrow().userId),
        })
        .execute();
    }

    return data({
      user,
      version: await getDrizzleVersion(),
      isAuthenticated: context.isAuthenticated,
      playgrounds: context.isAuthenticated
        ? await serverDb.query.playground.findMany({
            extras: {
              isShared: sql<boolean>`true`.as("is_shared"),
            },
            where: (Playground, { eq }) =>
              eq(Playground.creatorId, context.getAuthSessionOrThrow().userId),
            orderBy: (Playground, { desc }) => [desc(Playground.updatedAt)],
          })
        : [],
    });
  } catch (cause) {
    const reason = handleError(cause);
    throw error(reason);
  }
};

export const clientLoader = async ({
  serverLoader,
}: ClientLoaderFunctionArgs) => {
  try {
    const serverResponse = await serverLoader<typeof loader>();
    const serverPlaygrounds = serverResponse.data.playgrounds;
    const serverPlaygroundIds = serverPlaygrounds.map(
      (playground) => playground.id,
    );
    const localPlaygrounds = await localDb.query.playground.findMany({
      extras: {
        isShared: sql<boolean>`false`.as("is_shared"),
      },
      where:
        serverPlaygroundIds.length > 0
          ? (Playground, { notInArray }) =>
              notInArray(Playground.id, serverPlaygroundIds)
          : undefined,
      orderBy: (Playground, { desc }) => [desc(Playground.updatedAt)],
    });

    const playgrounds = [...serverPlaygrounds, ...localPlaygrounds].sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );

    const hasReadBanner = localStorage.getItem("hasReadBanner") === "true";

    const isMacOs =
      navigator.userAgent.includes("Macintosh") ||
      navigator.userAgent.includes("Mac OS");

    return data({
      ...serverResponse.data,
      playgrounds,
      hasReadBanner,
      isMacOs,
    });
  } catch (cause) {
    const reason = handleError(cause);
    throw error(reason);
  }
};

clientLoader.hydrate = true;

export function HydrateFallback() {
  return (
    <div className="flex size-full flex-col items-center justify-center gap-4">
      <RainLogo className="h-10 animate-pulse" />
      <Typography variant="mutedText" className="animate-pulse">
        Drizzle Run is loading several binaries to work locally first
      </Typography>
    </div>
  );
}

const apps: Array<{ id: string; path: string; icon: IconName; label: string }> =
  [
    {
      path: "/",
      label: "Command",
      icon: "chevron-right",
      id: "index",
    },
    {
      path: "/",
      label: "Playground",
      icon: "box",
      id: "playground",
    },
    {
      path: "/explore",
      label: "Explore",
      icon: "telescope",
      id: "explore",
    },
    {
      path: "/visualizer",
      label: "Schema visualizer",
      icon: "camera",
      id: "visualizer",
    },
    {
      path: "/converter",
      label: "Convert Drizzle to SQL",
      icon: "arrow-right-left",
      id: "converter",
    },
    {
      path: "/converter/sql",
      label: "Convert SQL to Drizzle",
      icon: "arrow-right-left",
      id: "converter",
    },
  ] as const;

export default function MainLayout() {
  const {
    data: { user, version, playgrounds, hasReadBanner, isMacOs },
  } = useLoaderData<typeof clientLoader>();
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams();
  const dialog = useDialog<"new_playground" | "log_out" | "editor_settings">();
  const closeDialog = dialog.close;
  const [open, setOpen] = useState(false);
  const [openList, setOpenList] = useState(false);
  const isMobileAppLayout = useIsMobileAppLayout();
  const currentApp =
    location.pathname === "/"
      ? apps[0]
      : apps.find((app) => app.path.includes(location.pathname)) ||
        apps.find((app) => app.id === "playground") ||
        apps[0];
  const meta = isMacOs ? "⌘" : "Ctrl+";

  useEffect(() => {
    closeDialog();
  }, [closeDialog, params.playgroundId]);

  useEffect(() => {
    function down(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    }

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <>
      <div className="grid size-full grid-rows-[auto_1fr]">
        <header className="grid h-14 grid-cols-3 items-center justify-between gap-1 border-b px-4">
          <div className="flex items-center gap-2">
            <NavLink to="/" className="flex items-center gap-1">
              <DrizzleLogo className="h-10" />
              <Typography as="span" className="pt-0.5 text-base text-green">
                Run
              </Typography>
            </NavLink>
            <Badge variant="secondary" className="bg-amber-950 text-amber-500">
              Work in progress
            </Badge>
            <Badge variant="outline">Drizzle {version}</Badge>
          </div>

          <div className="flex w-full items-center justify-center">
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="max-w-60 gap-1"
                  role="combobox"
                >
                  <Icon name={currentApp.icon} size="md" />
                  <span className="truncate">{currentApp.label}</span>
                  <CommandShortcut>{`${meta}K`}</CommandShortcut>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0">
                <Command loop>
                  <CommandInput placeholder="Type a command or search..." />
                  <CommandList className="max-h-96">
                    <CommandEmpty>No results found.</CommandEmpty>
                    <CommandGroup heading="Playground">
                      <CommandItem onSelect={() => setOpenList(!openList)}>
                        <Popover open={openList} onOpenChange={setOpenList}>
                          <PopoverTrigger className="flex w-full items-center justify-between gap-1 outline-none">
                            <div className="flex items-center gap-1">
                              <Icon name="folder-open" size="md" />
                              <span className="truncate">Open</span>
                            </div>
                            <Icon name="chevron-right" size="md" />
                          </PopoverTrigger>
                          <PopoverContent
                            className="w-96 p-0"
                            side="right"
                            align="start"
                            alignOffset={-11}
                            sideOffset={12}
                          >
                            <Command>
                              <CommandInput placeholder="Search a playground" />
                              <CommandList>
                                <CommandEmpty>No results found.</CommandEmpty>
                                {playgrounds.map((playground) => {
                                  return (
                                    <CommandItem
                                      key={playground.id}
                                      id={playground.id}
                                      onSelect={() => {
                                        navigate(`/${playground.id}`);
                                        setOpen(false);
                                      }}
                                      className="gap-2"
                                    >
                                      <Badge variant="outline">
                                        {playground.dialect}
                                      </Badge>

                                      {playground.isShared && (
                                        <Badge variant="outline">shared</Badge>
                                      )}

                                      <span className="truncate">
                                        {playground.name}
                                      </span>

                                      <span className="hidden">
                                        {playground.id}
                                      </span>
                                    </CommandItem>
                                  );
                                })}
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </CommandItem>
                      <CommandItem
                        className="gap-1"
                        onSelect={() => dialog.open("new_playground")}
                      >
                        <Icon name="box-plus" size="md" />
                        <span className="truncate">New playground</span>
                      </CommandItem>
                    </CommandGroup>
                    <CommandSeparator />
                    <CommandGroup heading="Applications">
                      {apps
                        .filter((app) => app.id !== "index")
                        .map((app) => (
                          <CommandItem
                            key={app.path}
                            className="gap-1"
                            onSelect={() => {
                              let goTo = app.path;

                              if (app.path === currentApp.path) {
                                goTo = location.pathname;
                              }

                              navigate(goTo);
                              setOpen(false);
                            }}
                          >
                            <Icon name={app.icon} size="md" />
                            <span className="truncate">{app.label}</span>
                          </CommandItem>
                        ))}
                    </CommandGroup>
                    <CommandSeparator />
                    <CommandGroup heading="Settings">
                      <CommandItem
                        className="gap-1"
                        onSelect={() => {
                          dialog.open("editor_settings");
                          setOpen(false);
                        }}
                        keywords={["editor", "settings"]}
                      >
                        <Icon name="panel-top" size="md" />
                        <span className="truncate">Editor</span>
                      </CommandItem>
                    </CommandGroup>
                    <CommandSeparator />
                    <CommandGroup heading="Help">
                      <CommandItem
                        className="gap-1"
                        onSelect={() => {
                          window.open(
                            "https://orm.drizzle.team/docs/overview",
                            "_blank",
                          );
                          setOpen(false);
                        }}
                      >
                        <Icon name="book-text" size="md" />
                        <span className="truncate">Docs</span>
                      </CommandItem>
                      <CommandItem
                        className="gap-1"
                        onSelect={() => {
                          window.open(
                            "https://github.com/rphlmr/drizzle-run",
                            "_blank",
                          );
                          setOpen(false);
                        }}
                      >
                        <Icon name="github" size="md" />
                        <span className="truncate">GitHub</span>
                      </CommandItem>
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex items-center justify-end gap-1">
            <ToolbarOutlet className="flex items-center gap-1" />
            <Suspense
              fallback={
                <Skeleton className="size-5 cursor-pointer rounded-full" />
              }
            >
              <Await resolve={user}>
                {(user) => (
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      className={cn(
                        buttonVariants({
                          variant: "outline",
                          size: "icon",
                        }),
                        "rounded-full",
                      )}
                    >
                      {user ? (
                        <Avatar className="size-5">
                          <AvatarImage
                            src={user.avatarUrl || ""}
                            alt={user.username}
                          />
                          <AvatarFallback>
                            {user.username.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <Icon name="circle-user-round" size="md" />
                      )}
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <div className="flex flex-col items-center gap-2 px-2 py-1.5">
                        {user ? (
                          <>
                            <Avatar className="size-14">
                              <AvatarImage
                                src={user.avatarUrl || ""}
                                alt={user.username}
                              />
                              <AvatarFallback>
                                {user.username.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col items-center gap-1">
                              <Typography variant="largeText">
                                {user.fullName}
                              </Typography>
                              <Typography variant="smallText">
                                {user.username}
                              </Typography>
                            </div>
                          </>
                        ) : (
                          <AnonymousCTA />
                        )}
                      </div>
                      {user ? (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="focus:bg-destructive"
                            onClick={() => {
                              dialog.open("log_out");
                            }}
                          >
                            <Icon
                              name="log-out"
                              size="md"
                              className="text-center"
                            >
                              Use Prisma
                            </Icon>
                          </DropdownMenuItem>
                        </>
                      ) : null}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </Await>
            </Suspense>
          </div>
        </header>
        <div className="grid size-full grid-cols-1 overflow-hidden">
          <Outlet />
        </div>
        {!hasReadBanner && !isMobileAppLayout && <WelcomeBanner />}
      </div>
      {dialog.isOpen && (
        <>
          {dialog.type === "new_playground" && (
            <Dialog open onOpenChange={dialog.toggle}>
              <DialogContent className="h-96 md:max-w-[80%]">
                <NewPlaygroundWizard />
              </DialogContent>
            </Dialog>
          )}
          {dialog.type === "editor_settings" && (
            <EditorOptionsDialog close={dialog.close} />
          )}
          {dialog.type === "log_out" && <LogOutDialog close={dialog.close} />}
        </>
      )}
    </>
  );
}

function LogOutDialog({ close }: Closable) {
  return (
    <AlertDialog open>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            <Icon name="triangle-alert" size="xl" className="text-red">
              Please note
            </Icon>
          </AlertDialogTitle>
          <AlertDialogDescription>
            <span>All playgrounds that have not been saved</span>
            <Icon size="md" name="cloud-upload" className="mx-1 text-green" />
            <span>could be lost.</span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={close}>Cancel</AlertDialogCancel>
          <Form method="post" action="/auth/sign-out" reloadDocument>
            <Button variant="destructive">I want to sign out</Button>
          </Form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function usePlaygrounds() {
  const { data } = useRouteLoaderData<typeof clientLoader>("routes/_") || {};
  return {
    playgrounds: data?.playgrounds || [],
    isAuthenticated: data?.isAuthenticated || false,
  };
}

function WelcomeBanner() {
  const { revalidate } = useRevalidator();

  return (
    <Alert className="absolute bottom-4 left-4 w-fit">
      <AlertTitle className="text-lg">👋 Welcome to Drizzle Run!</AlertTitle>
      <AlertDescription className="flex flex-col gap-2">
        <div className="flex flex-col">
          <p>
            You can use this tool to learn how to use Drizzle and share your
            playgrounds
          </p>
          <p>
            This is a work in progress, so do not hesitate to give a feedback on{" "}
            <a
              target="_blank"
              rel="noreferrer"
              href="https://github.com/rphlmr/drizzle-run"
              className="text-blue"
            >
              GitHub
            </a>
          </p>
        </div>

        <p>
          This software is given for free by{" "}
          <a
            target="_blank"
            rel="noreferrer"
            href="https://x.com/rphlmr"
            className="text-green"
          >
            @rphlmr
          </a>{" "}
          and will be open sourced later
        </p>

        <p>
          Made with{" "}
          <a
            target="_blank"
            rel="noreferrer"
            href="https://x.com/DrizzleORM"
            className="text-green"
          >
            @DrizzleORM
          </a>{" "}
          <a
            target="_blank"
            rel="noreferrer"
            href="https://x.com/ElectricSQL"
            className="text-green"
          >
            @ElectricSQL
          </a>{" "}
          <a
            target="_blank"
            rel="noreferrer"
            href="https://turso.tech/libsql"
            className="text-green"
          >
            @tursodatabase
          </a>{" "}
          <a
            target="_blank"
            rel="noreferrer"
            href="https://x.com/statelyai"
            className="text-green"
          >
            @statelyai
          </a>{" "}
          and{" "}
          <a
            target="_blank"
            rel="noreferrer"
            href="https://x.com/supabase"
            className="text-green"
          >
            @supabase
          </a>
        </p>

        <Button
          variant="secondary"
          className="w-fit"
          onClick={() => {
            localStorage.setItem("hasReadBanner", "true");
            revalidate();
          }}
        >
          Ok
        </Button>
      </AlertDescription>
    </Alert>
  );
}
