# PosterForge — Task List

Working task list for the PosterForge project. Update this file as work is completed or new tasks are identified. Shared between Claude Code and Codex sessions.

---

## In Progress

---

## Backlog

### Theme-Generated Components (`docs/plans/theme-generated-components.md`)

- [ ] **Phase 2 — Generated-image slot model** — Promote image slots to first-class plan elements with `x`, `y`, `widthPx`, `heightPx` positioning in `buildLayoutSpec`.
- [ ] **Phase 3 — Layout spec generation** — Extend `buildLayoutSpec` to write one section per raster slot; SVG/svg-hybrid slots resolve through `ThemeMotifLayer`.
- [ ] **Phase 4 — Canvas overlay renderer** — Place deterministic content into sidecar-defined content regions; keep pan/resize/regenerate controls per slot.
- [ ] **Phase 5 — Theme-specific component skins (timeline, network-graph, sankey)** — Remaining visual types (timeline, network-graph, sankey) not yet wired to skin vars. Section card heading vars (font/transform/tracking) are CSS-only; verify they render correctly for blueprint-engineering uppercase headings.
- [ ] **Phase 6 — QA additions** — Checks for missing generated assets, stale dimensions, region overflow, low contrast, factual content in image prompts.

### Glassmorphism

- [ ] **`neural-network-glassmorphism` component skins** — Wire `backdrop-filter: blur(12px)`, semi-transparent backgrounds, and frosted card CSS tokens into the theme skin once Phase 1 contract types are in place. React can do this natively with CSS properties — no library needed.

### Source Layer

- [ ] **Source document inspector UI** — Panel showing extracted evidence per source document.
- [ ] **Local file ingestion** — Upload a file as a source (PDF, Markdown, plain text).
- [ ] **Web URL ingestion** — Fetch and extract a web page as a source document.

### Evidence and Claims

- [ ] **Evidence graph UI** — Visual graph linking claims → evidence → sources.
- [ ] **Separate project results from literature claims** — Data model and UI distinction.
- [ ] **Citation quality checks** — Flag claims with no linked evidence or low-trust sources.

### QA

- [ ] **Colour contrast checks** — WCAG AA/AAA contrast ratio on poster text vs background.
- [ ] **Chart clipping detection** — Flag charts where data extends beyond visible area.
- [ ] **QR scanability check** — Warn if QR code is too small for reliable scanning.
- [ ] **Visual hierarchy scoring** — Heuristic score for information density and reading order.

### Export

- [ ] **Editable HTML project package** — Self-contained HTML export with embedded assets.
- [ ] **Playwright PNG preview export** — Single-page PNG render of the poster.
- [ ] **Richer PptxGenJS export** — Native charts, tables, and styled text boxes (not just image captures).

---

## Completed

- [x] Bar chart rendering (Recharts ResponsiveContainer fix)
- [x] Part A3 gaps: content region overlays, `imagegen-themes.json` consumption, `assetId` sidecar pattern
- [x] `ThemeMotifLayer` for SVG/svg-hybrid themes
- [x] `generatePoster` passes theme to `buildStandardImageSlots`
- [x] 60 themes in `imagegen-themes.json` with density, strategy, prompt prefix
- [x] In-canvas image generation service (`src/services/imageGen.ts`)
- [x] `EditablePosterCanvas` with generation state, progress, sidecar callbacks
- [x] Asset catalogue loader (`src/assets/catalogue.ts`)
- [x] ThemePicker background previews from catalogue / SVG files
- [x] GabeChoice demo project replacing fraud monitoring example
- [x] `sourceFixtures.ts` replacing `mockConnectors.ts` with real GabeChoice data
- [x] `repoConnectors.ts` evidence extraction with sanitization
- [x] Mermaid SVG normalization (`normalizeMermaidSvg`)
- [x] PosterMinimap removed
- [x] `neural-network-glassmorphism` and `stained-glass-data-mosaic` themes defined in JSON
- [x] Theme contract types (Phase 1) — `ComponentSkins`, `SlotTemplate`, `ThemeHtmlTokens`, `ThemeTypography` added to `PosterTheme`; `componentSkins` data added for `whiteboard-explainer`, `blueprint-engineering`, `neural-network-glassmorphism`; `resolveComponentSkins()` export added
- [x] Phase 5 component skin rendering — `VisualRenderer` accepts `skins?: ComponentSkins`, applies correct skin slice (`pickSkin`) as CSS custom property vars on `.visual-box` for metric_card, flow_diagram, mermaid_flow, data-table, data_table, table, code_block. `PosterCanvas` computes `resolveComponentSkins(theme)`, sets `sectionCard` skin vars inline on `<section>`, passes `skins` + `palette` to `VisualRenderer`. CSS rules consume `var(--skin-bg/border/radius/shadow/backdrop/heading-*)` with fallbacks preserving existing appearance.
