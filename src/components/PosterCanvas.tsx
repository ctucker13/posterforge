import { type CSSProperties, type ClipboardEvent, type PointerEvent as ReactPointerEvent, useCallback, useEffect, useRef, useState } from "react";
import { DndContext, DragOverlay, closestCenter, type CollisionDetection, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, rectSortingStrategy, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AlertTriangle, ArrowDown, ArrowUp, Eye, EyeOff, GripVertical, Image, Move, Pencil, RotateCcw, Trash2 } from "lucide-react";
import type { ContentRegion, GeneratedImageSlot, PosterBlock, PosterProject, QaIssue } from "../domain/poster";
import type { AssetSidecar } from "../layouts/buildLayoutSpec";
import { isFeaturedSection, resolveLayoutTemplate } from "../layouts";
import { parseBlockId } from "./posterUtils";
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
  onMoveBlock?: ((fromSectionId: string, fromIndex: number, toSectionId: string, toIndex: number) => void) | undefined;
  onUpdateSectionLayout?: ((sectionId: string, layout: { columnSpan?: 1 | 2 | 3 | 4; rowSpan?: 1 | 2 }) => void) | undefined;
  onRegenerateSection?: ((sectionId: string, instruction?: string) => void) | undefined;
  onMoveSection?: ((sectionId: string, direction: -1 | 1) => void) | undefined;
  onToggleHideSection?: ((sectionId: string) => void) | undefined;
  onDeleteSection?: ((sectionId: string) => void) | undefined;
  onGenerateImageSlot?: ((slotId: string) => void) | undefined;
  onUpdateImageSlotPosition?: ((slotId: string, objectPosition: string) => void) | undefined;
  onImageSlotSidecarLoaded?: ((slotId: string, patch: { seed?: number; contentRegions?: ContentRegion[] }) => void) | undefined;
  /** Move a freeform slot to an absolute position (poster-pixel coordinates). */
  onMoveSlot?: ((slotId: string, x: number, y: number) => void) | undefined;
  /** Resize a freeform slot to new bounds (poster-pixel coordinates). */
  onResizeSlot?: ((slotId: string, x: number, y: number, w: number, h: number) => void) | undefined;
  onDeselectItem?: (() => void) | undefined;
  /** Slot ids with an in-flight generation request; used to show progress UI. */
  generatingSlotIds?: Set<string> | undefined;
  /** CSS scale factor applied outside the poster (zoom level). Used to convert screen-pixel drag deltas to poster-pixel deltas. */
  canvasScale?: number | undefined;
}

