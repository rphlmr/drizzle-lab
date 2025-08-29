import { Link, useRouteError } from "react-router";

import type { AdditionalData } from "~/utils/error";
import { isFailureResponse } from "~/utils/http";
import { buttonVariants } from "./ui/button";
import { Icon } from "./ui/icon";
import { Typography } from "./ui/typography";

interface CatchErrorProps {
  redirectTo?: string;
}

export function CatchError({ redirectTo = "/" }: CatchErrorProps) {
  const error = useRouteError();
  let message = "Something went wrong";
  let reason = "";
  let paramsError: AdditionalData["paramsErrors"];

  if (isFailureResponse(error)) {
    message = error.failure.message;
    reason = error.failure.additionalData?.reason || "";
    paramsError = error.failure.additionalData?.paramsErrors;
  }

  if (error instanceof Error) {
    message = error.message;
  }

  return (
    <div className="flex flex-col items-center gap-4 max-w-60">
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
      <Link to={redirectTo} className={buttonVariants({ variant: "secondary" })} reloadDocument>
        Reload
      </Link>
    </div>
  );
}
