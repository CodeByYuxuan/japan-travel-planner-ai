import { createApp } from "./app.js";
import { loadApiEnv } from "./config/env.js";

try {
  const env = loadApiEnv();
  const app = createApp({ env });

  app.listen(env.apiPort, () => {
    console.log(`API server listening at http://localhost:${env.apiPort}`);
  });
} catch (error) {
  const message =
    error instanceof Error ? error.message : "Invalid API configuration.";

  console.error(message);
  process.exit(1);
}
