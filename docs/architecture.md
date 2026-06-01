# Architecture

## Recommended Approach

Use a schema-driven poster compiler.

The system should not generate PPTX directly from an LLM response. Instead, the LLM should create and revise a structured poster project:

```text
Prompt
  -> source plan
  -> evidence map
  -> poster brief
  -> poster.json
  -> rendered assets
  -> QA
  -> exports
```

## Project Structure

```text
poster-project/
  poster.json
  sources/
  assets/
  renders/
  exports/
  traces/
  qa/
```

## Main Components

### Source Connectors

Initial:

- mock source
- local files
- web pages
- research papers

Later:

- Confluence through Kiro MCP
- GitLab through Kiro MCP

### Visual Registry

Each visual type should define:

- input schema
- render strategy for HTML
- render strategy for PPTX
- export asset type
- QA checks

### Theme System

Separate:

- theme: layout grammar, typography, motifs, prompt language
- palette: color tokens only
- layout: spatial structure
- asset style: generated-image prompt style

This allows combinations such as:

```json
{
  "theme": "comic-strip",
  "palette": "natwest-group"
}
```

### QA Loop

QA should initially check:

- missing source links
- unsupported claims
- text overflow risk
- missing references
- low image resolution
- missing required exports
- theme or palette mismatch
- factual visuals rendered as AI images

## MVP Scope

Build:

- prompt UI
- structured trace panel
- mock source connector
- poster JSON generation
- theme system
- visual registry
- HTML preview
- basic QA
- PPTX export later

Postpone:

- judging simulator
- event management
- multi-user collaboration
- full Confluence/GitLab auth
- advanced brand governance

