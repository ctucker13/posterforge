# PosterForge — Complete Implementation Plan

This document is a ground-truth implementation plan derived from a full read of the
`ctucker13/posterforge` codebase at commit `f9c6274`. Every file reference, function
name, type name, and CSS class name is exact. It is intended to be handed directly to
Claude Code or Codex for implementation.

---

## Repository structure (relevant files)

```
src/
  App.tsx                          — root component, owns all state
  components/
    EditablePosterCanvas.tsx       — zoom/pan canvas wrapper
    PosterCanvas.tsx               — pure poster renderer, mode prop
    PosterInspector.tsx            — section/block editor panel
    ProjectEditor.tsx              — title/subtitle/layout/audience fields
    QaPanel.tsx                    — QA issues list
    ExportPanel.tsx                — export targets UI
    SourceSearchPanel.tsx          — source search + repo URL fetch
    TracePanel.tsx                 — generation trace events
    VisualRegistryPanel.tsx        — visual type browser
    EvidencePanel.tsx              — source summaries + claim map
    JsonProjectControls.tsx        — import/export/reset JSON
    posterUtils.ts                 — parseBlockId()
  domain/
    poster.ts                      — all types: PosterProject, PosterSection, etc.
    generator.ts                   — generatePoster(), GenerationOptions, generationTrace
    validation.ts                  — validatePosterProject()
    evidence.ts                    — buildClaimMap()
  visuals/
    registry.ts                    — visualRegistry, VisualDefinition, VisualPurpose
    data.ts                        — all parse*Data() functions + typed interfaces
  renderers/
    VisualRenderer.tsx             — switch on visual.type → renderer component
    derived.ts                     — summarizeConfusionMatrix(), etc.
  qa/
    index.ts                       — runQa(), applyQaFix()
  exports/
    index.ts                       — exportCapabilities[], downloadPosterJson(), etc.
    model.ts                       — ExportTarget, ExportArtifact, ExportJob, ExportManifest
    readiness.ts                   — getExportReadiness(), getExportReadinessForTarget()
    pptx.ts                        — buildPosterPptx(), buildPptxPosterPlan()
    renderPosterHtml.tsx           — renderPosterHtml(), RenderPosterHtmlOptions
    htmlPreview.ts                 — buildHtmlPreviewArtifact()
  layouts/
    index.ts                       — layoutTemplates[], LayoutTemplate, resolveLayoutTemplate()
  themes/
    index.ts                       — themes{}, palettes{}, resolvePalette()
  sources/
    mockConnectors.ts              — mockSourceConnectors[], buildMockSourcePackage()
  styles/
    app.css                        — all CSS, including A0 poster output frame rules
scripts/
  export-pdf.ts                    — Playwright A0 PDF export
  generate-image-asset.mjs         — OpenAI image generation script
```

---

## Phase 1 — Bug fixes (existing review items)

These are targeted fixes to known issues. Implement these first as they are
prerequisites or dependencies for later phases.

---

### 1.1  QA issue navigation — wire location to canvas

**Files:** `src/components/QaPanel.tsx`, `src/App.tsx`

**Problem:** Each `PosterQaIssue` has a `location` field (e.g. `visuals.vis_001`,
`sections.hero`, `claims.claim_001`). The QA panel renders `<code>{issue.location}</code>`
but clicking it does nothing.

**Implementation:**

In `QaPanel.tsx`, add an `onNavigate?: (location: string) => void` prop to
`QaPanelProps`. Add a "Go" button to each `<li className="qa-issue">` that calls
`onNavigate(issue.location)`.

```tsx
// QaPanel.tsx — add to QaPanelProps
onNavigate?: (location: string) => void;

// In the issue list item, alongside the existing Fix button:
{onNavigate && (
  <button type="button" onClick={() => onNavigate(issue.location)}>
    <MapPin size={15} /> Go
  </button>
)}
```

In `App.tsx`, add a `handleQaNavigate` function. Parse the dot-path to extract
the element ID. The format is `{collection}.{id}` or `{collection}.{id}.{subfield}`.
Extract the second segment as the canvas element ID, call `setSelectedCanvasItem`,
and switch `activeTab` to `"edit"` so the inspector is visible.

```ts
// App.tsx
function handleQaNavigate(location: string) {
  const parts = location.split(".");
  const collection = parts[0];
  const id = parts[1];
  if (!id) return;

  if (collection === "visuals") {
    setSelectedCanvasItem({ id, kind: "visual" });
  } else if (collection === "sections") {
    setSelectedCanvasItem({ id, kind: "section" });
  } else if (collection === "claims" || collection === "sources") {
    // No canvas element — just switch to edit tab for the inspector
  }
  setActiveTab("edit");
}
```

Pass `onNavigate={handleQaNavigate}` to `<QaPanel>` in the `App.tsx` render.

The canvas's `focusEditableTarget()` in `EditablePosterCanvas.tsx` already
handles scroll-to-selected when `selectedId` changes — no changes needed there.

---

### 1.2  Source connector fallback warning

**File:** `src/components/SourceSearchPanel.tsx`

