const PATTERNS: Array<{ test: (m: string) => boolean; message: string }> = [
  {
    test: (m) => /api.?key|unauthorized|401|403|invalid.?key|incorrect.?api/i.test(m),
    message: "API key missing or invalid. Set OPENAI_API_KEY in your environment and restart.",
  },
  {
    test: (m) => /rate.?limit|429|too.?many.?request/i.test(m),
    message: "Rate limit reached. Wait a moment, then try again.",
  },
  {
    test: (m) => /quota|billing|payment|insufficient_quota/i.test(m),
    message: "API quota exhausted. Check your billing details at platform.openai.com.",
  },
  {
    test: (m) => /timeout|timed.?out|ETIMEDOUT/i.test(m),
    message: "The request timed out. Check your connection and try again.",
  },
  {
    test: (m) => /fetch|network|ECONNREFUSED|ENOTFOUND|Failed to fetch|ERR_NETWORK/i.test(m),
    message: "Couldn't reach the AI service. Check your internet connection.",
  },
  {
    test: (m) => /context.?length|maximum.?token|too.?long|string_above_max_length/i.test(m),
    message: "The content is too long. Try fewer sources or a shorter prompt.",
  },
  {
    test: (m) => /content.?policy|content.?filter|safety/i.test(m),
    message: "The request was blocked by the content filter. Adjust your prompt and try again.",
  },
];

export function friendlyError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  const match = PATTERNS.find((p) => p.test(raw));
  return match?.message ?? "Something went wrong — open the browser console for details.";
}
