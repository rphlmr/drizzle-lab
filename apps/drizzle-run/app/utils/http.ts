import { parseWithZod } from "@conform-to/zod";
import { type Params, redirect } from "react-router";
import type { ZodTypeAny } from "zod";

import { AppError } from "~/utils/error";

export { redirect as clientRedirect };

export function failure(cause: AppError) {
  console.error(JSON.stringify(cause, null, 2));

  return {
    success: null,
    failure: {
      message: cause.message,
      label: cause.label,
      ...(cause.additionalData && {
        additionalData: cause.additionalData,
      }),
      ...(cause.traceId && { traceId: cause.traceId }),
    },
  };
}

export type FailureResponse = ReturnType<typeof failure>;

export function success<T>(success: T) {
  return { success, failure: null };
}

export type SuccessResponse<T> = ReturnType<typeof success<T>>;

export type LoaderOrActionResponse<T> = SuccessResponse<T> | FailureResponse;

export function isFailureResponse(response: unknown): response is FailureResponse {
  return (
    typeof response === "object" &&
    response !== null &&
    "data" in response &&
    response.data === null &&
    "error" in response &&
    typeof response.error === "object" &&
    response.error !== null &&
    "message" in response.error &&
    typeof response.error.message === "string" &&
    "label" in response.error &&
    typeof response.error.label === "string"
  );
}

export const QUERY_KEY = {
  redirectTo: "redirectTo",
};

export function path(
  path: string,
  searchParams?: Record<string, string | number | boolean | null | undefined> | undefined
) {
  const init = Object.entries(searchParams || {})
    .map(([key, value]) => {
      const serializedValue = String(value);

      if (value == null || !serializedValue) {
        return null;
      }

      return [key, serializedValue];
    })
    .filter(Boolean);

  return `${path}${init.length > 0 ? `?${new URLSearchParams(init)}` : ""}`;
}

/**
 * This should be used any time the redirect path is user-provided
 * (Like the query string on our login/signup pages). This avoids
 * open-redirect vulnerabilities.
 * @param {string} to The redirect destination
 * @param {string} defaultRedirect The redirect to use if the to is unsafe.
 */
export function safeRedirect(to: FormDataEntryValue | string | null | undefined, defaultRedirect = "/") {
  if (!to || typeof to !== "string" || !to.startsWith("/") || to.startsWith("//")) {
    return defaultRedirect;
  }

  return to;
}

export function parsePayload<Schema extends ZodTypeAny>(payload: FormData | URLSearchParams, schema: Schema) {
  const submission = parseWithZod(payload, { schema });

  if (submission.status !== "success") {
    throw new AppError({
      cause: null,
      status: 400,
      message: "Payload is invalid",
      label: "Bad request 🚫",
      additionalData: {
        submissionResult: submission.reply(),
      },
    });
  }

  return submission.value;
}

export function getSearchParams(request: Request) {
  return new URL(request.url).searchParams;
}

export function parseParams<Schema extends ZodTypeAny>(params: Params<string>, schema: Schema) {
  const values = schema.safeParse(params);

  if (!values.success) {
    throw new AppError({
      cause: null,
      status: 400,
      message: "Params are invalid",
      label: "Bad request 🚫",
      additionalData: {
        params,
        paramsErrors: values.error.formErrors.fieldErrors,
      },
    });
  }

  return values.data as Schema["_output"];
}

export function assertActionType<ActionType, ExpectedType extends ActionType>(
  actionType: ActionType,
  expectedType: ExpectedType
): asserts actionType is ExpectedType {
  if (actionType !== expectedType) {
    throw new Error("Unexpected action type");
  }
}
