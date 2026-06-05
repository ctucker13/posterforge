import type { PosterProject, PosterClaim, PosterSection, PosterVisual } from "../domain/poster";
import type { GenerationOptions } from "../domain/generator";
import { buildClaimMap } from "../domain/evidence";
import { createReferencesFromSources } from "../sources/sourceFixtures";
import { themes } from "../themes";
import { getOpenAIClient, DEFAULT_MODEL } from "./openai";
import { buildPosterGenerationMessages } from "./posterPrompt";

export async function generatePosterWithLLM(
  options: GenerationOptions,
  onProgress: (stepId: string) => void,
): Promise<PosterProject> {
  const { sources = [], sourceDocuments = [], sourceSummaries = [], evidence = [] } = options.currentSources ?? {};

  onProgress("plan");
  const messages = buildPosterGenerationMessages(
    options.prompt,
    options.theme,
    {
      sources,
      summaries: sourceSummaries,
      evidence,
    },
    options.outline,
  );

  onProgress("sources");
  const client = getOpenAIClient();

  onProgress("read_sources");
  const response = await client.chat.completions.create({
    model: DEFAULT_MODEL,
    messages,
    response_format: { type: "json_object" },
    temperature: 0.4,
  });

  onProgress("evidence");
  const raw = response.choices[0]?.message?.content ?? "{}";
  const generated = parseGeneratedPoster(raw);

  onProgress("claim_map");
  const claims: PosterClaim[] = Array.isArray(generated.claims) ? generated.claims : [];
  const sections: PosterSection[] = Array.isArray(generated.sections) ? generated.sections : [];
  const visuals: PosterVisual[] = Array.isArray(generated.visuals) ? generated.visuals : [];
  const claimMap = buildClaimMap(claims, sections, evidence);

  onProgress("layout");

  const poster: PosterProject = {
    id: `poster_${Date.now()}`,
    schemaVersion: "posterforge.poster.v1",
    metadata: {
      prompt: options.prompt,
      created_at: new Date().toISOString(),
      generator: `posterforge-llm/${DEFAULT_MODEL}`,
    },
    title: String(generated.title ?? options.outline?.title ?? deriveTitle(options.prompt)),
    subtitle: String(generated.subtitle ?? options.outline?.subtitle ?? `Generated with ${DEFAULT_MODEL}`),
    logo: themes[options.theme]?.logoUrl,
    format: { size: "A0", orientation: "landscape" },
    theme: options.theme,
    palette: options.palette,
    layout: isValidLayout(generated.layout) ? generated.layout : options.outline?.layout ?? "three-column-academic",
    audience: String(generated.audience ?? "poster session"),
    sources,
    sourceDocuments,
    sourceSummaries,
    evidence,
    claims,
    claimMap,
    sections,
    visuals,
    assets: [],
    traces: [],
    qaResults: [],
    references: createReferencesFromSources(sources),
  };

  onProgress("visuals");
  return poster;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseGeneratedPoster(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? parsed as Record<string, unknown> : {};
  } catch {
    console.warn("[posterforge] LLM returned invalid JSON — falling back to empty spec", raw.slice(0, 200));
    return {};
  }
}

const VALID_LAYOUTS = new Set([
  "three-column-academic",
  "results-first",
  "timeline-process",
  "dashboard-poster",
  "comic-strip-narrative",
  "case-study-poster",
]);

function isValidLayout(value: unknown): value is PosterProject["layout"] {
  return typeof value === "string" && VALID_LAYOUTS.has(value);
}

function deriveTitle(prompt: string): string {
  const cleaned = prompt
    .replace(/^(create|generate|make|build)\s+(a|an)\s+[\w -]*?(poster|presentation)\s+(about|for|on|covering)\s+/i, "")
    .trim();
  const first = cleaned.split(/[.!?\n]/)[0]?.trim() ?? "";
  return first.length >= 4 && first.length <= 90
    ? first.charAt(0).toUpperCase() + first.slice(1)
    : prompt.slice(0, 60);
}