**Problem:** `App.tsx` has a `sourceMode` state (`"mock" | "web" | "local"`) that is
passed as `GenerationOptions.sourceMode` to `generatePoster()`. However,
`SourceSearchPanel` only ever calls `mockSourceConnectors` regardless of which
mode is set, so "Web" and "Local" silently produce mock results.

**Implementation:**

`SourceSearchPanel` does not currently receive `sourceMode` as a prop. Add it.

```tsx
// SourceSearchPanel.tsx — add to props interface
interface SourceSearchPanelProps {
  poster: PosterProject;
  sourceMode: GenerationOptions["sourceMode"];   // add this
  onPosterChange: (poster: PosterProject) => void;
}
```

At the top of the panel body render, conditionally show a banner:

```tsx
{sourceMode !== "mock" && (
  <div className="source-mode-warning" role="alert">
    <AlertTriangle size={15} />
    <span>
      {sourceMode === "web" ? "Web" : "Local"} connector is not yet live.
      Search results are mock data. Real connector support is planned.
    </span>
  </div>
)}
```

Add `.source-mode-warning` to `app.css`:
```css
.source-mode-warning {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  border-radius: 6px;
  padding: 8px 10px;
  color: #93370d;
  font-size: 12px;
  font-weight: 700;
  background: #fffaeb;
  border: 1px solid #fedf89;
}
```

In `App.tsx`, pass `sourceMode={sourceMode}` to `<SourceSearchPanel>`.

---

### 1.3  Validate-before-export confirmation dialog

**File:** `src/components/ExportPanel.tsx`

**Problem:** Clicking an export button in `ExportPanel` immediately fires the export.
`getExportReadiness()` already returns blockers and QA issues but there is no
confirmation step.

**Implementation:**

Add local state for a pending export target and a modal:

```tsx
const [pendingExport, setPendingExport] = useState<ExportTarget | null>(null);
```

Change the export button `onClick` to `setPendingExport(capability.target)` instead
of calling `handleExport` directly.

Add a confirmation dialog that renders when `pendingExport !== null`. It shows:
- The export target label
- Any `readiness.blockers` for that target (up to 4)
- The count of high-severity QA issues from `poster.qaResults`

Two buttons: "Export anyway" (calls `handleExport(pendingExport)` then
`setPendingExport(null)`) and "Cancel" (`setPendingExport(null)`).

Use a `<dialog>` element styled inline — do not use `position: fixed`.

---

### 1.4  Visual data error inspector

**Files:** `src/components/PosterInspector.tsx`, `src/visuals/data.ts`

**Problem:** When `VisualRenderer` receives a visual whose data fails parsing, it
renders `<InvalidVisualData>` on the canvas. `PosterInspector` currently shows
"Visual selection is read-only in this first editing slice." when a visual is
selected, with no way to fix the data.

**Implementation:**

In `PosterInspector.tsx`, when `selectedKind === "visual"` and `selectedId` is set,
look up the visual from `poster.visuals`. Run the appropriate `parse*Data()` function
from `src/visuals/data.ts` against `visual.data`. If the result is `ok: false`, show
a data repair panel:

```tsx
// PosterInspector.tsx
if (selectedKind === "visual" && selectedId) {
  const visual = poster.visuals.find(v => v.id === selectedId);
  if (visual) {
    const parseError = getVisualParseError(visual);
    // If parse error, show JSON editor textarea
    // If no error, show read-only summary (type, source count)
  }
}
```

Add a `getVisualParseError(visual: PosterVisual): string | undefined` helper that
runs the matching parser and returns the error message or `undefined`. Import the
parsers from `src/visuals/data.ts` — the same ones already used in `VisualRenderer`
and `readiness.ts`.

For the edit state, use `useState<string>` initialised to
`JSON.stringify(visual.data, null, 2)`. On save, `JSON.parse` the textarea value,
validate with the parser, and if valid call `onPosterChange` with the updated visual.
Show a parse error message inline if the JSON is invalid.

---

## Phase 2 — Canvas zoom redesign

The A0 canvas is 4492×3179px (landscape) at 96dpi CSS pixels. At the current
`fitZoom ≈ 0.16` body text renders at ~5px — unreadable. The hardcoded constants
`editZoom = 0.52` and `checkZoom = 0.16` in `EditablePosterCanvas.tsx` must be
replaced with a continuous zoom model.

---

### 2.1  Replace hardcoded zoom constants with continuous zoom

**File:** `src/components/EditablePosterCanvas.tsx`

**Remove:**
```ts
const editZoom = 0.52;   // delete
const checkZoom = 0.16;  // delete
```

**Replace `EditorViewMode`:**
The type `"fit" | "edit" | "check"` conflates zoom level with canvas mode. Separate
them:

```ts
type CanvasEditMode = "editing" | "preview";   // controls contentEditable
// zoom is now a plain number, not a named mode
```

Remove the three-button Fit/Edit/Check toggle. Replace with:
- A "Fit" snap button (sets zoom to the computed `fitZoom`)
- `−` and `+` buttons (step by 0.05)
- A zoom percentage display (read-only text, not an input)
- Mouse-wheel zoom already works — keep it

