import { type CSSProperties, type KeyboardEvent, type ClipboardEvent, useEffect, useState } from "react";
import { DndContext, closestCenter, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, rectSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AlertTriangle, ArrowDown, ArrowUp, Eye, EyeOff, GripVertical, Image, Pencil, RotateCcw, Trash2 } from "lucide-react";
import type { ContentRegion, GeneratedImageSlot, PosterBlock, PosterProject, QaIssue } from "../domain/poster";
import type { AssetSidecar } from "../layouts/buildLayoutSpec";
import { isFeaturedSection, resolveLayoutTemplate } from "../layouts";
import { resolvePalette, resolveComponentSkins, type ComponentSkins, type SkinTokens } from "../themes";
import { VisualRenderer } from "../renderers/VisualRenderer";
import { backgroundStrategyForTheme } from "../layouts/buildLayoutSpec";
import { ThemeMotifLayer } from "./ThemeMotifLayer";

export type PosterCanvasItemKind = "section" | "block" | "visual";

export interface PosterCanvasProps {
  poster: PosterProject;
  mode?: "preview" | "edit" | "export" | undefined;
  selectedId?: string | undefined;
  qaIssues?: QaIssue[] | undefined;
  onSelectItem?: ((id: string, kind: PosterCanvasItemKind) => void) | undefined;
  onUpdatePosterField?: ((field: "title" | "subtitle", value: string) => void) | undefined;
  onUpdateSectionTitle?: ((sectionId: string, title: string) => void) | undefined;
  onUpdateTextBlock?: ((blockId: string, text: string) => void) | undefined;
  onSectionReorder?: ((orderedIds: string[]) => void) | undefined;
  onRegenerateSection?: ((sectionId: string, instruction?: string) => void) | undefined;
  onMoveSection?: ((sectionId: string, direction: -1 | 1) => void) | undefined;
  onToggleHideSection?: ((sectionId: string) => void) | undefined;
  onDeleteSection?: ((sectionId: string) => void) | undefined;
  onGenerateImageSlot?: ((slotId: string) => void) | undefined;
  onUpdateImageSlotPosition?: ((slotId: string, objectPosition: string) => void) | undefined;
  onImageSlotSidecarLoaded?: ((slotId: string, patch: { seed?: number; contentRegions?: ContentRegion[] }) => void) | undefined;
  onDeselectItem?: (() => void) | undefined;
  /** Slot ids with an in-flight generation request; used to show progress UI. */
  generatingSlotIds?: Set<string> | undefined;
}

