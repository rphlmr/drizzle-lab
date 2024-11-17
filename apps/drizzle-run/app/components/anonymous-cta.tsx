import { Link, useLocation } from "@remix-run/react";
import { buttonVariants } from "@repo/ui/components/button";
import { Icon } from "@repo/ui/components/icon";
import { Typography } from "@repo/ui/components/typography";

import { DrizzleLogo } from "~/components/logo";
import { path, QUERY_KEY } from "~/utils/http";

export function AnonymousCTA() {
  const location = useLocation();

  return (
    <div className="flex max-w-52 flex-col items-center gap-2">
      <div className="flex items-center gap-1">
        <DrizzleLogo className="h-12" />
        <Typography as="span" className="pt-1 text-lg text-green">
          Run
        </Typography>
      </div>
      <Link
        to={path("/auth/sign-in", {
          [QUERY_KEY.redirectTo]: location.pathname,
        })}
        className={buttonVariants({ variant: "secondary" })}
      >
        <Icon name="github" size="md">
          Sign in with GitHub
        </Icon>
      </Link>
    </div>
  );
}