Snap points: 0.10, 0.16, 0.25, 0.34 (screen-fit), 0.52, 1.0. The "Fit" button
snaps to `fitZoom` (viewport-computed). `Cmd+0` snaps to fit. `Cmd++`/`Cmd+-`
step zoom. These keyboard handlers go on `useEffect` with `document.addEventListener`.

The `fitZoom` `ResizeObserver` calculation already works correctly — keep it exactly
as-is.

Move the layout-check functionality (currently the "Check" mode) to a toggleable
overlay button in the toolbar. When toggled on, the layout warnings badge is
visible and the `collectEditorLayoutWarnings` effect runs; when off, it is hidden.

The `PosterCanvas` `mode` prop is now controlled by `canvasEditMode`:
- `canvasEditMode === "editing"` → `mode="edit"` on `PosterCanvas`
- `canvasEditMode === "preview"` → `mode="preview"` on `PosterCanvas`

---

### 2.2  Section-zoom focus mode

**File:** `src/components/EditablePosterCanvas.tsx`

When a section is selected (`selectedId` changes and `kind === "section"`), after
`focusEditableTarget` scrolls to the element, also update the zoom so the selected
section fills approximately 70% of the viewport height.

Extend `focusEditableTarget` (or add a sibling function `sectionZoomFocus`):

```ts
function sectionZoomFocus(
  stage: HTMLElement,
  viewport: HTMLElement,
  selectedId: string,
  setFitZoom: (z: number) => void,
  viewportHeight: number,
) {
  const target = stage.querySelector<HTMLElement>(
    `[data-poster-id="${CSS.escape(selectedId)}"]`
  );
  if (!target) return;

  // target is inside the scaled stage — measure its unscaled height
  // by dividing getBoundingClientRect().height by the current zoom
  // (zoom is known from the stage transform)
  const scaledHeight = target.getBoundingClientRect().height;
  const currentZoom = parseFloat(stage.style.transform?.match(/scale\(([\d.]+)\)/)?.[1] ?? "1");
  const naturalHeight = scaledHeight / currentZoom;
  const targetZoom = Math.min(1.0, (viewportHeight * 0.7) / naturalHeight);
  setFitZoom(Number(targetZoom.toFixed(3)));
}
```

Call `sectionZoomFocus` inside the existing `useEffect` that currently only calls
`focusEditableTarget`, but only when the selection change was a section click (not
a visual or block click).

On deselect (selectedId becomes `undefined`), snap back to the viewport-computed
`fitZoom` by calling `updateFitZoom()` (extract it from the ResizeObserver effect
so it can be called imperatively).

---

### 2.3  Poster minimap

**New file:** `src/components/PosterMinimap.tsx`

A small fixed-size thumbnail showing the full A0 poster at ~4% zoom (≈180×128px for
landscape) with a highlight rect showing the current viewport position.

```tsx
export function PosterMinimap({
  poster,
  currentZoom,
  viewportRef,
  stageRef,
}: {
  poster: PosterProject;
  currentZoom: number;
  viewportRef: RefObject<HTMLDivElement>;
  stageRef: RefObject<HTMLDivElement>;
}) { ... }
```

The minimap renders `<PosterCanvas poster={poster} mode="preview" />` at a scale
of `MINIMAP_HEIGHT / outputFrame.height` where `MINIMAP_HEIGHT = 128`. Wrap it in
`useDeferredValue(poster)` so minimap updates are deferred and do not block canvas
edits.

The highlight rect is absolutely positioned over the minimap. Its size and position
are computed from `viewportRef.current.scrollLeft/Top` and the current zoom. Update
on scroll via `useEffect` with a scroll event listener on the viewport div.

Place the minimap in the bottom-right corner of the `preview-viewport` div using
`position: absolute; bottom: 12px; right: 12px;`.

---

### 2.4  Section navigator

**New file:** `src/components/SectionNavigator.tsx`

A collapsible panel showing sections in layout order with click-to-select:

```tsx
export function SectionNavigator({
  poster,
  selectedId,
  qaIssues,
  onSelectSection,
}: {
  poster: PosterProject;
  selectedId?: string;
  qaIssues: QaIssue[];
  onSelectSection: (id: string) => void;
}) { ... }
```

Uses `getOrderedSections(poster)` from `PosterCanvas.tsx` (already exported).
Each row shows: section number, section title, and a status dot:
- Green — has at least one non-empty block and no QA issues for this section
- Amber — has a QA issue with location matching `sections.{id}`
- Grey — hidden (`section.layout?.hidden === true`) or empty blocks

Clicking a row calls `onSelectSection(section.id)`, which in `App.tsx` calls
`setSelectedCanvasItem({ id: section.id, kind: "section" })` and switches
`activeTab` to `"edit"`.

Mount the navigator inside `EditablePosterCanvas` above the viewport, or as an
optional panel inside the `inspector-column` — either location works. Prefer
mounting it at the top of the canvas area as a collapsible strip.

---

## Phase 3 — App shell restructure

---

### 3.1  Mode-aware app shell

**File:** `src/App.tsx`

**New type:**
```ts
type AppMode = "generate" | "edit" | "review" | "export";
```

Add `const [appMode, setAppMode] = useState<AppMode>("edit")` to App state.

**Left column restructure:**

