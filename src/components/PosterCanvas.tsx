import { type CSSProperties, type KeyboardEvent } from "react";
import { FileCheck2, Image, Link2 } from "lucide-react";
import type { PosterBlock, PosterClaim, PosterProject, PosterSource } from "../domain/poster";
import { isFeaturedSection, resolveLayoutTemplate } from "../layouts";
import { resolvePalette } from "../themes";
import { VisualRenderer } from "../renderers/VisualRenderer";

export type PosterCanvasItemKind = "section" | "block" | "visual";

export interface PosterCanvasProps {
  poster: PosterProject;
  mode?: "preview" | "edit" | "export" | undefined;
  selectedId?: string | undefined;
  onSelectItem?: ((id: string, kind: PosterCanvasItemKind) => void) | undefined;
  onUpdatePosterField?: ((field: "title" | "subtitle", value: string) => void) | undefined;
  onUpdateSectionTitle?: ((sectionId: string, title: string) => void) | undefined;
  onUpdateTextBlock?: ((blockId: string, text: string) => void) | undefined;
}

export function PosterCanvas({
  poster,
  mode = "preview",
  selectedId,
  onSelectItem,
  onUpdatePosterField,
  onUpdateSectionTitle,
  onUpdateTextBlock,
}: PosterCanvasProps) {
  const palette = resolvePalette(poster.theme, poster.palette);
  const layout = resolveLayoutTemplate(poster.layout);
  const outputFrame = getA0PreviewFrame(poster.format.orientation);
  const visuals = new Map(poster.visuals.map((visual) => [visual.id, visual]));
  const sources = new Map(poster.sources.map((source) => [source.id, source]));
  const claims = new Map(poster.claims.map((claim) => [claim.id, claim]));
  const sections = getOrderedSections(poster);

  return (
    <div
      className={`a0-preview-canvas poster-canvas-mode-${mode}`}
      data-poster-id={poster.id}
      data-poster-kind="canvas"
      data-orientation={outputFrame.orientation}
      style={
        {
          width: outputFrame.width,
          height: outputFrame.height,
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
        <header className="poster-hero" data-poster-id="hero" data-poster-kind="hero">
          <div>
            <p className="poster-kicker">{layout.name} · {poster.audience}</p>
            <h2
              contentEditable={mode === "edit"}
              suppressContentEditableWarning
              onBlur={(event) => onUpdatePosterField?.("title", event.currentTarget.innerText.trim())}
              onKeyDown={handleSingleLineEditKeyDown}
            >
              {poster.title}
            </h2>
            <p
              contentEditable={mode === "edit"}
              suppressContentEditableWarning
              onBlur={(event) => onUpdatePosterField?.("subtitle", event.currentTarget.innerText.trim())}
              onKeyDown={handleSingleLineEditKeyDown}
            >
              {poster.subtitle}
            </p>
          </div>
          <div className={`hero-asset${poster.logo ? " hero-asset-logo" : ""}`} aria-label={poster.logo ? "Organisation logo" : "Generated image asset placeholder"}>
            {poster.logo ? (
              <img className="hero-logo" src={poster.logo} alt="Organisation logo" />
            ) : (
              <>
                <Image size={42} />
                <span>GPT Image asset slot</span>
              </>
            )}
          </div>
        </header>

        <div className="poster-grid">
          {sections.map((section) => {
            if (section.layout?.hidden) {
              return null;
            }

            const isSelected = selectedId === section.id;
            const className = [
              "poster-card",
              `section-${section.type}`,
              `section-${section.id}`,
              isFeaturedSection(layout, section) || section.layout?.emphasis === "featured" || section.layout?.emphasis === "hero" ? "featured-section" : "",
              section.layout?.columnSpan ? `span-${section.layout.columnSpan}` : "",
              section.layout?.rowSpan ? `row-span-${section.layout.rowSpan}` : "",
              isSelected ? "selected-canvas-item" : "",
            ]
              .filter(Boolean)
              .join(" ");

            return (
              <section
                className={className}
                key={section.id}
                data-poster-id={section.id}
                data-poster-kind="section"
                onClick={(event) => {
                  if (mode === "edit") {
                    event.stopPropagation();
                    onSelectItem?.(section.id, "section");
                  }
                }}
              >
                <h3
                  contentEditable={mode === "edit"}
                  suppressContentEditableWarning
                  onBlur={(event) => onUpdateSectionTitle?.(section.id, event.currentTarget.innerText.trim())}
                  onKeyDown={handleSingleLineEditKeyDown}
                >
                  {section.title}
                </h3>
                {section.blocks.map((block, index) => renderBlock(block, index, section.id, visuals, claims, sources, mode, selectedId, onSelectItem, onUpdateTextBlock))}
              </section>
            );
          })}

          <section className="poster-card claim-card" data-poster-id="claim_map" data-poster-kind="claim_map">
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

          <section className="poster-card source-card" data-poster-id="source_bundle" data-poster-kind="source_bundle">
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
  );
}

export function getA0PreviewFrame(orientation: PosterProject["format"]["orientation"]) {
  const isPortrait = orientation === "portrait";
  const mmWidth = isPortrait ? 841 : 1189;
  const mmHeight = isPortrait ? 1189 : 841;
  return {
    orientation: isPortrait ? "portrait" : "landscape",
    mmWidth,
    mmHeight,
    width: mmToCssPx(mmWidth),
    height: mmToCssPx(mmHeight),
  };
}

function mmToCssPx(value: number) {
  return Math.round((value * 96) / 25.4);
}

export function getOrderedSections(poster: PosterProject) {
  return [...poster.sections].sort((a, b) => (a.layout?.order ?? poster.sections.indexOf(a)) - (b.layout?.order ?? poster.sections.indexOf(b)));
}

function renderBlock(
  block: PosterBlock,
  index: number,
  sectionId: string,
  visuals: Map<string, PosterProject["visuals"][number]>,
  claims: Map<string, PosterClaim>,
  sources: Map<string, PosterSource>,
  mode: PosterCanvasProps["mode"],
  selectedId?: string,
  onSelectItem?: PosterCanvasProps["onSelectItem"],
  onUpdateTextBlock?: PosterCanvasProps["onUpdateTextBlock"],
) {
  const blockId = `${sectionId}:block:${index}`;
  const selected = selectedId === blockId;

  if (block.type === "text") {
    const blockClaims = (block.claim_ids ?? []).map((claimId) => claims.get(claimId)).filter(Boolean) as PosterClaim[];

    return (
      <div
        className={`poster-text-block ${selected ? "selected-canvas-item" : ""}`}
        data-block-id={blockId}
        data-poster-kind="block"
        key={blockId}
        onClick={(event) => {
          if (mode === "edit") {
            event.stopPropagation();
            onSelectItem?.(blockId, "block");
          }
        }}
      >
        <p contentEditable={mode === "edit"} suppressContentEditableWarning onBlur={(event) => onUpdateTextBlock?.(blockId, event.currentTarget.innerText.trim())}>
          {block.text}
        </p>
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
    return <p key={blockId}>Missing visual: {block.visual_id}</p>;
  }

  return (
    <div
      className={selectedId === visual.id ? "selected-canvas-item" : ""}
      data-visual-id={visual.id}
      data-poster-kind="visual"
      key={visual.id}
      onClick={(event) => {
        if (mode === "edit") {
          event.stopPropagation();
          onSelectItem?.(visual.id, "visual");
        }
      }}
    >
      <VisualRenderer visual={visual} />
    </div>
  );
}

function handleSingleLineEditKeyDown(event: KeyboardEvent<HTMLElement>) {
  if (event.key === "Enter") {
    event.preventDefault();
    event.currentTarget.blur();
  }
}
