export type ApiEnvConfig = {
  apiPort: number;
  webOrigin: string;
  jwtSecret: string;
};

const localDevelopmentJwtSecret = "local-development-session-secret-change-me";

export const defaultApiEnv = {
  apiPort: 3001,
  webOrigin: "http://localhost:5173",
  jwtSecret: localDevelopmentJwtSecret
} satisfies ApiEnvConfig;

type ApiEnvSource = {
  API_PORT?: string | undefined;
  WEB_ORIGIN?: string | undefined;
  JWT_SECRET?: string | undefined;
  NODE_ENV?: string | undefined;
};

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
    apiPort: parseApiPort(env.API_PORT),
    webOrigin: parseWebOrigin(env.WEB_ORIGIN),
    jwtSecret: parseJwtSecret(env.JWT_SECRET, env.NODE_ENV)
  };
}
