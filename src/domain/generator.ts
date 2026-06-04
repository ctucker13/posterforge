import type {
  EvidenceItem,
  PosterBlock,
  PosterClaim,
  PosterOutline,
  PosterLayoutId,
  PosterProject,
  PosterSection,
  PosterSectionLayout,
  PosterSource,
  PosterVisual,
  SourceDocument,
  SourceSummary,
  TraceEvent,
  TrustLevel,
} from "./poster";
import { examplePoster } from "../data/examplePoster";
import { buildClaimMap } from "./evidence";
import { buildMockSourcePackage, createReferencesFromSources } from "../sources/mockConnectors";
import { themes } from "../themes";

export interface GenerationOptions {
  prompt: string;
  theme: string;
  palette?: string;
  sourceMode: "mock" | "web" | "local";
  /** When set and contains real (non-mock-URL) sources, generation uses these instead of mocks. */
  currentSources?: {
    sources: PosterSource[];
    sourceDocuments: SourceDocument[];
    sourceSummaries: SourceSummary[];
    evidence: EvidenceItem[];
  };
  outline?: PosterOutline;
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
    detail: "Loading project notes, code summaries, evaluation metrics, and research-paper summaries.",
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
    detail: "Selecting a poster structure and mapping sections to preview panels.",
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

export async function generateOutline(options: GenerationOptions, onProgress?: (stepId: string) => void): Promise<PosterOutline> {
  onProgress?.("plan");
  const realSources = options.currentSources?.sources.filter((s) => !s.url?.startsWith("mock://")) ?? [];
  const title = deriveTitle(options.prompt, realSources.length > 0 ? realSources : examplePoster.sources);
  const apiKey = (typeof import.meta !== "undefined" && import.meta.env?.VITE_OPENAI_API_KEY) as string | undefined;

  if (apiKey) {
    try {
      const { default: OpenAI } = await import("openai");
      const client = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
      const response = await client.responses.create({
        model: "gpt-5-mini",
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: [
                  "Create a lightweight PosterForge outline. Return only JSON with title, subtitle, layout, and sections.",
                  "Section objects must contain id, type, title, and description. Use 3-6 sections.",
                  `Prompt: ${options.prompt}`,
                  `Theme: ${options.theme}`,
                  `Sources: ${JSON.stringify(options.currentSources?.sources ?? [])}`,
                  `Evidence: ${JSON.stringify(options.currentSources?.evidence?.slice(0, 16) ?? [])}`,
                ].join("\n\n"),
              },
            ],
          },
        ],
      });
      const parsed = JSON.parse(response.output_text) as PosterOutline;
      return normalizeOutline(parsed, title);
    } catch (error) {
      console.warn("[posterforge] Outline generation failed, using deterministic fallback:", error);
    }
  }

  return {
    title,
    subtitle: realSources.length > 0 ? `Generated from ${realSources.length} attached source${realSources.length === 1 ? "" : "s"}` : "Generated from mock source package",
    layout: examplePoster.layout,
    sections: examplePoster.sections.map((section) => ({
      id: section.id,
      type: section.type,
      title: section.title,
      description: "",
    })),
  };
}

function normalizeOutline(candidate: PosterOutline, fallbackTitle: string): PosterOutline {
  const fallback = {
    title: fallbackTitle,
    subtitle: "Generated outline",
    layout: examplePoster.layout,
    sections: examplePoster.sections.map((section) => ({
      id: section.id,
      type: section.type,
      title: section.title,
      description: "",
    })),
  } satisfies PosterOutline;

  if (!candidate || typeof candidate !== "object" || !Array.isArray(candidate.sections)) {
    return fallback;
  }

  return {
    title: typeof candidate.title === "string" && candidate.title.trim() ? candidate.title : fallback.title,
    subtitle: typeof candidate.subtitle === "string" ? candidate.subtitle : fallback.subtitle,
    layout: candidate.layout ?? fallback.layout,
    sections: candidate.sections
      .filter((section) => section && typeof section.id === "string" && typeof section.title === "string")
      .map((section) => ({
        id: section.id,
        type: section.type ?? "custom",
        title: section.title,
        description: typeof section.description === "string" ? section.description : "",
      }))
      .slice(0, 8),
  };
}

