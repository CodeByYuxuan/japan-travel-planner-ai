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

type AiItineraryServiceOptions = {
  providerFactory: () => AiItineraryProvider;
};

export class AiItineraryService {
  constructor(private readonly options: AiItineraryServiceOptions) {}

  async generateItinerary(
    request: TripRequest
  ): Promise<GenerateItineraryResult> {
    const provider = this.createProvider();
    const prompt = buildItineraryPrompt(request);
    const firstResponse = await this.createProviderResponse(provider, {
      instructions: prompt.instructions,
      input: prompt.input
    });

    try {
      return {
        itinerary: parseAiItineraryOutput(firstResponse.text),
        metadata: createGenerationMetadata({
          attempts: 1,
          model: firstResponse.model,
          repaired: false
        })
      };
    } catch (error) {
      if (!(error instanceof AiItineraryOutputParseError)) {
        throw error;
      }

      const repairPrompt = buildItineraryRepairPrompt({
        originalPrompt: prompt,
        invalidOutput: firstResponse.text,
        parseError: error
      });
      const repairResponse = await this.createProviderResponse(provider, {
        instructions: repairPrompt.instructions,
        input: repairPrompt.input
      });

      try {
        return {
          itinerary: parseAiItineraryOutput(repairResponse.text),
          metadata: createGenerationMetadata({
            attempts: 2,
            model: repairResponse.model,
            repaired: true
          })
        };
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
}

export function createAiItineraryService(
  env: ApiEnvConfig = loadApiEnv()
): AiItineraryService {
  return new AiItineraryService({
    providerFactory: () => createOpenAiProviderFromEnv(env)
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