const blockAwareCollision: CollisionDetection = (args) => {
  const activeId = String(args.active.id);
  if (activeId.includes(":block:")) {
    const blockContainers = args.droppableContainers.filter((d) => String(d.id).includes(":block:"));
    if (blockContainers.length > 0) return closestCenter({ ...args, droppableContainers: blockContainers });
  }
  return closestCenter(args);
};

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
  onMoveBlock,
  onUpdateSectionLayout,
  onRegenerateSection,
  onMoveSection,
  onToggleHideSection,
  onDeleteSection,
  onGenerateImageSlot,
  onUpdateImageSlotPosition,
  onImageSlotSidecarLoaded,
  onMoveSlot,
  onResizeSlot,
  onDeselectItem,
  generatingSlotIds,
  canvasScale = 1,
}: PosterCanvasProps) {
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const palette = resolvePalette(poster.theme, poster.palette);
  const layout = resolveLayoutTemplate(poster.layout);
  const backgroundAsset = poster.assets?.find((a) => a.role === "background" && a.url);
  const outputFrame = getA0PreviewFrame(poster.format.orientation);
  const visuals = new Map(poster.visuals.map((visual) => [visual.id, visual]));
  const imageSlots = new Map((poster.imageSlots ?? []).map((slot) => [slot.id, slot]));
  const freeformSlots = (poster.imageSlots ?? []).filter(
    (s): s is GeneratedImageSlot & { x: number; y: number; width_px: number; height_px: number } =>
      s.role !== "background" && s.x != null && s.y != null && s.width_px != null && s.height_px != null,
  );
  const bgStrategy = backgroundStrategyForTheme(poster.theme);
  const sections = getOrderedSections(poster);
  const canvasSections = mode === "edit" ? sections : sections.filter((section) => !section.layout?.hidden);
  const qaIssuesByLocation = groupQaIssuesByLocation(qaIssues);

  function handleDragStart(event: DragStartEvent) {
    const id = String(event.active.id);
    if (id.includes(":block:")) setActiveBlockId(id);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveBlockId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    if (activeId.includes(":block:")) {
      // Block drag — within-section or cross-section
      const fromParsed = parseBlockId(activeId);
      if (!fromParsed) return;
      const toParsed = parseBlockId(overId);
      if (toParsed) {
        onMoveBlock?.(fromParsed.sectionId, fromParsed.index, toParsed.sectionId, toParsed.index);
      } else {
        // Dropped onto a section container — append to end of that section
        const targetSection = sections.find((s) => s.id === overId);
        if (targetSection) onMoveBlock?.(fromParsed.sectionId, fromParsed.index, overId, targetSection.blocks.length);
      }
      return;
    }

    // Section drag
    const sectionIds = sections.map((section) => section.id);
    const oldIndex = sectionIds.indexOf(activeId);
    const newIndex = sectionIds.indexOf(overId);
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
        skinStyle={{
          ...toSkinStyle(skins.sectionCard),
          ...(section.layout?.textScale && section.layout.textScale !== "md" && {
            "--section-text-scale": section.layout.textScale === "sm" ? "0.82" : "1.2",
          }),
          ...(section.layout?.textAlign && { "--section-text-align": section.layout.textAlign }),
          ...(section.layout?.accentColor && { "--section-accent": section.layout.accentColor }),
        } as CSSProperties}
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
            <EditableText
              as="h3"
              value={section.title}
              editing={mode === "edit"}
              placeholder="Section title"
              onCommit={(next) => onUpdateSectionTitle?.(section.id, next)}
            />
            {mode === "edit" && onMoveBlock ? (
              <SortableContext
                items={section.blocks.map((_, i) => `${section.id}:block:${i}`)}
                strategy={verticalListSortingStrategy}
              >
                {section.blocks.map((block, index) => {
                  const blockId = `${section.id}:block:${index}`;
                  return (
                    <SortableBlockItem key={blockId} id={blockId} sectionId={section.id} index={index}>
                      {renderBlock(block, index, section.id, visuals, imageSlots, mode, skins, palette, selectedId, qaIssuesByLocation, onSelectItem, onUpdateTextBlock, onGenerateImageSlot, onUpdateImageSlotPosition, onImageSlotSidecarLoaded, generatingSlotIds)}
                    </SortableBlockItem>
                  );
                })}
              </SortableContext>
            ) : (
              section.blocks.map((block, index) =>
                renderBlock(block, index, section.id, visuals, imageSlots, mode, skins, palette, selectedId, qaIssuesByLocation, onSelectItem, onUpdateTextBlock, onGenerateImageSlot, onUpdateImageSlotPosition, onImageSlotSidecarLoaded, generatingSlotIds),
              )
            )}
            {mode === "edit" && isSelected && onUpdateSectionLayout ? (
              <SectionResizeHandles onCommit={(spans) => onUpdateSectionLayout(section.id, spans)} />
            ) : null}
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
        {freeformSlots.map((slot) => (
          <FreeformSlot
            key={slot.id}
            slot={slot}
            mode={mode}
            canvasScale={canvasScale}
            generatingSlotIds={generatingSlotIds}
            onGenerate={onGenerateImageSlot}
            onUpdatePosition={onUpdateImageSlotPosition}
            onSidecarLoaded={onImageSlotSidecarLoaded}
            onMove={onMoveSlot}
            onResize={onResizeSlot}
          />
        ))}
        <header className="poster-hero" data-poster-id="hero" data-poster-kind="hero">
          <div>
            <p className="poster-kicker">{layout.name} · {poster.audience}</p>
            <EditableText
              as="h2"
              value={poster.title}
              editing={mode === "edit"}
              placeholder="Poster title"
              onCommit={(next) => onUpdatePosterField?.("title", next)}
            />
            <EditableText
              as="p"
              value={poster.subtitle ?? ""}
              editing={mode === "edit"}
              placeholder="Add a subtitle"
              onCommit={(next) => onUpdatePosterField?.("subtitle", next)}
            />
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
          {mode === "edit" && (onSectionReorder || onMoveBlock) ? (
            <DndContext collisionDetection={blockAwareCollision} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
              <SortableContext items={canvasSections.map((section) => section.id)} strategy={rectSortingStrategy}>
                {canvasSections.map(renderSection)}
              </SortableContext>
              <DragOverlay>
                {activeBlockId ? <BlockDragGhost blockId={activeBlockId} poster={poster} /> : null}
              </DragOverlay>
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
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled: !sortable, data: { type: "section" } });
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

function SortableBlockItem({
  id,
  sectionId,
  index,
  children,
}: {
  id: string;
  sectionId: string;
  index: number;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    data: { type: "block", sectionId, index },
  });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} className="sortable-block-item">
      <button type="button" className="block-drag-handle" title="Drag to reorder block" aria-label="Drag block" {...attributes} {...listeners}>
        <GripVertical size={11} />
      </button>
      {children}
    </div>
  );
}

