# PosterForge — Task List

Working task list for the PosterForge project. Update this file as work is completed or new tasks are identified. Shared between Claude Code and Codex sessions.

---

## In Progress

---

## Backlog

Organised by milestone — see `docs/plans/product-roadmap-2026-06.md` for the full analysis, dependency notes, and ordering rationale. Theme-generated-components phases from `docs/plans/theme-generated-components.md` are folded in (A5, A6, A11, E2).

### M1 — Canvas editing power

- [ ] **A11. Phase 5 remainder — skins for timeline, network-graph, sankey** — Plus verify blueprint-engineering uppercase heading vars render correctly.

### M2 — Agentic generation pipeline

- [ ] **B1. Staged pipeline orchestrator** — Research plan → evidence selection → outline confirm → per-section drafting → visual planning → layout planning → image-slot prompts; each step emits a real `PosterTraceEvent` and is individually re-runnable.
- [ ] **B2. Schema-validated structured outputs** — zod schemas per step with bounded repair re-asks; no silent `{}` fallback.
- [ ] **B3. Evidence-grounded section drafting** — Sections drafted with only assigned evidence in context; all text blocks carry `claim_ids`; unevidenced claims flagged at generation time.
- [ ] **B4. Visual planner grounded in real data** — Populate `visual.data` from evidence values; never invent numbers — missing data renders a "needs data" placeholder.
- [ ] **B5. Layout planner** — Choose layout, spans, emphasis, and slot placement from content volume and visual count; output reviewable as a trace artifact.
- [ ] **B6. Critique/judge pass** — Rubric scoring (clarity, hierarchy, density, source coverage, theme fit) with a ≤2-iteration revision loop; scores in QA panel.
- [ ] **B7. Conversational edit agent** — Cmd+K instructions beyond text blocks ("make results the hero", "swap the bar chart for a table") → JSON-patch on `PosterProject` → diff preview → accept/reject.
- [ ] **B8. Run controller** — Cancellable runs, per-step progress streaming, token/cost accounting, resume-from-step on failure.

### M3 — Image generation reliability (gpt-image-2)

- [ ] **C1. Variant generation + picker** — N candidates per slot with thumbnail picker and restorable history.
- [ ] **C2. Region-quietness validation** — Sample pixel variance/contrast inside each `contentRegion` post-generation; flag or auto-retry when too busy for legible overlay text.
- [ ] **C3. Prompt template library** — Per theme × slot role templates with standing negative guidance (no text/letters/charts/logos); factual content structurally excluded.
- [ ] **C4. Transparent component assets** — `background: "transparent"` generation for new slot roles `decoration`, `divider`, `frame`, `icon_set`, rendered as freeform overlays (needs A6/A7).
- [ ] **C5. Cost guardrails + cache** — Per-project image budget, confirm-before-batch, prompt-hash dedupe cache, running spend indicator.
- [ ] **C6. Inpaint/region edit path** — Repair a single region or outpaint after slot resize instead of full regen, preserving seed/composition.
- [ ] **C7. Proxy hardening** — Generation queue with concurrency limit, retry/backoff, clear error surfaces for direct and `VITE_IMAGEGEN_URL` paths.

### M4 — GitHub source depth

- [ ] **D1. Deep repo traversal** — Git trees API recursive listing prioritising `notebooks/`, `results/`, `reports/`, `docs/`, `figures/`; optional PAT; size/binary filters.
- [ ] **D2. Notebook ingestion** — Parse `.ipynb`: markdown → source text, metric outputs → evidence, chart-image outputs → candidate assets with cell-level provenance.
- [ ] **D3. Repo figure import** — Committed PNG/SVG figures become `uploaded_image` assets with source linkage, surfaced in AssetPicker.
- [ ] **D4. Data file ingestion** — Repo CSVs parsed into real data-table/chart visual data.
- [ ] **D5. Source document inspector UI** — Panel showing extracted evidence per source document.
- [ ] **D6. Local file ingestion** — Upload a file as a source (PDF, Markdown, plain text).
- [ ] **D7. Web URL ingestion** — Fetch and extract a web page as a source document.
- [ ] **D8. Evidence graph UI** — Visual graph linking claims → evidence → sources.
- [ ] **D9. Separate project results from literature claims** — Data model and UI distinction.
- [ ] **D10. Citation quality checks** — Flag claims with no linked evidence or low-trust sources.

