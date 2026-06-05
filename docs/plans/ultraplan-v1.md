Here's the complete brief to paste into Claude Code when you open your posterforge directory:

---

## Context: What was built in image-gen

The **image-gen** repo (`posterforge-assets` CLI) has been updated. Here is what it now does that posterforge needs to integrate with:

### New CLI command: `generate-for-layout`
Takes a `layout-spec.json` file and generates one gpt-image-2 asset per slot. Skips any slot with `backgroundStrategy: "svg"` or `"svg-hybrid"` (those are handled by posterforge's deterministic SVG renderer).

```bash
uv run posterforge-assets generate-for-layout layout-spec.json --posterforge-dir .
```

### layout-spec.json format (posterforge writes this, image-gen reads it)
```json
{
  "theme_id": "comic-research-showcase",
  "project_title": "My Project",
  "quality": "medium",
  "sections": [
    {
      "id": "hero-background",
      "role": "background",
      "width_px": 1536,
      "height_px": 864,
      "output_format": "webp",
      "background_strategy": "raster",
      "content_anchor": "center",
      "content_regions": [],
      "seed": null
    },
    {
      "id": "methods-card",
      "role": "section_art",
      "width_px": 720,
      "height_px": 480,
      "output_format": "png",
      "background_strategy": "raster",
      "content_anchor": "center",
      "content_regions": [
        { "id": "title", "x": "5%", "y": "5%",  "width": "90%", "height": "15%", "type": "text" },
        { "id": "body",  "x": "5%", "y": "22%", "width": "58%", "height": "55%", "type": "text" },
        { "id": "chart", "x": "65%","y": "22%", "width": "30%", "height": "55%", "type": "chart" }
      ]
    }
  ]
}
```

### Sidecar JSON written to `public/generated-assets/{stem}.json`
After generation, each asset has an extended sidecar including:
```json
{
  "id": "comic-research-...",
  "publicUrl": "/generated-assets/comic-research-....webp",
  "status": "complete",
  "seed": 12345678,
  "contentAnchor": "center",
  "contentRegions": [...],
  "layoutSectionId": "hero-background",
  "generationParams": { "model": "gpt-image-2", "quality": "medium", "size": "1536x864", "format": "webp", "seed": 12345678 }
}
```

### Updated `imagegen-themes.json` schema (v2)
`export-themes` now writes `src/themes/imagegen-themes.json` with additional fields per theme:
```json
{
  "id": "blueprint-engineering",
  "backgroundStrategy": "svg",
  "htmlTokens": { "radius": "4px", "borderWidth": "1px", ... },
  "typography": { "heading": "...", "body": "...", "mono": "..." },
  "chartStyle": "...",
  "diagramStyle": "...",
  "iconStyle": "...",
  "textureStyle": "...",
  "density": "medium",
  "formality": "technical"
}
```

**Background strategy classification** (used to decide SVG vs. raster):
- `"svg"` (11 themes): `blueprint-engineering`, `circuit-board-systems`, `swiss-grid-modernism`, `metro-map-systems-poster`, `patent-diagram-poster`, `transit-wayfinding-poster`, `minimalist-conference-poster`, `bauhaus-data-poster`, `low-poly-geometric-science`, `infographic-dashboard`, `clean-corporate-analytics`
- `"svg-hybrid"` (5 themes): `retro-computing-terminal`, `whiteboard-explainer`, `elegant-mathematical-atlas`, `academic-chalkboard`, `scandinavian-soft-minimal`
- `"raster"` (44 themes): everything else

---

## What to build in posterforge

Please explore the existing codebase first — read `src/components/PosterCanvas.tsx`, `src/components/VisualRenderer.tsx`, the plan JSON schema, and any existing theme loading — before making changes. Then implement the following three parts.

---

## Part A3 — Generated-image slot model + canvas

### New element type in the poster plan JSON schema

Add `"generated-image"` to the element union. A generated-image slot looks like this:

```typescript
interface GeneratedImageElement {
  id: string
  type: "generated-image"
  role: "background" | "hero_illustration" | "section_art" | "motif_pack" | "comic_panel"
  backgroundStrategy: "raster" | "svg" | "svg-hybrid"  // from theme's imagegen-themes.json
  x: number
  y: number
  widthPx: number
  heightPx: number
  contentAnchor: "top" | "bottom" | "left" | "right" | "center" | "full"
  outputFormat: "png" | "webp"
  assetId: string | null   // null = not yet generated; set to stem after generation
  objectPosition: string   // CSS object-position value e.g. "50% 50%"
  themeId: string
  seed: number | null      // stored after generation; enables "Regenerate (exact)"
  contentRegions: ContentRegion[]
}

interface ContentRegion {
  id: string
  x: string   // CSS percentage e.g. "5%"
  y: string
  width: string
  height: string
  type: "text" | "chart" | "metric" | "diagram-node" | "image"
}
```

### Standard slots to initialise per poster

When a poster plan is created from the data source, generate these slots based on the active theme:

- **1× background slot** — full canvas dimensions (`x:0, y:0, widthPx: canvasW, heightPx: canvasH`), `role: "background"`, `outputFormat: "webp"` for raster, `"svg"` for SVG-strategy themes
- **1× hero_illustration slot** (only if theme `density !== "low"`) — top 40% of canvas, `role: "hero_illustration"`, `outputFormat: "png"`
- **N× section_art slots** (optional, one per section card) — card dimensions, `role: "section_art"`, `outputFormat: "png"`, with standard `contentRegions` for that card's expected content types

Derive `backgroundStrategy` from `theme.backgroundStrategy` in `imagegen-themes.json`.

### Canvas rendering for generated-image slots

```tsx
// SVG-strategy slot (backgroundStrategy: "svg" or "svg-hybrid")
// No API call needed — filled immediately from public/theme-backgrounds/{themeId}.svg
<ThemeMotifLayer
  themeId={slot.themeId}
  mode="full-background"
  style={{ position: 'absolute', left: slot.x, top: slot.y, width: slot.widthPx, height: slot.heightPx }}
/>

// Raster slot — placeholder until generated
{!slot.assetId && (
  <div style={{ position:'absolute', left:slot.x, top:slot.y, width:slot.widthPx, height:slot.heightPx,
                background:'var(--theme-muted)', display:'flex', alignItems:'center', justifyContent:'center' }}>
    <button onClick={() => triggerGeneration(slot)}>Generate image</button>
  </div>
)}

// Raster slot — filled
{slot.assetId && (
  <div style={{ position:'absolute', left:slot.x, top:slot.y, width:slot.widthPx, height:slot.heightPx, overflow:'hidden' }}>
    <img
      src={`/generated-assets/${slot.assetId}.${slot.outputFormat}`}
      draggable={false}
      style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition: slot.objectPosition }}
      onPointerDown={e => startImagePan(e, slot)}
    />
    {/* Content region divs sit on top */}
    {slot.contentRegions.map(region => (
      <div key={region.id} style={{
        position:'absolute', left:region.x, top:region.y, width:region.width, height:region.height,
        overflow:'hidden', boxSizing:'border-box',
      }}>
        {renderRegionContent(region, posterContent)}
      </div>
    ))}
    {/* SVG motif overlay always on top, pointer-events:none */}
    <ThemeMotifLayer themeId={slot.themeId} mode="motif-overlay" />
  </div>
)}
```

### User manipulation

**Pan within the image** (pointer drag on `<img>`, not the canvas-level drag):
```typescript
function startImagePan(e: PointerEvent, slot: GeneratedImageElement) {
  e.stopPropagation()  // prevent canvas drag from activating
  const startX = e.clientX, startY = e.clientY
  const [ox, oy] = parseObjectPosition(slot.objectPosition)  // 0-100
  const onMove = (mv: PointerEvent) => {
    const dx = (mv.clientX - startX) / slot.widthPx * 100
    const dy = (mv.clientY - startY) / slot.heightPx * 100
    updateSlot(slot.id, { objectPosition: `${clamp(ox - dx, 0, 100)}% ${clamp(oy - dy, 0, 100)}%` })
  }
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', () => window.removeEventListener('pointermove', onMove), { once: true })
}
```

**Resize slot** — use existing canvas resize handles; on dimension change update `slot.widthPx`/`slot.heightPx`. If change > 20%, show a toast: "Image dimensions changed — Regenerate for best quality?"

**Move slot** — existing canvas drag updates `slot.x`/`slot.y`.

**Regenerate buttons**:
- "Regenerate" → calls `buildLayoutSpec` for just this slot (no seed) → runs `generate-for-layout` → updates `slot.assetId`
- "Regenerate (exact)" → same but passes stored `slot.seed` in the layout-spec

### New file: `src/layouts/buildLayoutSpec.ts`

```typescript
import type { PosterPlan } from '../types/poster'

export interface LayoutSpec {
  theme_id: string
  project_title: string
  project_subtitle?: string
  quality: 'low' | 'medium' | 'high'
  sections: LayoutSection[]
}

export interface LayoutSection {
  id: string
  role: string
  width_px: number
  height_px: number
  content_anchor: string
  output_format: string
  background_strategy: string
  seed?: number
  content_regions: ContentRegionSpec[]
}

interface ContentRegionSpec {
  id: string; x: string; y: string; width: string; height: string; type: string
}

export function buildLayoutSpec(plan: PosterPlan, quality: 'low'|'medium'|'high' = 'medium'): LayoutSpec {
  return {
    theme_id: plan.themeId,
    project_title: plan.title,
    project_subtitle: plan.subtitle ?? '',
    quality,
    sections: plan.elements
      .filter(e => e.type === 'generated-image' && e.backgroundStrategy === 'raster')
      .map(e => ({
        id: e.id,
        role: e.role,
        width_px: e.widthPx,
        height_px: e.heightPx,
        content_anchor: e.contentAnchor,
        output_format: e.outputFormat,
        background_strategy: e.backgroundStrategy,
        seed: e.seed ?? undefined,
        content_regions: e.contentRegions,
      })),
  }
}
```

### New file: `src/components/ThemeMotifLayer.tsx`

Renders either a full SVG background (SVG-strategy themes) or a motif-only overlay (raster themes). SVG files live at `public/theme-backgrounds/{themeId}.svg`.

```tsx
interface ThemeMotifLayerProps {
  themeId: string
  mode: 'full-background' | 'motif-overlay'
  style?: React.CSSProperties
}

export function ThemeMotifLayer({ themeId, mode, style }: ThemeMotifLayerProps) {
  return (
    <div
      style={{
        position: 'absolute', inset: 0,
        pointerEvents: 'none',
        ...(mode === 'motif-overlay' ? { zIndex: 2 } : {}),
        ...style,
      }}
    >
      <img
        src={`/theme-backgrounds/${themeId}.svg`}
        alt=""
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        onError={e => { (e.target as HTMLElement).style.display = 'none' }}
      />
    </div>
  )
}
```

### New directory: `public/theme-backgrounds/`

Create one SVG file per SVG/svg-hybrid theme (16 files total). Each SVG is built from the theme's design language. Key examples:

**`blueprint-engineering.svg`** — white linework on blueprint blue:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1536 864" width="1536" height="864">
  <rect width="1536" height="864" fill="#003580"/>
  <defs>
    <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
      <path d="M 48 0 L 0 0 0 48" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="0.5"/>
    </pattern>
    <pattern id="grid-major" width="240" height="240" patternUnits="userSpaceOnUse">
      <rect width="240" height="240" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="1536" height="864" fill="url(#grid)"/>
  <rect width="1536" height="864" fill="url(#grid-major)"/>
  <!-- Corner crosshairs -->
  <g stroke="rgba(255,255,255,0.5)" stroke-width="1" fill="none">
    <line x1="60" y1="40" x2="60" y2="80"/> <line x1="40" y1="60" x2="80" y2="60"/>
    <line x1="1476" y1="40" x2="1476" y2="80"/> <line x1="1456" y1="60" x2="1496" y2="60"/>
    <line x1="60" y1="784" x2="60" y2="824"/> <line x1="40" y1="804" x2="80" y2="804"/>
    <line x1="1476" y1="784" x2="1476" y2="824"/> <line x1="1456" y1="804" x2="1496" y2="804"/>
  </g>
  <!-- Title bar -->
  <rect x="0" y="0" width="1536" height="4" fill="rgba(255,255,255,0.4)"/>
  <rect x="0" y="860" width="1536" height="4" fill="rgba(255,255,255,0.4)"/>
</svg>
```

**`circuit-board-systems.svg`** — PCB traces on dark green:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1536 864">
  <rect width="1536" height="864" fill="#0d1f0d"/>
  <defs>
    <pattern id="pcb" width="96" height="96" patternUnits="userSpaceOnUse">
      <line x1="0" y1="48" x2="96" y2="48" stroke="rgba(0,255,80,0.12)" stroke-width="1"/>
      <line x1="48" y1="0" x2="48" y2="96" stroke="rgba(0,255,80,0.12)" stroke-width="1"/>
      <circle cx="48" cy="48" r="4" fill="none" stroke="rgba(0,255,80,0.2)" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="1536" height="864" fill="url(#pcb)"/>
  <!-- Trace lines -->
  <polyline points="100,432 200,432 200,200 400,200" fill="none" stroke="rgba(0,255,80,0.3)" stroke-width="2"/>
  <polyline points="1436,432 1336,432 1336,664 1136,664" fill="none" stroke="rgba(0,255,80,0.3)" stroke-width="2"/>
  <!-- Pads -->
  <circle cx="100" cy="432" r="6" fill="rgba(0,255,80,0.4)"/>
  <circle cx="400" cy="200" r="6" fill="rgba(0,255,80,0.4)"/>
  <circle cx="1436" cy="432" r="6" fill="rgba(0,255,80,0.4)"/>
  <circle cx="1136" cy="664" r="6" fill="rgba(0,255,80,0.4)"/>
</svg>
```

Build the remaining 14 SVGs similarly from each theme's palette and visual language. For `svg-hybrid` themes like `whiteboard-explainer`, the SVG uses a light off-white background with ruled lines and a subtle sketch pattern:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1536 864">
  <rect width="1536" height="864" fill="#FFFEF5"/>
  <defs>
    <pattern id="ruled" width="1536" height="40" patternUnits="userSpaceOnUse">
      <line x1="0" y1="39" x2="1536" y2="39" stroke="rgba(180,180,200,0.4)" stroke-width="1"/>
    </pattern>
    <pattern id="margin" width="100" height="864" patternUnits="userSpaceOnUse">
      <line x1="80" y1="0" x2="80" y2="864" stroke="rgba(220,160,160,0.3)" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="1536" height="864" fill="url(#ruled)"/>
  <rect width="1536" height="864" fill="url(#margin)"/>
  <!-- Margin line -->
  <line x1="80" y1="0" x2="80" y2="864" stroke="rgba(220,160,160,0.5)" stroke-width="1.5"/>
</svg>
```

---

## Part B — Fix broken visual renderers

### Install these packages first
```bash
npm install recharts react-katex katex mermaid
# or: yarn add / pnpm add
```

### Find and fix `src/components/VisualRenderer.tsx`

Explore the file first to understand its current structure. Then apply this migration:

**For every chart type** (`bar-chart`, `line-chart`, `scatter`, `pie-chart`, `area-chart`), replace the broken render branch with Recharts:

```tsx
import { BarChart, Bar, LineChart, Line, ScatterChart, Scatter,
         PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
         ResponsiveContainer } from 'recharts'

// Bar chart
case 'bar-chart': {
  const chartData = visual.data.labels.map((label: string, i: number) => ({
    name: label,
    ...Object.fromEntries(visual.data.datasets.map((ds: any) => [ds.label, ds.values[i]]))
  }))
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        {visual.data.datasets.map((ds: any, i: number) => (
          <Bar key={ds.label} dataKey={ds.label} fill={palette[i % palette.length]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}
```

**For equations**, replace broken branch with KaTeX. Import the CSS at the top of the component or in your global CSS:
```tsx
import 'katex/dist/katex.min.css'
import { InlineMath, BlockMath } from 'react-katex'

case 'equation': {
  try {
    return visual.data.display
      ? <BlockMath math={visual.data.latex} />
      : <InlineMath math={visual.data.latex} />
  } catch {
    return <div style={{ color: 'red', fontFamily: 'monospace' }}>Invalid LaTeX: {visual.data.latex}</div>
  }
}
```

**For flow diagrams**, use Mermaid with client-side lazy loading (SSR-safe):
```tsx
import { useEffect, useRef, useState } from 'react'

function MermaidDiagram({ definition }: { definition: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [svg, setSvg] = useState<string>('')
  const [error, setError] = useState<string>('')
  const id = useRef(`mermaid-${Math.random().toString(36).slice(2)}`)

  useEffect(() => {
    import('mermaid').then(({ default: mermaid }) => {
      mermaid.initialize({ startOnLoad: false, theme: 'neutral' })
      mermaid.render(id.current, definition)
        .then(({ svg }) => setSvg(svg))
        .catch(e => setError(String(e)))
    })
  }, [definition])

  if (error) return <div style={{ color:'red', fontFamily:'monospace', fontSize:12 }}>{error}</div>
  if (!svg) return <div style={{ color:'#888' }}>Rendering diagram…</div>
  return <div ref={ref} dangerouslySetInnerHTML={{ __html: svg }} style={{ width:'100%', height:'100%' }} />
}

// In the switch:
case 'flow-diagram':
  return <MermaidDiagram definition={visual.data.definition} />
```

**Wrap the entire switch in try/catch** so one broken visual doesn't crash the poster:
```tsx
try {
  switch (visual.visualType) {
    // ... cases
    default:
      return <div style={{...placeholderStyle}}>[{visual.visualType} — not yet supported]</div>
  }
} catch (err) {
  return <div style={{...placeholderStyle}}>[{visual.visualType} — rendering error]</div>
}
```

**Data table** — no library needed:
```tsx
case 'data-table':
  return (
    <div style={{ overflow:'auto', width:'100%', height:'100%' }}>
      <table style={{ borderCollapse:'collapse', width:'100%', fontSize:'0.85em' }}>
        <thead>
          <tr>{visual.data.headers.map((h: string) => <th key={h} style={{ borderBottom:'2px solid currentColor', padding:'4px 8px', textAlign:'left' }}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {visual.data.rows.map((row: string[], i: number) => (
            <tr key={i}>{row.map((cell, j) => <td key={j} style={{ borderBottom:'1px solid rgba(0,0,0,0.1)', padding:'4px 8px' }}>{cell}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  )
```

### Standardised visual data schemas (used by renderer and editor)

```typescript
// All visuals follow this base shape in the plan JSON:
{ id, type: "visual", visualType: string, x, y, widthPx, heightPx, paletteId, data: {...} }

// Per-type data shapes:
bar-chart:    { labels: string[], datasets: [{ label: string, values: number[] }] }
line-chart:   { labels: string[], series: [{ name: string, values: number[] }] }
scatter:      { points: [{ x: number, y: number, label?: string }] }
pie-chart:    { segments: [{ name: string, value: number }] }
area-chart:   { labels: string[], series: [{ name: string, values: number[] }] }
histogram:    { values: number[], bins: number }
heatmap:      { rows: string[], cols: string[], values: number[][] }
flow-diagram: { definition: string }   // Mermaid DSL
network-graph:{ nodes: [{ id, label }], edges: [{ source, target, label? }] }
equation:     { latex: string, display: boolean }
data-table:   { headers: string[], rows: string[][] }
timeline:     { events: [{ date: string, label: string, description?: string }] }
```

---

## Part C — Visual registry + picker UI

### New file: `src/visuals/visualRegistry.ts`

```typescript
export type VisualCategory = 'chart' | 'diagram' | 'equation' | 'table'

export interface FieldDefinition {
  key: string    // dot-path into data, e.g. "labels" or "datasets.0.values"
  label: string
  type: 'text' | 'number' | 'array-of-strings' | 'array-of-numbers' | 'textarea' | 'boolean'
}

export interface VisualDefinition {
  id: string
  name: string
  category: VisualCategory
  description: string
  icon: string          // single emoji or short unicode symbol for the picker card
  defaultData: object   // shown as live preview in picker
  editableFields: FieldDefinition[]
}

export const VISUAL_REGISTRY: VisualDefinition[] = [
  {
    id: 'bar-chart', name: 'Bar Chart', category: 'chart',
    description: 'Compare values across categories',
    icon: '📊',
    defaultData: { labels: ['A','B','C','D'], datasets: [{ label: 'Series 1', values: [42, 67, 31, 55] }] },
    editableFields: [
      { key: 'labels',              label: 'Categories',    type: 'array-of-strings' },
      { key: 'datasets.0.label',    label: 'Series name',   type: 'text' },
      { key: 'datasets.0.values',   label: 'Values',        type: 'array-of-numbers' },
    ],
  },
  {
    id: 'line-chart', name: 'Line Chart', category: 'chart',
    description: 'Show trends over a sequence',
    icon: '📈',
    defaultData: { labels: ['Jan','Feb','Mar','Apr','May'], series: [{ name: 'Metric', values: [10, 22, 18, 35, 29] }] },
    editableFields: [
      { key: 'labels',          label: 'X-axis labels', type: 'array-of-strings' },
      { key: 'series.0.name',   label: 'Series name',   type: 'text' },
      { key: 'series.0.values', label: 'Values',        type: 'array-of-numbers' },
    ],
  },
  {
    id: 'scatter', name: 'Scatter Plot', category: 'chart',
    description: 'Explore correlation between two variables',
    icon: '🔵',
    defaultData: { points: [{ x:1,y:2 },{ x:3,y:5 },{ x:4,y:3 },{ x:7,y:8 },{ x:9,y:6 }] },
    editableFields: [],  // advanced: edit raw JSON
  },
  {
    id: 'pie-chart', name: 'Pie / Donut', category: 'chart',
    description: 'Show part-to-whole proportions',
    icon: '🥧',
    defaultData: { segments: [{ name:'Alpha', value:40 },{ name:'Beta', value:30 },{ name:'Gamma', value:30 }] },
    editableFields: [
      { key: 'segments.0.name',  label: 'Segment 1 name',  type: 'text' },
      { key: 'segments.0.value', label: 'Segment 1 value', type: 'number' },
    ],
  },
  {
    id: 'area-chart', name: 'Area Chart', category: 'chart',
    description: 'Emphasise volume over time',
    icon: '🏔️',
    defaultData: { labels: ['Q1','Q2','Q3','Q4'], series: [{ name:'Revenue', values:[100,150,130,200] }] },
    editableFields: [
      { key: 'labels',          label: 'X labels',    type: 'array-of-strings' },
      { key: 'series.0.name',   label: 'Series',      type: 'text' },
      { key: 'series.0.values', label: 'Values',      type: 'array-of-numbers' },
    ],
  },
  {
    id: 'histogram', name: 'Histogram', category: 'chart',
    description: 'Distribution of a numeric variable',
    icon: '📉',
    defaultData: { values: [2,3,3,4,4,4,5,5,5,5,6,6,7,8], bins: 6 },
    editableFields: [
      { key: 'values', label: 'Raw values', type: 'array-of-numbers' },
      { key: 'bins',   label: 'Bin count',  type: 'number' },
    ],
  },
  {
    id: 'heatmap', name: 'Heatmap', category: 'chart',
    description: 'Matrix of values as colour intensity',
    icon: '🟧',
    defaultData: { rows:['R1','R2','R3'], cols:['C1','C2','C3'], values:[[1,2,3],[4,5,6],[7,8,9]] },
    editableFields: [
      { key: 'rows', label: 'Row labels', type: 'array-of-strings' },
      { key: 'cols', label: 'Col labels', type: 'array-of-strings' },
    ],
  },
  {
    id: 'flow-diagram', name: 'Flow Diagram', category: 'diagram',
    description: 'Process flow using Mermaid DSL',
    icon: '🔄',
    defaultData: { definition: 'graph TD\n  A[Start] --> B{Decision}\n  B -->|Yes| C[Action]\n  B -->|No| D[End]' },
    editableFields: [
      { key: 'definition', label: 'Mermaid diagram definition', type: 'textarea' },
    ],
  },
  {
    id: 'network-graph', name: 'Network Graph', category: 'diagram',
    description: 'Nodes and edges relationship diagram',
    icon: '🕸️',
    defaultData: {
      nodes: [{ id:'1', label:'Input' },{ id:'2', label:'Model' },{ id:'3', label:'Output' }],
      edges: [{ source:'1', target:'2' },{ source:'2', target:'3' }],
    },
    editableFields: [],
  },
  {
    id: 'equation', name: 'Equation', category: 'equation',
    description: 'LaTeX mathematical equation',
    icon: '∑',
    defaultData: { latex: 'E = mc^2', display: true },
    editableFields: [
      { key: 'latex',   label: 'LaTeX expression', type: 'textarea' },
      { key: 'display', label: 'Display mode',     type: 'boolean' },
    ],
  },
  {
    id: 'data-table', name: 'Data Table', category: 'table',
    description: 'Rows and columns of structured data',
    icon: '🗂️',
    defaultData: {
      headers: ['Method','Accuracy','F1'],
      rows: [['Baseline','72.3%','0.71'],['Proposed','89.1%','0.88']],
    },
    editableFields: [
      { key: 'headers', label: 'Column headers', type: 'array-of-strings' },
    ],
  },
  {
    id: 'timeline', name: 'Timeline', category: 'diagram',
    description: 'Sequence of dated events',
    icon: '📅',
    defaultData: {
      events: [
        { date:'2023 Q1', label:'Data collection' },
        { date:'2023 Q3', label:'Model training' },
        { date:'2024 Q1', label:'Evaluation' },
        { date:'2024 Q2', label:'Deployment' },
      ],
    },
    editableFields: [
      { key: 'events.0.date',  label: 'Date 1',  type: 'text' },
      { key: 'events.0.label', label: 'Event 1', type: 'text' },
    ],
  },
]

export function getVisual(id: string): VisualDefinition | undefined {
  return VISUAL_REGISTRY.find(v => v.id === id)
}
```

### New file: `src/components/VisualPicker.tsx`

```tsx
import { useState } from 'react'
import { VISUAL_REGISTRY, type VisualCategory, type VisualDefinition } from '../visuals/visualRegistry'
import { VisualRenderer } from './VisualRenderer'

interface VisualPickerProps {
  onSelect: (visual: VisualDefinition) => void
  onClose: () => void
}

const TABS: { label: string; category: VisualCategory | 'all' }[] = [
  { label: 'All',       category: 'all' },
  { label: 'Charts',    category: 'chart' },
  { label: 'Diagrams',  category: 'diagram' },
  { label: 'Equations', category: 'equation' },
  { label: 'Tables',    category: 'table' },
]

export function VisualPicker({ onSelect, onClose }: VisualPickerProps) {
  const [activeTab, setActiveTab] = useState<VisualCategory | 'all'>('all')

  const visible = activeTab === 'all'
    ? VISUAL_REGISTRY
    : VISUAL_REGISTRY.filter(v => v.category === activeTab)

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }} onClick={onClose}>
      <div style={{
        background: 'white', borderRadius: 12, width: 680, maxHeight: '80vh',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Add Visual</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20 }}>×</button>
        </div>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, padding: '8px 20px', borderBottom: '1px solid #eee' }}>
          {TABS.map(tab => (
            <button key={tab.category} onClick={() => setActiveTab(tab.category)} style={{
              padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 14,
              background: activeTab === tab.category ? '#1a1a2e' : 'transparent',
              color: activeTab === tab.category ? 'white' : '#555',
              fontWeight: activeTab === tab.category ? 600 : 400,
            }}>{tab.label}</button>
          ))}
        </div>
        {/* Grid */}
        <div style={{ overflow: 'auto', padding: 20, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {visible.map(visual => (
            <button key={visual.id} onClick={() => onSelect(visual)} style={{
              border: '1px solid #e5e7eb', borderRadius: 8, padding: 0, cursor: 'pointer',
              background: 'white', textAlign: 'left', overflow: 'hidden',
              transition: 'box-shadow 0.15s',
            }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)')}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
            >
              {/* Mini preview */}
              <div style={{ height: 100, background: '#f9fafb', borderBottom: '1px solid #e5e7eb', overflow: 'hidden' }}>
                <VisualRenderer
                  visual={{ id: `preview-${visual.id}`, type: 'visual', visualType: visual.id,
                            x: 0, y: 0, widthPx: 200, heightPx: 100, data: visual.defaultData, paletteId: null }}
                />
              </div>
              {/* Label */}
              <div style={{ padding: '8px 10px' }}>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{visual.icon} {visual.name}</div>
                <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{visual.description}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
```

### New file: `src/components/VisualDataEditor.tsx`

```tsx
import { getVisual } from '../visuals/visualRegistry'

interface VisualDataEditorProps {
  visual: any         // the visual element from plan JSON
  onChange: (updated: any) => void
}

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((acc, key) => {
    const idx = parseInt(key)
    return isNaN(idx) ? acc?.[key] : acc?.[idx]
  }, obj)
}

function setNestedValue(obj: any, path: string, value: any): any {
  const result = structuredClone(obj)
  const keys = path.split('.')
  let cur = result
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i]
    const idx = parseInt(k)
    cur = isNaN(idx) ? cur[k] : cur[idx]
  }
  const lastKey = keys[keys.length - 1]
  const lastIdx = parseInt(lastKey)
  if (isNaN(lastIdx)) cur[lastKey] = value
  else cur[lastIdx] = value
  return result
}

export function VisualDataEditor({ visual, onChange }: VisualDataEditorProps) {
  const definition = getVisual(visual.visualType)
  if (!definition) return null

  function update(key: string, value: any) {
    onChange({ ...visual, data: setNestedValue(visual.data, key, value) })
  }

  return (
    <div style={{ padding: 16, background: '#f9fafb', borderTop: '1px solid #e5e7eb' }}>
      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12, color: '#374151' }}>
        {definition.icon} {definition.name} — Edit Data
      </div>
      {definition.editableFields.map(field => {
        const value = getNestedValue(visual.data, field.key)
        return (
          <div key={field.key} style={{ marginBottom: 10 }}>
            <label style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 4 }}>
              {field.label}
            </label>
            {field.type === 'textarea' && (
              <textarea
                value={value ?? ''}
                onChange={e => update(field.key, e.target.value)}
                style={{ width: '100%', minHeight: 80, fontFamily: 'monospace', fontSize: 12,
                         border: '1px solid #d1d5db', borderRadius: 4, padding: '6px 8px', resize: 'vertical' }}
              />
            )}
            {field.type === 'text' && (
              <input type="text" value={value ?? ''}
                onChange={e => update(field.key, e.target.value)}
                style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 4, padding: '4px 8px', fontSize: 13 }} />
            )}
            {field.type === 'number' && (
              <input type="number" value={value ?? 0}
                onChange={e => update(field.key, Number(e.target.value))}
                style={{ width: 100, border: '1px solid #d1d5db', borderRadius: 4, padding: '4px 8px', fontSize: 13 }} />
            )}
            {field.type === 'boolean' && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                <input type="checkbox" checked={!!value}
                  onChange={e => update(field.key, e.target.checked)} />
                {field.label}
              </label>
            )}
            {field.type === 'array-of-strings' && (
              <ArrayEditor
                values={value ?? []}
                onChange={vals => update(field.key, vals)}
                inputType="text"
              />
            )}
            {field.type === 'array-of-numbers' && (
              <ArrayEditor
                values={value ?? []}
                onChange={vals => update(field.key, vals)}
                inputType="number"
              />
            )}
          </div>
        )
      })}
      {/* Live preview for equation/flow editors */}
      {(visual.visualType === 'equation' || visual.visualType === 'flow-diagram') && (
        <div style={{ marginTop: 12, border: '1px solid #e5e7eb', borderRadius: 6, padding: 12,
                      background: 'white', minHeight: 60 }}>
          <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 6 }}>Preview</div>
          {/* VisualRenderer renders the live preview */}
        </div>
      )}
    </div>
  )
}

function ArrayEditor({ values, onChange, inputType }: { values: any[], onChange: (v: any[]) => void, inputType: 'text'|'number' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {values.map((v, i) => (
        <div key={i} style={{ display: 'flex', gap: 4 }}>
          <input type={inputType} value={v}
            onChange={e => { const next = [...values]; next[i] = inputType === 'number' ? Number(e.target.value) : e.target.value; onChange(next) }}
            style={{ flex:1, border:'1px solid #d1d5db', borderRadius:4, padding:'3px 6px', fontSize:13 }} />
          <button onClick={() => onChange(values.filter((_,j)=>j!==i))}
            style={{ border:'none', background:'none', cursor:'pointer', color:'#ef4444', fontSize:16, lineHeight:1 }}>×</button>
        </div>
      ))}
      <button onClick={() => onChange([...values, inputType === 'number' ? 0 : ''])}
        style={{ alignSelf:'flex-start', border:'1px dashed #d1d5db', background:'none',
                 borderRadius:4, padding:'3px 10px', fontSize:12, cursor:'pointer', color:'#6b7280' }}>
        + Add
      </button>
    </div>
  )
}
```

### Wiring the picker into the canvas

In `PosterCanvas.tsx` (or wherever the canvas toolbar lives), add:

```tsx
import { useState } from 'react'
import { VisualPicker } from './VisualPicker'
import { VisualDataEditor } from './VisualDataEditor'
import { type VisualDefinition } from '../visuals/visualRegistry'

// In component state:
const [showPicker, setShowPicker] = useState(false)
const [selectedVisualId, setSelectedVisualId] = useState<string | null>(null)

function handlePickVisual(definition: VisualDefinition) {
  const newVisual = {
    id: `visual-${Date.now()}`,
    type: 'visual',
    visualType: definition.id,
    x: 40, y: 40,
    widthPx: 400, heightPx: 280,
    data: structuredClone(definition.defaultData),
    paletteId: activePlan.themeId,
  }
  dispatch({ type: 'ADD_ELEMENT', element: newVisual })
  setSelectedVisualId(newVisual.id)
  setShowPicker(false)
}

// In JSX:
<button onClick={() => setShowPicker(true)}>+ Add Visual</button>

{showPicker && <VisualPicker onSelect={handlePickVisual} onClose={() => setShowPicker(false)} />}

{selectedVisualId && (() => {
  const v = activePlan.elements.find(e => e.id === selectedVisualId)
  return v?.type === 'visual' ? (
    <VisualDataEditor
      visual={v}
      onChange={updated => dispatch({ type: 'UPDATE_ELEMENT', element: updated })}
    />
  ) : null
})()}
```

---

## Verification checklist

After implementing, check:

1. **SVG themes**: Open a poster with `blueprint-engineering` → background fills immediately from `/theme-backgrounds/blueprint-engineering.svg`, no generate button
2. **Raster themes**: Open a poster with `comic-research-showcase` → background slot shows placeholder + "Generate image" button
3. **Content regions**: A `section_art` slot shows `contentRegion` divs overlaid in the correct positions
4. **Pan image**: Pointer-drag on a generated image pans it (changes `objectPosition`), does not trigger canvas element drag
5. **buildLayoutSpec**: Calling `buildLayoutSpec(plan)` returns a valid layout-spec with only raster sections
6. **Bar chart renders**: A `visual` element with `visualType: "bar-chart"` renders a Recharts chart, not a blank/error
7. **Equation renders**: `{ visualType: "equation", data: { latex: "E=mc^2", display: true } }` renders via KaTeX
8. **Flow diagram renders**: `{ visualType: "flow-diagram", data: { definition: "graph TD\n  A-->B" } }` renders via Mermaid (no SSR crash)
9. **Visual picker opens**: "Add Visual" button → modal with 5 tabs and 12 visual type cards with mini previews
10. **Data editor live update**: Select a bar chart → change a value in VisualDataEditor → chart on canvas updates immediately

---

That's the complete self-contained brief. Copy everything from "Context: What was built in image-gen" through "Verification checklist" into your posterforge Claude Code session.