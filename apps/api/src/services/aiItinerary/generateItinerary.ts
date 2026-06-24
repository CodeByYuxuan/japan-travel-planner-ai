import type { Itinerary, TripRequest } from "@japan-travel-planner/shared";

import { type ApiEnvConfig, loadApiEnv } from "../../config/env.js";
import { ApiError } from "../../errors/ApiError.js";
import {
  createOpenAiProviderFromEnv,
  type OpenAiTextRequest,
  type OpenAiTextResult
} from "../../providers/openai/openaiClient.js";
import { OpenAiConfigurationError } from "../../providers/openai/openaiConfig.js";
import { buildItineraryPrompt } from "./prompt.js";
import { buildItineraryRepairPrompt } from "./repairItinerary.js";
import {
  AiItineraryOutputParseError,
  parseAiItineraryOutput
} from "./schema.js";
import {
  type AiUsageLogger,
  type AiUsageOutcome,
  createConsoleAiUsageLogger,
  recordAiUsageSafely
} from "./usageLogger.js";

export type AiItineraryProvider = {
  createResponse: (request: OpenAiTextRequest) => Promise<OpenAiTextResult>;
};

export type AiItineraryGenerationMetadata = {
  attempts: number;
  repaired: boolean;
  model: string;
  tokenUsage: null;
  estimatedCostUsd: null;
};

export type GenerateItineraryResult = {
  itinerary: Itinerary;
  metadata: AiItineraryGenerationMetadata;
};

export type AiItineraryGenerationContext = {
  requestIdentifier?: string | undefined;
};

type AiItineraryServiceOptions = {
  providerFactory: () => AiItineraryProvider;
  usageLogger?: AiUsageLogger | undefined;
};

export class AiItineraryService {
  private readonly usageLogger: AiUsageLogger;

  constructor(private readonly options: AiItineraryServiceOptions) {
    this.usageLogger = options.usageLogger ?? createConsoleAiUsageLogger();
  }

  async generateItinerary(
    request: TripRequest,
    context: AiItineraryGenerationContext = {}
  ): Promise<GenerateItineraryResult> {
    let attempts = 0;
    let model: string | null = null;

    try {
      const provider = this.createProvider();
      const prompt = buildItineraryPrompt(request);
      attempts = 1;
      const firstResponse = await this.createProviderResponse(provider, {
        instructions: prompt.instructions,
        input: prompt.input
      });
      model = firstResponse.model;

      try {
        const result = {
          itinerary: parseAiItineraryOutput(firstResponse.text),
          metadata: createGenerationMetadata({
            attempts: 1,
            model: firstResponse.model,
            repaired: false
          })
        };

        await this.recordUsage({
          context,
          metadata: result.metadata,
          outcome: "success"
        });
        return result;
      } catch (error) {
        if (!(error instanceof AiItineraryOutputParseError)) {
          throw error;
        }

        const repairPrompt = buildItineraryRepairPrompt({
          originalPrompt: prompt,
          invalidOutput: firstResponse.text,
          parseError: error
        });
        attempts = 2;
        const repairResponse = await this.createProviderResponse(provider, {
          instructions: repairPrompt.instructions,
          input: repairPrompt.input
        });
        model = repairResponse.model;

        try {
          const result = {
            itinerary: parseAiItineraryOutput(repairResponse.text),
            metadata: createGenerationMetadata({
              attempts: 2,
              model: repairResponse.model,
              repaired: true
            })
          };

          await this.recordUsage({
            context,
            metadata: result.metadata,
            outcome: "repaired_success"
          });
          return result;
        } catch (repairError) {
          if (repairError instanceof AiItineraryOutputParseError) {
            throw new ApiError({
              statusCode: 502,
              code: "AI_ITINERARY_INVALID_OUTPUT",
              message:
                "AI itinerary generation returned invalid structured output.",
              details: {
                attempts: 2,
                reason: "MODEL_OUTPUT_INVALID"
              }
            });
          }

          throw repairError;
        }
      }
    } catch (error) {
      await this.recordFailureUsage({
        attempts,
        context,
        error,
        model
      });
      throw error;
    }
  }

  private createProvider() {
    try {
      return this.options.providerFactory();
    } catch (error) {
      throw mapGenerationError(error);
    }
  }

  private async createProviderResponse(
    provider: AiItineraryProvider,
    request: OpenAiTextRequest
  ) {
    try {
      return await provider.createResponse(request);
    } catch (error) {
      throw mapGenerationError(error);
    }
  }

  private async recordUsage(options: {
    context: AiItineraryGenerationContext;
    metadata: AiItineraryGenerationMetadata;
    outcome: AiUsageOutcome;
  }) {
    await recordAiUsageSafely(this.usageLogger, {
      attempts: options.metadata.attempts,
      estimatedCostUsd: options.metadata.estimatedCostUsd,
      model: options.metadata.model,
      outcome: options.outcome,
      requestIdentifier: options.context.requestIdentifier,
      tokenUsage: options.metadata.tokenUsage
    });
  }

  private async recordFailureUsage(options: {
    attempts: number;
    context: AiItineraryGenerationContext;
    error: unknown;
    model: string | null;
  }) {
    const outcome = generationErrorToUsageOutcome(options.error);

    if (outcome === null) {
      return;
    }

    await recordAiUsageSafely(this.usageLogger, {
      attempts: options.attempts,
      estimatedCostUsd: null,
      model: options.model,
      outcome,
      requestIdentifier: options.context.requestIdentifier,
      tokenUsage: null
    });
  }
}

export function createAiItineraryService(
  env: ApiEnvConfig = loadApiEnv(),
  options: { usageLogger?: AiUsageLogger } = {}
): AiItineraryService {
  return new AiItineraryService({
    providerFactory: () => createOpenAiProviderFromEnv(env),
    usageLogger: options.usageLogger
  });
}

function createGenerationMetadata(options: {
  attempts: number;
  repaired: boolean;
  model: string;
}): AiItineraryGenerationMetadata {
  return {
    attempts: options.attempts,
    repaired: options.repaired,
    model: options.model,
    tokenUsage: null,
    estimatedCostUsd: null
  };
}

function mapGenerationError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (error instanceof OpenAiConfigurationError) {
    return new ApiError({
      statusCode: 500,
      code: "AI_PROVIDER_CONFIGURATION_ERROR",
      message: "AI itinerary generation is not configured.",
      details: {
        reason: "PROVIDER_CONFIGURATION"
      }
    });
  }

  return new ApiError({
    statusCode: 502,
    code: "AI_PROVIDER_REQUEST_FAILED",
    message: "AI itinerary provider request failed.",
    details: {
      reason: "PROVIDER_FAILURE"
    }
  });
}

function generationErrorToUsageOutcome(error: unknown): AiUsageOutcome | null {
  if (!(error instanceof ApiError)) {
    return null;
  }

  if (error.code === "AI_PROVIDER_CONFIGURATION_ERROR") {
    return "provider_configuration_error";
  }

  if (error.code === "AI_PROVIDER_REQUEST_FAILED") {
    return "provider_request_failed";
  }

  if (error.code === "AI_ITINERARY_INVALID_OUTPUT") {
    return "invalid_model_output";
  }

  return null;
}
