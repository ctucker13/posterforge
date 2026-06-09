# F3 Decision — Workspace Model

Status: **decided 2026-06-09, implementation deferred to M2**. This records the decision so A3–A10 and M2 build toward it instead of deepening the mode split.

## Context

The app currently has four modes (Generate / Edit / Review / Export) driven by `ModeBar`. Each mode swaps the left control panel and the inspector column; the poster canvas persists across all of them. The four "modes" are not actually peers:

- **Edit** is the home — where users spend nearly all their time.
- **Generate** is an entry flow: prompt → sources → outline confirm → run. It is a sequence, not a place.
- **Review** is a lens over the poster: QA issues and traces. It is read-mostly and wants to overlay editing, not replace it.
- **Export** is a terminal action: a thing you do, not a place you work.

Treating flows, lenses, and actions as sibling modes is what creates the panel sprawl risk: every new feature must pick a mode, and users must remember where things live.

## Decision

Collapse to a **single continuous workspace**:

1. **The canvas is permanent and always editable** (the existing edit/preview toggle stays as a canvas-local control).
2. **Generation becomes a flow, not a mode** — launched from a primary action, presented as a left-rail sequence (prompt → sources → outline → progress), collapsing back to the workspace when done. M2's run controller (B8) and staged progress (B1) define this surface.
3. **Review becomes a lens** — QA issues render as canvas overlays plus a right-rail panel; toggled, not switched into.
4. **Export becomes an action** — a dialog/menu from the header, not a workspace state.
5. **One right-rail panel at a time** — Inspector is the default; QA, Trace, and Evidence become switchable tabs in the same rail rather than mode-dependent panel populations.

## Timing

Implement **incrementally alongside M2**, because B1/B8 reshape the generation surface anyway — building the flow UI twice would be waste. Until then `ModeBar` stays, but:

- A3–A10 canvas controls must not check `appMode` — the canvas behaves as "always editable" (plus its local preview toggle).
- New panels must not add to the mode-dependent population; anything new goes in the right rail as a tab.
- The Export panel gains no new workspace surface; richer export work (E8–E10) targets the future dialog.

## Rejected alternative

Keeping four modes and polishing each: rejected because every milestone adds surfaces (M2 progress, M3 variant pickers, M4 source inspectors), and four parallel surface sets multiply that cost; the Apple-like principle is fewer places, more depth.
