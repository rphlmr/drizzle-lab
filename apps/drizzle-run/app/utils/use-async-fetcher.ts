import { useEffect, useRef } from "react";
import { type FetcherSubmitOptions, type SubmitTarget, useFetcher } from "react-router";
import type { LoaderOrActionResponse, SuccessResponse } from "./http";

type Deferred<T> = ReturnType<typeof newDeferred<T>>;

function newDeferred<T>() {
  let resolve: (data: T) => void = () => void 0;
  let reject: (error: unknown) => void = () => void 0;

  const promise = new Promise<T>((_resolve, _reject) => {
    resolve = _resolve;
    reject = _reject;
  });

  return { resolve, reject, promise };
}

export function useAsyncFetcher<
  T extends (...args: any) => Promise<LoaderOrActionResponse<any>>,
  Output = Extract<Awaited<ReturnType<T>>, SuccessResponse<unknown>>["success"],
>() {
  const fetcher = useFetcher<T>();
  const deferred = useRef<Deferred<Output> | null>(null);

  useEffect(() => {
    if (fetcher.state !== "idle" || !fetcher.data || !deferred.current) {
      return;
    }

    const response = fetcher.data;

    if (response.failure) {
      return deferred.current.reject(response.failure);
    }

    return deferred.current.resolve(response.success as Output);
  }, [fetcher.data, fetcher.state]);

  return {
    submit: (
      target: SubmitTarget,
      options?: FetcherSubmitOptions & {
        action?: RoutePath;
      }
    ): Promise<Output> => {
      fetcher.submit(target, options);
      deferred.current = newDeferred<Output>();
      return deferred.current.promise;
    },
  };
}
