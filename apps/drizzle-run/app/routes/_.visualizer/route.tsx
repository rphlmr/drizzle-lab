import { Link, type MetaFunction } from "react-router";
import { Typography } from "~/components/ui/typography";

import { CatchError } from "~/components/catch-error";
import { env } from "~/utils/env";
import { robot } from "~/utils/robot";

export const meta: MetaFunction = () => {
  const ogUrl = new URL(`${env.APP_URL}/api/og`);
  ogUrl.searchParams.set("v", "1");
  ogUrl.searchParams.set("o", "visualizer");

  const imgUrl = ogUrl.toString();

  const title = `Visualizer - ${env.APP_NAME}`;

  return [
    { title },
    { name: "description", content: "An other view of your schema" },
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
      content: `${env.APP_URL}/visualizer`,
    },
    { property: "og:type", content: "website" },
    { property: "og:site_name", content: env.APP_NAME },
    { property: "og:locale", content: "en_US" },
    ...robot.public,
  ];
};

export function ErrorBoundary() {
  return <CatchError redirectTo="/" />;
}

export default function View() {
  return (
    <div className="flex flex-col justify-center items-center gap-12 size-full">
      <Typography variant="largeText">Drizzle Visualizer is now available as a standalone app.</Typography>
      <code className="text-muted-foreground">npx drizzle-lab@latest visualizer</code>
      <Link to="https://www.npmjs.com/package/drizzle-lab?activeTab=readme" target="_blank" rel="noreferrer">
        View on npm
      </Link>
    </div>
  );
}
