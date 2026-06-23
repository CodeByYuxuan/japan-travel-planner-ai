import type { ApiEnvConfig } from "../../config/env.js";

export type OpenAiProviderConfig = {
  apiKey: string | undefined;
  model: string;
};

export class OpenAiConfigurationError extends Error {
  readonly code = "OPENAI_CONFIGURATION_ERROR";

  constructor(message: string) {
    super(message);
    this.name = "OpenAiConfigurationError";
  }
}

export function createOpenAiProviderConfig(
  env: Pick<ApiEnvConfig, "openAiApiKey" | "openAiModel">
): OpenAiProviderConfig {
  return {
    apiKey: env.openAiApiKey,
    model: env.openAiModel
  };
}

export function requireOpenAiApiKey(config: OpenAiProviderConfig) {
  if (config.apiKey === undefined || config.apiKey.trim().length === 0) {
    throw new OpenAiConfigurationError(
      "OPENAI_API_KEY is required before using OpenAI itinerary generation."
    );
  }

  return config.apiKey;
}
