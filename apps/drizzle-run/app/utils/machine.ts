import type { AnyActorRef, ErrorActorEvent, EventObject } from "xstate";

export function actorNotProvided() {
  return new Error(
    `Actor is not provided. Did you forget to call "provide" on the machine?`,
  );
}

export interface InvokeError {
  message: string;
  cause: unknown;
}

export type ActorNotification<
  Id extends string,
  Payload extends { type: string } | undefined = undefined,
> =
  | { type: `${Id}.done`; payload?: Payload }
  | { type: `${Id}.error`; error: InvokeError };

export interface SenderRef<ActorEvent> extends AnyActorRef {
  send: (event: ActorEvent) => void;
}

export type InvokeFailure = { message: string; cause?: string | null };

export function makeInvokeFailure(
  eventObject: EventObject,
  defaultMessage = "Something went wrong",
): InvokeFailure {
  if (!eventObject.type.startsWith("xstate.error.actor")) {
    throw new Error("Event is not an actor error");
  }

  const { error } = eventObject as ErrorActorEvent<unknown>;

  let message = defaultMessage;
  let cause: string | null = null;

  if (error instanceof Error) {
    message = error.message;

    if (error.cause instanceof Error) {
      cause = error.cause.message;
    }

    if (typeof error.cause === "string") {
      cause = error.cause;
    }
  }

  return {
    message,
    cause,
  };
}
