import type { AiTokenUsage } from "../services/aiItinerary/usageLogger.js";

export type AiTokenPricing = {
  inputCostPerMillionTokens: number | null;
  outputCostPerMillionTokens: number | null;
};

export function combineTokenUsage(
  current: AiTokenUsage | null,
  next: AiTokenUsage | null | undefined
): AiTokenUsage | null {
  if (next === null || next === undefined) {
    return current;
  }

  const combinedUsage: AiTokenUsage = {};
  const inputTokens = sumDefinedValues(current?.inputTokens, next.inputTokens);
  const outputTokens = sumDefinedValues(
    current?.outputTokens,
    next.outputTokens
  );
  const totalTokens = sumDefinedValues(current?.totalTokens, next.totalTokens);

  if (inputTokens !== undefined) {
    combinedUsage.inputTokens = inputTokens;
  }

  if (outputTokens !== undefined) {
    combinedUsage.outputTokens = outputTokens;
  }

  if (totalTokens !== undefined) {
    combinedUsage.totalTokens = totalTokens;
  }

  return combinedUsage;
}

export function estimateAiCostUsd(
  usage: AiTokenUsage | null,
  pricing: AiTokenPricing
): number | null {
  if (
    usage === null ||
    usage.inputTokens === undefined ||
    usage.outputTokens === undefined ||
    pricing.inputCostPerMillionTokens === null ||
    pricing.outputCostPerMillionTokens === null
  ) {
    return null;
  }

  const estimatedCost =
    (usage.inputTokens / 1_000_000) * pricing.inputCostPerMillionTokens +
    (usage.outputTokens / 1_000_000) * pricing.outputCostPerMillionTokens;

  return Math.round(estimatedCost * 100_000_000) / 100_000_000;
}

function sumDefinedValues(
  first: number | undefined,
  second: number | undefined
) {
  if (first === undefined && second === undefined) {
    return undefined;
  }

  return (first ?? 0) + (second ?? 0);
}
