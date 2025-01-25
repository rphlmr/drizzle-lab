import type React from "react";
import { Suspense } from "react";

import {
  Await,
  Link,
  useFetcher,
  useLoaderData,
  type MetaFunction,
} from "@remix-run/react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@repo/ui/components/avatar";
import { Badge } from "@repo/ui/components/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@repo/ui/components/card";
import { Input } from "@repo/ui/components/input";
import { ToggleGroup, ToggleGroupItem } from "@repo/ui/components/toggle-group";
import { Typography } from "@repo/ui/components/typography";
import { and, desc, eq, sql, type SQL } from "drizzle-orm";
import { useDebounceSubmit } from "remix-utils/use-debounce-submit";
import { z } from "zod";

import { CatchError } from "~/components/catch-error";
import { RainLogo } from "~/components/logo";
import { serverDb } from "~/database/.server/db";
import { env } from "~/utils/env";
import { handleError } from "~/utils/error";
import { data, error, getSearchParams, parseParams } from "~/utils/http";
import { robot } from "~/utils/robot";

export const meta: MetaFunction = () => {
  const ogUrl = new URL(`${env.APP_URL}/api/og`);
  ogUrl.searchParams.set("v", "1");
  ogUrl.searchParams.set("o", "explore");

  const imgUrl = ogUrl.toString();

  const title = `Explore - ${env.APP_NAME}`;

  return [
    { title },
    { name: "description", content: "Explore all Drizzle playgrounds" },
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
      content: `${env.APP_URL}/explore`,
    },
    { property: "og:type", content: "website" },
    { property: "og:site_name", content: env.APP_NAME },
    { property: "og:locale", content: "en_US" },
    ...robot.public,
  ];
};

export function ErrorBoundary() {
  return (
    <Layout>
      <CatchError redirectTo="/" />
    </Layout>
  );
}

const dialectOptions = ["all", "postgresql", "sqlite"] as const;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const searchParams = parseParams(
      Object.fromEntries(
        [...getSearchParams(request).entries()].map(([key, value]) => [
          key,
          value || undefined,
        ]),
      ),
      z.object({
        dialect: z.enum(dialectOptions).optional().default("all").catch("all"),
        search: z.string().trim().min(1).nullish().catch(undefined),
      }),
    );

    const filters: SQL[] = [];

    if (searchParams.dialect !== "all") {
      filters.push(
        eq(serverDb.schema.playground.dialect, searchParams.dialect),
      );
    }

    if (searchParams.search?.trim()) {
      filters.push(
        sql`${serverDb.schema.playground.fts} 
          @@ to_tsquery(${searchParams.search
            .split(" ")
            .filter((word) => word.length > 0)
            .map((word) => word + ":*")
            .join(" | ")}
            )
        `,
      );
    }

    const playgrounds = serverDb
      .select({
        id: serverDb.schema.playground.id,
        name: serverDb.schema.playground.name,
        description: serverDb.schema.playground.description,
        dialect: serverDb.schema.playground.dialect,
        updatedAt: serverDb.schema.playground.updatedAt,
        creator: {
          avatarUrl: serverDb.schema.user.avatarUrl,
          username: serverDb.schema.user.username,
        },
      })
      .from(serverDb.schema.playground)
      .leftJoin(
        serverDb.schema.user,
        eq(serverDb.schema.playground.creatorId, serverDb.schema.user.id),
      )
      .where(and(...filters))
      .orderBy(desc(serverDb.schema.playground.updatedAt))
      .limit(1_000)
      .execute();

    return data({
      playgrounds,
      dialectOption: searchParams.dialect,
      search: searchParams.search,
    });
  } catch (cause) {
    const reason = handleError(cause);
    throw error(reason);
  }
};

export default function Route() {
  const { data } = useLoaderData<typeof loader>();
  const submit = useDebounceSubmit();
  const searchFetcher = useFetcher<typeof loader>({ key: "search" });
  const playgrounds =
    searchFetcher.data?.data.playgrounds || data.playgrounds || [];
  const search = searchFetcher.data?.data.search || data.search || "";
  const dialectOption =
    searchFetcher.data?.data.dialectOption || data.dialectOption;
  const searchParams = {
    dialect: dialectOption,
    search,
  };

  return (
    <Layout>
      <Input
        name="search"
        placeholder="Search playgrounds by keyword"
        className="dzl-max-w-xs dzl-text-center"
        type="search"
        onChange={(e) => {
          submit(
            { ...searchParams, [e.target.name]: e.target.value },
            {
              navigate: false,
              fetcherKey: "search",
              debounceTimeout: 200,
            },
          );
        }}
      />

      <ToggleGroup
        type="single"
        value={dialectOption}
        onValueChange={(dialect) => {
          if (!dialect || dialectOption === dialect) {
            return;
          }
          submit(
            {
              ...searchParams,
              dialect,
            },
            {
              navigate: false,
              fetcherKey: "search",
            },
          );
        }}
      >
        {dialectOptions.map((dialect) => (
          <ToggleGroupItem key={dialect} value={dialect}>
            {dialect}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <div className="dzl-flex dzl-w-full dzl-flex-wrap dzl-gap-2 dzl-overflow-y-auto dzl-scrollbar-thin dzl-scrollbar-track-transparent dzl-scrollbar-thumb-primary">
        <Suspense
          fallback={
            <div className="dzl-flex dzl-flex-col dzl-items-center dzl-justify-center dzl-gap-4">
              <RainLogo className="dzl-h-10 dzl-animate-pulse" />
              <Typography variant="mutedText" className="dzl-animate-pulse">
                Loading playgrounds
              </Typography>
            </div>
          }
        >
          <Await resolve={playgrounds}>
            {(playgrounds) =>
              playgrounds.map((playground) => (
                <Link key={playground.id} to={`/${playground.id}`}>
                  <Card className="hover:dzl-bg-accent">
                    <CardHeader className="dzl-flex dzl-flex-col dzl-gap-2">
                      <Badge variant="outline" className="dzl-w-fit">
                        {playground.dialect}
                      </Badge>
                      <CardTitle className="dzl-text-lg">
                        {playground.name}
                      </CardTitle>
                    </CardHeader>
                    {playground.description && (
                      <CardContent>{playground.description}</CardContent>
                    )}
                    <CardFooter className="dzl-gap-2">
                      <Avatar className="dzl-size-6">
                        <AvatarImage
                          src={playground.creator?.avatarUrl || ""}
                          alt={playground.creator?.username}
                        />
                        <AvatarFallback />
                      </Avatar>

                      <Typography variant="mutedText">
                        @{playground?.creator?.username || "Anonymous"}
                      </Typography>
                    </CardFooter>
                  </Card>
                </Link>
              ))
            }
          </Await>
        </Suspense>
      </div>
    </Layout>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dzl-flex dzl-h-full dzl-flex-col dzl-items-center dzl-gap-6 dzl-overflow-hidden dzl-p-6">
      {children}
    </div>
  );
}
