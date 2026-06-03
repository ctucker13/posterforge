import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    // Clear the OpenAI API key during unit tests so generatePoster takes the
    // deterministic mock path rather than making real API calls.
    env: {
      VITE_OPENAI_API_KEY: "",
    },
  },
});