export async function reviseTextBlock(
  block: Extract<PosterBlock, { type: "text" }>,
  instruction: string,
  sectionTitle: string,
  posterTitle: string,
): Promise<string> {
  const apiKey = (typeof import.meta !== "undefined" && import.meta.env?.VITE_OPENAI_API_KEY) as string | undefined;
  if (!apiKey) {
    return `${block.text} [revised: ${instruction}]`;
  }

  try {
    const { default: OpenAI } = await import("openai");
    const client = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
    const response = await client.responses.create({
      model: "gpt-5-mini",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `Revise the following poster text block. Return only the revised text.\n\nPoster: ${posterTitle}\nSection: ${sectionTitle}\nInstruction: ${instruction}\n\nText:\n${block.text}`,
            },
          ],
        },
      ],
    });
    return response.output_text.trim() || block.text;
  } catch (error) {
    console.warn("[posterforge] Text block revision failed, using deterministic fallback:", error);
    return `${block.text} [revised: ${instruction}]`;
  }
}

export async function regenerateSection(section: PosterSection, instruction: string | undefined, poster: PosterProject): Promise<PosterSection> {
  const apiKey = (typeof import.meta !== "undefined" && import.meta.env?.VITE_OPENAI_API_KEY) as string | undefined;
  if (apiKey) {
    try {
      const { default: OpenAI } = await import("openai");
      const client = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
      const evidence = (poster.evidence ?? [])
        .filter((item) => section.blocks.some((block) => block.type === "text" && block.claim_ids?.some((claimId) => poster.claims.find((claim) => claim.id === claimId)?.source_ids.includes(item.source_id))))
        .slice(0, 12);
      const response = await client.responses.create({
        model: "gpt-5-mini",
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: [
                  "Regenerate this poster section. Return only JSON for a PosterSection with the same id, layout, and block schema.",
                  `Poster title: ${poster.title}`,
                  `Instruction: ${instruction?.trim() || "Improve clarity and concision."}`,
                  `Current section JSON: ${JSON.stringify(section)}`,
                  `Available evidence JSON: ${JSON.stringify(evidence)}`,
                ].join("\n\n"),
              },
            ],
          },
        ],
      });
      const parsed = JSON.parse(response.output_text) as PosterSection;
      return normalizeRegeneratedSection(section, parsed);
    } catch (error) {
      console.warn("[posterforge] Section regeneration failed, using deterministic fallback:", error);
    }
  }

  const note = instruction?.trim() ? `Regenerated note: ${instruction.trim()}` : "Regenerated section draft.";
  return {
    ...section,
    blocks: section.blocks.map((block, index) =>
      index === 0 && block.type === "text"
        ? {
            ...block,
            text: `${block.text} ${note}`,
          }
        : block,
    ),
  };
}

function normalizeRegeneratedSection(original: PosterSection, candidate: PosterSection): PosterSection {
  if (!candidate || typeof candidate !== "object" || !Array.isArray(candidate.blocks)) {
    return original;
  }

  return {
    ...original,
    title: typeof candidate.title === "string" && candidate.title.trim() ? candidate.title : original.title,
    type: candidate.type ?? original.type,
    blocks: candidate.blocks.filter(isPosterBlock),
  };
}

function isPosterBlock(value: unknown): value is PosterBlock {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const block = value as Record<string, unknown>;
  if (block.type === "text") return typeof block.text === "string";
  if (block.type === "visual_ref") return typeof block.visual_id === "string";
  return false;
}

