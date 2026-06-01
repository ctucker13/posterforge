# PosterForge

PosterForge explores a schema-driven approach for generating academic and data science posters with agent assistance.

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

## First Prototype

The current prototype is dependency-free and can be opened directly in a browser:

- `demo/index.html` - prompt UI, trace panel, and poster preview
- `spec/poster.schema.json` - early poster project schema
- `spec/example-poster.json` - example generated poster
- `themes/` - theme and palette modules
- `visuals/registry.json` - visual types the system should support
- `qa/rules.json` - initial quality-control rules
- `docs/architecture.md` - design approach and roadmap

## Design Principles

- Keep `poster.json` as the editable source of truth.
- Use deterministic renderers for factual visuals such as charts, tables, math, code, and diagrams.
- Use AI image generation for atmosphere, illustration, backgrounds, and themed assets.
- Preserve source metadata for every claim, chart, visual, and generated image.
- Make generation observable through structured trace events.
- Run a QA loop before export.
- Treat NatWest as an optional theme or palette, not a global visual requirement.

## Planned Stack

- TypeScript and React for the real UI.
- PptxGenJS for editable PowerPoint export.
- Playwright for PDF/PNG render checks.
- Plotly, Mermaid, KaTeX, and Shiki for deterministic visuals.
- GPT Image 2 for generated visual assets.
- Python only where data science computation is useful.
- Kiro skill wrapper for agent orchestration and MCP source access.

