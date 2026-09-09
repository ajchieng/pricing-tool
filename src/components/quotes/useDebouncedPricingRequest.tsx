"use client";

import { useEffect, useRef, useState } from "react";

type DebouncedPricingRequestOptions<TResult> = {
  enabled: boolean;
  requestKey: string;
  retryToken: number;
  request: (signal: AbortSignal) => Promise<TResult>;
  onSuccess: (value: TResult) => void;
  onDisabled: () => void;
  errorMessage: (error: unknown) => string;
  delayMs?: number;
};

export function useDebouncedPricingRequest<TResult>({
  enabled,
  requestKey,
  retryToken,
  request,
  onSuccess,
  onDisabled,
  errorMessage,
  delayMs = 350,
}: DebouncedPricingRequestOptions<TResult>) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef(request);
  const onSuccessRef = useRef(onSuccess);
  const onDisabledRef = useRef(onDisabled);
  const errorMessageRef = useRef(errorMessage);
  const requestSequenceRef = useRef(0);

  useEffect(() => {
    requestRef.current = request;
    onSuccessRef.current = onSuccess;
    onDisabledRef.current = onDisabled;
    errorMessageRef.current = errorMessage;
  }, [errorMessage, onDisabled, onSuccess, request]);

  useEffect(() => {
    const requestSequence = requestSequenceRef.current + 1;
    requestSequenceRef.current = requestSequence;
    let controller: AbortController | null = null;
    const timer = setTimeout(() => {
      void (async () => {
        if (!enabled) {
          if (requestSequence !== requestSequenceRef.current) return;
          onDisabledRef.current();
          setError(null);
          setLoading(false);
          return;
        }

        controller = new AbortController();
        setLoading(true);
        try {
          const value = await requestRef.current(controller.signal);
          if (requestSequence !== requestSequenceRef.current) return;
          onSuccessRef.current(value);
          setError(null);
        } catch (requestError) {
          if (
            requestSequence !== requestSequenceRef.current ||
            (requestError instanceof Error &&
              requestError.name === "AbortError")
          ) {
            return;
          }
          setError(errorMessageRef.current(requestError));
        } finally {
          if (requestSequence === requestSequenceRef.current) {
            setLoading(false);
          }
        }
      })();
    }, delayMs);

    return () => {
      clearTimeout(timer);
      requestSequenceRef.current += 1;
      controller?.abort();
    };
  }, [delayMs, enabled, requestKey, retryToken]);

  return { loading, error };
}
