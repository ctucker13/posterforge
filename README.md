# PosterForge

PosterForge is a source-grounded poster generation workspace for academic and data science posters.

The core idea is:

```text
user prompt + sources
  -> poster project spec
  -> visual assets
  -> HTML preview
  -> editable PPTX
  -> print PDF
```

The poster spec is the source of truth. PPTX, PDF, HTML, images, and trace logs are generated outputs.

## Current Prototype

PosterForge now uses a Vite, React, and TypeScript app for the demo UI.

```bash
npm install
npm run dev
```

Then open the local Vite URL shown in the terminal.

## What It Demonstrates

- prompt-driven poster generation flow
- trace events showing generation progress
- theme and palette selection
- NatWest palette scoped as an optional palette/theme
- mock source modes for Confluence, GitLab, web, papers, and local files
- typed poster project model
- visual registry for data science poster elements
- basic QA checks for source grounding and poster quality
- HTML poster preview

## Planned Stack

- TypeScript and React for the main app.
- PptxGenJS for editable PowerPoint export.
- Playwright for PDF/PNG render checks.
- Plotly, Mermaid, KaTeX, and Shiki for deterministic visuals.
- GPT Image 2 for generated visual assets.
- Python with `uv` later for data science helpers only where useful.
- Kiro skill wrapper for agent orchestration and MCP source access.

## Design Principles

- Keep `poster.json` as the editable source of truth.
- Use deterministic renderers for factual visuals such as charts, tables, math, code, and diagrams.
- Use AI image generation for atmosphere, illustration, backgrounds, and themed assets.
- Preserve source metadata for every claim, chart, visual, and generated image.
- Make generation observable through structured trace events.
- Run a QA loop before export.
- Treat NatWest as an optional theme or palette, not a global visual requirement.
