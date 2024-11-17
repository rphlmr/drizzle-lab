import type { SubmissionResult } from "@conform-to/dom";

/**
 * Additional data to help us debug.
 */
export type AdditionalData = Record<string, unknown> & {
  submissionResult?: SubmissionResult;
  reason?: string;
  paramsErrors?: Record<string, string[] | undefined>;
};

/**
 * @param message The message intended for the user.
 *
 * Other params are for logging purposes and help us debug.
 * @param label The label of the error to help us debug and filter logs.
 * @param cause The error that caused the rejection.
 * @param additionalData Additional data to help us debug.
 *
 */
type FailureReason = {
  label:
    | "Unknown 🐞"
    | "Auth 🔐"
    | "Bad request 🚫"
    | "Preset 🏗️"
    | "Playground 📦"
    | "Healthcheck 🏥"
    | "Dev error 🤦‍♂️"; // ... anything you want to help you debug / filter in Sentry
  cause: unknown | null;
  message: string;
  additionalData?: AdditionalData;
  traceId?: string;
  status?:
    | 200 // ok
    | 204 // no content
    | 400 // bad request
    | 401 // unauthorized
    | 403 // forbidden
    | 404 // not found
    | 405 // method not allowed
    | 409 // conflict
    | 500; // internal server error;
};

/**
 * A custom error class to normalize the error handling in our app.
 */
export class AppError extends Error {
  readonly label: FailureReason["label"];
  readonly cause: FailureReason["cause"];
  readonly additionalData: FailureReason["additionalData"];
  readonly status: FailureReason["status"];
  traceId: FailureReason["traceId"];

  constructor({
    message,
    status,
    cause = null,
    additionalData,
    label,
    traceId,
  }: FailureReason) {
    super();
    this.name = "AppError";
    this.label = label;
    this.message = message;
    this.status =
      cause instanceof AppError ? cause.status || status || 500 : status || 500;
    this.cause = cause;
    this.additionalData = additionalData;
    this.traceId = traceId || crypto.randomUUID();
  }
}

/**
 * Check if an error is an instance of `AppError` or a redirect response.
 *
 * **Should be only used in a loader or action.**
 *
 * If it is a redirect response, it is re-thrown.
 *
 * Otherwise, we enrich the error with the additional data.
 *
 * If we can not do anything with the cause, we return a default error.
 */
export function handleError(cause: unknown, additionalData?: AdditionalData) {
  if (cause instanceof Response) {
    throw cause;
  }

  if (cause instanceof AppError) {
    // Copy the original error and enrich it with additional data
    return new AppError({
      ...cause,
      additionalData: {
        ...cause.additionalData,
        ...additionalData,
      },
    });
  }

  // We don't know what this error is, so we create a new default one.
  return new AppError({
    cause,
    message: "Sorry, an unexpected error occurred.",
    additionalData,
    label: "Unknown 🐞",
  });
}
