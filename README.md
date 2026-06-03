# PosterForge

PosterForge is a source-grounded academic and data science poster generation workspace.

The core product direction is a schema-driven poster compiler, not "LLM directly to PPTX":

```text
user prompt + sources
  -> poster project spec
  -> source documents and evidence
  -> visual assets
  -> browser-native HTML poster canvas
  -> QA loop
  -> A0 print PDF
  -> optional PPTX compatibility snapshot
  -> project bundle
```

The `PosterProject` / `poster.json` spec is the source of truth. The React HTML/CSS poster canvas is the canonical visual renderer. PDF, PPTX, PNG, images, traces, QA results, and bundles are generated outputs.

## Commands

```bash
npm install
npm run dev
npm run build
npm run image:plan -- --visual vis_generated_panel
OPENAI_API_KEY=... npm run image:generate -- --visual vis_generated_panel --model gpt-image-1.5
npx playwright install chromium
npm run export:check -- --poster spec/example-poster.json
npm run export:pdf -- --poster spec/example-poster.json
npm run export:pptx:html -- --poster public/generated-assets/poster_demo_fraud_model.generated.json
```

`npm run dev` starts Vite on `0.0.0.0`.

`npm run image:plan` writes prompt metadata without calling OpenAI. `npm run image:generate` calls the OpenAI Images API from Node, saves the PNG and metadata under `public/generated-assets/`, and writes an updated importable poster JSON. The sample spec keeps image asset model names configurable; the current OpenAI image-generation docs list `gpt-image-1.5`, `gpt-image-1`, and `gpt-image-1-mini`, so pass `--model gpt-image-1.5` if a future placeholder model name is rejected.

`npm run export:check` renders poster JSON through the shared React poster canvas and writes a layout QA report without producing the final PDF. It checks clipping, section overlap, elements outside the A0 canvas, zero-size regions, and missing image assets.

`npm run export:pdf` runs the same layout preflight, writes a static HTML export document, and creates a print-ready A0 PDF with Playwright. For landscape posters the output is `1189mm x 841mm`; for portrait posters it is `841mm x 1189mm`. The script writes the layout QA report beside the PDF.

`npm run export:pptx:html` is now a compatibility path. It captures the HTML poster canvas and places that capture into an actual A0-sized PPTX slide. It is useful when a PowerPoint file is required, but the browser-native HTML canvas and A0 PDF are the fidelity targets.

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
- GPT Image asset planning/generation script for non-factual backgrounds, comic panels, and section art, with prompt/model/theme/palette metadata preserved.
- Derived renderer summaries for confusion matrix metrics, Sankey flow shares, and Gantt timeline segments.
- Structured trace UI showing observable work, not hidden reasoning.
- QA panel with actionable issues, renderer data-shape checks, preview density risks, and a simple safe auto-fix for generated references.
- Poster JSON import, export, and reset.
- Export job/artifact model with centralized readiness checks.
- Shared React poster canvas used by preview, editor, and A0 PDF export.
- Zoomable A0 preview frame so the aspect ratio and poster use of space match exported files.
- Structured browser editing controls for section order, visibility, span/emphasis, and text block copy.
- Export capability panel with poster JSON, A0 PDF, PPTX compatibility snapshot, and project bundle manifest available; editable HTML project and PNG marked as planned.
- First-pass PptxGenJS compiler for one-slide editable poster export with native text, claim/source cards, lightweight native visual renderers, and generated image embedding when asset URLs are available.
- Playwright-backed high-fidelity HTML render to PPTX export script with PNG capture and DOM measurement output.
- Playwright-backed A0 PDF export script with static HTML output and DOM layout preflight.
- HTML preview artifact descriptor for project bundles and export QA.
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
  exports/      export model, readiness checks, JSON downloads, bundle manifest, preview descriptor
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

5. Strengthen export implementations:
   - editable HTML project package
   - Playwright PNG preview export
   - project bundle ZIP output
   - optional richer PptxGenJS compatibility export where practical

## Long-Term Roadmap

- GPT Image generated image assets for backgrounds, panels, section art, comic-strip frames, and atmosphere.
- Browser-native editable poster project package.
- Playwright PDF/PNG render checks.
- Optional richer PptxGenJS PowerPoint compatibility compiler.
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
