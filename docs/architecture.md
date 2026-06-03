# Architecture

PosterForge is a schema-driven poster compiler. The application should not generate PPTX directly from an LLM response. It should create, revise, render, QA, and export a structured `PosterProject`.

## Compiler Flow

```text
prompt + source selections
  -> source connector search/fetch
  -> parsed SourceDocument[]
  -> SourceSummary[] and EvidenceItem[]
  -> ClaimMap
  -> PosterProject / poster.json
  -> visual renderer plan
  -> browser-native HTML poster canvas
  -> QA results and safe fixes
  -> exports
```

The `PosterProject` object is the source of truth. Outputs are derived artifacts:

- HTML preview/editor canvas
- deterministic visual renders
- generated image assets
- trace logs
- QA reports
- PDF
- PPTX compatibility snapshot
- PNG
- project bundle

## Current Source-Of-Truth Model

`src/domain/poster.ts` defines:

- `PosterProject`
- `PosterSource`
- `SourceDocument`
- `SourceSummary`
- `EvidenceItem`
- `ClaimMap`
- `PosterClaim`
- `PosterSection`
- `PosterBlock`
- `PosterVisual`
- `PosterAsset`
- `PosterTraceEvent`
- `PosterQaIssue`

`spec/poster.schema.json` mirrors the current JSON shape for import/export. Runtime import validation lives in `src/domain/validation.ts` and checks both nested object shape and important cross-references such as claim, source, evidence, section, and visual IDs.

## Runtime Module Boundaries

```text
src/
  app/
    app-level re-exports

  components/
    React panels and controls

  data/
    sample PosterProject

  domain/
    core poster types
    demo generator
    evidence helpers
    compatibility re-exports

  sources/
    SourceConnector interfaces
    mock Confluence/GitLab/paper/web connectors

  visuals/
    visual registry definitions

  renderers/
    deterministic visual renderers and placeholders

  layouts/
    typed layout template registry

  themes/
    theme and palette definitions

  qa/
    QA checks and deterministic safe fixes

  exports/
    export job/artifact model
    export capability registry
    target readiness service
    browser JSON and bundle-manifest downloads
    A0 PDF export document renderer
    first-pass PPTX compatibility compiler
    HTML preview artifact descriptor
```

## Sources

The source layer separates acquisition from interpretation.

Current:

- connector interface
- connector kind and acquisition capability metadata
- mock Confluence source
- mock GitLab sources
- mock research paper source
- mock web page source
- generated source package for demo poster generation
- mock source interpretation helper that converts fetched documents into summaries and evidence

Planned:

- source document inspector
- local file ingestion
- web URL ingestion
- paper/PDF metadata support
- Confluence through Kiro MCP
- GitLab through Kiro MCP

## Evidence And Claim Map

Current:

- deterministic mock evidence extraction from source seed data
- source summaries
- claim map entries linking claims to source IDs, evidence IDs, and section IDs
- Evidence panel showing source summaries, source type/trust badges, claim confidence, poster locations, and linked evidence snippets

Planned:

- evidence graph UI
- literature claim vs project result separation
- citation quality checks
- source confidence and source type scoring

## Visual Registry And Renderers

Current registry groups:

- model performance
- explainability
- flow/process
- scientific/technical
- data quality
- other/generated assets

Current lightweight renderers/placeholders:

- confusion matrix
- Sankey-style flow
- table
- timeline
- Gantt
- metric card
- Mermaid source placeholder
- math source placeholder
- code block placeholder
- generated asset placeholder
- generated asset image rendering when `PosterVisual.asset.url` is present
- typed renderer data parsers in `src/visuals/data.ts`
- derived renderer calculations for confusion matrix metrics, Sankey link shares, and Gantt layout segments

Current generated asset path:

- `src/assets/imagePrompts.ts` plans non-factual image asset requests from `PosterProject` visual assets and project assets.
- `scripts/generate-image-asset.mjs` runs outside the browser, reads poster JSON, calls the OpenAI Images API when `OPENAI_API_KEY` is set, saves PNG and metadata under `public/generated-assets/`, and writes an updated importable poster JSON.
- Dry-run mode records the planned prompt and metadata without making an API call.
- Model names remain configurable in poster JSON and CLI args so future GPT Image versions can be tested without changing the app code.

Planned deterministic renderers:

- Plotly charts
- Mermaid SVG rendering
- KaTeX or MathJax math rendering
- Shiki code highlighting
- richer table/timeline/Gantt rendering
- ROC, PR, calibration, lift/gains, feature importance, SHAP, residuals, actual vs predicted, missingness, fairness, choropleth, network graph, and embedding projection visuals

Factual visuals should be deterministic. GPT Image models should only create atmosphere, backgrounds, section art, comic panels, and similar non-factual assets.

## Theme, Palette, And Layout

These are separate concerns:

- `theme`: layout grammar, typography, motifs, visual language
- `palette`: colour tokens
- `layout`: spatial structure
- `asset style`: generated-image prompt style

Current themes:

- NatWest Group
- Clean Academic
- Comic Strip Research
- Retro Time Lab

Current palettes:

- NatWest Group
- Clean Blue
- Comic Ink
- Retro Lab

Current layouts:

- three-column academic
- results-first
- timeline/process
- dashboard poster
- comic-strip narrative
- case-study poster

NatWest colours are not global. They are used by the NatWest theme by default, or by any other theme only when the NatWest palette is explicitly selected.

## Trace UI

Trace events are structured, observable work records. They must not expose private chain-of-thought.

