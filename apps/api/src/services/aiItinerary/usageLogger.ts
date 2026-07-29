import { createHash } from "node:crypto";

export type AiUsageOutcome =
  | "invalid_model_output"
  | "provider_configuration_error"
  | "provider_request_failed"
  | "rate_limited"
  | "repaired_success"
  | "success"
  | "validation_error";

export type AiTokenUsage = {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
};

export type AiUsageEvent = {
  attempts?: number | null | undefined;
  estimatedCostUsd?: number | null | undefined;
  model?: string | null | undefined;
  outcome: AiUsageOutcome;
  requestIdentifier?: string | undefined;
  requestId?: string | undefined;
  tokenUsage?: AiTokenUsage | null | undefined;
};

export type AiFailureCategory =
  | "configuration"
  | "invalid_output"
  | "rate_limited"
  | "request_failed"
  | "validation";

export type AiUsageLogEntry = {
  attempts: number | null;
  estimatedCostUsd: number | null;
  event: "ai_itinerary_usage";
  failureCategory: AiFailureCategory | null;
  model: string | null;
  outcome: AiUsageOutcome;
  provider: "openai";
  requestIdentifierHash?: string;
  requestId?: string;
  timestamp: string;
  tokenUsage: AiTokenUsage | null;
};

export type AiUsageLogger = {
  recordUsage: (event: AiUsageEvent) => Promise<void> | void;
};

export type ConsoleAiUsageLoggerOptions = {
  clock?: () => Date;
  sink?: (entry: AiUsageLogEntry) => void;
};

export const noopAiUsageLogger: AiUsageLogger = {
  recordUsage: () => {}
};

export function createAiUsageLogEntry(
  event: AiUsageEvent,
  timestamp: Date = new Date()
): AiUsageLogEntry {
  const requestId = sanitizeRequestId(event.requestId);

  return {
    attempts: sanitizePositiveInteger(event.attempts),
    estimatedCostUsd: sanitizeEstimatedCost(event.estimatedCostUsd),
    event: "ai_itinerary_usage",
    failureCategory: outcomeToFailureCategory(event.outcome),
    model: sanitizeModel(event.model),
    outcome: event.outcome,
    provider: "openai",
    ...(event.requestIdentifier !== undefined &&
    event.requestIdentifier.trim().length > 0
      ? { requestIdentifierHash: hashIdentifier(event.requestIdentifier) }
      : {}),
    ...(requestId !== null ? { requestId } : {}),
    timestamp: timestamp.toISOString(),
    tokenUsage: sanitizeTokenUsage(event.tokenUsage)
  };
}

export function createConsoleAiUsageLogger(
  options: ConsoleAiUsageLoggerOptions = {}
): AiUsageLogger {
  const clock = options.clock ?? (() => new Date());
  const sink =
    options.sink ??
    ((entry: AiUsageLogEntry) => {
      console.info(JSON.stringify(entry));
    });

  return {
    recordUsage: (event) => {
      sink(createAiUsageLogEntry(event, clock()));
    }
  };
}

export async function recordAiUsageSafely(
  logger: AiUsageLogger,
  event: AiUsageEvent
): Promise<void> {
  try {
    await logger.recordUsage(event);
  } catch {
    // Usage logging must never break itinerary generation.
  }
}

function hashIdentifier(identifier: string) {
  return createHash("sha256").update(identifier).digest("hex");
}

function sanitizePositiveInteger(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    return null;
  }

  return value;
}

function sanitizeEstimatedCost(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return null;
  }

  return value;
}

function sanitizeModel(value: string | null | undefined) {
  const trimmedValue = value?.trim();

  return trimmedValue && trimmedValue.length > 0 ? trimmedValue : null;
}

function sanitizeRequestId(value: string | undefined) {
  const trimmedValue = value?.trim();

  return trimmedValue !== undefined &&
    /^[A-Za-z0-9._:-]{1,128}$/.test(trimmedValue)
    ? trimmedValue
    : null;
}

function outcomeToFailureCategory(
  outcome: AiUsageOutcome
): AiFailureCategory | null {
  if (outcome === "provider_configuration_error") {
    return "configuration";
  }

  if (outcome === "provider_request_failed") {
    return "request_failed";
  }

  if (outcome === "invalid_model_output") {
    return "invalid_output";
  }

  if (outcome === "rate_limited") {
    return "rate_limited";
  }

  if (outcome === "validation_error") {
    return "validation";
  }

  return null;
}

function sanitizeTokenUsage(
  tokenUsage: AiTokenUsage | null | undefined
): AiTokenUsage | null {
  if (tokenUsage === null || tokenUsage === undefined) {
    return null;
  }

  const sanitizedUsage: AiTokenUsage = {};
  const inputTokens = sanitizePositiveInteger(tokenUsage.inputTokens);
  const outputTokens = sanitizePositiveInteger(tokenUsage.outputTokens);
  const totalTokens = sanitizePositiveInteger(tokenUsage.totalTokens);

  if (inputTokens !== null) {
    sanitizedUsage.inputTokens = inputTokens;
  }

  if (outputTokens !== null) {
    sanitizedUsage.outputTokens = outputTokens;
  }

  if (totalTokens !== null) {
    sanitizedUsage.totalTokens = totalTokens;
  }

  return Object.keys(sanitizedUsage).length > 0 ? sanitizedUsage : null;
}
