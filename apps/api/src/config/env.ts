export type ApiEnvConfig = {
  apiPort: number;
  webOrigin: string;
};

export const defaultApiEnv = {
  apiPort: 3001,
  webOrigin: "http://localhost:5173"
} satisfies ApiEnvConfig;

type ApiEnvSource = {
  API_PORT?: string | undefined;
  WEB_ORIGIN?: string | undefined;
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

export function loadApiEnv(env: ApiEnvSource = process.env): ApiEnvConfig {
  return {
    apiPort: parseApiPort(env.API_PORT),
    webOrigin: parseWebOrigin(env.WEB_ORIGIN)
  };
}
