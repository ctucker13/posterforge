# PosterForge — Task List

Working task list for the PosterForge project. Update this file as work is completed or new tasks are identified. Shared between Claude Code and Codex sessions.

---

## In Progress

---

## Backlog

Organised by milestone — see `docs/plans/product-roadmap-2026-06.md` for the full analysis, dependency notes, and ordering rationale. Theme-generated-components phases from `docs/plans/theme-generated-components.md` are folded in (A5, A6, A11, E2).

### M1 — Canvas editing power

- [ ] **A3. Drag-resize sections** — Resize handles snapping to grid columns/rows, writing `columnSpan`/`rowSpan`, with ghost preview.
- [ ] **A4. Block-level rearrange** — dnd-kit drag of blocks within and between sections with insert indicators.
- [ ] **A5. Phase 3 — Layout spec generation** — Extend `buildLayoutSpec` to write one section per raster slot; SVG/svg-hybrid slots resolve through `ThemeMotifLayer`.
- [ ] **A6. Phase 4 — Freeform slot overlay renderer** — Render generated slots as positioned surfaces (`x`/`y`/`width_px`/`height_px`); drag-move and corner-handle resize; deterministic content into sidecar content regions; keep pan/regenerate controls per slot.
- [ ] **A7. Z-order and snap guides** — Bring-forward/send-back; alignment guides on edges/centres/margins; shift-drag axis lock.
- [ ] **A8. Selection model upgrade** — Multi-select, marquee, arrow-key nudge, Delete, duplicate (Cmd+D).
- [ ] **A9. Per-section style controls** — Text scale, alignment, palette-derived accent/background per section via existing skin/token CSS vars.
- [ ] **A10. Visual sizing controls** — Height/aspect controls on `visual_ref` blocks with responsive chart re-render.
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

- [ ] **F1. App design language system** — Chrome tokens (spacing, type scale, radii, elevation, motion), consistent iconography, single accent system — distinct from poster themes; audit existing panels. *Land with M1.*
- [ ] **F2. Progressive-disclosure inspector redesign** — Top 3–4 controls per selection visible, the rest behind a "More" tier; defaults good enough to rarely open it. *Land with M1, before A3–A10 add controls.*
- [ ] **F3. Workspace simplification review** — Evaluate collapsing the Generate/Edit/Review/Export modes into one continuous workspace; consolidate QA/Trace/Evidence/Registry/Export panels into one coherent right-rail. *Decide before B8.*
- [ ] **F4. First-run and empty states** — "Paste a repo URL → poster" as the single obvious first action; teaching empty states; example project one click away. *Land with M2.*
- [ ] **F5. Microinteraction and motion pass** — Smooth zoom/fit transitions, drag ghosting, stage-aware generation progress (wired to B1 traces), skeletons over spinners; `prefers-reduced-motion` support.
- [ ] **F6. Keyboard parity + shortcuts overlay** — Every common action keyboard-reachable; `?` shortcuts overlay; consistent Cmd+Z/D/K conventions.
- [ ] **F7. Plain-language error and recovery surfaces** — No raw API errors; each failure says what happened and offers one-click recovery. *Land with M2/M3.*
- [ ] **F8. Accessibility baseline** — Focus rings, ARIA labels on canvas controls, contrast-checked app chrome.

### M5 — QA, persistence, and export polish

- [ ] **E1. Autosave + project list** — IndexedDB persistence, autosave, multi-project list, named snapshots; auto-snapshot before each generation run.
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
