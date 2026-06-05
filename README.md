# PosterForge

PosterForge is a source-grounded academic and data science poster generation workspace.

The core product direction is a schema-driven poster compiler, not "LLM directly to PPTX":

```text
user prompt + sources
  -> poster project spec
  -> source documents and evidence
  -> visual assets (deterministic + AI-generated)
  -> browser-native HTML poster canvas
  -> QA loop
  -> A0 print PDF
  -> 1920x1080 virtual session PDF
  -> optional PPTX compatibility snapshot
  -> project bundle ZIP
```

The `PosterProject` / `poster.json` spec is the source of truth. The React HTML/CSS poster canvas is the canonical visual renderer. PDF, PPTX, PNG, images, traces, QA results, and bundles are generated outputs.

## Environment

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

| Variable | Required | Description |
|---|---|---|
| `VITE_OPENAI_API_KEY` | Yes (for AI features) | OpenAI API key for poster generation and in-canvas image generation |
| `VITE_OPENAI_MODEL` | No | Chat model for poster generation (default: `gpt-4o`) |
| `VITE_OPENAI_IMAGE_MODEL` | No | Image model for in-canvas generation (default: `gpt-image-2`) |
| `VITE_IMAGEGEN_URL` | No | Route in-canvas image generation to a self-hosted service instead of calling OpenAI directly. POST `{ model, prompt, size, output_format, background }`, expect `{ b64_json }` back. |

## Commands

```bash
npm install
npm run dev
npm run build
npm run test:run
npm run image:plan -- --visual vis_generated_panel
OPENAI_API_KEY=... npm run image:generate -- --visual vis_generated_panel --model gpt-image-2
npx playwright install chromium
npm run export:check -- --poster spec/example-poster.json
npm run export:pdf -- --poster spec/example-poster.json
npm run export:screen -- --poster spec/example-poster.json
npm run export:pptx:html -- --poster public/generated-assets/poster_demo_fraud_model.generated.json
```

`npm run dev` starts Vite on `0.0.0.0`.

`npm run image:plan` writes prompt metadata without calling OpenAI. `npm run image:generate` calls the OpenAI Images API from Node, saves the image and sidecar JSON under `public/generated-assets/`, and writes an updated importable poster JSON.

`npm run export:check` renders poster JSON through the shared React poster canvas and writes a layout QA report without producing the final PDF.

`npm run export:pdf` runs layout preflight, writes a static HTML export document, and creates a print-ready A0 PDF with Playwright. Landscape output is `1189mm × 841mm`; portrait is `841mm × 1189mm`.

`npm run export:screen` renders the A0 poster into a single 1920×1080 PDF page for virtual poster sessions.

`npm run export:pptx:html` is a compatibility path that captures the HTML poster canvas into an A0-sized PPTX slide.

## Current Stack

- Vite + React + TypeScript
- Recharts (bar, line, area, pie, scatter, histogram charts)
- KaTeX / react-katex (equation rendering)
- Mermaid (flow diagram rendering)
- lucide-react
- @dnd-kit
- jszip
- Playwright
- PptxGenJS
- npm

Python is intentionally not the app core. It can be added later with `uv` for data science helpers.

## Current Features

### Poster Generation
- Mode-based workspace for Generate, Edit, Review, and Export.
- Prompt-driven poster generation with an outline confirmation step before full generation.
- LLM-backed generation (via `VITE_OPENAI_API_KEY`) with deterministic fallback when no key is set.
- Real-source generation path: attach Confluence, GitLab, web, or local file sources and the generator derives sections, visuals, and claims from evidence extracted from those documents.
- Typed `PosterProject` model with metadata, sources, source documents, evidence, claim map, sections, visuals, assets, image slots, traces, QA results, and references.
- Runtime `PosterProject` validation for JSON import with nested shape and cross-reference checks.
- Schema migration chain for legacy imported posters.

### Visual Renderers
- Full Recharts renderers for bar chart, line chart, area chart, pie/donut, scatter plot, histogram, and heatmap.
- KaTeX renderer for LaTeX equations (inline and display mode).
- Mermaid renderer for flow diagrams (lazy-loaded, SSR-safe).
- SVG renderer for network graphs with circular layout and directional edges.
- HTML table renderer for data tables.
- Deterministic renderers for confusion matrix, Sankey-style flow, timeline, Gantt, metric card, and code block.
- Visual registry (`src/visuals/visualRegistry.ts`) with 15 typed visual definitions, default data, and editable field schemas.
- VisualPicker modal with category tabs (All / Charts / Diagrams / Equations / Tables) and mini previews.
- VisualDataEditor with live editable fields (text, number, boolean, array-of-strings, array-of-numbers, textarea).
- Error boundary on every renderer — one broken visual cannot crash the poster.

