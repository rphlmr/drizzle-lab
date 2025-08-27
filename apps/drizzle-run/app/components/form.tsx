import { type FieldMetadata, FormProvider, useField, useForm as useFormBase } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod";
import type React from "react";
import { type FetcherWithComponents, Form as RRForm, type FormProps as RRFormProps } from "react-router";
import type { ZodTypeAny, z } from "zod";
import { cn } from "~/utils/cn";
import type { LoaderOrActionResponse } from "~/utils/http";
import { Typography } from "./ui/typography";

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

interface FormProps extends RRFormProps {
  context?: React.ComponentPropsWithoutRef<typeof FormProvider>["context"];
  fetcher?: FetcherWithComponents<unknown>;
}

export function Form({ context, fetcher, ...props }: FormProps) {
  const FormComponent = fetcher?.Form || RRForm;

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
