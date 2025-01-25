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
    <div className="dzl-flex dzl-max-w-60 dzl-flex-col dzl-items-center dzl-gap-4">
      <Icon name="ghost" className="dzl-size-20 dzl-text-red" />
      <Typography variant="largeText" className="dzl-mt-2 dzl-text-center">
        {message}
      </Typography>
      {reason ? (
        <Typography variant="mutedText" className="dzl-text-center">
          {reason}
        </Typography>
      ) : null}
      {paramsError ? (
        <Typography variant="mutedText">
          <pre className="dzl-text-xs">
            {JSON.stringify(paramsError, null, 2)}
          </pre>
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
