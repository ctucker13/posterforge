import { type CSSProperties } from "react";
import { FileCheck2, Image, Link2 } from "lucide-react";
import type { PosterBlock, PosterProject } from "../domain/poster";
import { resolvePalette } from "../themes";
import { VisualRenderer } from "./VisualRenderer";

interface PosterPreviewProps {
  poster: PosterProject;
}

export function PosterPreview({ poster }: PosterPreviewProps) {
  const palette = resolvePalette(poster.theme, poster.palette);
  const visuals = new Map(poster.visuals.map((visual) => [visual.id, visual]));
  const sources = new Map(poster.sources.map((source) => [source.id, source]));

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
          } as CSSProperties
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

          <section className="poster-card claim-card">
            <h3>Claim map</h3>
            <div className="claim-list">
              {poster.claims.map((claim) => (
                <div key={claim.id}>
                  <p>{claim.text}</p>
                  <span>
                    <Link2 size={14} />
                    {claim.source_ids.map((sourceId) => sources.get(sourceId)?.title ?? sourceId).join(", ") || "No source"}
                  </span>
                </div>
              ))}
            </div>
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
