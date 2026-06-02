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
  -> HTML preview
  -> QA results and safe fixes
  -> exports
```

The `PosterProject` object is the source of truth. Outputs are derived artifacts:

- HTML preview
- deterministic visual renders
- generated image assets
- trace logs
- QA reports
- PPTX
- PDF
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

`spec/poster.schema.json` mirrors the current JSON shape for import/export.

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
    export capability registry
    browser JSON download helper
```

## Sources

The source layer separates acquisition from interpretation.

Current:

- connector interface
- mock Confluence source
- mock GitLab sources
- mock research paper source
- mock web page source
- generated source package for demo poster generation

Planned:

- source search UI
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
- Evidence panel in the UI

Planned:

- evidence graph UI
- claim-to-block location tracking
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

Planned deterministic renderers:

- Plotly charts
- Mermaid SVG rendering
- KaTeX or MathJax math rendering
- Shiki code highlighting
- richer table/timeline/Gantt rendering
- ROC, PR, calibration, lift/gains, feature importance, SHAP, residuals, actual vs predicted, missingness, fairness, choropleth, network graph, and embedding projection visuals

Factual visuals should be deterministic. GPT Image 2 should only create atmosphere, backgrounds, section art, comic panels, and similar non-factual assets.

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
- missing references
- export completeness
- explicit NatWest palette override notice

Planned QA checks:

- text overflow
- colour contrast
- print readability
- chart clipping
- QR code scanability
- citation quality
- data/paper separation
- poster density
- visual hierarchy

## Exports

Current:

- browser JSON export for the current `PosterProject`
- export capability registry
- UI showing PPTX/PDF/PNG/bundle as planned outputs with requirements

Planned:

- editable PPTX export with PptxGenJS
- print PDF export with Playwright
- preview PNG export with Playwright
- project bundle containing spec, sources, assets, renders, traces, QA, and exports
- SVG/PNG fallbacks for complex visuals

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