The left column currently (`"control-panel tool-panel"`) renders simultaneously:
- Prompt textarea
- Theme / palette selectors
- Source mode buttons
- Generate button
- Theme note aside
- `<JsonProjectControls>`
- `<ExportPanel>`

Restructure so each mode shows only relevant controls:

```tsx
// Generate mode — left column content
<div className="field">
  <span>Prompt</span>
  <textarea value={prompt} onChange={...} rows={6} />
</div>
<div className="field-grid">
  {/* theme select */} {/* palette select */}
</div>
<div className="source-options">
  {/* mock / web / local buttons */}
</div>
<button className="primary-action" onClick={handleGenerate}>
  Generate poster
</button>
{/* theme-note aside */}

// Edit mode — left column shows ProjectEditor + PosterInspector
// (currently in inspector-column, move here or keep in inspector-column
//  but only render when appMode === "edit")

// Review mode — left column shows QaPanel
// Export mode — left column shows ExportPanel + JsonProjectControls
```

**Mode bar:**

Add a new `<ModeBar>` component at the top of the left column (or in the
`workspace-header`):

```tsx
// src/components/ModeBar.tsx
export function ModeBar({
  mode,
  onModeChange,
  qaIssueCount,
}: {
  mode: AppMode;
  onModeChange: (mode: AppMode) => void;
  qaIssueCount: number;
}) { ... }
```

Four buttons: Generate, Edit, Review (with badge showing qaIssueCount if > 0),
Export. Active mode is highlighted. Style matches the existing `.workspace-tabs`
pattern.

**Right inspector column:**

In Edit mode, the inspector column shows:
- `<ProjectEditor>` (already there)
- `<PosterInspector>` (already there, driven by selectedCanvasItem)

In other modes, the inspector column shows relevant secondary info:
- Generate mode: `<SourceSearchPanel>` + `<EvidencePanel>`
- Review mode: `<QaPanel>` + `<TracePanel>`
- Export mode: nothing extra (export panel is in left column)

The existing `WorkspaceTab` type and tab buttons can remain for sub-navigation
within the Edit mode inspector column (Edit / Sources / QA / Trace / Visuals tabs).
The app mode controls which column layout is shown; the workspace tabs control
sub-navigation within Edit mode.

---

### 3.2  Two-stage generation: outline → confirm → generate

**Files:** `src/App.tsx`, `src/domain/generator.ts`,
new `src/components/OutlineConfirmDialog.tsx`

**New type in `poster.ts`:**
```ts
export interface PosterOutline {
  title: string;
  subtitle: string;
  layout: PosterLayoutId;
  sections: Array<{
    id: string;
    type: PosterSection["type"];
    title: string;
    description: string;   // one-line description
  }>;
}
```

**New function in `generator.ts`:**
```ts
export async function generateOutline(
  options: GenerationOptions,
  onProgress?: (stepId: string) => void,
): Promise<PosterOutline>
```

This makes a cheap first LLM call (or in the mock path, derives from the prompt
and source titles) returning only section titles and one-line descriptions — no
full content generation. On the mock path, return a fixed outline derived from
`examplePoster.sections.map(s => ({ id: s.id, type: s.type, title: s.title,
description: "" }))` plus the prompt-derived title.

**Flow in `App.tsx`:**

Replace `handleGenerate`:
```ts
async function handleGenerate() {
  setIsGenerating(true);
  // Step 1: get outline
  const outline = await generateOutline({ prompt, theme, palette, sourceMode, ... });
  setPendingOutline(outline);
  setIsGenerating(false);
  // Show OutlineConfirmDialog
}

async function handleConfirmOutline(confirmedOutline: PosterOutline) {
  setPendingOutline(null);
  setIsGenerating(true);
  // Step 2: full generation using confirmed outline
  const nextPoster = await generatePoster({ ..., outline: confirmedOutline }, onProgress);
  ...
}
```

Add `pendingOutline: PosterOutline | null` to App state.

**`OutlineConfirmDialog` component:**

Renders when `pendingOutline !== null`. Shows the proposed poster title and an
ordered list of sections. Each section row has an editable title input and a
`type` selector. Sections can be reordered (drag handles using `@dnd-kit/sortable`)
and deleted. An "Add section" button appends a blank custom section. Two action
buttons: "Generate poster" and "Back".

---

### 3.3  Contextual right panel for selected canvas items

**Files:** `src/App.tsx`, `src/components/PosterInspector.tsx`

`PosterInspector` already shows the right controls when a section or block is
selected. The only change needed is ensuring the inspector panel is visually
prominent when something is selected and collapses gracefully when nothing is.

In `App.tsx`, pass `onSelectItem` from `EditablePosterCanvas` to also set
`activeTab` to `"edit"` when a canvas item is selected (so the inspector is
visible). Currently `onSelectItem` only calls `setSelectedCanvasItem` — add
`setActiveTab("edit")` inside the same handler.

---

### 3.4  QA overlays on canvas (Review mode)

**Files:** `src/components/PosterCanvas.tsx`, `src/App.tsx`

Add an optional `qaIssues?: QaIssue[]` prop to `PosterCanvasProps`.

