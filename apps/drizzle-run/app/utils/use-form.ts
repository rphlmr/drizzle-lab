import { useForm as useFormBase } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod";
import type { ZodTypeAny, z } from "zod/v3";

import type { LoaderOrActionResponse } from "~/utils/http";

type FormOption<Schema extends ZodTypeAny> = Omit<
  Parameters<typeof useFormBase<z.input<Schema>>>[number],
  "lastResult"
> & {
  schema: Schema;
  lastResult: LoaderOrActionResponse<unknown> | undefined;
};

export function useForm<Schema extends ZodTypeAny>({ schema, lastResult, ...options }: FormOption<Schema>) {
  return useFormBase({
    lastResult: lastResult?.failure?.additionalData?.submissionResult,
    onValidate({ formData }) {
      return parseWithZod<Schema>(formData, { schema });
    },
    shouldValidate: "onBlur",
    ...options,
  });
}
