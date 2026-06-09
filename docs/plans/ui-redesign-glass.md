# UI Redesign — Clean Glass Aesthetic (workstream F9)

Status: planned 2026-06-09 from a screenshot review of all four workspace modes. Goal: an Apple-like chrome — calm, layered, generous — using a glassmorphic visual language. App chrome only; the poster canvas keeps its theme-driven appearance untouched.

## Review findings (current UI)

1. **Squashed mode bar** — segment labels truncate to "Ge…/Re…/Ex…" inside the 300px left rail.
2. **Redundant labeling** — mode tab, panel `<h2>`, and a right-aligned mode chip repeat the same word three times within one viewport-height of the rail.
3. **Crowded canvas toolbar** — ~10 small buttons, a zoom readout, the edit/preview toggle, layout-check status, and a full-sentence hint share one row.
4. **Section navigator eats the column** — six full-width rows sit between the panel header and the toolbar before the poster appears.
5. **Border noise** — almost every element is a white box with a 1px border and its own radius, nested three deep (Export mode is the worst case). Hierarchy is drawn with outlines instead of space and layering.
6. **Type and density** — weights 800/900 at 10–12px, ALL-CAPS-ish labels, 24px hit targets; everything reads as compressed.
7. **Flat single-plane look** — panels, header, and viewport are all the same white on a near-white background; one heavy drop shadow (`--elevation-panel`) does all the depth work.

## Design direction

**Layered glass over an ambient backdrop.** The app gets a soft cool gradient background; top-level surfaces (header, rails, floating toolbar) become translucent frosted panels (`backdrop-filter: blur + saturate`) with hairline rgba borders and soft shadows. *Interior* content stops being boxes: groups separate by spacing and subtle background tint, not borders. Fewer, larger, calmer surfaces.

Principles applied:
- **One border per region.** Panels may have a hairline; their contents may not. Nested cards become flat groups (tint or spacing only).
- **Depth = blur + shadow + tint, not outlines.**
- **Comfortable controls**: 32px minimum control height, 13px control text at weight 600, weights capped at 700, hit targets ≥ 28px.
- **Glass is for chrome layers only** — never inside the poster canvas, and only on top-level surfaces (blur is GPU-costly; interior elements stay opaque).

## Phases

### G1 — Foundations: glass token layer + app shell

- Extend the F1 token block with a glass tier:
  - `--glass-panel: rgba(255, 255, 255, 0.62)`, `--glass-panel-strong: rgba(255, 255, 255, 0.8)` (focus/hover states)
  - `--glass-blur: blur(20px) saturate(1.6)`
  - `--hairline: rgba(16, 24, 40, 0.08)`, `--hairline-strong: rgba(16, 24, 40, 0.14)` (replaces most `--chrome-border*` uses on panels)
  - radius bump: panels `--radius-xl` (12→16px), controls `--radius-lg`
  - `--control-h: 32px`, `--control-h-sm: 26px`
  - softer elevation pair for glass layers
- App background: fixed soft gradient (cool grey-blue with a faint warm corner) so the blur has content to refract; subtle enough to stay calm.
- `.app-shell` panels (`workspace-header`, `control-panel`, `inspector-column` panels, `preview-panel`) become glass surfaces; increase shell gap (12→16px).
- Fallbacks: `@supports not (backdrop-filter: blur(1px))` → solid `--chrome-surface`; respect `prefers-reduced-transparency` (and keep the existing `prefers-reduced-motion` guard).
- Contrast check: ink tokens on glass over the gradient must hold WCAG AA; darken `--chrome-ink-faint` usage on glass if needed.

### G2 — Header + mode bar

- Slim the header into a single glass bar: product mark left; the spec/theme/QA status becomes three quiet inline stats right (no boxed sub-cards).
- **Mode bar → real segmented control in the header centre** (macOS pattern), full icon+label segments, active segment = raised white pill. This permanently fixes the truncation and frees the left rail's top. (F3 will later dissolve modes; the segmented control survives that as the flow/lens switcher, so this is not throwaway.)
- Delete the redundant panel-header mode labels ("Edit / EDIT") — the left rail's `panel-header` shows contextual content only (e.g. source count in Generate).

### G3 — Canvas stage

- The preview viewport becomes a recessed "stage": slightly darker ambient well, poster floats with a soft large shadow — the poster is unmistakably the artifact.
- **Floating glass toolbar** overlaid at the top of the stage, grouped into pills: [undo · redo] [zoom out · % · zoom in · fit ▾] [virtual · preview · layout-check]. Fit width/page/virtual collapse into one "fit" menu. The hint sentence is removed (shortcuts overlay F6 owns discoverability later); layout-check results show as a count badge with tooltip.
- **Section navigator → compact strip**: one horizontal row of numbered dot-chips with title tooltips (current rows are redundant with the canvas itself); QA-flagged sections get a warning tint. Collapsible.

### G4 — Control kit + rail content

- One control system applied across panels: button variants `solid` (accent), `quiet` (default), `danger`; field inputs/selects at `--control-h` with focus ring `0 0 0 3px color-mix(accent 25%)`; labels 11px/600/+0.02em, sentence case.
- Left rail (Generate): prompt field, theme picker, and source panel become flat groups; theme swatch grid gets breathing room; primary "Generate" button is the single solid-accent element.
- Right rail (Inspector/Evidence/Trace/QA): panel headers shrink to one quiet row; F2 disclosures restyled to the glass language (tint, no border); QA severity chips and trace cards become flat rows with leading status dots.
- Export mode: four bordered cards → one flat list of export rows (icon, name, description, trailing quiet button).

### G5 — Audit + polish pass

- Screenshot audit of every mode at 1280/1600/1920 widths against the squash list above; fix any remaining truncation/cramming (notably: mode bar at 1280, toolbar at 1280).
- Hover/active/focus states verified consistent across the control kit; motion (existing tokens) applied to segment/pill transitions.
- Re-run all Playwright interaction smokes (A1–A3 behaviours must be untouched); pixel-diff poster canvas region to prove it is byte-identical.

## Constraints

- **Poster canvas untouched** — all changes scoped to chrome selectors; the canvas region must pixel-diff clean.
- **No structural rewrites** — the 3-column shell and mode model stay (F3 implements the workspace collapse later, with M2); this is a reskin plus targeted layout fixes (mode bar relocation, navigator compaction).
- **No new dependencies** — plain CSS on the existing token layer.

## Order and effort

G1 → G2 → G3 → G4 → G5, each independently shippable. G1+G2 deliver the biggest visible shift (glass + fixed mode bar) and should land together; G3 is the second-biggest win (the toolbar/navigator squash); G4 is broad but mechanical; G5 is the gate.