export async function generatePoster(
  options: GenerationOptions,
  onProgress?: (stepId: string) => void,
  onWarning?: (message: string) => void,
): Promise<PosterProject> {
  const noop = (_id: string) => {};
  const progress = onProgress ?? noop;

  const apiKey = (typeof import.meta !== "undefined" && import.meta.env?.VITE_OPENAI_API_KEY) as string | undefined;
  const realSources = options.currentSources?.sources.filter((s) => !s.url?.startsWith("mock://")) ?? [];

  // Route to real LLM when an API key is configured
  if (apiKey) {
    try {
      const { generatePosterWithLLM } = await import("../services/generatePosterLLM");
      return await generatePosterWithLLM(options, progress);
    } catch (err) {
      console.warn("[posterforge] LLM generation failed, falling back to deterministic path:", err);
      onWarning?.(
        `LLM generation failed: ${err instanceof Error ? err.message : String(err)}. Using template poster — results may not match your prompt.`,
      );
    }
  }

  if (realSources.length > 0 && options.currentSources) {
    progress("plan"); progress("sources"); progress("read_sources"); progress("evidence");
    return generateFromRealSources(options);
  }

  // ── Mock path ──────────────────────────────────────────────────────────────
  progress("plan"); progress("sources"); progress("read_sources"); progress("evidence");
  progress("claim_map"); progress("layout"); progress("visuals");
  const sourcePackage = buildMockSourcePackage(options.sourceMode);
  const sourceText =
    options.sourceMode === "mock"
      ? "mock Confluence, GitLab, and research-paper sources"
      : options.sourceMode === "web"
        ? "web pages and research papers"
        : "local project files";

  const sections = examplePoster.sections.map((section) =>
    applyOutlineToSection(
      section.id === "hero"
        ? {
            ...section,
            blocks: [
              {
                type: "text" as const,
                claim_ids: ["claim_001", "claim_002"],
                text:
                  options.prompt.trim() ||
                  "Create a source-grounded academic data science poster with traceable claims and rich visuals.",
              },
            ],
          }
        : section,
      options.outline,
    ),
  );
  const claimMap = buildClaimMap(examplePoster.claims, sections, sourcePackage.evidence);

  return {
    ...examplePoster,
    metadata: {
      ...examplePoster.metadata,
      prompt: options.prompt,
      updated_at: new Date().toISOString(),
      generator: "posterforge-demo-generator",
    },
    schemaVersion: "posterforge.poster.v1",
    theme: options.theme,
    palette: options.palette,
    logo: themes[options.theme]?.logoUrl,
    title: options.outline?.title ?? examplePoster.title,
    subtitle: options.outline?.subtitle || `Generated from ${sourceText}`,
    layout: options.outline?.layout ?? examplePoster.layout,
    sources: sourcePackage.sources,
    sourceDocuments: sourcePackage.sourceDocuments,
    sourceSummaries: sourcePackage.sourceSummaries,
    evidence: sourcePackage.evidence,
    claimMap,
    references: createReferencesFromSources(sourcePackage.sources),
    sections,
  };
}

function applyOutlineToSection(section: PosterSection, outline: PosterOutline | undefined): PosterSection {
  if (!outline) {
    return section;
  }

  const outlineSection = outline.sections.find((item) => item.id === section.id);
  if (!outlineSection) {
    return section;
  }

  return {
    ...section,
    type: outlineSection.type,
    title: outlineSection.title,
    layout: {
      ...(section.layout ?? {}),
      order: outline.sections.findIndex((item) => item.id === section.id),
    },
  };
}

// ── Real-source generation ────────────────────────────────────────────────────