function BlockDragGhost({ blockId, poster }: { blockId: string; poster: PosterProject }) {
  const parsed = parseBlockId(blockId);
  if (!parsed) return null;
  const section = poster.sections.find((s) => s.id === parsed.sectionId);
  const block = section?.blocks[parsed.index];
  if (!block) return null;
  return (
    <div className="block-drag-ghost">
      {block.type === "text" ? (
        <p>{block.text.slice(0, 80)}{block.text.length > 80 ? "…" : ""}</p>
      ) : block.type === "visual_ref" ? (
        <p className="block-ghost-label">Visual: {block.visual_id}</p>
      ) : (
        <p className="block-ghost-label">Image slot</p>
      )}
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

function handlePlainTextPaste(e: ClipboardEvent) {
  e.preventDefault();
  const text = e.clipboardData.getData("text/plain");
  document.execCommand("insertText", false, text);
}

/**
 * Click-to-edit text on the poster canvas. Commits trimmed text on blur,
 * Enter commits single-line fields, Escape reverts and exits without
 * committing. Unchanged text never reaches onCommit, so focusing and
 * leaving a field cannot create an undo step.
 */
function EditableText({
  as: Tag,
  value,
  editing,
  multiline = false,
  placeholder,
  onCommit,
}: {
  as: "h2" | "h3" | "p";
  value: string;
  editing: boolean;
  multiline?: boolean;
  placeholder?: string;
  onCommit?: ((next: string) => void) | undefined;
}) {
  return (
    <Tag
      contentEditable={editing}
      suppressContentEditableWarning
      data-placeholder={editing ? placeholder : undefined}
      onKeyDown={(event) => {
        if (event.key === "Enter" && !multiline) {
          event.preventDefault();
          event.currentTarget.blur();
        } else if (event.key === "Escape") {
          event.preventDefault();
          event.currentTarget.innerText = value;
          event.currentTarget.blur();
        }
      }}
      onBlur={(event) => {
        const next = event.currentTarget.innerText.trim();
        if (next === value.trim()) {
          if (event.currentTarget.innerText !== value) event.currentTarget.innerText = value;
          return;
        }
        onCommit?.(next);
      }}
      onPaste={handlePlainTextPaste}
    >
      {value}
    </Tag>
  );
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
        <EditableText
          as="p"
          value={block.text}
          editing={mode === "edit"}
          multiline
          placeholder="Empty text block — click to write"
          onCommit={(next) => onUpdateTextBlock?.(blockId, next)}
        />
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

/**
 * Drag handles on the selected section's east/south edges and corner that
 * resize it by whole grid tracks, writing columnSpan/rowSpan on release.
 * The span is applied live to the card while dragging (real reflow preview);
 * pointer math uses the card's position captured at drag start so the
 * preview reflow cannot destabilise it. Escape cancels the gesture.
 */
function SectionResizeHandles({ onCommit }: { onCommit: (spans: { columnSpan: 1 | 2 | 3 | 4; rowSpan: 1 | 2 }) => void }) {
  const [preview, setPreview] = useState<{ cols: number; rows: number } | null>(null);

  function beginResize(event: ReactPointerEvent<HTMLDivElement>, axis: "x" | "y" | "xy") {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const card = event.currentTarget.closest<HTMLElement>(".poster-card");
    const grid = card?.closest<HTMLElement>(".poster-grid");
    if (!card || !grid) return;

    // A canvas gesture ends any in-progress text edit; this also keeps
    // Cmd/Ctrl+Z routed to poster history instead of the focused field.
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();

    // Computed track sizes are in layout px while client rects are scaled by
    // the canvas zoom transform — convert tracks into screen px to mix them.
    const gridStyle = getComputedStyle(grid);
    const colTracks = gridStyle.gridTemplateColumns.split(" ").map(Number.parseFloat);
    const rowTracks = gridStyle.gridTemplateRows.split(" ").map(Number.parseFloat);
    const cardRect = card.getBoundingClientRect();
    const scale = card.offsetWidth > 0 ? cardRect.width / card.offsetWidth : 1;
    const colWidth = (colTracks[0] ?? card.offsetWidth) * scale;
    const rowHeight = (rowTracks[0] ?? card.offsetHeight) * scale;
    const gapX = (Number.parseFloat(gridStyle.columnGap) || 0) * scale;
    const gapY = (Number.parseFloat(gridStyle.rowGap) || 0) * scale;
    const maxCols = Math.min(colTracks.length, 4) as 1 | 2 | 3 | 4;

    const spanFromSize = (size: number, track: number, gap: number, max: number) =>
      Math.min(Math.max(Math.round((size + gap) / (track + gap)), 1), max);

    const startCols = spanFromSize(cardRect.width, colWidth, gapX, maxCols);
    const startRows = spanFromSize(cardRect.height, rowHeight, gapY, 2);
    const current = { cols: startCols, rows: startRows };
    setPreview(current);

    const applyPreview = () => {
      card.style.gridColumn = `span ${current.cols}`;
      card.style.gridRow = `span ${current.rows}`;
      setPreview({ ...current });
    };

    const handleMove = (moveEvent: PointerEvent) => {
      if (axis !== "y") current.cols = spanFromSize(moveEvent.clientX - cardRect.left, colWidth, gapX, maxCols);
      if (axis !== "x") current.rows = spanFromSize(moveEvent.clientY - cardRect.top, rowHeight, gapY, 2);
      applyPreview();
    };

    const finish = (commit: boolean) => {
      document.removeEventListener("pointermove", handleMove);
      document.removeEventListener("pointerup", handleUp);
      document.removeEventListener("keydown", handleKey, true);
      card.style.gridColumn = "";
      card.style.gridRow = "";
      setPreview(null);
      if (commit && (current.cols !== startCols || current.rows !== startRows)) {
        onCommit({ columnSpan: current.cols as 1 | 2 | 3 | 4, rowSpan: current.rows as 1 | 2 });
      }
    };

    const handleUp = () => finish(true);
    const handleKey = (keyEvent: KeyboardEvent) => {
      if (keyEvent.key === "Escape") {
        keyEvent.stopPropagation();
        finish(false);
      }
    };

    document.addEventListener("pointermove", handleMove);
    document.addEventListener("pointerup", handleUp);
    document.addEventListener("keydown", handleKey, true);
  }

  return (
    <>
      <div className="section-resize-handle handle-e" title="Resize columns" onPointerDown={(event) => beginResize(event, "x")} />
      <div className="section-resize-handle handle-s" title="Resize rows" onPointerDown={(event) => beginResize(event, "y")} />
      <div className="section-resize-handle handle-se" title="Resize" onPointerDown={(event) => beginResize(event, "xy")} />
      {preview ? <div className="section-resize-badge">{`${preview.cols} col${preview.cols > 1 ? "s" : ""} × ${preview.rows} row${preview.rows > 1 ? "s" : ""}`}</div> : null}
    </>
  );
}

type FreeformSlotData = GeneratedImageSlot & { x: number; y: number; width_px: number; height_px: number };

function FreeformSlot({
  slot,
  mode,
  canvasScale,
  generatingSlotIds,
  onGenerate,
  onUpdatePosition,
  onSidecarLoaded,
  onMove,
  onResize,
}: {
  slot: FreeformSlotData;
  mode: PosterCanvasProps["mode"];
  canvasScale: number;
  generatingSlotIds: Set<string> | undefined;
  onGenerate: PosterCanvasProps["onGenerateImageSlot"];
  onUpdatePosition: PosterCanvasProps["onUpdateImageSlotPosition"];
  onSidecarLoaded: PosterCanvasProps["onImageSlotSidecarLoaded"];
  onMove: ((slotId: string, x: number, y: number) => void) | undefined;
  onResize: ((slotId: string, x: number, y: number, w: number, h: number) => void) | undefined;
}) {
  const [livePos, setLivePos] = useState<{ x: number; y: number } | null>(null);
  const [liveSize, setLiveSize] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [active, setActive] = useState(false);
  const moveStartRef = useRef<{ px: number; py: number; sx: number; sy: number } | null>(null);

  const cx = livePos?.x ?? liveSize?.x ?? slot.x;
  const cy = livePos?.y ?? liveSize?.y ?? slot.y;
  const cw = liveSize?.w ?? slot.width_px;
  const ch = liveSize?.h ?? slot.height_px;
  const isEdit = mode === "edit";
  const generating = generatingSlotIds?.has(slot.id) ?? false;

  const handleMoveDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    moveStartRef.current = { px: e.clientX, py: e.clientY, sx: slot.x, sy: slot.y };
    setActive(true);
  };
  const handleMoveMove = (e: React.PointerEvent) => {
    if (!moveStartRef.current) return;
    setLivePos({
      x: moveStartRef.current.sx + (e.clientX - moveStartRef.current.px) / canvasScale,
      y: moveStartRef.current.sy + (e.clientY - moveStartRef.current.py) / canvasScale,
    });
  };
  const handleMoveUp = (e: React.PointerEvent) => {
    if (!moveStartRef.current) return;
    const nx = moveStartRef.current.sx + (e.clientX - moveStartRef.current.px) / canvasScale;
    const ny = moveStartRef.current.sy + (e.clientY - moveStartRef.current.py) / canvasScale;
    onMove?.(slot.id, Math.round(nx), Math.round(ny));
    moveStartRef.current = null;
    setLivePos(null);
    setActive(false);
  };

  const handleResize = useCallback(
    (corner: string, dx: number, dy: number, done: boolean) => {
      const MIN = 80;
      let nx = slot.x, ny = slot.y, nw = slot.width_px, nh = slot.height_px;
      const pdx = dx / canvasScale;
      const pdy = dy / canvasScale;
      if (corner.includes("e")) nw = Math.max(MIN, nw + pdx);
      if (corner.includes("s")) nh = Math.max(MIN, nh + pdy);
      if (corner.includes("w")) { const newW = Math.max(MIN, nw - pdx); nx = nx + nw - newW; nw = newW; }
      if (corner.includes("n")) { const newH = Math.max(MIN, nh - pdy); ny = ny + nh - newH; nh = newH; }
      nx = Math.round(nx); ny = Math.round(ny); nw = Math.round(nw); nh = Math.round(nh);
      if (done) { setLiveSize(null); setActive(false); onResize?.(slot.id, nx, ny, nw, nh); }
      else { setLiveSize({ x: nx, y: ny, w: nw, h: nh }); setActive(true); }
    },
    [slot, canvasScale, onResize],
  );

  return (
    <div
      className={`freeform-slot${isEdit ? " freeform-slot-edit" : ""}${active ? " freeform-slot-active" : ""}`}
      style={{ position: "absolute", left: cx, top: cy, width: cw, height: ch }}
    >
      <GeneratedImageBlock
        blockId={slot.id}
        slot={slot}
        slotId={slot.id}
        objectPosition={slot.objectPosition}
        mode={mode}
        generating={generating}
        onGenerate={onGenerate}
        onUpdatePosition={onUpdatePosition}
        onSidecarLoaded={onSidecarLoaded}
      />
      {isEdit && (
        <div
          className="freeform-move-handle"
          title="Drag to move"
          onPointerDown={handleMoveDown}
          onPointerMove={handleMoveMove}
          onPointerUp={handleMoveUp}
        >
          <Move size={14} />
        </div>
      )}
      {isEdit && (["nw", "n", "ne", "w", "e", "sw", "s", "se"] as const).map((corner) => (
        <FreeformResizeHandle key={corner} corner={corner} onResize={handleResize} />
      ))}
    </div>
  );
}

function FreeformResizeHandle({
  corner,
  onResize,
}: {
  corner: string;
  onResize: (corner: string, dx: number, dy: number, done: boolean) => void;
}) {
  const startRef = useRef<{ px: number; py: number } | null>(null);
  return (
    <div
      className={`freeform-resize-handle freeform-handle-${corner}`}
      onPointerDown={(e) => {
        e.stopPropagation();
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        startRef.current = { px: e.clientX, py: e.clientY };
      }}
      onPointerMove={(e) => {
        if (!startRef.current) return;
        onResize(corner, e.clientX - startRef.current.px, e.clientY - startRef.current.py, false);
      }}
      onPointerUp={(e) => {
        if (!startRef.current) return;
        onResize(corner, e.clientX - startRef.current.px, e.clientY - startRef.current.py, true);
        startRef.current = null;
      }}
    />
  );
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
