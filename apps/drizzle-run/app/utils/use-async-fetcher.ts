import { useEffect, useRef } from "react";

import { useFetcher } from "@remix-run/react";

import type { LoaderOrActionResponse, DataResponse } from "./http";

type ActionFunction = (
  args: ActionFunctionArgs,
) => Promise<LoaderOrActionResponse<unknown>>;
type ClientActionFunction = (
  args: ClientActionFunctionArgs,
) => Promise<LoaderOrActionResponse<unknown>>;
type LoaderFunction = (
  args: LoaderFunctionArgs,
) => Promise<LoaderOrActionResponse<unknown>>;
type ClientLoaderFunction = (
  args: ClientLoaderFunctionArgs,
) => Promise<LoaderOrActionResponse<unknown>>;
type LoaderOrActionFunction =
  | LoaderFunction
  | ClientLoaderFunction
  | ActionFunction
  | ClientActionFunction;

type Deferred<T extends LoaderOrActionFunction> = ReturnType<
  typeof newDeferred<T>
>;

function newDeferred<T extends LoaderOrActionFunction>() {
  let resolve: (data: unknown) => void = () => void 0;
  let reject: (error: unknown) => void = () => void 0;

  const promise = new Promise<
    Extract<Awaited<ReturnType<T>>, DataResponse<unknown>>["data"]
  >((_resolve, _reject) => {
    resolve = _resolve;
    reject = _reject;
  });

  return { resolve, reject, promise };
}

function useAsyncFetcher<T extends LoaderOrActionFunction>() {
  const fetcher = useFetcher<T>();
  const deferred = useRef<Deferred<T> | null>(null);

  useEffect(() => {
    if (fetcher.state !== "idle" || !fetcher.data || !deferred.current) {
      return;
    }

    const response = fetcher.data;

    if (response.error) {
      return deferred.current.reject(response.error);
    }

    return deferred.current.resolve(response.data);
  }, [fetcher.data, fetcher.state]);

  return {
    submit: (...args: Parameters<typeof fetcher.submit>) => {
      fetcher.submit(...args);
      deferred.current = newDeferred();
      return deferred.current.promise;
    },
  };
}

export { useAsyncFetcher };