export function PosterCanvas({
  poster,
  mode = "preview",
  selectedId,
  qaIssues = [],
  onSelectItem,
  onUpdatePosterField,
  onUpdateSectionTitle,
  onUpdateTextBlock,
  onSectionReorder,
  onRegenerateSection,
  onMoveSection,
  onToggleHideSection,
  onDeleteSection,
  onGenerateImageSlot,
  onUpdateImageSlotPosition,
  onImageSlotSidecarLoaded,
  onDeselectItem,
  generatingSlotIds,
}: PosterCanvasProps) {
  const palette = resolvePalette(poster.theme, poster.palette);
  const layout = resolveLayoutTemplate(poster.layout);
  const backgroundAsset = poster.assets?.find((a) => a.role === "background" && a.url);
  const outputFrame = getA0PreviewFrame(poster.format.orientation);
  const visuals = new Map(poster.visuals.map((visual) => [visual.id, visual]));
  const imageSlots = new Map((poster.imageSlots ?? []).map((slot) => [slot.id, slot]));
  const bgStrategy = backgroundStrategyForTheme(poster.theme);
  const sections = getOrderedSections(poster);
  const canvasSections = mode === "edit" ? sections : sections.filter((section) => !section.layout?.hidden);
  const qaIssuesByLocation = groupQaIssuesByLocation(qaIssues);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const sectionIds = sections.map((section) => section.id);
    const oldIndex = sectionIds.indexOf(String(active.id));
    const newIndex = sectionIds.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    onSectionReorder?.(arrayMove(sectionIds, oldIndex, newIndex));
  }

  const skins = resolveComponentSkins(poster.theme);

  function toSkinStyle(tokens: SkinTokens | undefined): CSSProperties {
    return (tokens ?? {}) as CSSProperties;
  }

  function renderSection(section: (typeof sections)[number]) {
    const isSelected = selectedId === section.id;
    const className = [
      "poster-card",
      `section-${section.type}`,
      `section-${section.id}`,
      section.layout?.hidden ? "hidden-section-placeholder" : "",
      isFeaturedSection(layout, section) || section.layout?.emphasis === "featured" || section.layout?.emphasis === "hero" ? "featured-section" : "",
      section.layout?.columnSpan ? `span-${section.layout.columnSpan}` : "",
      section.layout?.rowSpan ? `row-span-${section.layout.rowSpan}` : "",
      isSelected ? "selected-canvas-item" : "",
    ]
      .filter(Boolean)
      .join(" ");

    const firstTextBlockIndex = section.blocks.findIndex((block) => block.type === "text");

    return (
      <SortableSectionShell
        className={className}
        id={section.id}
        key={section.id}
        sortable={mode === "edit" && Boolean(onSectionReorder)}
        skinStyle={toSkinStyle(skins.sectionCard)}
        onClick={(event) => {
          if (mode === "edit") {
            event.stopPropagation();
            onSelectItem?.(section.id, "section");
          }
        }}
      >
        {(dragHandleProps) => (
          <>
            <QaBadge issues={qaIssuesByLocation.get(`sections.${section.id}`) ?? []} onClick={() => onSelectItem?.(section.id, "section")} />
            {section.layout?.hidden ? (
              <>
                <div className="section-inline-toolbar visible" role="toolbar" aria-label="Hidden section actions">
                  <button type="button" onClick={(event) => { event.stopPropagation(); onToggleHideSection?.(section.id); }}>
                    <Eye size={12} /> Show
                  </button>
                  <button type="button" onClick={(event) => { event.stopPropagation(); onDeleteSection?.(section.id); }}>
                    <Trash2 size={12} />
                  </button>
                </div>
                <h3>{section.title}</h3>
                <p className="hidden-section-note">Hidden from preview and exports.</p>
              </>
            ) : (
              <>
            {mode === "edit" ? (
              <div className="section-actions">
                {dragHandleProps ? (
                  <button className="section-action-btn" type="button" title="Reorder section" {...dragHandleProps}>
                    <GripVertical size={13} />
                  </button>
                ) : null}
                <button
                  className="section-action-btn"
                  type="button"
                  title="Open section regeneration instructions"
                  onClick={(event) => {
                    event.stopPropagation();
                    onRegenerateSection?.(section.id);
                  }}
                >
                  <RotateCcw size={13} />
                </button>
              </div>
            ) : null}
            {isSelected && mode === "edit" ? (
              <div className="section-inline-toolbar" role="toolbar" aria-label="Section actions">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    if (firstTextBlockIndex >= 0) onSelectItem?.(`${section.id}:block:${firstTextBlockIndex}`, "block");
                  }}
                >
                  <Pencil size={12} /> Edit
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onRegenerateSection?.(section.id);
                  }}
                >
                  <RotateCcw size={12} /> Regen
                </button>
                <button type="button" onClick={(event) => { event.stopPropagation(); onMoveSection?.(section.id, -1); }}>
                  <ArrowUp size={12} />
                </button>
                <button type="button" onClick={(event) => { event.stopPropagation(); onMoveSection?.(section.id, 1); }}>
                  <ArrowDown size={12} />
                </button>
                <button type="button" onClick={(event) => { event.stopPropagation(); onToggleHideSection?.(section.id); }}>
                  {section.layout?.hidden ? <Eye size={12} /> : <EyeOff size={12} />}
                </button>
                <button type="button" onClick={(event) => { event.stopPropagation(); onDeleteSection?.(section.id); }}>
                  <Trash2 size={12} />
                </button>
              </div>
            ) : null}
            <h3
              contentEditable={mode === "edit"}
              suppressContentEditableWarning
              onBlur={(event) => onUpdateSectionTitle?.(section.id, event.currentTarget.innerText.trim())}
              onKeyDown={handleSingleLineEditKeyDown}
              onPaste={handlePlainTextPaste}
            >
              {section.title}
            </h3>
            {section.blocks.map((block, index) =>
              renderBlock(block, index, section.id, visuals, imageSlots, mode, skins, palette, selectedId, qaIssuesByLocation, onSelectItem, onUpdateTextBlock, onGenerateImageSlot, onUpdateImageSlotPosition, onImageSlotSidecarLoaded, generatingSlotIds),
            )}
              </>
            )}
          </>
        )}
      </SortableSectionShell>
    );
  }

  return (
    <div
      className={`a0-preview-canvas poster-canvas-mode-${mode}`}
      data-poster-id={poster.id}
      data-poster-kind="canvas"
      data-orientation={outputFrame.orientation}
      onClick={() => onDeselectItem?.()}
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
            position: "relative",
            "--theme-primary": palette.colors.primary,
            "--theme-accent": palette.colors.accent,
            "--theme-bg": palette.colors.background,
            "--theme-panel": palette.colors.panel,
            "--theme-ink": palette.colors.ink,
          } as CSSProperties
        }
      >
        {(bgStrategy === "svg" || bgStrategy === "svg-hybrid") && (
          <ThemeMotifLayer themeId={poster.theme} mode="full-background" />
        )}
        {bgStrategy === "raster" && (() => {
          const bgSlot = [...imageSlots.values()].find((s) => s.role === "background");
          if (!bgSlot) return null;
          const assetId = bgSlot.assetId;
          const fmt = bgSlot.outputFormat ?? "webp";
          const effectiveUrl = assetId ? `/generated-assets/${assetId}.${fmt}` : bgSlot.url;
          const generating = generatingSlotIds?.has(bgSlot.id) ?? false;
          return (
            <>
              {effectiveUrl ? (
                <img
                  src={effectiveUrl}
                  alt=""
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%",
                           objectFit: "cover", zIndex: 0, pointerEvents: "none" }}
                />
              ) : null}
              {mode === "edit" && (!effectiveUrl || generating) ? (
                <div className="raster-bg-placeholder">
                  {generating ? (
                    <span className="raster-bg-hint">Generating background…</span>
                  ) : (
                    <button
                      type="button"
                      className="raster-bg-generate-btn"
                      onClick={(event) => {
                        event.stopPropagation();
                        onGenerateImageSlot?.(bgSlot.id);
                      }}
                    >
                      Generate background
                    </button>
                  )}
                </div>
              ) : null}
            </>
          );
        })()}
        <header className="poster-hero" data-poster-id="hero" data-poster-kind="hero">
          <div>
            <p className="poster-kicker">{layout.name} · {poster.audience}</p>
            <h2
              contentEditable={mode === "edit"}
              suppressContentEditableWarning
              onBlur={(event) => onUpdatePosterField?.("title", event.currentTarget.innerText.trim())}
              onKeyDown={handleSingleLineEditKeyDown}
              onPaste={handlePlainTextPaste}
            >
              {poster.title}
            </h2>
            <p
              contentEditable={mode === "edit"}
              suppressContentEditableWarning
              onBlur={(event) => onUpdatePosterField?.("subtitle", event.currentTarget.innerText.trim())}
              onKeyDown={handleSingleLineEditKeyDown}
              onPaste={handlePlainTextPaste}
            >
              {poster.subtitle}
            </p>
          </div>
          <div
            className={`hero-asset${poster.logo ? " hero-asset-logo" : backgroundAsset ? " hero-asset-image" : ""}`}
            aria-label={poster.logo ? "Organisation logo" : backgroundAsset ? "Poster background asset" : "Generated image asset placeholder"}
          >
            {poster.logo ? (
              <img className="hero-logo" src={poster.logo} alt="Organisation logo" />
            ) : backgroundAsset?.url ? (
              <img className="hero-bg-image" src={backgroundAsset.url} alt={backgroundAsset.title ?? "Poster background"} />
            ) : (
              <>
                <Image size={42} />
                <span>GPT Image asset slot</span>
              </>
            )}
          </div>
        </header>

        <div className="poster-grid">
          {mode === "edit" && onSectionReorder ? (
            <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={canvasSections.map((section) => section.id)} strategy={rectSortingStrategy}>
                {canvasSections.map(renderSection)}
              </SortableContext>
            </DndContext>
          ) : (
            canvasSections.map(renderSection)
          )}
        </div>
      </article>
    </div>
  );
}