Current trace stages include:

- planning poster
- searching sources
- reading source documents
- extracting evidence
- creating claim map
- choosing layout
- selecting visuals
- preparing image-generation prompts
- rendering deterministic visuals
- running QA
- applying self-fixes
- preparing exports

## QA

Current QA checks:

- poster title required
- at least one source required
- at least one results/key-finding section expected
- factual claims require source links
- factual visuals require source links
- generated images cannot be linked as factual evidence
- unknown source references
- missing visual references
- text density risk
- low generated image resolution risk
- chart label readability strategy risk
- renderer data shape checks for supported deterministic visuals
- long visual label overflow risk
- section density risk
- table density risk
- missing references
- export completeness
- explicit NatWest palette override notice

Planned QA checks:

- colour contrast
- print readability
- chart clipping
- QR code scanability
- citation quality
- data/paper separation
- poster density
- visual hierarchy

## Browser Canvas And A0 PDF Export

Current:

- `src/components/PosterCanvas.tsx` is the shared React renderer for preview, editing, and export.
- The canvas uses the poster format orientation to enforce A0 dimensions: landscape `1189mm x 841mm`, portrait `841mm x 1189mm`.
- `src/components/PosterPreview.tsx` wraps the canvas in zoom controls so users can inspect the output frame without changing the source layout.
- `src/components/EditablePosterCanvas.tsx` and `src/components/PosterInspector.tsx` provide structured browser editing that updates `PosterProject` JSON rather than editing an exported file.
- `src/exports/renderPosterHtml.tsx` renders the shared canvas to a static HTML export document.
- `scripts/export-pdf.ts` uses Playwright to produce a print-ready A0 PDF and a clipping QA report from that static HTML document.

The current primary fidelity path is:

```text
PosterProject JSON -> React PosterCanvas -> static export HTML -> Playwright A0 PDF
```

Planned:

- editable HTML project package containing `poster.json`, HTML/CSS assets, generated assets, and editor state
- Playwright PNG preview export
- stronger print QA for text overflow, contrast, image resolution, and chart clipping

## PPTX Compatibility Export

Current:

- `src/exports/pptx.ts` compiles the current `PosterProject` into a one-slide PowerPoint poster using PptxGenJS.
- The compiler preserves native title, subtitle, section headings, text blocks, Claim map, and Source bundle content as editable PowerPoint text.
- Current lightweight visual types export with native PowerPoint text/shapes for confusion matrix, metric card, table, Sankey-style flow, timeline, Gantt, Mermaid source, math source, and code source.
- Generated image assets with `PosterVisual.asset.url` are embedded as images when the browser can fetch the URL.
- PptxGenJS is loaded by dynamic import so the main app bundle does not pay the compiler cost until the user exports PPTX.
- `scripts/export-html-pptx.mjs` provides the higher-fidelity path: render poster JSON to static HTML, fit it into an A0 canvas using poster orientation, capture the canvas with Playwright, write a PNG, write DOM measurements, and place the captured render into an actual A0-sized PPTX slide.

PPTX is a compatibility output, not the canonical editing surface. The browser-native canvas and A0 PDF are the fidelity targets.

PPTX modes:

- native PPTX: more editable, lower visual fidelity, available from the browser export panel
- HTML-capture PPTX: closer to the HTML preview, less editable, available from `npm run export:pptx:html`
- future hybrid editable PPTX: use Playwright measurements to place editable text and screenshot fallbacks for complex regions

A0 sizing is mandatory for poster exports. Landscape PPTX output uses `1189mm x 841mm` (`46.811in x 33.110in`); portrait output uses `841mm x 1189mm`.

Planned:

- build the hybrid editable PPTX compiler from Playwright DOM measurements
- add SVG/PNG fallbacks for charts, Mermaid, math, and code
- add export QA for text overflow, clipping, and missing image assets

## Exports

Current:

- export job and artifact model
- centralized readiness service for JSON, PPTX, PDF, PNG, and bundle targets
- browser JSON export for the current `PosterProject`
- browser project bundle manifest export
- browser PPTX compatibility export
- CLI A0 PDF export through Playwright
- export capability registry
- UI showing JSON, A0 PDF, PPTX compatibility snapshot, and bundle manifest as available outputs
- UI showing editable HTML project and PNG as planned outputs
- HTML preview descriptor artifact for project bundles

The project bundle manifest is a JSON placeholder for the future ZIP bundle. It records expected entries for poster spec, source documents, summaries, evidence, claim map, assets, traces, QA, references, and planned export outputs.

The readiness service is shared by the export UI and QA layer so target requirements are not duplicated. JSON, A0 PDF, PPTX compatibility snapshot, and bundle manifest exports can be ready now; editable HTML project and PNG remain planned.

Planned:

- editable HTML project package
- preview PNG export with Playwright
- project bundle containing spec, sources, assets, renders, traces, QA, and exports
- optional richer PPTX compatibility export with SVG/PNG fallbacks for complex visuals

## Future Kiro Skill

The Kiro skill should be thin. It should call the PosterForge engine rather than duplicating the poster logic.

Planned operations:

- create poster from prompt
- add source
- render preview
- export PPTX
- export PDF
- revise poster
- run QA
- regenerate visual asset

Confluence and GitLab access should happen through Kiro MCP servers later.

## Explicit Non-Goals For The Current MVP

- judge/improve mode
- poster competition simulation
- event judging
- multi-user collaboration
- production Confluence/GitLab authentication
- full brand governance
