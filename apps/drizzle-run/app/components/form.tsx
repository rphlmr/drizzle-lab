import type React from "react";

import {
  type FieldMetadata,
  FormProvider,
  useField,
  useForm as useFormBase,
} from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod";
import {
  type FormProps as RemixFormProps,
  Form as RemixForm,
} from "@remix-run/react";
import { Typography } from "@repo/ui/components/typography";
import { cn } from "@repo/ui/utils/cn";
import type { FetcherWithComponents } from "react-router-dom";
import type { z, ZodTypeAny } from "zod";

import type { LoaderOrActionResponse } from "~/utils/http";

interface FieldErrorProps extends React.HTMLAttributes<HTMLParagraphElement> {
  field: FieldMetadata<unknown>;
  className?: string;
  children?: React.ReactNode;
}

export function FieldError({ field, className, ...props }: FieldErrorProps) {
  const [meta] = useField(field.name);

  const error = meta.errors?.[0];

  if (!error) {
    return null;
  }

  return (
    <Typography
      variant="smallText"
      id={meta.errorId}
      className={cn("font-medium text-destructive", className)}
      {...props}
    >
      {error}
    </Typography>
  );
}

interface FormProps extends RemixFormProps {
  context?: React.ComponentPropsWithoutRef<typeof FormProvider>["context"];
  fetcher?: FetcherWithComponents<unknown>;
}

export function Form({ context, fetcher, ...props }: FormProps) {
  const FormComponent = fetcher?.Form || RemixForm;

  return context ? (
    <FormProvider context={context}>
      <FormComponent {...props} />
    </FormProvider>
  ) : (
    <FormComponent {...props} />
  );
}

type FormOption<Schema extends ZodTypeAny> = Omit<
  Parameters<typeof useFormBase<z.input<Schema>>>[number],
  "lastResult"
> & {
  schema: Schema;
  lastResult: LoaderOrActionResponse<unknown> | undefined;
  defaultValue?: Partial<Schema["_input"]>;
};

export function useForm<Schema extends ZodTypeAny>({
  schema,
  lastResult,
  ...options
}: FormOption<Schema>) {
  return useFormBase({
    lastResult: lastResult?.error?.additionalData?.submissionResult,
    onValidate({ formData }) {
      return parseWithZod<Schema>(formData, { schema });
    },
    shouldValidate: "onBlur",
    ...options,
  });
}
