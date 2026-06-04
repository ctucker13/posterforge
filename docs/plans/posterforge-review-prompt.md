# PosterForge — Full Project Critical Review

## Context

You are performing a comprehensive, opinionated software engineering review of **PosterForge** — an agentic academic poster generation workspace built with Vite + React + TypeScript. The project ingests sources (web URLs, GitHub/GitLab repos, Confluence pages) and a user prompt, runs a structured pipeline to produce a `PosterProject` (backed by `poster.json`), and renders the result as a browser-native HTML/CSS poster canvas that the user can edit. Outputs include A0 PDF, PPTX compatibility snapshots, and project bundle ZIPs.

Read **every file in the repository** before writing your review. Pay particular attention to:

```
src/
  app/
  components/
  data/
  domain/
  exports/
  layouts/
  qa/
  renderers/
  sources/
  themes/
  visuals/
index.html
vite.config.ts
tsconfig.json
package.json
spec/poster.schema.json
spec/example-poster.json
docs/architecture.md
```

---

## What I Want

Produce a **structured, critical engineering review** that covers every domain below. For each issue you raise:

1. Clearly state the **problem** and its impact.
2. Reference the **specific file(s) and line(s)** where it occurs.
3. Provide a **concrete recommendation** — code snippets where they add clarity.

Do not soften findings. Be direct and specific. Point out both what works well and what needs significant work.

---

## Review Domains

### 1. Agent & Orchestration Design

Review the agentic pipeline that turns `user prompt + sources → PosterProject`.

- Does the architecture follow established best practices for agentic systems (bounded context, tool separation, clear handoff points, observability)?
- Is there a clear separation between **orchestration logic**, **tool/skill execution**, and **state management**? Or is business logic entangled with UI state?
- Are agent steps **idempotent and resumable**, or does a mid-pipeline failure require restarting from scratch?
- Is the `PosterProject` schema being used correctly as the single source of truth, or does state live in multiple inconsistent places?
- Are source connectors (Confluence, GitLab, web) properly abstracted behind a uniform interface? Is the acquisition/interpretation boundary enforced?
- Is the **trace/observability layer** sufficient for debugging failed runs? What is missing?
- How robust is error handling across pipeline steps? Are errors surfaced clearly to the user or silently swallowed?
- Is there a concept of **agent checkpointing / partial progress persistence**, and should there be?
- Evaluate whether the current mock connectors are structured in a way that makes replacing them with real connectors easy or hard.

### 2. Domain Model & Data Architecture

- Is `PosterProject` / `poster.json` well-designed as a portable, versionable spec? Identify any structural weaknesses (circular references, missing discriminated unions, ambiguous optionals).
- Is the schema (`spec/poster.schema.json`) kept in sync with TypeScript types? Is validation happening at the right boundaries?
- Are cross-cutting concerns (evidence linking, source trust, claim provenance) cleanly modelled or scattered?
- Are the typed layout templates, visual registry, and renderer data parsers well-separated? Would adding a new layout or renderer be straightforward?
- Is there a clear versioning/migration strategy for `poster.json`? What happens when the schema evolves?

### 3. Backend / Build Architecture

- Evaluate the choice of Vite + React + TypeScript as the sole runtime. The README explicitly defers Python to a later `uv`-based layer. Is this the right call for the roadmap (Plotly, Mermaid, KaTeX, Pandas summaries, ML metrics)? What are the risks of keeping everything in the browser?
- Are the Node.js scripts (`image:plan`, `image:generate`, `export:pdf`, `export:pptx:html`) well-structured? Do they share code correctly with the React app, or is there duplication?
- Is there a clear API boundary if a backend is added later, or will that be a painful retrofit?
- Evaluate the Playwright-backed export scripts for robustness: timing assumptions, error handling, environment portability.
- Are environment variables and secrets (OpenAI API key) handled safely?
- Is the `package.json` script surface clean and composable?

### 4. React Component Architecture

- Is there a clear **component hierarchy** (smart/container vs. presentational)? Are components doing too much?
- Is state management appropriate for the complexity of the app? Identify any prop-drilling, state duplication, or missing memoisation that will cause re-render issues as the poster model grows.
- Is the **shared poster canvas** (used by preview, editor, and Playwright PDF export) truly shared and single-source, or are there subtle rendering divergences between contexts?
- Are the panel components (Evidence, QA, Trace, Export, Editor controls) well-decomposed? Are there god components?
- Identify any missing `useMemo`/`useCallback`/`React.memo` opportunities that are likely to cause performance issues with a real A0 canvas.
- Is TypeScript used correctly and strictly throughout? Flag any `any` types, missing generics, or unsafe casts.

### 5. UI / UX Critical Review

This is a key area — be thorough and direct.

