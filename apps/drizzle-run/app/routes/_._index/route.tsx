import type React from "react";

import { Link, type MetaFunction } from "react-router";
import { Badge } from "~/components/ui/badge";
import { buttonVariants } from "~/components/ui/button";
import { Icon } from "~/components/ui/icon";
import { Typography } from "~/components/ui/typography";
import { cn } from "~/utils/cn";

import { CatchError } from "~/components/catch-error";
import { DrizzleLogo } from "~/components/logo";
import { NewPlaygroundWizard } from "~/routes/api.playground/route";
import { env } from "~/utils/env";
import { path, QUERY_KEY } from "~/utils/http";
import { robot } from "~/utils/robot";

import { usePlaygrounds } from "../_/route";

export const meta: MetaFunction = () => {
  const ogUrl = new URL(`${env.APP_URL}/api/og`);
  ogUrl.searchParams.set("v", "1");

  const imgUrl = ogUrl.toString();

  const title = env.APP_NAME;

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
      content: `${env.APP_URL}`,
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

export default function View() {
  const { playgrounds, isAuthenticated } = usePlaygrounds();

  return (
    <Layout>
      <div className="flex flex-col items-center w-fit">
        <div className="flex items-center gap-1">
          <DrizzleLogo className="h-20" />

          <Typography as="span" className="pt-2 text-green text-3xl">
            Run
          </Typography>
        </div>
        <Badge variant="secondary" className="bg-amber-950 text-amber-500">
          Work in progress
        </Badge>
      </div>

      <div className="flex flex-col items-center gap-4">
        <Typography>Would you like to see what the community has shared?</Typography>
        <Link to="/explore" className={buttonVariants({ variant: "outline", size: "lg" })}>
          <Icon name="telescope" size="md">
            Explore shared playgrounds
          </Icon>
        </Link>
      </div>

      <NewPlaygroundWizard className="max-w-[80%]">
        {playgrounds.length > 0 ? <RecentPlaygrounds /> : null}
      </NewPlaygroundWizard>

      {!isAuthenticated && (
        <div className="flex flex-col justify-center items-center gap-4">
          <Link
            to={path("/auth/sign-in", {
              [QUERY_KEY.redirectTo]: location.pathname,
            })}
            className={buttonVariants({
              variant: "secondary",
            })}
          >
            <Icon name="github" size="md">
              Sign in with GitHub
            </Icon>
          </Link>
          <Typography variant="smallText" className="text-center">
            Share your playgrounds and save them for later
          </Typography>
        </div>
      )}
    </Layout>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center h-full">
      <div className="flex flex-col justify-center items-center gap-20 size-full">{children}</div>
    </div>
  );
}

function RecentPlaygrounds() {
  const { playgrounds } = usePlaygrounds();

  return (
    <>
      <Typography variant="largeText">Recent playgrounds</Typography>
      {playgrounds.length === 0 ? (
        <Typography variant="mutedText">You don't have any playgrounds yet</Typography>
      ) : (
        <div className="flex flex-col gap-2 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-primary">
          {playgrounds.map((playground) => (
            <Link
              to={`/${playground.id}`}
              key={playground.id}
              className={cn(
                buttonVariants({
                  variant: "outline",
                  className: "justify-start",
                }),
                "w-full shrink-0 gap-2 overflow-hidden px-2"
              )}
            >
              <Badge variant="outline">{playground.dialect}</Badge>

              {playground.isShared && <Badge variant="outline">shared</Badge>}

              <Typography variant="smallText" className="truncate">
                {playground.name}
              </Typography>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
