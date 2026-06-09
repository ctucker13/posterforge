# PosterForge Product Roadmap — June 2026

Full plan of tasks to reach the product goal: a user gives a GitHub repository and a prompt; an agentic pipeline plans and compiles an academic data-science poster from real evidence, using gpt-image-2 for themed atmosphere/component surfaces; the user then has full creative control in the canvas — resizing, arranging, and editing everything — before export.

This plan supersedes the flat backlog ordering in `TASKS.md` (the tasks there are folded in below) and builds on `docs/plans/theme-generated-components.md`.

---

## Problem analysis

Four things have to be true for this product to succeed, and each maps to a current gap:

### 1. The user must be able to fix anything the AI got wrong — fast

Generative output is never right the first time. If editing is weaker than regenerating, users churn. Today the canvas supports section reorder/span/hide, image pan, and Cmd+K text revision — but there is **no undo/redo**, **no inline text editing**, **no drag-resize**, and no freeform placement. The slot model already has `x`/`y` (Phase 2 done) but the overlay renderer (Phase 4) is unbuilt. Editing is the differentiator the product is named for, so it comes first.

### 2. Generation must be a multi-step agent, not one prompt

`generatePosterWithLLM` is a single `chat.completions.create` call that returns the whole poster as one JSON object. That ceiling is low: sections aren't grounded per-evidence, visuals get hallucinated data, layout isn't reasoned about, and there is no critique loop. The trace data model (`PosterTraceEvent`, artifact refs) already anticipates a staged pipeline — the pipeline just doesn't exist. An agentic decomposition (plan → evidence → outline → per-section drafting → visual planning → layout planning → asset prompts → self-QA → bounded revision) raises quality and makes every step observable and re-runnable.

### 3. gpt-image-2 output must be survivable, not perfect

Image models will produce text artifacts, busy regions, and off-theme results. The architecture already has the right idea (generated images are atmosphere/surfaces; factual content stays deterministic HTML over `contentRegions`). What's missing is the reliability layer: multiple candidates per slot with a picker, automated validation that content regions actually came back quiet enough to overlay text, transparent component assets, prompt templates with negative guidance, caching, and cost guardrails.

### 4. Evidence must come from where data scientists actually keep results

`repoConnectors.ts` lists only top-level repo files. Data science repos keep their value in `notebooks/`, `results/`, committed figure PNGs, and CSVs. Deep traversal plus notebook/CSV/figure ingestion turns the evidence layer from "summarised README" into "real metrics, real charts, real figures with provenance."

---

## Milestones

Ordering rationale: editing first (agent output is only valuable if users can correct it), agentic pipeline second (the content-quality engine), image reliability third (the deterministic-overlay architecture already limits blast radius), source depth fourth, QA/export polish last (several QA checks depend on the freeform layer and region model existing).

---

## M1 — Canvas editing power

Goal: a user can take any generated poster and confidently reshape it without touching JSON.

- **A1. Undo/redo history** — Centralise `PosterProject` mutation behind a history store (immutable snapshots or patch stack), Cmd+Z / Cmd+Shift+Z, history capped and coalesced for drag gestures. This must land before the other editing tasks so they all get it for free.
- **A2. Inline text editing** — Click-to-edit on text blocks, section titles, poster title/subtitle directly on the canvas (contentEditable or swap-in textarea), Escape/blur to commit through `onPosterChange`. Cmd+K revision remains the AI path; typing is the manual path.
- **A3. Drag-resize sections** — Resize handles on selected sections that snap to grid columns/rows and write `columnSpan`/`rowSpan`; live ghost preview while dragging.
- **A4. Block-level rearrange** — dnd-kit drag of blocks within a section and between sections; insert indicators; works for text, visual_ref, and generated_image blocks.
- **A5. Phase 3 — Layout spec generation** *(existing backlog)* — Extend `buildLayoutSpec` to write one section per raster slot; SVG/svg-hybrid slots resolve through `ThemeMotifLayer`.
- **A6. Phase 4 — Freeform slot overlay renderer** *(existing backlog, expanded)* — Render generated slots as positioned surfaces using `x`/`y`/`width_px`/`height_px`; drag-move and corner-handle resize; deterministic content placed into sidecar content regions; pan/regenerate controls kept per slot.
- **A7. Z-order and snap guides** — Bring-forward/send-back for freeform elements; alignment guides (edges, centres, poster margins) during drag; shift-drag axis lock.
- **A8. Selection model upgrade** — Multi-select (shift-click, marquee), arrow-key nudging, Delete, duplicate (Cmd+D) for sections and freeform elements.
- **A9. Per-section style controls** — Inspector controls for text scale, alignment, and palette-derived accent/background colour per section; persisted in the spec, consumed via the existing skin/token CSS vars.
- **A10. Visual sizing controls** — Height/aspect controls on `visual_ref` blocks; charts re-render responsively into the chosen box.
- **A11. Phase 5 remainder — skins for timeline, network-graph, sankey** *(existing backlog)* — plus verify blueprint-engineering uppercase heading vars render correctly.