### In-Canvas Image Generation
- `GeneratedImageSlot` domain type tracking `assetId`, `outputFormat`, `seed`, `contentRegions`, and dimensions.
- `generated_image` block type in sections: renders a placeholder with a "Generate image" button until generated, then a draggable image.
- In-browser image generation via `src/services/imageGen.ts`: calls OpenAI `gpt-image-2` (or `VITE_OPENAI_IMAGE_MODEL`) directly, or POSTs to `VITE_IMAGEGEN_URL` if set for server-side key management.
- "Regen" and "Regen (exact)" buttons — exact mode appends a composition-preservation instruction to the prompt and uses the stored seed.
- Pointer-drag pan on generated images to adjust `objectPosition` without regenerating.
- Sidecar JSON loading: when `assetId` is set, the canvas fetches `/generated-assets/{assetId}.json` to populate `seed` and `contentRegions` from the image-gen CLI's output.
- Content region overlays (title/body/chart zones) shown in edit mode over generated images.
- Theme background strategy derived from `src/themes/imagegen-themes.json`: SVG and svg-hybrid themes (16 themes) fill immediately from `public/theme-backgrounds/`; raster themes (44 themes) use the generate button.
- `ThemeMotifLayer` wired to the canvas article for SVG/svg-hybrid themes.
- Standard slots (`background`, `hero_illustration`, `section_art`) initialised on poster creation; `hero_illustration` skipped for low-density themes (7 themes).
- `buildLayoutSpec` produces a `layout-spec.json` for the `image-gen` CLI (`posterforge-assets generate-for-layout`).

### Canvas and Editor
- Shared `PosterCanvas` component used by preview, editor, and A0 PDF export.
- `EditablePosterCanvas` wraps the canvas with full in-canvas generation state: slot generation queue, progress indicators, sidecar callback, and image position updates wired through `onPosterChange`.
- Continuous zoom controls, fit snapping, section focus zoom, layout check overlay, minimap, and virtual 16:9 preview mode.
- Drag-to-reorder sections, section visibility toggle, span/emphasis controls, selected-section toolbar.
- Cmd+K text block revision flow with accept/reject diff.
- VisualPicker wired into the Canvas Inspector "Add visual" button.

### Themes
- 60 themes defined in `imagegen-themes.json` with `backgroundStrategy`, `density`, `htmlTokens`, `typography`, `chartStyle`, `diagramStyle`, and image prompt prefixes.
- Theme and palette separation with swatch-based theme selection and opt-in palette override.
- NatWest Group theme and palette scoped to explicit selection.

### QA and Export
- QA panel with actionable issues, canvas navigation, renderer data-shape checks, print/virtual output-intent checks, preview density risks, and auto-fix for generated references.
- Export capability panel: poster JSON, A0 PDF, virtual session PDF, PPTX snapshot, and project bundle ZIP.
- First-pass PptxGenJS compiler for editable poster export with native text, claim/source cards, and generated image embedding.
- Playwright-backed A0 PDF and screen PDF export scripts.

## Source-Grounding Rules

- Every factual claim should link to at least one source.
- Every factual visual should link to source data, code, paper, project notes, or equivalent evidence.
- Literature claims and project/user results should remain separate in the data model.
- AI-generated images must not be used as factual evidence.
- Generated assets must preserve prompt/model/theme/palette/source relationship metadata.

## Project Structure

```text
src/
  components/   React UI panels (PosterCanvas, EditablePosterCanvas, VisualPicker, VisualDataEditor, ThemeMotifLayer, …)
  data/         sample PosterProject data
  domain/       poster types, generator, evidence helpers, validation
  exports/      export model, readiness checks, JSON downloads, bundle manifest
  layouts/      layout template registry, buildLayoutSpec
  qa/           QA rules and safe fixes
  renderers/    deterministic and chart visual renderers (VisualRenderer)
  services/     imageGen (in-browser image generation service)
  sources/      source connector interfaces and mock connectors
  themes/       theme/palette definitions, imagegen-themes.json
  visuals/      visual registry (visualRegistry.ts)

public/
  theme-backgrounds/   SVG backgrounds for 16 svg/svg-hybrid themes
  generated-assets/    output dir for image-gen CLI (images + sidecar JSON)

scripts/
  generate-image-asset.mjs   Node CLI for offline/production image generation
```

Supporting files:

```text
.env.example
spec/poster.schema.json
spec/example-poster.json
docs/architecture.md
docs/plans/
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

3. Strengthen QA:
   - colour contrast checks
   - chart clipping detection
   - QR scanability
   - visual hierarchy scoring

4. Strengthen export implementations:
   - editable HTML project package
   - Playwright PNG preview export
   - optional richer PptxGenJS compatibility export

## Long-Term Roadmap

- Browser-native editable poster project package.
- Playwright PDF/PNG render checks.
- Confluence and GitLab source access through Kiro MCP.
- Thin Kiro skill wrapper that calls the PosterForge engine.
- Judge/improve mode with rubric scoring and improvement suggestions.
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
