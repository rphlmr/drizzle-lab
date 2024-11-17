import type { LinksFunction } from "@remix-run/node";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useRouteLoaderData,
} from "@remix-run/react";
import { Toaster } from "@repo/ui/components/sonner";
import { TooltipProvider } from "@repo/ui/components/tooltip";
import stylesheet from "@repo/ui/css/base.css?url";

import { CatchError } from "~/components/catch-error";
import { data } from "~/utils/http";

import { env, getBrowserEnv } from "./utils/env";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: stylesheet },
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
  },
  {
    rel: "stylesheet preload prefetch",
    href: "https://fonts.googleapis.com/css2?family=Inter:wght@100;200;300;400;500;600;700;800;900&display=swap",
    as: "style",
  },
];

export function loader() {
  return data({
    env: getBrowserEnv(),
  });
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { data } = useRouteLoaderData<typeof loader>("root") || {};

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="dark h-dvh w-screen overscroll-none">
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster />
        <ScrollRestoration />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.env = ${JSON.stringify(data?.env)}`,
          }}
        />
        {env.NODE_ENV === "production" && (
          <script
            defer
            data-site-id="drizzle.run"
            src="https://assets.onedollarstats.com/tracker.js"
          ></script>
        )}
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary() {
  return (
    <div className="flex h-screen items-center justify-center">
      <CatchError redirectTo="/" />
    </div>
  );
}
