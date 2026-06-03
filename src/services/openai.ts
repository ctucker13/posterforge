import OpenAI from "openai";

export function getOpenAIClient(): OpenAI {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY as string | undefined;
  if (!apiKey) {
    throw new Error("VITE_OPENAI_API_KEY is not set. Add it to .env.local to enable AI generation.");
  }
  return new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
}

export const DEFAULT_MODEL: string = (import.meta.env.VITE_OPENAI_MODEL as string | undefined) ?? "gpt-4o";