**Layout & Information Architecture**
- Review the overall panel layout. Is the current arrangement cluttered? Which panels are fighting for attention?
- Suggest a concrete revised layout — specify the panel regions, what belongs in each, and how they should be toggled or collapsed.
- Is there a clear **primary workflow** (prompt → source config → generate → review → edit → export) reflected in the UI, or does the user have to discover it?

**Poster Canvas & Editor**
- The current poster is rendered at **A0 scale** inside the browser. This is the most significant UX problem. Propose a concrete replacement:
  - The canvas should render at a **comfortable viewport-filling size** (e.g. a fixed container of ~70–80% viewport height) with a CSS `transform: scale()` approach that preserves the true A0 aspect ratio.
  - The user should be able to **zoom in** (mouse wheel / pinch), **pan** (drag), and **snap back to fit**.
  - The "edit at full resolution" vs "navigate overview" tension needs to be resolved — suggest an approach (e.g. a mini-map, a two-pane layout, a modal drill-down per section).
  - Every rendered element — section text, charts, metric cards, code blocks, tables, image placeholders, references — must be **inline-editable** in the canvas. Describe the interaction model (click to focus, contenteditable or overlay form, commit/discard).
  - Suggest how the editing controls sidebar should relate to the selected canvas element (context-sensitive property panel vs. static controls).

**Component-Level Feedback**
- Review each major panel: Source Config, Evidence, QA, Trace, Export, Editor Controls. For each: is the information density right? Is the visual hierarchy clear? What should be cut, collapsed, or promoted?
- Is there a coherent **design system** (spacing scale, type scale, colour tokens, component variants), or are styles ad hoc?
- Are loading states, empty states, and error states handled consistently across panels?
- Is the generate/pipeline flow reflected with clear progress indication?

**Accessibility & Polish**
- Flag any obvious accessibility issues (missing ARIA roles, keyboard navigation gaps, contrast issues).
- Is the app responsive, or is it viewport-locked? What is the minimum viable screen width?

### 6. Export Pipeline

- Is the export readiness model (`exports/`) correctly encapsulating all pre-flight checks?
- Is the A0 PDF export using Playwright in a way that is deterministic and will survive CI environments?
- Is the PPTX compatibility snapshot (HTML capture → slide) the right tradeoff? When would it fail?
- Is there a risk of the poster canvas rendering differently in Playwright vs. the browser (font loading, CSS variables, dynamic layout)?

### 7. Testing & Quality

- What test coverage exists? What is the highest-risk untested code?
- Are the QA rules (`qa/`) unit-testable in isolation from the UI?
- Are the renderer data parsers tested? They are critical for export correctness.
- Is there a strategy for visual regression testing of the poster canvas?
- Are the Playwright scripts instrumented enough to distinguish layout failures from rendering failures?

### 8. Code Quality & Engineering Standards

- Is there consistent error boundary usage in React?
- Are there any obvious memory leaks (event listeners, intervals, large objects held in closures)?
- Is the project structure sensible for its current size, and does it scale to the roadmap?
- Is there dead code, commented-out code, or leftover scaffold code that should be removed?
- Are magic numbers and strings extracted into named constants?
- Is the TypeScript compiler configured strictly enough (`strict: true`, `noUncheckedIndexedAccess`, etc.)?

---

## Prioritised Output Format

Structure your output as follows:

### Executive Summary
2–3 paragraphs: what is working well, what are the highest-priority problems, what is the recommended order of attack.

### Critical Issues (P0)
Things that will block quality or correctness in production. Fix before anything else.

### Significant Issues (P1)
Important improvements that should be tackled in the next sprint.

### Improvements (P2)
Valuable but non-urgent refactors and enhancements.

### UI/UX Redesign Proposal
A dedicated section with a concrete redesign proposal for:
1. The overall app layout (panel structure, workflow progression).
2. The poster canvas — scaled viewing, zoom/pan, inline editing model.
3. The editor sidebar — context-sensitive, element-linked property panel.

Include ASCII wireframes or pseudocode/JSX sketches where they add clarity.

### Quick Wins
Small changes (< 30 min each) that will visibly improve the codebase or UX immediately.

---

## Constraints & Tone

- Be specific. Vague advice ("improve error handling") is not acceptable — point to the file, describe the failure mode, show the fix.
- Assume the reviewer is a senior software engineer who will implement these changes. Do not over-explain basics.
- Prioritise changes that unlock the **core value proposition**: fast, editable, source-grounded poster generation. Do not recommend rewrites unless there is a compelling correctness or scalability reason.
- For the UI/UX section, assume the target user is a researcher or data scientist who wants a professional poster quickly — not a designer. Optimise for clarity and speed over visual flair.