## M2 — Agentic generation pipeline

Goal: replace one-shot generation with an observable, steerable, multi-step agent; let the same agent perform scoped edits after generation.

- **B1. Staged pipeline orchestrator** — Decompose generation into discrete steps with real inputs/outputs: research plan → evidence selection → outline (existing user confirm dialog) → per-section drafting → visual planning → layout planning → image-slot prompt writing. Each step emits a real `PosterTraceEvent` with artifact refs; steps are individually re-runnable.
- **B2. Schema-validated structured outputs** — zod schemas per step; on invalid output, automatic repair re-ask (bounded retries) instead of silently falling back to `{}`.
- **B3. Evidence-grounded section drafting** — Each section is drafted with only its assigned evidence items in context; every text block carries `claim_ids`; claims with no evidence are flagged at generation time, not just in QA.
- **B4. Visual planner grounded in real data** — Map evidence (metrics, tables, code summaries) to visual-registry types and populate `visual.data` from evidence values; refuse to invent numbers — missing data becomes a placeholder visual with a "needs data" badge.
- **B5. Layout planner** — Choose layout template, section spans/emphasis, and slot placement from content volume and visual count instead of defaults; outputs reviewable as a trace artifact.
- **B6. Critique/judge pass** — Rubric scoring (clarity, hierarchy, density, source coverage, theme fit) after assembly; bounded auto-revision loop (≤2 iterations) targeting the lowest-scoring sections; scores surfaced in the QA panel.
- **B7. Conversational edit agent** — Extend the Cmd+K command bar beyond single text blocks: instructions like "make results the hero", "tighten methods", "swap the bar chart for a table" translate to JSON-patch operations on `PosterProject`, previewed as a diff (reuse `BlockRevisionDiff` pattern) with accept/reject. This is the bridge between agent power and user control.
- **B8. Run controller** — Cancellable generation runs, progress streaming per step, token/cost accounting per run, resume-from-step on failure.

## M3 — Image generation reliability (gpt-image-2)

Goal: generated assets are theme-true, overlay-safe, affordable, and recoverable when bad.

- **C1. Variant generation + picker** — Generate N candidates per slot (user-set, default 1), thumbnail picker per slot, retained history so a previous candidate can be restored.
- **C2. Region-quietness validation** — After generation, sample pixel variance/contrast inside each `contentRegion`; flag (or auto-retry with strengthened prompt) when a region is too busy to overlay legible text. Feeds the QA panel.
- **C3. Prompt template library** — Per theme × slot role templates combining `imagePromptPrefix`, role guidance, and standing negative guidance ("no text, no letters, no charts, no logos"); factual content structurally excluded from prompts (enforced + QA-checked, Phase 6).
- **C4. Transparent component assets** — `background: "transparent"` generation for new slot roles: `decoration`, `divider`, `frame`, `icon_set`; renderable as freeform overlay elements (depends on A6/A7).
- **C5. Cost guardrails + cache** — Per-project image budget with confirm-before-batch; prompt-hash dedupe cache so identical regen requests don't re-bill; running spend indicator near the generate controls.
- **C6. Inpaint/region edit path** — Where the API supports it, repair a single bad region (or outpaint after a slot resize) instead of full regeneration, preserving seed/composition.
- **C7. Proxy hardening** — Queue with concurrency limit, retry/backoff, and clear error surfaces for both direct-OpenAI and `VITE_IMAGEGEN_URL` paths.

## M4 — GitHub source depth

Goal: evidence comes from the real artifacts of a data science project, with provenance.

- **D1. Deep repo traversal** — Git trees API for recursive listing; prioritise `notebooks/`, `results/`, `reports/`, `docs/`, `figures/`; optional PAT for rate limits and private repos; size/binary filters.
- **D2. Notebook ingestion** — Parse `.ipynb`: markdown cells → source text, metric-bearing outputs → evidence items, embedded chart-image outputs → candidate poster assets with cell-level provenance.
- **D3. Repo figure import** — Committed PNG/SVG figures become importable `uploaded_image` assets with source linkage; surfaced in AssetPicker.
- **D4. Data file ingestion** — CSVs in the repo parsed into real data-table/chart visual data (column sniffing, row caps).
- **D5. Source document inspector UI** *(existing backlog)* — Panel showing extracted evidence per source document.
- **D6. Local file ingestion** *(existing backlog)* — PDF, Markdown, plain text upload.
- **D7. Web URL ingestion** *(existing backlog)* — Fetch and extract a web page as a source document.
- **D8. Evidence graph UI** *(existing backlog)* — Claims → evidence → sources visual graph.
- **D9. Separate project results from literature claims** *(existing backlog)* — Data model and UI distinction.
- **D10. Citation quality checks** *(existing backlog)* — Flag claims with no linked evidence or low-trust sources.

