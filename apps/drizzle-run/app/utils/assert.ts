import type { ErrorActorEvent, EventObject } from "xstate";

function assertNonNull<T>(
  value: T | null | undefined,
): asserts value is NonNullable<T> {
  if (!value) {
    throw new Error("Value is null or undefined");
  }
}

function assertIsActorError(
  event: EventObject,
): asserts event is ErrorActorEvent<unknown> {
  if (!event.type.startsWith("xstate.error.actor")) {
    throw new Error("Event is not an actor error");
  }
}

export { assertNonNull, assertIsActorError };