### Cross-cutting — UX and UI discipline (Apple-like: simple by default, powerful underneath)

- [ ] **F4. First-run and empty states** — "Paste a repo URL → poster" as the single obvious first action; teaching empty states; example project one click away. *Land with M2.*

### M5 — QA, persistence, and export polish
- [ ] **E2. Phase 6 — QA additions** — Checks for missing generated assets, stale dimensions, region overflow, low contrast, factual content in image prompts.
- [ ] **E3. Colour contrast checks** — WCAG AA/AAA on poster text vs background, including text over generated images (shares sampling machinery with C2).
- [ ] **E4. Chart clipping detection** — Flag charts where data extends beyond visible area.
- [ ] **E5. QR scanability check** — Warn if QR code is too small for reliable scanning.
- [ ] **E6. Visual hierarchy scoring** — Heuristic score for information density and reading order (can reuse B6 rubric).
- [ ] **E7. Overlap/overflow detection for freeform elements** — New check once A6/A7 exist.
- [ ] **E8. Editable HTML project package** — Self-contained HTML export with embedded assets.
- [ ] **E9. Playwright PNG preview export** — Single-page PNG render of the poster.
- [ ] **E10. Richer PptxGenJS export** — Native charts, tables, and styled text boxes (not just image captures).

---

## Completed

