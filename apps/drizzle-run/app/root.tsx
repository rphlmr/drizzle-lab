import { Links, type LinksFunction, Meta, Outlet, Scripts, ScrollRestoration, useRouteLoaderData } from "react-router";
import { Toaster } from "~/components/ui/sonner";
import { TooltipProvider } from "~/components/ui/tooltip";
import "./app.css";
import { CatchError } from "~/components/catch-error";
import { success } from "~/utils/http";
import type { Route } from "./+types/root";
import { env, getBrowserEnv } from "./utils/env";

export const links: LinksFunction = () => [
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
  return success({
    env: getBrowserEnv(),
  });
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { success } =
    useRouteLoaderData<Route.ComponentProps["loaderData"]>("root" satisfies RouteIdMatch<Route.ComponentProps>) || {};

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="w-screen h-dvh overscroll-none dark">
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster />
        <ScrollRestoration />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.env = ${JSON.stringify(success?.env)}`,
          }}
        />
        {env.NODE_ENV === "production" && (
          <script defer data-site-id="drizzle.run" src="https://assets.onedollarstats.com/tracker.js" />
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
    <div className="flex justify-center items-center h-screen">
      <CatchError redirectTo="/" />
    </div>
  );
}
