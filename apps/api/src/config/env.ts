export type ApiEnvConfig = {
  aiGenerationRateLimitMax: number;
  aiGenerationRateLimitWindowMs: number;
  apiPort: number;
  openAiApiKey: string | undefined;
  openAiModel: string;
  webOrigin: string;
  jwtSecret: string;
};

const localDevelopmentJwtSecret = "local-development-session-secret-change-me";
const defaultOpenAiModel = "gpt-5.5";

export const defaultApiEnv = {
  aiGenerationRateLimitMax: 5,
  aiGenerationRateLimitWindowMs: 60_000,
  apiPort: 3001,
  openAiApiKey: undefined,
  openAiModel: defaultOpenAiModel,
  webOrigin: "http://localhost:5173",
  jwtSecret: localDevelopmentJwtSecret
} satisfies ApiEnvConfig;

type ApiEnvSource = {
  AI_GENERATION_RATE_LIMIT_MAX?: string | undefined;
  AI_GENERATION_RATE_LIMIT_WINDOW_MS?: string | undefined;
  API_PORT?: string | undefined;
  OPENAI_API_KEY?: string | undefined;
  OPENAI_MODEL?: string | undefined;
  WEB_ORIGIN?: string | undefined;
  JWT_SECRET?: string | undefined;
  NODE_ENV?: string | undefined;
};

function parsePositiveIntegerEnv(options: {
  defaultValue: number;
  name: string;
  value: string | undefined;
}) {
  const rawValue = options.value?.trim() || String(options.defaultValue);

  if (!/^\d+$/.test(rawValue)) {
    throw new Error(`Invalid ${options.name}: expected a positive integer.`);
  }

  const parsedValue = Number(rawValue);

  if (!Number.isSafeInteger(parsedValue) || parsedValue < 1) {
    throw new Error(`Invalid ${options.name}: expected a positive integer.`);
  }

  return parsedValue;
}

function parseApiPort(value: string | undefined) {
  const rawPort = value?.trim() || String(defaultApiEnv.apiPort);

  if (!/^\d+$/.test(rawPort)) {
    throw new Error(
      "Invalid API_PORT: expected an integer between 1 and 65535."
    );
  }

  const apiPort = Number(rawPort);

  if (!Number.isSafeInteger(apiPort) || apiPort < 1 || apiPort > 65535) {
    throw new Error(
      "Invalid API_PORT: expected an integer between 1 and 65535."
    );
  }

  return apiPort;
}

function parseWebOrigin(value: string | undefined) {
  const rawOrigin = value?.trim() || defaultApiEnv.webOrigin;

  try {
    const origin = new URL(rawOrigin);

    if (origin.protocol !== "http:" && origin.protocol !== "https:") {
      throw new Error("Expected http or https protocol.");
    }

    return origin.origin;
  } catch {
    throw new Error("Invalid WEB_ORIGIN: expected an absolute http(s) URL.");
  }
}

function parseOpenAiApiKey(value: string | undefined) {
  const rawApiKey = value?.trim();

  return rawApiKey && rawApiKey.length > 0 ? rawApiKey : undefined;
}

function parseOpenAiModel(value: string | undefined) {
  const rawModel = value?.trim();

  if (rawModel === undefined || rawModel.length === 0) {
    return defaultApiEnv.openAiModel;
  }

  return rawModel;
}

function parseJwtSecret(
  value: string | undefined,
  nodeEnv: string | undefined
) {
  const rawSecret = value?.trim();

  if (rawSecret !== undefined && rawSecret.length > 0) {
    if (rawSecret.length < 16) {
      throw new Error("Invalid JWT_SECRET: expected at least 16 characters.");
    }

    return rawSecret;
  }

  if (nodeEnv === "production") {
    throw new Error("Invalid JWT_SECRET: required when NODE_ENV=production.");
  }

  return defaultApiEnv.jwtSecret;
}

export function loadApiEnv(env: ApiEnvSource = process.env): ApiEnvConfig {
  return {
    aiGenerationRateLimitMax: parsePositiveIntegerEnv({
      defaultValue: defaultApiEnv.aiGenerationRateLimitMax,
      name: "AI_GENERATION_RATE_LIMIT_MAX",
      value: env.AI_GENERATION_RATE_LIMIT_MAX
    }),
    aiGenerationRateLimitWindowMs: parsePositiveIntegerEnv({
      defaultValue: defaultApiEnv.aiGenerationRateLimitWindowMs,
      name: "AI_GENERATION_RATE_LIMIT_WINDOW_MS",
      value: env.AI_GENERATION_RATE_LIMIT_WINDOW_MS
    }),
    apiPort: parseApiPort(env.API_PORT),
    openAiApiKey: parseOpenAiApiKey(env.OPENAI_API_KEY),
    openAiModel: parseOpenAiModel(env.OPENAI_MODEL),
    webOrigin: parseWebOrigin(env.WEB_ORIGIN),
    jwtSecret: parseJwtSecret(env.JWT_SECRET, env.NODE_ENV)
  };
}