## M5 — QA, persistence, and export polish

Goal: posters survive sessions, pass review, and leave the app in useful formats.

- **E1. Autosave + project list** — IndexedDB persistence with autosave, multi-project list, named snapshots; snapshot automatically before each generation run (pairs with A1's history for in-session undo).
- **E2. Phase 6 QA additions** *(existing backlog)* — Missing generated assets, stale dimensions, region overflow, low contrast, factual content in image prompts.
- **E3. Colour contrast checks** *(existing backlog)* — WCAG AA/AAA on poster text vs background — including text over generated images via region sampling (shares machinery with C2).
- **E4. Chart clipping detection** *(existing backlog)*.
- **E5. QR scanability check** *(existing backlog)*.
- **E6. Visual hierarchy scoring** *(existing backlog)* — can reuse the B6 rubric.
- **E7. Overlap/overflow detection for freeform elements** — New check needed once A6/A7 exist.
- **E8. Editable HTML project package** *(existing backlog)* — Self-contained export with embedded assets.
- **E9. Playwright PNG preview export** *(existing backlog)*.
- **E10. Richer PptxGenJS export** *(existing backlog)* — Native charts, tables, styled text boxes.

---

## Cross-cutting workstream F — UX and UI discipline (Apple-like approach)

Applies to every milestone rather than slotting after one. The product philosophy: **user-focused, simple and easy by default, powerful and customisable underneath**. Concretely that means progressive disclosure (common actions visible, depth one click away), direct manipulation over forms, opinionated defaults that rarely need changing, and restraint in chrome — the poster is the interface, panels are servants.

Principles to hold every feature against:

1. **Simple surface, deep capability** — every new control ships with a sensible default and lives behind progressive disclosure unless it's used constantly. No setting added "just in case".
2. **Direct manipulation first** — if something can be dragged, resized, or clicked-to-edit on the canvas, that beats an inspector field. Inspector fields are the precision fallback, not the primary path.
3. **The user is never trapped** — every AI action previewable and reversible (undo, diff/accept); every error in plain language with a recovery action.
4. **Quiet interface** — panels earn their pixels; consolidate rather than accumulate; motion is feedback, not decoration.

Tasks:

- **F1. App design language system** — Token set for the app chrome (spacing, type scale, radii, elevation, motion durations/easings), consistent lucide icon usage, and a single accent system — distinct from poster themes. Audit existing panels against it.
- **F2. Progressive-disclosure inspector redesign** — Restructure the Inspector so the 3–4 most-used controls per selection are immediately visible and everything else sits behind a "More" tier; defaults good enough that most users never open it.
- **F3. Workspace simplification review** — Evaluate collapsing the Generate/Edit/Review/Export ModeBar into one continuous workspace where review and export are surfaces within editing, not modes; consolidate the panel population (QA, Trace, Evidence, Registry, Export) into a coherent right-rail with one panel open at a time.
- **F4. First-run and empty states** — "Paste a repo URL → poster" as the single obvious first action; empty states that teach the next step instead of showing blank panels; example project one click away.
- **F5. Microinteraction and motion pass** — Smooth zoom/fit transitions, drag ghosting and drop settle, generation progress that communicates stage (wired to B1 traces), skeletons over spinners; honours `prefers-reduced-motion`.
- **F6. Keyboard parity + shortcuts overlay** — Every common action reachable by keyboard; `?` overlay listing shortcuts; consistent Cmd+Z/D/K conventions across the app.
- **F7. Plain-language error and recovery surfaces** — No raw API errors in the UI; each failure states what happened, what it means, and one-click recovery (retry, switch to fallback, open settings).
- **F8. Accessibility baseline** — Focus rings, ARIA labels on canvas controls, contrast-checked app chrome (the poster QA already covers poster contrast).

Sequencing: F1 and F2 should land alongside M1 (the editing work triples the number of controls — the disclosure pattern must exist before they arrive). F4 and F7 land with M2 (generation is where new users arrive and where errors happen). F3, F5, F6, F8 are continuous, with F3's mode review decided before M2's run controller shapes the workspace.

---

## Dependencies worth respecting

- **A1 (undo/redo) before A2–A10** — every editing feature should mutate through the history store from day one.
- **A6/A7 (freeform layer) before C4 (transparent decorations) and E7 (overlap QA)**.
- **B2 (schema validation) before B3–B6** — staged steps are only composable if their outputs are validated.
- **C2 and E3 share image-sampling machinery** — build once.
- **E1 (snapshots) pairs with B8 (run controller)** — a generation run should never destroy a poster the user edited.

## Explicit non-goals for now

- Real-time multi-user collaboration.
- Full WYSIWYG rich-text (bold/italic runs inside blocks) — block-level editing is enough for poster copy.
- Letting gpt-image-2 render factual content (charts, numbers, labels) — deterministic renderers stay canonical, per the source-grounding rules.
