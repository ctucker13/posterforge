import { FileCheck2, Image, ShieldCheck } from "lucide-react";
import type { PosterBlock, PosterProject } from "../domain/poster";
import { runQa } from "../domain/qa";
import { resolvePalette } from "../domain/themes";
import { VisualRenderer } from "./VisualRenderer";

interface PosterPreviewProps {
  poster: PosterProject;
}

export function PosterPreview({ poster }: PosterPreviewProps) {
  const palette = resolvePalette(poster.theme, poster.palette);
  const qaIssues = runQa(poster);
  const visuals = new Map(poster.visuals.map((visual) => [visual.id, visual]));

  return (
    <section className="preview-panel" aria-label="Poster preview">
      <div className="panel-header">
        <h2>Preview</h2>
        <span>HTML render</span>
      </div>
      <article
        className={`poster poster-${poster.theme}`}
        style={
          {
            "--theme-primary": palette.colors.primary,
            "--theme-accent": palette.colors.accent,
            "--theme-bg": palette.colors.background,
            "--theme-panel": palette.colors.panel,
            "--theme-ink": palette.colors.ink,
          } as React.CSSProperties
        }
      >
        <header className="poster-hero">
          <div>
            <p className="poster-kicker">{poster.layout} · {poster.audience}</p>
            <h2>{poster.title}</h2>
            <p>{poster.subtitle}</p>
          </div>
          <div className="hero-asset" aria-label="Generated image asset placeholder">
            <Image size={42} />
            <span>GPT Image 2 asset slot</span>
          </div>
        </header>

        <div className="poster-grid">
          {poster.sections.map((section) => (
            <section className="poster-card" key={section.id}>
              <h3>{section.title}</h3>
              {section.blocks.map((block, index) => renderBlock(block, index, visuals))}
            </section>
          ))}

          <section className="poster-card qa-card">
            <h3>Quality control</h3>
            <div className="qa-summary">
              <ShieldCheck size={22} />
              <strong>{qaIssues.length === 0 ? "No QA issues" : `${qaIssues.length} QA issue${qaIssues.length === 1 ? "" : "s"}`}</strong>
            </div>
            <ul>
              {qaIssues.length === 0 ? (
                <li>Claims and factual visuals are source-linked.</li>
              ) : (
                qaIssues.map((issue) => <li key={`${issue.id}-${issue.location}`}>{issue.message}</li>)
              )}
            </ul>
          </section>

          <section className="poster-card source-card">
            <h3>Source bundle</h3>
            <div className="source-list">
              {poster.sources.map((source) => (
                <div key={source.id}>
                  <FileCheck2 size={18} />
                  <span>{source.title}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </article>
    </section>
  );
}

function renderBlock(block: PosterBlock, index: number, visuals: Map<string, PosterProject["visuals"][number]>) {
  if (block.type === "text") {
    return <p key={index}>{block.text}</p>;
  }

  const visual = visuals.get(block.visual_id);
  if (!visual) {
    return <p key={index}>Missing visual: {block.visual_id}</p>;
  }

  return <VisualRenderer key={visual.id} visual={visual} />;
}