function SortableSectionShell({
  id,
  className,
  sortable,
  skinStyle,
  onClick,
  children,
}: {
  id: string;
  className: string;
  sortable: boolean;
  skinStyle?: CSSProperties;
  onClick: (event: React.MouseEvent<HTMLElement>) => void;
  children: (dragHandleProps: Record<string, unknown> | undefined) => React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled: !sortable });
  const style: CSSProperties = {
    ...skinStyle,
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : undefined,
  };

  return (
    <section ref={setNodeRef} className={className} data-poster-id={id} data-poster-kind="section" style={style} onClick={onClick}>
      {children(sortable ? { ...attributes, ...listeners } : undefined)}
    </section>
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

function handlePlainTextPaste(e: ClipboardEvent) {
  e.preventDefault();
  const text = e.clipboardData.getData("text/plain");
  document.execCommand("insertText", false, text);
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
  imageSlots: Map<string, GeneratedImageSlot>,
  mode: PosterCanvasProps["mode"],
  skins?: ComponentSkins,
  palette?: ReturnType<typeof resolvePalette>,
  selectedId?: string,
  qaIssuesByLocation?: Map<string, QaIssue[]>,
  onSelectItem?: PosterCanvasProps["onSelectItem"],
  onUpdateTextBlock?: PosterCanvasProps["onUpdateTextBlock"],
  onGenerateImageSlot?: PosterCanvasProps["onGenerateImageSlot"],
  onUpdateImageSlotPosition?: PosterCanvasProps["onUpdateImageSlotPosition"],
  onImageSlotSidecarLoaded?: PosterCanvasProps["onImageSlotSidecarLoaded"],
  generatingSlotIds?: Set<string> | undefined,
) {
  const blockId = `${sectionId}:block:${index}`;
  const selected = selectedId === blockId;

  if (block.type === "text") {
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
        <p contentEditable={mode === "edit"} suppressContentEditableWarning onBlur={(event) => onUpdateTextBlock?.(blockId, event.currentTarget.innerText.trim())} onPaste={handlePlainTextPaste}>
          {block.text}
        </p>
      </div>
    );
  }

  if (block.type === "generated_image") {
    const slot = imageSlots.get(block.slot_id);
    return (
      <GeneratedImageBlock
        key={blockId}
        blockId={blockId}
        slot={slot}
        slotId={block.slot_id}
        objectPosition={slot?.objectPosition ?? block.objectPosition}
        mode={mode}
        generating={generatingSlotIds?.has(block.slot_id) ?? false}
        onGenerate={onGenerateImageSlot}
        onUpdatePosition={onUpdateImageSlotPosition}
        onSidecarLoaded={onImageSlotSidecarLoaded}
      />
    );
  }

  const visual = visuals.get(block.visual_id);
  if (!visual) {
    return <p key={blockId}>Missing visual: {block.visual_id}</p>;
  }

  return (
    <div
      className={`poster-visual-item ${selectedId === visual.id ? "selected-canvas-item" : ""}`}
      data-visual-id={visual.id}
      data-visual-type={visual.type}
      data-poster-kind="visual"
      key={visual.id}
      onClick={(event) => {
        if (mode === "edit") {
          event.stopPropagation();
          onSelectItem?.(visual.id, "visual");
        }
      }}
    >
      <QaBadge issues={qaIssuesByLocation?.get(`visuals.${visual.id}`) ?? []} onClick={() => onSelectItem?.(visual.id, "visual")} />
      <VisualRenderer visual={visual} palette={palette} skins={skins} />
    </div>
  );
}