- [x] E1 autosave + project list — IndexedDB persistence, autosave, multi-project list, named snapshots; auto-snapshot before each generation run
- [x] F9 glass UI redesign — full G1–G5 pass: glass tokens/shell, header + segmented mode bar, canvas stage (recessed + floating toolbar), compact section navigator, grouped toolbar, flat export/QA rows, audit polish (`docs/plans/ui-redesign-glass.md`)
- [x] F8 accessibility baseline — skip-to-canvas link, `aria-live` announcement region (generation, QA, errors), `aria-label` + `aria-roledescription` on poster article, focus trap in shortcuts overlay, `.sr-only` utility
- [x] F7 plain-language errors — `friendlyError` utility maps API/network/quota/policy failures to user-facing messages across generation and image-gen paths
- [x] F6 keyboard parity + shortcuts overlay — `?` opens overlay, Esc deselects/closes, arrow keys reorder sections, Delete hides section, arrow nudge/Cmd+D/Delete for freeform slots; `KeyboardShortcutsOverlay` with focus trap
- [x] F5 microinteraction + motion pass — `@keyframes panel-in`, `badge-pop`, `selection-pop`; `panel-enter` wrapper on right-rail tab switches; `key`-prop remount on inspector section/block panels; `prefers-reduced-motion` guard
- [x] F3 workspace simplification — collapse mode bar into segmented control, persistent right-rail tabs; decision in `docs/plans/f3-workspace-decision.md`
- [x] A10 visual sizing controls — S/M/L size buttons on `visual_ref` inspector; `data-visual-size` attribute drives `flex` sizing in CSS; `size` field on `PosterVisual`
- [x] A9 per-section style controls — text scale (S/M/L), alignment (L/C/R), and palette-derived accent color per section via CSS custom properties (`--section-text-scale`, `--section-text-align`, `--section-accent`); `SectionAccentPicker` swatches; fields on `PosterSectionLayout`
- [x] A8 freeform slot keyboard controls — arrow nudge (1 px / 10 px with Shift), Delete removes slot, Cmd+D duplicates; `handleSlotKeyDown` in `FreeformSlot`; `tabIndex` + focus-on-drag
- [x] A7 z-order + snap guides — bring-forward/send-back toolbar on freeform slot hover; `zOrder` field on `GeneratedImageSlot`; `computeSnap` aligns slot edges/centres to poster edges/centre with 15 px threshold; live guide lines
- [x] A6 Phase 4 freeform slot overlay renderer — generated slots rendered as absolutely-positioned draggable surfaces with pointer capture; drag-move and corner/edge resize handles; pan/regen controls per slot
- [x] A5 Phase 3 layout spec generation — `buildLayoutSpec` writes one section per raster slot; SVG/svg-hybrid slots resolve through `ThemeMotifLayer`
- [x] A4 block-level drag-to-reorder — dnd-kit drag of blocks within and between sections with insert indicators
- [x] A3 drag-resize sections — `SectionResizeHandles` in `PosterCanvas` (east/south/corner handles on the selected section): drag snaps to whole grid tracks with live reflow preview + span badge, commits `columnSpan`/`rowSpan` once on release (single undo step), Escape cancels; handles math converts computed track sizes into screen px to respect canvas zoom; starting a resize blurs any in-progress text edit so Cmd/Ctrl+Z routes to poster history; fixed pre-existing specificity bug where layout templates' per-section-type `grid-column` rules silently beat user `.span-N` classes (results-first, case-study); verified with Playwright (10 interaction checks)
- [x] F1 app design language system — chrome design tokens in `:root` (`--chrome-*` ink ramp/surfaces/borders/accent+semantic colors, `--radius-*`, `--text-*` chrome type scale, `--space-*`, `--elevation-*`, `--motion-*`/`--ease-out`); 322 value-identical replacements across `app.css` (stray radii 3/5/7px normalised onto the 4/6/8 scale); baseline transitions on chrome buttons with `prefers-reduced-motion` guard; poster canvas explicitly excluded (stays on `--theme-*`/`--skin-*`); verified pixel-identical vs baseline screenshots except deliberate corner-radius normalisation
- [x] F2 progressive-disclosure inspector — section selection shows title + Up/Down/Hide with span/emphasis behind a "Layout options" disclosure; visual selection shows validity + structured editor with metadata/raw-JSON/save behind "Advanced"; shared `.inspector-disclosure` style on F1 tokens; fixed pre-existing stretch bug (`align-content: start`) that blew inspector controls up to fill the rail height
- [x] F3 workspace decision — recorded in `docs/plans/f3-workspace-decision.md`: collapse modes into one continuous workspace, implement with M2
- [x] A2 inline text editing — `EditableText` component in `PosterCanvas` unifying poster title/subtitle, section titles, and text blocks: Enter commits single-line fields, Escape reverts and exits without committing, unchanged text never reaches `onCommit` (no spurious undo steps), plain-text paste preserved; `:empty::before` placeholder CSS keeps cleared text clickable; `white-space: pre-line` so newlines typed in text blocks survive the committed render; verified in-browser with Playwright (12 interaction checks)
- [x] A1 undo/redo history — pure history core (`src/app/posterHistory.ts`, capped at 100 steps, gesture coalescing via `coalesce` keys, `skipHistory` for derived data) + `usePosterHistory` hook owning the `PosterProject` in `App.tsx`; Cmd/Ctrl+Z and Cmd/Ctrl+Shift+Z / Ctrl+Y shortcuts (skipped inside inputs/contentEditable); undo/redo toolbar buttons in `EditablePosterCanvas`; per-keystroke call sites coalesced (ProjectEditor title/subtitle/audience, PosterInspector section title/block text/visual data); QA results and sidecar hydration bypass history; theme/palette picker state follows poster on undo
- [x] Phase 2 component slot model — `GeneratedImageSlot` and `SlotTemplate` gain `x`, `y`, `objectPosition`; `buildSlotsFromTemplates()` exported; `buildLayoutSpec` and `buildStandardImageSlots` delegate to theme `slotTemplates` when present; `objectPosition` canonical on slot; `slotTemplates` defined for `neural-network-glassmorphism` and `whiteboard-explainer`
- [x] `neural-network-glassmorphism` component skins — `backdrop-filter: blur(12px)`, semi-transparent backgrounds, frosted card CSS tokens via `componentSkins` and `--skin-backdrop` vars
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
