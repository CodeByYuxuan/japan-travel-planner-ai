import { createApp } from "./app.js";
import { loadApiEnv } from "./config/env.js";

try {
  const env = loadApiEnv();
  const app = createApp({ env });
  const host = "0.0.0.0";

  app.listen(env.apiPort, host, () => {
    console.log(`API server listening at http://${host}:${env.apiPort}`);
  });
} catch (error) {
  const message =
    error instanceof Error ? error.message : "Invalid API configuration.";

  console.error(message);
  process.exit(1);
}