When `qaIssues` is provided and non-empty, for each issue whose `location` matches
`sections.{id}` or `visuals.{id}`, render a small badge overlay on the matching
canvas element. Parse the location with `location.split(".").slice(0, 2).join(".")`
to get the `{collection}.{id}` key, then match against section IDs and visual IDs.

The badge is `position: absolute; top: 4px; right: 4px;` inside the section card,
showing severity colour (red = high, amber = medium, grey = low) and an icon.
Clicking the badge calls `onSelectItem(sectionId, "section")`.

In `App.tsx`, pass `qaIssues={qaIssues}` to `EditablePosterCanvas` (which passes
it to `PosterCanvas`) only when `appMode === "review"`.

---

## Phase 4 — Visual editing and image placeholders

---

### 4.1  Visual editor in PosterInspector

**File:** `src/components/PosterInspector.tsx`

Currently `selectedKind === "visual"` shows "Visual selection is read-only."

Replace this with a `VisualEditor` sub-component inline in `PosterInspector`.
The editor is keyed on `visual.type` and renders different controls:

**`metric_card`** — editable label (text input), value (text input), note
(text input). Uses `parseMetricCardData` for validation on save.

**`table`** — shows column headers (editable) and up to 8 rows in a simple grid.
Each cell is a text input. Uses `parseTableData` for validation on save.

**`mermaid_flow` / `math` / `code_block`** — a `<textarea>` showing the source
text (from `visual.data.source` or `visual.data.code`). Re-renders a preview
using a minimal `<pre>` block on change. Uses `parseSourceTextData` /
`parseCodeBlockData` for validation on save.

**`confusion_matrix`** — four number inputs for TP, FP, FN, TN. Derived metrics
(accuracy, precision, recall) update live as inputs change. Uses
`parseConfusionMatrixData` for validation.

**`ai_image` / `generated_background` / `generated_comic_panel`** — prompt text
area, model selector (`gpt-image-1.5` / `gpt-image-1` / `gpt-image-1-mini`),
and a "Regenerate" note (CLI command, not in-browser generation).

For all types, on save:
```ts
function saveVisualData(visualId: string, newData: Record<string, unknown>) {
  onPosterChange({
    ...poster,
    visuals: poster.visuals.map(v => v.id === visualId ? { ...v, data: newData } : v),
  });
}
```

---

### 4.2  Aspect-ratio-correct image placeholders

**Files:** `src/renderers/VisualRenderer.tsx`,
new `src/utils/imageSize.ts`,
`src/data/examplePoster.ts` (or whichever file defines the sample data)

**New file `src/utils/imageSize.ts`:**
```ts
export type ApiImageSize = "1024x1024" | "1536x1024" | "1024x1536";

export function nearestApiSize(aspectRatio: number): ApiImageSize {
  const candidates = [
    { size: "1024x1024" as const, ratio: 1.0 },
    { size: "1536x1024" as const, ratio: 1.5 },
    { size: "1024x1536" as const, ratio: 0.667 },
  ];
  return candidates.sort(
    (a, b) => Math.abs(a.ratio - aspectRatio) - Math.abs(b.ratio - aspectRatio)
  )[0].size;
}

export function inferAssetDimensions(
  orientation: "portrait" | "landscape",
  columnSpan: 1 | 2 | 3 | 4 = 1,
): { width_px: number; height_px: number } {
  // A0 landscape: 4492×3179 CSS px at 96dpi
  const posterW = orientation === "landscape" ? 4492 : 3179;
  const posterH = orientation === "landscape" ? 3179 : 4492;
  const gutter = 32;
  const cols = 3;
  const colW = Math.floor((posterW - gutter * (cols + 1)) / cols);
  const sectionH = Math.floor((posterH - 300) / 4);
  return {
    width_px: colW * columnSpan + gutter * (columnSpan - 1),
    height_px: sectionH,
  };
}
```

**In `VisualRenderer.tsx`**, update the generated asset branch:

```tsx
if (["ai_image", "generated_background", "generated_comic_panel"].includes(visual.type)) {
  const parsed = parseGeneratedVisualData(visual.data);
  if (!parsed.ok) return <InvalidVisualData visual={visual} message={parsed.message} />;

  const imageUrl = visual.asset?.url;
  const widthPx = visual.asset?.width_px;
  const heightPx = visual.asset?.height_px;
  const aspectRatio = widthPx && heightPx && widthPx > 0 && heightPx > 0
    ? widthPx / heightPx
    : undefined;
  const apiSize = aspectRatio ? nearestApiSize(aspectRatio) : undefined;

  return (
    <div className="visual-box generated-asset">
      <VisualHeader title={visual.title} meta={apiSize} />
      <div
        className={`generated-asset-frame ${imageUrl ? "has-image" : "is-placeholder"}`}
        style={aspectRatio ? { aspectRatio: String(aspectRatio) } : undefined}
      >
        {imageUrl ? (
          <img
            className="generated-asset-image"
            src={imageUrl}
            alt={visual.asset?.title ?? visual.title}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <>
            <Image size={28} aria-hidden="true" />
            <span>{visual.type.replace(/_/g, " ")}</span>
            {apiSize && <code className="asset-size-badge">{apiSize}</code>}
            <p className="asset-prompt-preview">
              {visual.asset?.prompt ?? parsed.data.prompt ?? "No prompt yet."}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
```

