# Theme-Generated Components Plan

PosterForge should treat a theme as a render contract, not just a palette plus a generated background. GPT-image-2 can create themed surfaces, empty panels, ornamental backgrounds, motif packs, and diagram atmospheres, but factual poster content must remain deterministic HTML/SVG rendered on top.

## Problem

The current canvas mixes two unrelated systems:

- Generated theme assets create a background mood.
- HTML components use generic card, table, flow, metric, and Mermaid styles.

That makes raster themes feel disconnected. A whiteboard theme should produce marker-like boxes and sketched flow arrows. A blueprint theme should produce technical-grid cards, dimension-line surfaces, and engineering diagram treatment. The generated asset and the HTML renderer need to share a layout and component contract.

## Target Model

Each theme should define:

- `backgroundStrategy`: `raster`, `svg`, or `svg-hybrid`.
- `imagePromptPrefix`: prompt language for GPT-image-2 assets.
- `htmlTokens`: radius, border width, shadow, section padding, title scale.
- `typography`: heading, body, mono font stacks.
- `componentSkins`: deterministic HTML/SVG treatment for text boxes, metrics, tables, timelines, and diagrams.
- `slotTemplates`: generated-image slots for poster background, hero art, section art, motif packs, and optional diagram surfaces.

Generated assets should include empty content regions:

```json
{
  "id": "section-art-methods",
  "role": "section_art",
  "background_strategy": "raster",
  "width_px": 720,
  "height_px": 480,
  "content_anchor": "center",
  "content_regions": [
    { "id": "title", "x": "5%", "y": "5%", "width": "90%", "height": "15%", "type": "text" },
    { "id": "body", "x": "5%", "y": "22%", "width": "58%", "height": "55%", "type": "text" },
    { "id": "diagram", "x": "65%", "y": "22%", "width": "30%", "height": "55%", "type": "diagram-node" }
  ]
}
```

The image sidecar then records the same regions so the canvas knows where deterministic content can safely sit.

## Creation Flow

```text
source docs + prompt
  -> PosterProject content
  -> theme render contract
  -> layout slots with content regions
  -> GPT-image-2 assets for raster slots
  -> deterministic HTML/SVG overlays using theme component skins
  -> QA checks for region overflow, contrast, and missing assets
```

## Theme Examples

### Whiteboard Explainer

- GPT-image-2 creates clean whiteboard panels, marker underlines, empty sketched frames, and optional hand-drawn process surfaces.
- HTML overlays use dashed borders, marker-like accent strokes, simple rounded pills, and light ruled background lines.
- Flow diagrams should look like sketched arrows and marker nodes, but labels are always HTML/SVG.

### Blueprint Engineering

- GPT-image-2 creates deep-blue technical drawing surfaces, empty schematic frames, grid textures, and engineering callout regions.
- HTML overlays use dark panels, pale cyan linework, uppercase headings, fine grid backgrounds, and technical table rules.
- Flow diagrams should resemble schematic blocks and dimensioned signal paths, but values and labels remain deterministic.

## Implementation Phases

1. **Theme contract types**
   Add typed theme render metadata in `src/themes`, including component skin IDs and slot templates.

2. **Generated-image slot model**
   Promote generated-image slots to first-class plan elements with `x`, `y`, `widthPx`, `heightPx`, `contentRegions`, `assetId`, `seed`, and `objectPosition`.

3. **Layout spec generation**
   Extend `buildLayoutSpec` so it writes one section per raster slot. SVG and SVG-hybrid slots should be resolved locally through `ThemeMotifLayer`.

4. **Canvas overlay renderer**
   Render generated slot images as surfaces, then place deterministic content into sidecar-defined content regions. Keep pan/resize/regenerate controls on the slot.

5. **Theme-specific component skins**
   Replace generic renderer styling with theme-aware skins for cards, tables, metrics, timelines, flow diagrams, and Mermaid output.

6. **QA**
   Add checks for missing generated assets, stale generated asset dimensions, region overflow, low contrast, and factual content accidentally embedded in GPT-image prompts.

## First Slice In Code

The first working slice starts with deterministic component skins for:

- `whiteboard-explainer`
- `blueprint-engineering`

The poster DOM now exposes `data-visual-type` on each visual wrapper, which lets theme skins target diagram/table/metric classes without changing the visual data model.
