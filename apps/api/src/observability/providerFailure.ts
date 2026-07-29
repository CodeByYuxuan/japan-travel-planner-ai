import { logSafely, type AppLogger } from "./logger.js";

export type ProviderFailureCategory =
  | "configuration"
  | "request_failed"
  | "unexpected";

export type ProviderFailureEvent = {
  failureCategory: ProviderFailureCategory;
  operation: string;
  provider: string;
};

export type ProviderFailureReporter = (event: ProviderFailureEvent) => void;

export function createProviderFailureReporter(
  logger: AppLogger,
  requestId: string | undefined
): ProviderFailureReporter {
  return (event) => {
    logSafely(logger, "warn", "provider_failure", {
      ...event,
      ...(requestId !== undefined ? { requestId } : {})
    });
  };
}

export function reportProviderFailureSafely(
  reporter: ProviderFailureReporter | undefined,
  event: ProviderFailureEvent
) {
  try {
    reporter?.(event);
  } catch {
    // Provider degradation must not depend on the logging sink.
  }
}