function groupQaIssuesByLocation(qaIssues: QaIssue[]) {
  const grouped = new Map<string, QaIssue[]>();
  for (const issue of qaIssues) {
    const key = issue.location.split(".").slice(0, 2).join(".");
    if (!key.startsWith("sections.") && !key.startsWith("visuals.")) continue;
    grouped.set(key, [...(grouped.get(key) ?? []), issue]);
  }
  return grouped;
}

function QaBadge({ issues, onClick }: { issues: QaIssue[]; onClick: () => void }) {
  if (issues.length === 0) {
    return null;
  }

  const severity = issues.some((issue) => issue.severity === "high") ? "high" : issues.some((issue) => issue.severity === "medium") ? "medium" : "low";
  return (
    <button
      className={`qa-canvas-badge ${severity}`}
      type="button"
      title={issues.map((issue) => issue.message).join("\n")}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
    >
      <AlertTriangle size={13} />
      {issues.length}
    </button>
  );
}

function handleSingleLineEditKeyDown(event: KeyboardEvent<HTMLElement>) {
  if (event.key === "Enter") {
    event.preventDefault();
    event.currentTarget.blur();
  }
}

function GeneratedImageBlock({
  blockId,
  slot,
  slotId,
  objectPosition,
  mode,
  generating = false,
  onGenerate,
  onUpdatePosition,
  onSidecarLoaded,
}: {
  blockId: string;
  slot: GeneratedImageSlot | undefined;
  slotId: string;
  objectPosition?: string | undefined;
  mode: PosterCanvasProps["mode"];
  generating?: boolean | undefined;
  onGenerate?: ((slotId: string) => void) | undefined;
  onUpdatePosition?: ((slotId: string, objectPosition: string) => void) | undefined;
  onSidecarLoaded?: PosterCanvasProps["onImageSlotSidecarLoaded"];
}) {
  const roleLabel =
    slot?.role === "background" ? "Background"
    : slot?.role === "hero_illustration" ? "Hero art"
    : "Section art";

  // Gap 3: derive effective URL — assetId takes precedence over direct url field
  const assetId = slot?.assetId;
  const fmt = slot?.outputFormat ?? "webp";
  const effectiveUrl = assetId ? `/generated-assets/${assetId}.${fmt}` : slot?.url;

  // Gap 3: fetch sidecar when assetId is present and seed/contentRegions haven't been loaded yet
  const needsSidecar = Boolean(assetId && slot?.seed === undefined);
  useEffect(() => {
    if (!assetId || !needsSidecar) return;
    let cancelled = false;
    fetch(`/generated-assets/${assetId}.json`)
      .then((r) => r.json())
      .then((sidecar: AssetSidecar) => {
        if (cancelled) return;
        const patch: { seed?: number; contentRegions?: ContentRegion[] } = {};
        if (sidecar.seed !== undefined) patch.seed = sidecar.seed;
        if (sidecar.contentRegions?.length) patch.contentRegions = sidecar.contentRegions as ContentRegion[];
        if (Object.keys(patch).length > 0) onSidecarLoaded?.(slotId, patch);
      })
      .catch(() => { /* sidecar not yet written — normal before first generation */ });
    return () => { cancelled = true; };
  }, [assetId, needsSidecar, slotId, onSidecarLoaded]);

  // Gap 1: content regions from slot (populated from sidecar or defaults)
  const contentRegions = slot?.contentRegions ?? [];

  if (effectiveUrl) {
    let dragStart: { x: number; y: number; ox: number; oy: number } | null = null;

    const parsePos = (pos: string | undefined): { ox: number; oy: number } => {
      const parts = (pos ?? "50% 50%").split(" ");
      return { ox: parseFloat(parts[0] ?? "50"), oy: parseFloat(parts[1] ?? "50") };
    };

    const handlePointerDown = (e: React.PointerEvent<HTMLImageElement>) => {
      if (mode !== "edit") return;
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      const { ox, oy } = parsePos(objectPosition);
      dragStart = { x: e.clientX, y: e.clientY, ox, oy };
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLImageElement>) => {
      if (!dragStart) return;
      const rect = e.currentTarget.parentElement?.getBoundingClientRect();
      if (!rect) return;
      const dx = ((e.clientX - dragStart.x) / rect.width) * 100;
      const dy = ((e.clientY - dragStart.y) / rect.height) * 100;
      const newOx = Math.max(0, Math.min(100, dragStart.ox - dx));
      const newOy = Math.max(0, Math.min(100, dragStart.oy - dy));
      e.currentTarget.style.objectPosition = `${newOx.toFixed(1)}% ${newOy.toFixed(1)}%`;
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLImageElement>) => {
      if (!dragStart) return;
      const rect = e.currentTarget.parentElement?.getBoundingClientRect();
      if (rect) {
        const dx = ((e.clientX - dragStart.x) / rect.width) * 100;
        const dy = ((e.clientY - dragStart.y) / rect.height) * 100;
        const { ox, oy } = dragStart;
        const newOx = Math.max(0, Math.min(100, ox - dx));
        const newOy = Math.max(0, Math.min(100, oy - dy));
        onUpdatePosition?.(slotId, `${newOx.toFixed(1)}% ${newOy.toFixed(1)}%`);
      }
      dragStart = null;
    };

    return (
      <div className="generated-image-block generated-image-loaded" data-block-id={blockId}>
        <img
          src={effectiveUrl}
          alt={roleLabel}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: objectPosition ?? "50% 50%",
            display: "block",
            cursor: mode === "edit" ? "grab" : "default",
          }}
          draggable={false}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        />
        {/* Gap 1: content region overlays */}
        {contentRegions.map((region) => (
          <div
            key={region.id}
            className={`image-content-region image-content-region-${region.type}`}
            style={{ position: "absolute", left: region.x, top: region.y, width: region.width, height: region.height }}
            data-region-type={region.type}
            aria-hidden="true"
          />
        ))}
        {/* Regenerate controls — available in edit mode for any generated image */}
        {mode === "edit" ? (
          <div className="image-slot-actions">
            <button type="button" className="image-slot-btn" disabled={generating} onClick={() => onGenerate?.(slotId)}>
              <RotateCcw size={11} /> {generating ? "Generating…" : "Regen"}
            </button>
            <button type="button" className="image-slot-btn" disabled={generating} onClick={() => onGenerate?.(`${slotId}:exact`)}>
              <RotateCcw size={11} /> Exact
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="generated-image-block generated-image-placeholder" data-block-id={blockId}>
      <Image size={28} />
      <span>{roleLabel}</span>
      {mode === "edit" ? (
        <button type="button" className="image-slot-generate-btn" disabled={generating} onClick={() => onGenerate?.(slotId)}>
          {generating ? "Generating…" : "Generate image"}
        </button>
      ) : null}
    </div>
  );
}
