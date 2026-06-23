import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, test, vi } from "vitest";

import { defaultApiEnv, loadApiEnv } from "../../config/env.js";
import {
  createOpenAiProvider,
  createOpenAiProviderFromEnv,
  createOpenAiSdkClient,
  type OpenAiResponsesClient
} from "./openaiClient.js";
import {
  createOpenAiProviderConfig,
  OpenAiConfigurationError
} from "./openaiConfig.js";

const webSourceDirectory = fileURLToPath(
  new URL("../../../../web/src/", import.meta.url)
);

function listSourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    const stats = statSync(path);

    if (stats.isDirectory()) {
      return listSourceFiles(path);
    }

    return /\.(ts|tsx)$/.test(entry) ? [path] : [];
  });
}

describe("OpenAI provider config", () => {
  test("uses the default model and does not require an API key at API startup", () => {
    const env = loadApiEnv({});
    const config = createOpenAiProviderConfig(env);

    expect(config).toEqual({
      apiKey: undefined,
      model: defaultApiEnv.openAiModel
    });
  });

  test("uses OPENAI_API_KEY and OPENAI_MODEL overrides from server env", () => {
    const env = loadApiEnv({
      OPENAI_API_KEY: "sk-test-secret-key",
      OPENAI_MODEL: "gpt-test-model"
    });
    const config = createOpenAiProviderConfig(env);

    expect(config).toEqual({
      apiKey: "sk-test-secret-key",
      model: "gpt-test-model"
    });
  });
});

describe("backend-only OpenAI boundary", () => {
  test("web source does not import the backend OpenAI provider", () => {
    const webSource = listSourceFiles(webSourceDirectory)
      .map((filePath) => readFileSync(filePath, "utf8"))
      .join("\n");

    expect(webSource).not.toContain("providers/openai");
    expect(webSource).not.toContain("openaiClient");
    expect(webSource).not.toContain("OPENAI_API_KEY");
    expect(webSource).not.toContain("VITE_OPENAI_");
  });
});

describe("OpenAI provider client", () => {
  test("fails clearly before creating the real SDK client without OPENAI_API_KEY", () => {
    const config = createOpenAiProviderConfig(loadApiEnv({}));

    expect(() => createOpenAiSdkClient(config)).toThrow(
      OpenAiConfigurationError
    );
    expect(() => createOpenAiProviderFromEnv(loadApiEnv({}))).toThrow(
      "OPENAI_API_KEY is required"
    );
  });

  test("creates the wrapper with a present API key without exposing the key", () => {
    const config = createOpenAiProviderConfig(
      loadApiEnv({
        OPENAI_API_KEY: "sk-test-secret-key",
        OPENAI_MODEL: "gpt-test-model"
      })
    );
    const provider = createOpenAiProvider({
      client: {
        responses: {
          create: vi.fn(async () => ({
            output_text: "Mock response"
          }))
        }
      },
      config
    });

    expect(provider).not.toEqual(
      expect.objectContaining({
        apiKey: "sk-test-secret-key"
      })
    );
    expect(JSON.stringify(provider)).not.toContain("sk-test-secret-key");
  });

  test("calls the injected Responses API client and returns normalized text", async () => {
    const create = vi.fn(async () => ({
      output_text: "A concise model response."
    }));
    const fakeClient = {
      responses: {
        create
      }
    } satisfies OpenAiResponsesClient;
    const provider = createOpenAiProvider({
      client: fakeClient,
      config: {
        apiKey: undefined,
        model: "gpt-test-model"
      }
    });

    await expect(
      provider.createResponse({
        input: "Draft a short itinerary note.",
        instructions: "Reply in one sentence."
      })
    ).resolves.toEqual({
      model: "gpt-test-model",
      text: "A concise model response."
    });
    expect(create).toHaveBeenCalledWith({
      input: "Draft a short itinerary note.",
      instructions: "Reply in one sentence.",
      model: "gpt-test-model"
    });
  });

  test("allows a per-request model override", async () => {
    const create = vi.fn(async () => ({
      output_text: "Override response"
    }));
    const provider = createOpenAiProvider({
      client: {
        responses: {
          create
        }
      },
      config: {
        apiKey: undefined,
        model: "gpt-default-model"
      }
    });

    const result = await provider.createResponse({
      input: "Use another model.",
      model: "gpt-override-model"
    });

    expect(result.model).toBe("gpt-override-model");
    expect(create).toHaveBeenCalledWith({
      input: "Use another model.",
      model: "gpt-override-model"
    });
  });
});
