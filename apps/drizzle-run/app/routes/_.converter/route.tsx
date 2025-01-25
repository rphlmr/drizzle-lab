import { NavLink, Outlet, type MetaFunction } from "@remix-run/react";
import { Badge } from "@repo/ui/components/badge";
import { Button, buttonVariants } from "@repo/ui/components/button";
import { Icon } from "@repo/ui/components/icon";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@repo/ui/components/popover";
import { Separator } from "@repo/ui/components/separator";
import { Typography } from "@repo/ui/components/typography";
import { cn } from "@repo/ui/utils/cn";

import { Toolbar } from "~/components/toolbar";
import { env } from "~/utils/env";
import { path } from "~/utils/http";
import { robot } from "~/utils/robot";

export const meta: MetaFunction = ({ location }) => {
  const ogUrl = new URL(`${env.APP_URL}/api/og`);
  ogUrl.searchParams.set("v", "1");
  ogUrl.searchParams.set("o", "converter");

  const imgUrl = ogUrl.toString();

  const title = `Converter - ${env.APP_NAME}`;

  return [
    { title },
    { name: "description", content: "From Drizzle to SQL" },
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
      content: `${env.APP_URL}${location.pathname}`,
    },
    { property: "og:type", content: "website" },
    { property: "og:site_name", content: env.APP_NAME },
    { property: "og:locale", content: "en_US" },
    ...robot.public,
  ];
};

export default function Route() {
  return (
    <>
      <Toolbar>
        <HowTo />
      </Toolbar>
      <div className="dzl-flex dzl-size-full dzl-flex-col">
        <Badge className="dzl-mt-2 dzl-w-fit dzl-self-center dzl-bg-amber-950 dzl-text-amber-500">
          Experimental features. No guarantees it will work or be kept.
        </Badge>
        <div className="dzl-relative dzl-flex dzl-items-center dzl-justify-center dzl-gap-2 dzl-self-center dzl-py-2">
          <NavLink
            to={path("/converter")}
            end
            className={({ isActive }) =>
              buttonVariants({
                variant: isActive ? "secondary" : "ghost",
                size: "sm",
                className: cn(isActive && "dzl-pointer-events-none"),
              })
            }
          >
            <span>Drizzle to SQL</span>
          </NavLink>
          <NavLink
            end
            to={path("/converter/sql")}
            className={({ isActive }) =>
              buttonVariants({
                variant: isActive ? "secondary" : "ghost",
                size: "sm",
                className: cn(isActive && "dzl-pointer-events-none"),
              })
            }
          >
            <span>SQL to Drizzle</span>
          </NavLink>
        </div>

        <Outlet />
      </div>
    </>
  );
}

function HowTo() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">How to use?</Button>
      </PopoverTrigger>
      <PopoverContent>
        <div className="flex flex-col gap-2">
          <Typography variant="largeText">
            How to use Drizzle schema converter
          </Typography>
          <Typography variant="smallText">
            Write your schema in TypeScript as usual in the editor on the left
          </Typography>
          <Typography variant="smallText">
            Imports are required, and so is the export statement for your tables
          </Typography>
          <Typography variant="mutedText">
            Everything runs in your browser, the schema is only persisted in
            session storage to prevent loss on unexpected refreshes.
          </Typography>
          <Typography variant="smallText" className="dzl-text-red">
            SQL to Drizzle does not support MySQL
            <br />
            (does not work in the browser, yet?)
          </Typography>
          <Separator />
          <a
            href="https://orm.drizzle.team/docs/sql-schema-declaration"
            target="_blank"
            rel="noreferrer"
            className="dzl-flex dzl-items-center dzl-gap-2 hover:dzl-underline"
          >
            <Typography variant="smallText">Drizzle documentation</Typography>
            <Icon name="external-link" size="md" />
          </a>
        </div>
      </PopoverContent>
    </Popover>
  );
}