function generateFromRealSources(options: GenerationOptions): PosterProject {
  const { sources, sourceDocuments = [], sourceSummaries = [], evidence = [] } = options.currentSources!;

  const claims = deriveClaims(evidence, sources);
  const visuals = deriveVisuals(sources, sourceDocuments, sourceSummaries);
  const sections = deriveSections(options.prompt, sources, sourceSummaries, evidence, visuals, claims);
  const claimMap = buildClaimMap(claims, sections, evidence);

  return {
    id: `poster_${Date.now()}`,
    metadata: {
      prompt: options.prompt,
      created_at: new Date().toISOString(),
      generator: "posterforge-source-generator",
    },
    schemaVersion: "posterforge.poster.v1",
    logo: themes[options.theme]?.logoUrl,
    title: deriveTitle(options.prompt, sources),
    subtitle: `Generated from ${sources.length} attached source${sources.length !== 1 ? "s" : ""}`,
    format: { size: "A0", orientation: "landscape" },
    theme: options.theme,
    palette: options.palette,
    layout: deriveLayout(evidence),
    audience: deriveAudience(options.prompt),
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
}

// ── Derivation helpers ────────────────────────────────────────────────────────

function deriveTitle(prompt: string, sources: PosterSource[]): string {
  const cleaned = prompt
    .replace(/^(create|generate|make|build)\s+(a|an)\s+[\w -]*?(poster|presentation|slide deck)\s+(about|for|on|covering)\s+/i, "")
    .replace(/^(poster|presentation)\s+(about|for|on)\s+/i, "")
    .trim();
  const first = cleaned.split(/[.!?\n]/)[0]?.trim() ?? "";
  if (first.length >= 4 && first.length <= 90) {
    return first.charAt(0).toUpperCase() + first.slice(1);
  }
  return sources[0]?.title.split("/")[0]?.trim() ?? "Generated Poster";
}

function deriveAudience(prompt: string): string {
  const match = prompt.match(/\b(for|audience[:\s]+|presented to)\s+([^,.!?]{4,40})/i);
  return match ? (match[2]?.trim() ?? "poster session") : "poster session";
}

function deriveLayout(evidence: EvidenceItem[]): PosterLayoutId {
  const metricCount = evidence.filter((e) => e.kind === "metric").length;
  const methodCount = evidence.filter((e) => e.kind === "method").length;
  if (metricCount > methodCount && metricCount >= 3) return "results-first";
  if (methodCount > metricCount && methodCount >= 3) return "timeline-process";
  return "three-column-academic";
}

function deriveClaims(evidence: EvidenceItem[], sources: PosterSource[]): PosterClaim[] {
  const claimEvidence = evidence.filter((e) => e.kind === "claim");
  if (claimEvidence.length > 0) {
    return claimEvidence.slice(0, 8).map((e, i) => ({
      id: `claim_${i + 1}`,
      text: e.text,
      source_ids: [e.source_id],
      confidence: e.confidence ?? "medium",
    }));
  }
  // Fallback: one claim per source derived from its first reference evidence
  return sources.slice(0, 4).map((source, i) => {
    const ref = evidence.find((e) => e.source_id === source.id);
    return {
      id: `claim_${i + 1}`,
      text: ref?.text ?? `${source.title} contributes evidence to this poster.`,
      source_ids: [source.id],
      confidence: "medium" as TrustLevel,
    };
  });
}

function deriveVisuals(
  sources: PosterSource[],
  documents: SourceDocument[],
  summaries: SourceSummary[],
): PosterVisual[] {
  const visuals: PosterVisual[] = [];

  // Source overview: flow list of attached sources with type labels.
  // source_ids left empty so deriveSections can place it without double-assigning.
  if (sources.length >= 1) {
    visuals.push({
      id: "vis_source_pipeline",
      type: "flow",
      title: `${sources.length} source${sources.length !== 1 ? "s" : ""}`,
      source_ids: [],
      data: {
        rows: sources.slice(0, 6).map((s, i) => ({
          label: s.title.split("/").pop()?.trim() ?? s.title,
          detail: s.type.replace(/_/g, " "),
          weight: Math.max(30, 100 - i * 15),
          note: s.type,
        })),
      },
    });
  }

  for (const source of sources.slice(0, 5)) {
    const summary = summaries.find((s) => s.source_id === source.id);
    const doc = documents.find((d) => d.source.id === source.id);
    const slug = idSlug(source.id);

    // Methods → flow list
    if (summary?.methods && summary.methods.length >= 2) {
      visuals.push({
        id: `vis_methods_${slug}`,
        type: "flow",
        title: clip(`Methods: ${source.title}`, 50),
        source_ids: [source.id],
        data: {
          rows: summary.methods.slice(0, 6).map((method, i) => ({
            label: method,
            detail: "",
            weight: Math.max(20, 100 - i * 14),
            note: "",
          })),
        },
      });
    }

    // Multiple metrics → table; single metric → metric_card
    if (summary?.metrics && summary.metrics.length >= 3) {
      visuals.push({
        id: `vis_metrics_${slug}`,
        type: "table",
        title: clip(`Key metrics: ${source.title}`, 50),
        source_ids: [source.id],
        data: {
          columns: ["Metric"],
          rows: summary.metrics.slice(0, 8).map((m) => ({ Metric: m })),
        },
      });
    } else if (summary?.metrics && summary.metrics.length >= 1) {
      visuals.push({
        id: `vis_metric_${slug}`,
        type: "metric_card",
        title: clip(source.title, 40),
        source_ids: [source.id],
        data: {
          label: summary.metrics[0] ?? "",
          value: summary.metrics[0]?.match(/^([\d.]+)/)?.[1] ?? "—",
          note: clip(summary.summary, 100),
        },
      });
    }

    // Code block when body contains a fenced block
    if (doc?.body && visuals.length < 9) {
      const fence = extractCodeFence(doc.body);
      if (fence) {
        visuals.push({
          id: `vis_code_${slug}`,
          type: "code_block",
          title: clip(`Code: ${source.title}`, 50),
          source_ids: [source.id],
          data: fence,
        });
      }
    }
  }

  return visuals.slice(0, 9);
}

function deriveSections(
  prompt: string,
  sources: PosterSource[],
  summaries: SourceSummary[],
  evidence: EvidenceItem[],
  visuals: PosterVisual[],
  claims: PosterClaim[],
): PosterSection[] {
  const sections: PosterSection[] = [];
  let order = 0;

  // Hero
  sections.push({
    id: "hero",
    type: "hero",
    title: deriveHeroTitle(prompt, sources),
    layout: { order: order++, columnSpan: 1 },
    blocks: [
      {
        type: "text",
        claim_ids: claims.slice(0, 2).map((c) => c.id),
        text: deriveHeroText(prompt, summaries),

      },
    ],
  });

  const grouped = groupSourcesByCharacter(sources, summaries, evidence);

  // Total non-hero content sections we expect to produce
  const contentCount =
    Math.min(grouped.results.length, 2) +
    Math.min(grouped.methods.length, 2) +
    Math.min(grouped.findings.length, 1) +
    Math.min(grouped.background.length, 1);

  // Span results wide only when there are enough other sections to fill the row
  const resultsSpan: 1 | 2 = contentCount >= 3 ? 2 : 1;

  for (const source of grouped.results.slice(0, 2)) {
    const sec = buildSourceSection(source, summaries, evidence, visuals, claims, "results", order++, {
      columnSpan: resultsSpan,
      ...(resultsSpan >= 2 ? { emphasis: "featured" as const } : {}),
    });
    if (sec) sections.push(sec);
  }

  // Methods
  for (const source of grouped.methods.slice(0, 2)) {
    const sec = buildSourceSection(source, summaries, evidence, visuals, claims, "methods", order++);
    if (sec) sections.push(sec);
  }

  // Key findings
  for (const source of grouped.findings.slice(0, 1)) {
    const sec = buildSourceSection(source, summaries, evidence, visuals, claims, "key_findings", order++);
    if (sec) sections.push(sec);
  }

  // Background / context
  for (const source of grouped.background.slice(0, 1)) {
    const sec = buildSourceSection(source, summaries, evidence, visuals, claims, "background", order++);
    if (sec) sections.push(sec);
  }

  // Ensure QA-required results/key_findings exists
  if (!sections.some((s) => s.type === "results" || s.type === "key_findings")) {
    const nonHero = sections.find((s) => s.type !== "hero");
    if (nonHero) nonHero.type = "results";
  }

  // Source overview visual — prefer the hero section (usually content-light),
  // fall back to the first content section with ≤1 existing visual.
  const pipelineVisual = visuals.find((v) => v.id === "vis_source_pipeline");
  if (pipelineVisual) {
    const heroSec = sections.find((s) => s.id === "hero");
    const fallback = sections.find((s) => s.id !== "hero" && s.blocks.filter((b) => b.type === "visual_ref").length <= 1);
    const target = (heroSec && heroSec.blocks.filter((b) => b.type === "visual_ref").length === 0) ? heroSec : fallback;
    if (target) {
      target.blocks.push({ type: "visual_ref", visual_id: "vis_source_pipeline" });
    }
  }

  // Discussion for medium-confidence claims
  const mediumClaims = claims.filter((c) => c.confidence === "medium" || !c.confidence);
  if (mediumClaims.length >= 2 && sections.length < 7) {
    sections.push({
      id: "discussion",
      type: "discussion",
      title: "Limitations and context",
      layout: { order: order++ },
      blocks: [
        {
          type: "text",
          claim_ids: mediumClaims.slice(0, 3).map((c) => c.id),
          text: mediumClaims
            .slice(0, 3)
            .map((c) => c.text)
            .join(" ")
            .slice(0, 280),
        },
      ],
    });
  }

  return sections;
}

// ── Section building ──────────────────────────────────────────────────────────

interface SourceGroups {
  results: PosterSource[];
  methods: PosterSource[];
  findings: PosterSource[];
  background: PosterSource[];
}

function groupSourcesByCharacter(
  sources: PosterSource[],
  summaries: SourceSummary[],
  evidence: EvidenceItem[],
): SourceGroups {
  const groups: SourceGroups = { results: [], methods: [], findings: [], background: [] };
  for (const source of sources) {
    const summary = summaries.find((s) => s.source_id === source.id);
    const ev = evidence.filter((e) => e.source_id === source.id);
    const metricScore = ev.filter((e) => e.kind === "metric").length + (summary?.metrics?.length ?? 0);
    const methodScore = ev.filter((e) => e.kind === "method").length + (summary?.methods?.length ?? 0);
    const claimScore = ev.filter((e) => e.kind === "claim").length;
    const max = Math.max(metricScore, methodScore, claimScore);
    if (max === 0) {
      groups.background.push(source);
    } else if (metricScore === max) {
      groups.results.push(source);
    } else if (methodScore === max) {
      groups.methods.push(source);
    } else {
      groups.findings.push(source);
    }
  }
  return groups;
}

function buildSourceSection(
  source: PosterSource,
  summaries: SourceSummary[],
  evidence: EvidenceItem[],
  visuals: PosterVisual[],
  claims: PosterClaim[],
  type: PosterSection["type"],
  order: number,
  layoutOverrides: Partial<PosterSectionLayout> = {},
): PosterSection | null {
  const summary = summaries.find((s) => s.source_id === source.id);
  const sourceClaims = claims.filter((c) => c.source_ids.includes(source.id));
  // Only include visuals explicitly tied to this source (skip shared/empty source_ids)
  const sourceVisuals = visuals.filter((v) => v.source_ids && v.source_ids.length > 0 && v.source_ids.includes(source.id));
  const blocks: PosterBlock[] = [];

  const summaryText = summary?.summary ?? "";
  if (summaryText || sourceClaims.length > 0) {
    blocks.push({
      type: "text",
      claim_ids: sourceClaims.map((c) => c.id),
      text: summaryText || (sourceClaims[0]?.text ?? ""),
    });
  }

  for (const visual of sourceVisuals.slice(0, 2)) {
    blocks.push({ type: "visual_ref", visual_id: visual.id });
  }

  if (blocks.length === 0) return null;

  return {
    id: `section_${idSlug(source.id)}`,
    type,
    title: source.title,
    layout: { order, columnSpan: 1, ...layoutOverrides },
    blocks,
  };
}

function deriveHeroTitle(prompt: string, sources: PosterSource[]): string {
  // Extract the subject from the prompt after common prefixes
  const title = deriveTitle(prompt, sources);
  // Use just the first comma-delimited segment as a short heading
  const short = title.split(/[,;–]/)[0]?.trim() ?? title;
  return short.length >= 3 ? short : title.split(/\s+/).slice(0, 5).join(" ");
}

function deriveHeroText(prompt: string, summaries: SourceSummary[]): string {
  const first = summaries[0]?.summary ?? "";
  if (first.length >= 40) return clip(first, 280);
  return prompt.trim() || "A source-grounded poster generated from attached project evidence.";
}

// ── Text/value utilities ──────────────────────────────────────────────────────

function idSlug(id: string): string {
  return id.toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 24);
}

function clip(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

function extractCodeFence(body: string): { language: string; code: string } | null {
  const m = body.match(/```(\w+)?\n([\s\S]+?)```/);
  if (!m) return null;
  return { language: m[1] || "text", code: m[2]?.trim().slice(0, 500) ?? "" };
}