**In example poster data:** for any `PosterAsset` entries that are generated
visuals, add `width_px` and `height_px` using `inferAssetDimensions()` based on
their containing section's `columnSpan`.

**In `generate-image-asset.mjs`:** the `inferImageSize(asset)` function already
reads `asset.width_px` and `asset.height_px`. Once these are populated in the
JSON, the script will automatically call the API with the correct size — no script
changes needed.

---

### 4.3  AI command palette (Cmd+K) for text editing

**Files:** `src/components/EditablePosterCanvas.tsx`,
`src/domain/generator.ts`,
new `src/components/BlockRevisionDiff.tsx`

**New function in `generator.ts`:**
```ts
export async function reviseTextBlock(
  block: Extract<PosterBlock, { type: "text" }>,
  instruction: string,
  sectionTitle: string,
  posterTitle: string,
): Promise<string>
```

On the mock path (no API key), return the original text with `[revised: {instruction}]`
appended. On the LLM path, call the LLM with a focused prompt: "Revise the following
poster text block. Instruction: {instruction}. Return only the revised text."

**In `EditablePosterCanvas.tsx`:**

Add a `commandBarValue` state and a `revisionDiff` state
(`{ original: string; revised: string; blockId: string } | null`).

Show a command bar below the viewport when `selectedCanvasItem?.kind === "block"`:

```tsx
{selectedCanvasItem?.kind === "block" && (
  <div className="command-bar" role="search">
    <Wand2 size={14} aria-hidden="true" />
    <input
      placeholder='Edit this block… "make shorter" or "rephrase for non-technical audience"'
      value={commandBarValue}
      onChange={e => setCommandBarValue(e.target.value)}
      onKeyDown={e => e.key === "Enter" && handleBlockRevise()}
    />
    <kbd>↵</kbd>
  </div>
)}
```

`handleBlockRevise` calls `reviseTextBlock`, then sets `revisionDiff` with the
original and revised text.

**`BlockRevisionDiff` component:**

Shows original and revised text side by side with "Accept" and "Reject" buttons.
Accept calls `onPosterChange` with the updated block text. Reject clears the diff.
Renders inline below the canvas, not as a modal.

---

### 4.4  Drag-to-reorder sections on canvas

**Files:** `src/components/PosterCanvas.tsx`, `src/App.tsx`

**Dependency:** Add `@dnd-kit/core` and `@dnd-kit/sortable` to `package.json`.

In `PosterCanvas.tsx`, when `mode === "edit"`, wrap the `sections.map(...)` in a
`<DndContext>` + `<SortableContext>` from `@dnd-kit/sortable`. Each section card
becomes a `<SortableItem>` with a drag handle icon (`<GripVertical size={16} />`
from lucide-react, visible only in edit mode) in the top-right of the card.

Add an `onSectionReorder?: (orderedIds: string[]) => void` prop to
`PosterCanvasProps`.

On drag end, call `onSectionReorder` with the new ordered array of section IDs.

In `App.tsx`, `handleSectionReorder` applies the new order by updating each
section's `layout.order`:

```ts
function handleSectionReorder(orderedIds: string[]) {
  handlePosterStateChange({
    ...poster,
    sections: poster.sections.map(section => ({
      ...section,
      layout: {
        ...(section.layout ?? {}),
        order: orderedIds.indexOf(section.id),
      },
    })),
  });
}
```

Pass `onSectionReorder={handleSectionReorder}` to `EditablePosterCanvas` → through
to `PosterCanvas`.

---

## Phase 5 — Screen-fit virtual poster output

The goal is a single-page PDF of the full A0 poster composition scaled to fit a
1920×1080 screen. The aspect ratio is never broken. The poster is letterboxed
(horizontal bars in the poster background colour) to fill a 16:9 frame.

---

### 5.1  Add `target` option to `renderPosterHtml()`

**File:** `src/exports/renderPosterHtml.tsx`

**Extend `RenderPosterHtmlOptions`:**
```ts
export interface RenderPosterHtmlOptions {
  css: string;
  title?: string;
  mode?: "preview" | "edit" | "export";
  target?: "print" | "screen";   // new — default "print"
}
```

In `renderPosterHtml()`, compute screen-fit values when `target === "screen"`:

```ts
const SCREEN_W = 1920;
const SCREEN_H = 1080;
const screenFitZoom = Math.min(SCREEN_W / frame.width, SCREEN_H / frame.height);
// frame.width = 4492, frame.height = 3179 for landscape A0
// screenFitZoom = Math.min(1920/4492, 1080/3179) = Math.min(0.4274, 0.3398) = 0.3398
const scaledW = Math.round(frame.width * screenFitZoom);   // 1527
const scaledH = Math.round(frame.height * screenFitZoom);  // 1080
```

Replace the `@page` and body CSS block conditionally:

```ts
const pageAndBodyCss = target === "screen"
  ? `
