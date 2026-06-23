import OpenAI from "openai";

import {
  createOpenAiProviderConfig,
  requireOpenAiApiKey,
  type OpenAiProviderConfig
} from "./openaiConfig.js";
import { loadApiEnv, type ApiEnvConfig } from "../../config/env.js";

export type OpenAiResponseCreateParams = {
  input: string;
  instructions?: string;
  model: string;
};

export type OpenAiResponseResult = {
  output_text?: string | undefined;
};

export type OpenAiResponsesClient = {
  responses: {
    create: (
      params: OpenAiResponseCreateParams
    ) => Promise<OpenAiResponseResult>;
  };
};

export type OpenAiTextRequest = {
  input: string;
  instructions?: string;
  model?: string;
};

export type OpenAiTextResult = {
  model: string;
  text: string;
};

export class OpenAiProvider {
  constructor(
    private readonly client: OpenAiResponsesClient,
    private readonly model: string
  ) {}

  async createResponse(request: OpenAiTextRequest): Promise<OpenAiTextResult> {
    const model = request.model ?? this.model;
    const response = await this.client.responses.create({
      input: request.input,
      model,
      ...(request.instructions !== undefined
        ? { instructions: request.instructions }
        : {})
    });

    return {
      model,
      text: response.output_text ?? ""
    };
  }
}

export function createOpenAiSdkClient(config: OpenAiProviderConfig) {
  return new OpenAI({
    apiKey: requireOpenAiApiKey(config)
  });
}

export function createOpenAiProvider(options: {
  client?: OpenAiResponsesClient;
  config: OpenAiProviderConfig;
}) {
  return new OpenAiProvider(
    options.client ?? createOpenAiSdkClient(options.config),
    options.config.model
  );
}

export function createOpenAiProviderFromEnv(env: ApiEnvConfig = loadApiEnv()) {
  return createOpenAiProvider({
    config: createOpenAiProviderConfig(env)
  });
}
