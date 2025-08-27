import { Link, useLocation } from "react-router";

import { DrizzleLogo } from "~/components/logo";
import { path, QUERY_KEY } from "~/utils/http";
import { Typography } from "./ui/typography";
import { buttonVariants } from "./ui/button";
import { Icon } from "./ui/icon";

export function AnonymousCTA() {
  const location = useLocation();

  return (
    <div className="flex flex-col items-center gap-2 max-w-52">
      <div className="flex items-center gap-1">
        <DrizzleLogo className="h-12" />
        <Typography as="span" className="pt-1 text-green text-lg">
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
