import { Link, useRouteError } from "@remix-run/react";
import { buttonVariants } from "@repo/ui/components/button";
import { Icon } from "@repo/ui/components/icon";
import { Typography } from "@repo/ui/components/typography";

import type { AdditionalData } from "~/utils/error";
import { isErrorResponse } from "~/utils/http";

interface CatchErrorProps {
  redirectTo?: string;
}

export function CatchError({ redirectTo = "/" }: CatchErrorProps) {
  const error = useRouteError();
  let message = "Something went wrong";
  let reason = "";
  let paramsError: AdditionalData["paramsErrors"];

  if (isErrorResponse(error)) {
    message = error.error.message;
    reason = error.error.additionalData?.reason || "";
    paramsError = error.error.additionalData?.paramsErrors;
  }

  if (error instanceof Error) {
    message = error.message;
  }

  return (
    <div className="flex max-w-60 flex-col items-center gap-4">
      <Icon name="ghost" className="size-20 text-red" />
      <Typography variant="largeText" className="mt-2 text-center">
        {message}
      </Typography>
      {reason ? (
        <Typography variant="mutedText" className="text-center">
          {reason}
        </Typography>
      ) : null}
      {paramsError ? (
        <Typography variant="mutedText">
          <pre className="text-xs">{JSON.stringify(paramsError, null, 2)}</pre>
        </Typography>
      ) : null}
      <Link
        to={redirectTo}
        className={buttonVariants({ variant: "secondary" })}
        reloadDocument
      >
        Reload
      </Link>
    </div>
  );
}
