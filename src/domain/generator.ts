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
  },
  {
    id: "sources",
    label: "Searching sources",
    detail: "Preparing source connectors for Confluence, GitLab, web, papers, and local files.",
  },
  {
    id: "evidence",
    label: "Extracting evidence",
    detail: "Mapping claims and visuals back to source references.",
  },
  {
    id: "visuals",
    label: "Selecting visuals",
    detail: "Choosing deterministic data science visuals and AI-image asset roles.",
  },
  {
    id: "theme",
    label: "Applying theme",
    detail: "Applying visual grammar and palette tokens without leaking brand colours into other themes.",
  },
  {
    id: "qa",
    label: "Running QA",
    detail: "Checking source traceability, text density, factual visual handling, and export readiness.",
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
