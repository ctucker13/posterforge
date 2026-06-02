# PosterForge

PosterForge is a source-grounded academic and data science poster generation workspace.

The core product direction is a schema-driven poster compiler, not "LLM directly to PPTX":

```text
user prompt + sources
  -> poster project spec
  -> source documents and evidence
  -> visual assets
  -> HTML preview
  -> QA loop
  -> editable PPTX
  -> print PDF
  -> project bundle
```

The `PosterProject` / `poster.json` spec is the source of truth. HTML, PPTX, PDF, PNG, images, traces, QA results, and bundles are generated outputs.

## Commands

```bash
npm install
npm run dev
npm run build
```

`npm run dev` starts Vite on `0.0.0.0`.

## Current Stack

- Vite
- React
- TypeScript
- lucide-react
- npm

Python is intentionally not the app core. It can be added later with `uv` for data science helpers such as Pandas summaries, sklearn metrics, SHAP, notebook processing, or statistical analysis.

## Current Features

- Prompt-driven poster generation flow.
- Typed `PosterProject` model with metadata, sources, source documents, evidence, claim map, sections, visuals, assets, traces, QA results, and references.
- Runtime `PosterProject` validation for JSON import, including nested shape and cross-reference checks.
- Mock source package for Confluence, GitLab, research paper, and web-page style sources.
- Mock source connector capability metadata and a clear acquisition/interpretation boundary.
- Evidence panel showing source summaries, source type/trust badges, claim confidence, poster locations, and linked evidence snippets.
- Theme and palette separation.
- NatWest Group theme and palette scoped to explicit selection.
- Typed layout templates:
  - three-column academic
  - results-first
  - timeline/process
  - dashboard poster
  - comic-strip narrative
  - case-study poster
- Visual registry grouped by purpose:
  - model performance
  - explainability
  - flow/process
  - scientific/technical
  - data quality
  - other/generated assets
- Typed visual data parsers for deterministic renderer inputs.
- Lightweight deterministic renderers/placeholders for confusion matrix, Sankey-style flow, table, timeline, Gantt, metric card, Mermaid source, math source, code block, and generated asset slots.
- Derived renderer summaries for confusion matrix metrics, Sankey flow shares, and Gantt timeline segments.
- Structured trace UI showing observable work, not hidden reasoning.
- QA panel with actionable issues, renderer data-shape checks, preview density risks, and a simple safe auto-fix for generated references.
- Poster JSON import, export, and reset.
- Export capability panel with JSON and project bundle manifest available; PPTX/PDF/PNG marked as planned.
- HTML poster preview.

## Source-Grounding Rules

- Every factual claim should link to at least one source.
- Every factual visual should link to source data, code, paper, project notes, or equivalent evidence.
- Literature claims and project/user results should remain separate in the data model.
- AI-generated images must not be used as factual evidence.
- Generated assets must preserve prompt/model/theme/palette/source relationship metadata.

## Project Structure

```text
src/
  app/          app-level re-exports
  components/   React UI panels
  data/         sample PosterProject data
  domain/       poster types, generator, evidence helpers, compatibility re-exports
  exports/      export capability registry and JSON download helper
  layouts/      typed layout template registry
  qa/           QA rules and safe fixes
  renderers/    deterministic visual renderers and placeholders
  sources/      source connector interfaces and mock connectors
  themes/       theme and palette definitions
  visuals/      visual registry definitions
```

Supporting files:

```text
spec/poster.schema.json
spec/example-poster.json
docs/architecture.md
```

## Near-Term Roadmap

1. Add stronger source connector behavior:
   - source document inspector
   - local file ingestion placeholder
   - web URL ingestion placeholder

2. Strengthen evidence extraction:
   - evidence graph UI
   - separate project results from literature claims
   - citation quality checks

3. Improve deterministic renderers:
   - Plotly charts
   - Mermaid SVG rendering
   - KaTeX or MathJax math rendering
   - Shiki code highlighting
   - richer table/timeline/Gantt renderers

4. Strengthen QA:
   - colour contrast
   - print readability
   - chart clipping
   - QR scanability
   - poster density
   - visual hierarchy

5. Add export implementations:
   - PptxGenJS editable PPTX export
   - Playwright PDF export
   - Playwright PNG preview export
   - project bundle ZIP output

## Long-Term Roadmap

- GPT Image 2 generated image assets for backgrounds, panels, section art, comic-strip frames, and atmosphere.
- PptxGenJS editable PowerPoint compiler.
- Playwright PDF/PNG render checks.
- Confluence and GitLab source access through Kiro MCP.
- Thin Kiro skill wrapper that calls the PosterForge engine.
- Judge/improve mode later, including rubric scoring and improvement suggestions.
- Presenter notes and 60-second pitch generation.
- Online and physical poster session support.
- Human judging support, with humans as final decision-makers.

## Design Principles

- Keep TypeScript/React central for the main app, UI, poster engine, visual registry, trace UI, and orchestration.
- Keep `poster.json` editable and importable.
- Use deterministic renderers for factual tables, equations, charts, code, diagrams, and metrics.
- Use generated images only for non-factual assets and atmosphere.
- Preserve source and asset metadata.
- Show structured traces for observable work.
- Keep NatWest colours isolated to the NatWest theme/palette unless explicitly selected.
