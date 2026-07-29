import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  envPrefix: ["VITE_API_BASE_URL", "VITE_TRIP_DATA_MODE"],
  plugins: [react()],
  server: {
    port: 5173
  }
});
