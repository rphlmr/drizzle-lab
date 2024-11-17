import type React from "react";
import { useMemo, useState } from "react";

import { getInputProps } from "@conform-to/react";
import { type ClientActionFunctionArgs, useFetcher } from "@remix-run/react";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/select";
import { Separator } from "@repo/ui/components/separator";
import { ToggleGroup, ToggleGroupItem } from "@repo/ui/components/toggle-group";
import { Typography } from "@repo/ui/components/typography";
import { cn } from "@repo/ui/utils/cn";
import { z } from "zod";

import { Form, useForm } from "~/components/form";
import { localDb } from "~/database/.client/db";
import {
  asDialect,
  type Dialect,
  DialectSchema,
  getPresetFiles,
  getPresetsManifest,
  type PresetManifest,
} from "~/registry";
import { AppError, handleError } from "~/utils/error";
import { clientRedirect, error, parsePayload } from "~/utils/http";

const actionType = {
  newPlayground: "new-playground",
} as const;

export type ActionType = (typeof actionType)[keyof typeof actionType];

const NewPlaygroundSchema = z.object({
  actionType: z.literal(actionType.newPlayground, {
    required_error: "Action type is required",
    invalid_type_error: "Action type is invalid",
  }),
  dialect: DialectSchema,
  presetId: z.string().min(1),
  name: z.string().min(1),
});

const Schema = z.discriminatedUnion("actionType", [NewPlaygroundSchema]);

export async function clientAction({ request }: ClientActionFunctionArgs) {
  try {
    const payload = parsePayload(await request.formData(), Schema);

    switch (payload.actionType) {
      case "new-playground": {
        const [{ id }] = await localDb
          .insert(localDb.schema.playground)
          .values({
            dialect: payload.dialect,
            name: payload.name,
            content: await getPresetFiles(payload.dialect, payload.presetId),
          })
          .returning({ id: localDb.schema.playground.id });

        throw clientRedirect(`/${id}`);
      }
      default: {
        throw new AppError({
          cause: null,
          status: 404,
          message: "Action type not handled",
          label: "Bad request 🚫",
        });
      }
    }
  } catch (cause) {
    const reason = handleError(cause);
    return error(reason);
  }
}

interface NewPlaygroundWizardProps {
  children?: React.ReactNode;
  className?: string;
}

export function NewPlaygroundWizard(props: NewPlaygroundWizardProps) {
  const manifest = useMemo(() => getPresetsManifest(), []);
  const [dialect, setDialect] = useState<Dialect>("postgresql");
  const [presetId, setPresetId] = useState<PresetManifest["id"]>("");
  const preset = manifest[dialect].find((preset) => preset.id === presetId);

  return (
    <div
      className={cn("flex size-full max-h-80 overflow-hidden", props.className)}
    >
      <WizardContent>
        <div className="flex flex-col gap-4">
          <Typography variant="largeText">Start</Typography>

          <Select
            defaultValue={dialect}
            onValueChange={(dialect: Dialect) => setDialect(dialect)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a dialect" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={asDialect("postgresql")}>
                <span className="font-medium">PostgreSQL</span>
              </SelectItem>
              <SelectItem value={asDialect("sqlite")}>
                <span className="font-medium">SQLite</span>
              </SelectItem>
            </SelectContent>
          </Select>
          <Typography variant="smallText">Presets</Typography>
          <ToggleGroup
            type="single"
            className="flex flex-col gap-2"
            onValueChange={(preset) => setPresetId(preset)}
          >
            {manifest[dialect].map((preset) => (
              <ToggleGroupItem
                key={preset.id}
                value={preset.id}
                variant="outline"
                className="w-full justify-start"
              >
                <Typography variant="smallText" className="truncate">
                  {preset.name}
                </Typography>
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      </WizardContent>
      <Separator orientation="vertical" className="mx-4" />
      <WizardContent>
        {preset ? (
          <NewPlaygroundForm
            key={preset.id}
            preset={preset}
            dialect={dialect}
          />
        ) : (
          props.children || <NoPresetSelected />
        )}
      </WizardContent>
    </div>
  );
}

interface NewPlaygroundFormProps {
  preset: PresetManifest;
  dialect: Dialect;
}

function NewPlaygroundForm({ preset, dialect }: NewPlaygroundFormProps) {
  const fetcher = useFetcher<typeof clientAction>();
  const [form, fields] = useForm({
    lastResult: fetcher.data,
    schema: NewPlaygroundSchema,
    defaultValue: {
      actionType: "new-playground",
      dialect,
      name: `New ${preset.name.toLowerCase()} playground`,
      presetId: preset.id,
    },
  });

  return (
    <div className="flex w-full flex-1 flex-col gap-4">
      <Typography variant="largeText">{preset.name}</Typography>
      <Typography variant="smallText">{preset.description}</Typography>
      <Form
        fetcher={fetcher}
        context={form.context}
        method="post"
        action="/api/playground"
        id={form.id}
        onSubmit={form.onSubmit}
        className="flex flex-col gap-4"
      >
        <input {...getInputProps(fields.actionType, { type: "hidden" })} />
        <input {...getInputProps(fields.dialect, { type: "hidden" })} />
        <input {...getInputProps(fields.presetId, { type: "hidden" })} />
        <Input
          {...getInputProps(fields.name, {
            type: "text",
          })}
          placeholder="Playground name"
        />
        <Button className="w-fit self-end" size="sm" type="submit">
          Create
        </Button>
      </Form>
      <div className="flex flex-col gap-1">
        <Typography variant="mutedText">
          Do not put any sensitive data in your playground
        </Typography>
        <Typography variant="mutedText">All playgrounds are public</Typography>
      </div>
    </div>
  );
}

function NoPresetSelected() {
  return (
    <div className="flex size-full flex-1 flex-col items-center justify-center">
      <Typography variant="largeText">
        👈 Select a preset to continue
      </Typography>
    </div>
  );
}

function WizardContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex w-full flex-1 flex-col gap-4 overflow-hidden px-4",
        className,
      )}
    >
      {children}
    </div>
  );
}
