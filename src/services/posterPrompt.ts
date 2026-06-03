import type OpenAI from "openai";
import type { EvidenceItem, PosterSource, SourceSummary } from "../domain/poster";

// The system prompt tells the model exactly what JSON structure to produce.
// We ask only for the generated fields — sources/evidence are merged by the caller.
const SYSTEM_PROMPT = `You are a poster generation engine for PosterForge, a tool that produces A0 academic and professional conference posters.

Given a user prompt and source context, produce a JSON object with the following fields:

{
  "title": "string — concise poster title (≤ 90 chars)",
  "subtitle": "string — one-line supporting description",
  "layout": "one of: three-column-academic | results-first | timeline-process | dashboard-poster | comic-strip-narrative | case-study-poster",
  "audience": "string — who this poster is for",
  "claims": [
    { "id": "claim_N", "text": "string — a single factual claim", "source_ids": ["src_id"], "confidence": "high|medium|low" }
  ],
  "sections": [
    {
      "id": "string — unique snake_case id",
      "type": "hero|background|methods|results|key_findings|discussion|timeline|references|custom",
      "title": "string",
      "layout": { "order": 0, "columnSpan": 1 },
      "blocks": [
        { "type": "text", "claim_ids": ["claim_N"], "text": "string — 1–3 sentences, max 280 chars" },
        { "type": "visual_ref", "visual_id": "vis_id" }
      ]
    }
  ],
  "visuals": [
    {
      "id": "vis_id",
      "type": "timeline|gantt|table|flow|metric_card|mermaid_flow|code_block",
      "title": "string",
      "source_ids": ["src_id"],
      "data": { /* type-specific data — see below */ }
    }
  ]
}

Visual data formats:
- timeline: { "events": [{ "date": "str", "label": "str", "detail": "str" }] }
- gantt: { "tasks": [{ "label": "str", "start": "YYYY-MM-DD", "end": "YYYY-MM-DD", "status": "str" }] }
- table: { "columns": ["col1","col2"], "rows": [{ "col1": "val", "col2": "val" }] }
- flow: { "rows": [{ "label": "str", "detail": "str", "weight": 0-100, "note": "str" }] }
- metric_card: { "label": "str", "value": "str|number", "note": "str" }
- mermaid_flow: { "source": "flowchart LR\\nA --> B" }
- code_block: { "language": "python|typescript|bash", "code": "str" }

Rules:
1. Every text block MUST reference at least one claim_id from the claims array.
2. Every visual MUST reference at least one source_id from the attached sources.
3. Every claim MUST reference at least one source_id from the attached sources.
4. Layout selection: use results-first for metric/outcome-heavy content; timeline-process for sequential/process content; three-column-academic otherwise.
5. Produce 3–6 sections and 2–6 visuals. Do not produce more than you have evidence for.
6. Keep text blocks concise — 1 to 3 sentences, under 280 characters.
7. Return ONLY the JSON object, no markdown fences, no explanation.`;

export interface SourceContext {
  sources: PosterSource[];
  summaries: SourceSummary[];
  evidence: EvidenceItem[];
}

export function buildPosterGenerationMessages(
  prompt: string,
  theme: string,
  context: SourceContext,
): OpenAI.Chat.ChatCompletionMessageParam[] {
  const sourceLines = context.sources
    .map((s) => {
      const summary = context.summaries.find((sm) => sm.source_id === s.id);
      const ev = context.evidence.filter((e) => e.source_id === s.id);
      const lines = [`Source ID: ${s.id} | Type: ${s.type} | Title: ${s.title}`];
      if (summary?.summary) lines.push(`  Summary: ${summary.summary}`);
      if (summary?.metrics?.length) lines.push(`  Metrics: ${summary.metrics.join(" | ")}`);
      if (summary?.methods?.length) lines.push(`  Methods: ${summary.methods.join(" | ")}`);
      if (ev.length) lines.push(`  Evidence: ${ev.map((e) => `[${e.kind}] ${e.text}`).join(" | ")}`);
      return lines.join("\n");
    })
    .join("\n\n");

  const userMessage = `
Prompt: ${prompt}
Theme: ${theme}

Attached sources (use these source IDs in claims and visuals):
${sourceLines || "No sources attached — generate general content based on the prompt alone."}

Generate the poster JSON now.`.trim();

  return [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userMessage },
  ];
}