@page { size: ${SCREEN_W}px ${SCREEN_H}px; margin: 0; }
html, body {
  width: ${SCREEN_W}px; height: ${SCREEN_H}px;
  margin: 0; padding: 0; overflow: hidden;
  background: ${posterBgColour};
}
.screen-fit-frame {
  width: ${SCREEN_W}px; height: ${SCREEN_H}px;
  display: flex; align-items: center; justify-content: center;
  background: ${posterBgColour};
}
.screen-fit-frame .a0-preview-canvas {
  transform: scale(${screenFitZoom.toFixed(4)});
  transform-origin: center center;
  flex-shrink: 0;
}
`
  : `
@page { size: A0 ${orientation}; margin: 0; }
html, body { width: ${frame.mmWidth}mm; height: ${frame.mmHeight}mm; margin: 0; background: #ffffff; }
body { overflow: hidden; }
.a0-preview-canvas { width: ${frame.mmWidth}mm !important; height: ${frame.mmHeight}mm !important;
                     border: 0; box-shadow: none; }
`;
```

Where `posterBgColour` is extracted from the palette:
```ts
import { resolvePalette } from "../themes";
const palette = resolvePalette(poster.theme, poster.palette);
const posterBgColour = palette.colors.background ?? "#ffffff";
```

Wrap the body HTML in a `.screen-fit-frame` div when `target === "screen"`:
```ts
const bodyHtml = target === "screen"
  ? `<div class="screen-fit-frame">${body}</div>`
  : body;
```

---

### 5.2  Add `--target` flag to `scripts/export-pdf.ts`

**File:** `scripts/export-pdf.ts`

In `parseArgs`, extract `target` (default `"print"`):
```ts
const target = String(args.target ?? "print") as "print" | "screen";
const isScreen = target === "screen";
```

Pass `target` to `renderPosterHtml`:
```ts
await writeFile(htmlPath, renderPosterHtml(poster, { css, title: poster.title,
                                                     mode: "export", target }));
```

Adjust the output filename:
```ts
const pdfPath = path.join(outDir, isScreen ? `${baseName}-screen.pdf` : `${baseName}.pdf`);
```

Adjust `page.pdf()` call:
```ts
await page.pdf(
  isScreen
    ? {
        path: pdfPath,
        width: "1920px",
        height: "1080px",
        printBackground: true,
      }
    : {
        path: pdfPath,
        width: `${frame.mmWidth}mm`,
        height: `${frame.mmHeight}mm`,
        printBackground: true,
        preferCSSPageSize: true,
        margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
      }
);
```

Note: the `viewport` passed to `browser.newPage()` should also change for screen
target. Use `{ width: 1920, height: 1080 }` when `isScreen`.

---

### 5.3  Add `"screen_pdf"` export target

**File:** `src/exports/model.ts`

```ts
export type ExportTarget =
  | "poster_json"
  | "pdf"
  | "screen_pdf"    // add this
  | "html_project"
  | "png"
  | "pptx"
  | "project_bundle";
```

**File:** `src/exports/index.ts`

Add to `exportCapabilities`:
```ts
{
  id: "screen_pdf",
  label: "Export virtual session PDF",
  status: "available",
  description:
    "Full A0 poster composition scaled to fit a 1920×1080 screen. Aspect ratio preserved, letterboxed. Open fullscreen in any PDF viewer for virtual poster sessions.",
  output: "poster-screen.pdf",
  requirements: [
    "Playwright",
    "npm run export:screen -- --poster spec/example-poster.json",
  ],
},
```

**File:** `src/exports/readiness.ts`

In `getTargetBlockers`, add a branch for `"screen_pdf"`:
```ts
if (target === "screen_pdf") {
  return [...baseBlockers, ...getRendererBlockers(poster),
          poster.format.orientation !== "landscape"
            ? "Portrait A0 does not fit a landscape screen well. Consider landscape orientation for virtual sessions."
            : ""];
}
```

**File:** `src/components/ExportPanel.tsx`

Add a case in `handleExport`:
```ts
if (target === "screen_pdf") {
  setMessage(
    "Screen PDF export: npm run export:screen -- --poster spec/example-poster.json"
  );
  return;
}
```

Add a suitable icon for `screen_pdf` in `renderExportIcon` (use `Monitor` from
lucide-react).

---

### 5.4  Add `package.json` script

**File:** `package.json`

```json
"export:screen": "npx tsx scripts/export-pdf.ts --target screen"
```

---

### 5.5  Virtual view mode in `EditablePosterCanvas`

**File:** `src/components/EditablePosterCanvas.tsx`

Add `"virtual"` to the view mode options (after the zoom redesign in Phase 2,
this is a zoom preset + framing, not a separate mode type).

When virtual view is active:
- The viewport shows a 16:9 frame (1920:1080 proportions) scaled to fill the
  preview column width
- Inside the frame, the poster is scaled with `zoom = frameHeight / outputFrame.height`
- Horizontal letterbox bars in `palette.colors.background`
- A badge "Virtual · 1920×1080 · {zoomPercent}%" in the toolbar

```tsx
// Virtual frame dimensions, computed from viewport width
const VIRTUAL_ASPECT = 1920 / 1080;
const virtualFrameWidth = Math.floor(viewportWidth);
const virtualFrameHeight = Math.floor(virtualFrameWidth / VIRTUAL_ASPECT);
const virtualZoom = virtualFrameHeight / outputFrame.height;
// For landscape A0: outputFrame.height = 3179
// virtualZoom ≈ frameHeight / 3179 ≈ 0.34 at typical viewport

// Render:
<div
  className="virtual-screen-frame"
  style={{
    width: virtualFrameWidth,
    height: virtualFrameHeight,
    background: palette.colors.background,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    flexShrink: 0,
  }}
>
  <div
    style={{
      transform: `scale(${virtualZoom})`,
      transformOrigin: "center top",
      width: outputFrame.width,
      height: outputFrame.height,
      flexShrink: 0,
    }}
  >
    <PosterCanvas poster={poster} mode="preview" />
  </div>
</div>
```

`viewportWidth` is measured from `viewportRef.current.getBoundingClientRect().width`
in the existing `ResizeObserver` effect — add it to that effect's update.

In the toolbar, add a "Virtual" button alongside the zoom controls. Clicking it
sets a `virtualMode: boolean` state, shows the virtual frame, and hides the
standard zoom controls (zoom is fixed when in virtual view).

---

## Summary of all new files

| File | Purpose |
|---|---|
| `src/components/ModeBar.tsx` | App mode switcher (Generate / Edit / Review / Export) |
| `src/components/OutlineConfirmDialog.tsx` | Two-stage generation outline confirm step |
| `src/components/SectionNavigator.tsx` | Section jump list with status dots |
| `src/components/PosterMinimap.tsx` | Full-poster thumbnail with viewport rect |
| `src/components/BlockRevisionDiff.tsx` | AI block revision accept/reject diff view |
| `src/utils/imageSize.ts` | `nearestApiSize()`, `inferAssetDimensions()` |

---

## Summary of all modified files

| File | Changes |
|---|---|
| `src/App.tsx` | Mode state, outline flow, handleQaNavigate, handleSectionReorder, sourceMode prop, mode-aware layout |
| `src/domain/poster.ts` | Add `PosterOutline` type, `outputIntent?: "print" \| "virtual" \| "both"` to `PosterProject` |
| `src/domain/generator.ts` | Add `generateOutline()`, `reviseTextBlock()` |
| `src/components/EditablePosterCanvas.tsx` | Continuous zoom, section-zoom focus, virtual view mode, command bar |
| `src/components/PosterCanvas.tsx` | `qaIssues` prop for overlays, `onSectionReorder` prop + dnd-kit wrappers |
| `src/components/QaPanel.tsx` | `onNavigate` prop + Go button |
| `src/components/PosterInspector.tsx` | Full visual editor per type, JSON repair for error case |
| `src/components/SourceSearchPanel.tsx` | `sourceMode` prop + mock fallback warning banner |
| `src/components/ExportPanel.tsx` | Confirmation dialog, `screen_pdf` target, Monitor icon |
| `src/renderers/VisualRenderer.tsx` | Aspect-ratio placeholder, `nearestApiSize` badge |
| `src/qa/index.ts` | `outputIntent`-aware rules (print DPI checks, virtual font-size checks) |
| `src/exports/model.ts` | Add `"screen_pdf"` to `ExportTarget` |
| `src/exports/index.ts` | Add `screen_pdf` capability entry |
| `src/exports/readiness.ts` | Add `screen_pdf` blockers branch |
| `src/exports/renderPosterHtml.tsx` | `target` option, screen-fit CSS + wrapper div |
| `src/layouts/index.ts` | No changes required |
| `src/styles/app.css` | `.source-mode-warning`, `.virtual-screen-frame`, `.asset-size-badge`, `.command-bar`, minimap styles |
| `scripts/export-pdf.ts` | `--target screen` flag, conditional page size |
| `package.json` | `export:screen` script, `@dnd-kit/core`, `@dnd-kit/sortable` deps |

---

## Constraints and notes for implementers

**Do not change:**
- `PosterCanvas.tsx` rendering logic beyond the dnd-kit wrapping and QA overlay additions
- `VisualRenderer.tsx` renderer branches other than the generated asset branch
- `src/qa/index.ts` existing rule logic — only add new rules
- `scripts/generate-image-asset.mjs` — no changes needed; `inferImageSize()` already reads `width_px`/`height_px`
- The `poster.json` / `PosterProject` schema version field — it is already present as `schemaVersion`

**Key invariants:**
- `PosterCanvas` is a pure component — all state lives in `App.tsx`
- `poster.json` is the single source of truth — every edit goes through `onPosterChange`
- The `runQa()` function is called via `debouncedRunQa` on every `poster` state change — new QA rules will be picked up automatically
- The Playwright PDF pipeline uses the exact same `PosterCanvas` React component as the browser — fidelity between preview and export is guaranteed by this shared render path

**Phase ordering:**
Phases 1–2–3–4–5 can be worked in order. Within each phase, items are independent
except: Phase 3.4 (QA overlays) depends on Phase 1.1 (QA navigation) being done
first for the location-parsing logic. Phase 5.5 (virtual view) depends on Phase 2.1
(zoom redesign) for the `viewportWidth` measurement being in the ResizeObserver.
All other items are independent.
