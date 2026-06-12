import { createApp } from "./app.js";

const port = Number.parseInt(process.env.API_PORT ?? "3001", 10);
const app = createApp();

app.listen(port, () => {
  console.log(`API server listening at http://localhost:${port}`);
});
