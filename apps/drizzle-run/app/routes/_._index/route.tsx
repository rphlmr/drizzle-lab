import type React from "react";

import { Link, type MetaFunction } from "@remix-run/react";
import { Badge } from "@repo/ui/components/badge";
import { buttonVariants } from "@repo/ui/components/button";
import { Icon } from "@repo/ui/components/icon";
import { Typography } from "@repo/ui/components/typography";
import { cn } from "@repo/ui/utils/cn";

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

export default function Route() {
  const { playgrounds, isAuthenticated } = usePlaygrounds();

  return (
    <Layout>
      <div className="dzl-flex dzl-w-fit dzl-flex-col dzl-items-center">
        <div className="dzl-flex dzl-items-center dzl-gap-1">
          <DrizzleLogo className="dzl-h-20" />

          <Typography
            as="span"
            className="dzl-pt-2 dzl-text-3xl dzl-text-green"
          >
            Run
          </Typography>
        </div>
        <Badge
          variant="secondary"
          className="dzl-bg-amber-950 dzl-text-amber-500"
        >
          Work in progress
        </Badge>
      </div>

      <div className="dzl-flex dzl-flex-col dzl-items-center dzl-gap-4">
        <Typography>
          Would you like to see what the community has shared?
        </Typography>
        <Link
          to="/explore"
          className={buttonVariants({ variant: "outline", size: "lg" })}
        >
          <Icon name="telescope" size="md">
            Explore shared playgrounds
          </Icon>
        </Link>
      </div>

      <NewPlaygroundWizard className="dzl-max-w-[80%]">
        {playgrounds.length > 0 ? <RecentPlaygrounds /> : null}
      </NewPlaygroundWizard>

      {!isAuthenticated && (
        <div className="dzl-flex dzl-flex-col dzl-items-center dzl-justify-center dzl-gap-4">
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
          <Typography variant="smallText" className="dzl-text-center">
            Share your playgrounds and save them for later
          </Typography>
        </div>
      )}
    </Layout>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dzl-flex dzl-h-full dzl-flex-col dzl-items-center">
      <div className="dzl-flex dzl-size-full dzl-flex-col dzl-items-center dzl-justify-center dzl-gap-20">
        {children}
      </div>
    </div>
  );
}

function RecentPlaygrounds() {
  const { playgrounds } = usePlaygrounds();

  return (
    <>
      <Typography variant="largeText">Recent playgrounds</Typography>
      {playgrounds.length === 0 ? (
        <Typography variant="mutedText">
          You don't have any playgrounds yet
        </Typography>
      ) : (
        <div className="dzl-flex dzl-flex-col dzl-gap-2 dzl-overflow-y-auto dzl-scrollbar-thin dzl-scrollbar-track-transparent dzl-scrollbar-thumb-primary">
          {playgrounds.map((playground) => (
            <Link
              to={`/${playground.id}`}
              key={playground.id}
              className={cn(
                buttonVariants({
                  variant: "outline",
                  className: "dzl-justify-start",
                }),
                "dzl-w-full dzl-shrink-0 dzl-gap-2 dzl-overflow-hidden dzl-px-2",
              )}
            >
              <Badge variant="outline">{playground.dialect}</Badge>

              {playground.isShared && <Badge variant="outline">shared</Badge>}

              <Typography variant="smallText" className="dzl-truncate">
                {playground.name}
              </Typography>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
