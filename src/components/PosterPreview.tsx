import { type CSSProperties, useMemo, useState } from "react";
import { FileCheck2, Image, Link2, Maximize2, ZoomIn, ZoomOut } from "lucide-react";
import type { PosterBlock, PosterClaim, PosterProject, PosterSource } from "../domain/poster";
import { isFeaturedSection, resolveLayoutTemplate } from "../layouts";
import { resolvePalette } from "../themes";
import { VisualRenderer } from "./VisualRenderer";

interface PosterPreviewProps {
  poster: PosterProject;
}

export function PosterPreview({ poster }: PosterPreviewProps) {
  const [zoom, setZoom] = useState(0.45);
  const palette = resolvePalette(poster.theme, poster.palette);
  const layout = resolveLayoutTemplate(poster.layout);
  const visuals = new Map(poster.visuals.map((visual) => [visual.id, visual]));
  const sources = new Map(poster.sources.map((source) => [source.id, source]));
  const claims = new Map(poster.claims.map((claim) => [claim.id, claim]));
  const outputFrame = useMemo(() => getA0PreviewFrame(poster.format.orientation), [poster.format.orientation]);

  const zoomLabel = `${Math.round(zoom * 100)}%`;

  return (
    <section className="preview-panel" aria-label="Poster preview">
      <div className="panel-header">
        <h2>Preview</h2>
        <span>{`A0 ${outputFrame.orientation} · ${zoomLabel}`}</span>
      </div>
      <div className="preview-toolbar" aria-label="Preview zoom controls">
        <button type="button" onClick={() => setZoom((value) => Math.max(0.2, Number((value - 0.1).toFixed(2))))} title="Zoom out">
          <ZoomOut size={15} />
        </button>
        <strong>{zoomLabel}</strong>
        <button type="button" onClick={() => setZoom((value) => Math.min(1, Number((value + 0.1).toFixed(2))))} title="Zoom in">
          <ZoomIn size={15} />
        </button>
        <button type="button" onClick={() => setZoom(0.45)} title="Reset zoom">
          <Maximize2 size={15} />
        </button>
        <span>{`${outputFrame.mmWidth}mm x ${outputFrame.mmHeight}mm`}</span>
      </div>
      <div className="preview-viewport">
        <div className="a0-preview-stage" style={{ width: outputFrame.width * zoom, height: outputFrame.height * zoom }}>
          <div
            className="a0-preview-canvas"
            style={
              {
                width: outputFrame.width,
                height: outputFrame.height,
                transform: `scale(${zoom})`,
                "--theme-primary": palette.colors.primary,
                "--theme-accent": palette.colors.accent,
              } as CSSProperties
            }
          >
            <article
              className={`poster poster-output-frame poster-${poster.theme} poster-layout-${layout.cssClass}`}
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
                  <p className="poster-kicker">{layout.name} · {poster.audience}</p>
                  <h2>{poster.title}</h2>
                  <p>{poster.subtitle}</p>
                </div>
                <div className="hero-asset" aria-label="Generated image asset placeholder">
                  <Image size={42} />
                  <span>GPT Image asset slot</span>
                </div>
              </header>

              <div className="poster-grid">
                {poster.sections.map((section) => (
                  <section
                    className={`poster-card section-${section.type} section-${section.id} ${isFeaturedSection(layout, section) ? "featured-section" : ""}`}
                    key={section.id}
                  >
                    <h3>{section.title}</h3>
                    {section.blocks.map((block, index) => renderBlock(block, index, visuals, claims, sources))}
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
          </div>
        </div>
      </div>
    </section>
  );
}

function getA0PreviewFrame(orientation: PosterProject["format"]["orientation"]) {
  const isPortrait = orientation === "portrait";
  return {
    orientation: isPortrait ? "portrait" : "landscape",
    mmWidth: isPortrait ? 841 : 1189,
    mmHeight: isPortrait ? 1189 : 841,
    width: isPortrait ? 841 : 1189,
    height: isPortrait ? 1189 : 841,
  };
}

function renderBlock(
  block: PosterBlock,
  index: number,
  visuals: Map<string, PosterProject["visuals"][number]>,
  claims: Map<string, PosterClaim>,
  sources: Map<string, PosterSource>,
) {
  if (block.type === "text") {
    const blockClaims = (block.claim_ids ?? []).map((claimId) => claims.get(claimId)).filter(Boolean) as PosterClaim[];

    return (
      <div className="poster-text-block" key={index}>
        <p>{block.text}</p>
        {blockClaims.length > 0 ? (
          <div className="text-claim-badges" aria-label="Text claim sources">
            {blockClaims.map((claim) => (
              <span className="text-claim-badge" key={claim.id} title={claim.text}>
                <Link2 size={12} />
                {claim.source_ids.map((sourceId) => sources.get(sourceId)?.title ?? sourceId).join(", ") || claim.id}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  const visual = visuals.get(block.visual_id);
  if (!visual) {
    return <p key={index}>Missing visual: {block.visual_id}</p>;
  }

  return <VisualRenderer key={visual.id} visual={visual} />;
}
