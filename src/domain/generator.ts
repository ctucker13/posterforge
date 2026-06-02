import type { PosterProject, TraceEvent } from "./poster";
import { examplePoster } from "../data/examplePoster";

export interface GenerationOptions {
  prompt: string;
  theme: string;
  palette?: string;
  sourceMode: "mock" | "web" | "local";
}

export const generationTrace: Omit<TraceEvent, "status">[] = [
  {
    id: "plan",
    label: "Planning poster",
    detail: "Interpreting the prompt, selecting a layout, and drafting a source-grounded poster brief.",
    artifactRefs: [{ kind: "poster_spec", label: "poster brief" }],
  },
  {
    id: "sources",
    label: "Searching sources",
    detail: "Preparing source connectors for Confluence, GitLab, web, papers, and local files.",
    artifactRefs: [{ kind: "source_index", label: "source connector plan" }],
  },
  {
    id: "read_sources",
    label: "Reading source documents",
    detail: "Loading mock project notes, code summaries, evaluation metrics, and research-paper summaries.",
    artifactRefs: [{ kind: "source_document", label: "parsed source documents" }],
  },
  {
    id: "evidence",
    label: "Extracting evidence",
    detail: "Extracting claims, methods, metrics, and visual evidence from structured source documents.",
    artifactRefs: [{ kind: "evidence_map", label: "evidence items" }],
  },
  {
    id: "claim_map",
    label: "Creating claim map",
    detail: "Connecting poster claims and factual visuals to source IDs and confidence levels.",
    artifactRefs: [{ kind: "claim_map", label: "claim map" }],
  },
  {
    id: "layout",
    label: "Choosing layout",
    detail: "Selecting a results-first poster structure and mapping sections to preview panels.",
    artifactRefs: [{ kind: "layout_plan", label: "layout plan" }],
  },
  {
    id: "visuals",
    label: "Selecting visuals",
    detail: "Choosing deterministic data science visuals and AI-image asset roles.",
    artifactRefs: [{ kind: "visual_plan", label: "visual plan" }],
  },
  {
    id: "image_prompts",
    label: "Preparing image-generation prompts",
    detail: "Drafting non-factual asset prompts for atmosphere, panels, backgrounds, and theme art.",
    artifactRefs: [{ kind: "image_prompt", label: "asset prompt plan" }],
  },
  {
    id: "render_visuals",
    label: "Rendering deterministic visuals",
    detail: "Rendering factual diagrams, matrices, flow charts, math, code, and tables from structured data.",
    artifactRefs: [{ kind: "render", label: "visual renders" }],
  },
  {
    id: "qa",
    label: "Running QA",
    detail: "Checking source traceability, text density, factual visual handling, and export readiness.",
    artifactRefs: [{ kind: "qa_report", label: "QA report" }],
  },
  {
    id: "self_fixes",
    label: "Applying self-fixes",
    detail: "Applying safe deterministic fixes such as generated references when source metadata is available.",
    artifactRefs: [{ kind: "qa_report", label: "fix report" }],
  },
  {
    id: "exports",
    label: "Preparing exports",
    detail: "Preparing the poster JSON source of truth and marking PPTX, PDF, PNG, and bundle exports as planned.",
    artifactRefs: [{ kind: "export", label: "export plan" }],
  },
];

export function generatePoster(options: GenerationOptions): PosterProject {
  const sourceText =
    options.sourceMode === "mock"
      ? "mock Confluence, GitLab, and research-paper sources"
      : options.sourceMode === "web"
        ? "web pages and research papers"
        : "local project files";

  return {
    ...examplePoster,
    metadata: {
      ...examplePoster.metadata,
      prompt: options.prompt,
      updated_at: new Date().toISOString(),
      generator: "posterforge-demo-generator",
    },
    theme: options.theme,
    palette: options.palette,
    subtitle: `Generated from ${sourceText}`,
    sections: examplePoster.sections.map((section) =>
      section.id === "hero"
        ? {
            ...section,
            blocks: [
              {
                type: "text",
                text:
                  options.prompt.trim() ||
                  "Create a source-grounded academic data science poster with traceable claims and rich visuals.",
              },
            ],
          }
        : section,
    ),
  };
}
