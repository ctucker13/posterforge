import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Eye, Maximize2, Minus, Monitor, Pencil, Plus } from "lucide-react";
import { Wand2 } from "lucide-react";
import type { PosterProject, QaIssue } from "../domain/poster";
import { reviseTextBlock } from "../domain/generator";
import { getA0PreviewFrame, PosterCanvas, type PosterCanvasItemKind } from "./PosterCanvas";
import { BlockRevisionDiff } from "./BlockRevisionDiff";
import { PosterMinimap } from "./PosterMinimap";
import { parseBlockId } from "./posterUtils";
import { SectionNavigator } from "./SectionNavigator";
import { resolvePalette } from "../themes";

interface EditablePosterCanvasProps {
  poster: PosterProject;
  onPosterChange: (poster: PosterProject) => void;
  onSelectItem: (id: string, kind: PosterCanvasItemKind) => void;
  selectedId?: string | undefined;
  selectedKind?: PosterCanvasItemKind | undefined;
  qaIssues?: QaIssue[];
  onSectionReorder?: (orderedIds: string[]) => void;
  onRegenerateSection?: (sectionId: string, instruction?: string) => void;
  onMoveSection?: (sectionId: string, direction: -1 | 1) => void;
  onToggleHideSection?: (sectionId: string) => void;
  onDeleteSection?: (sectionId: string) => void;
}

type CanvasEditMode = "editing" | "preview";
const MIN_ZOOM = 0.08;
const MAX_ZOOM = 2;
const ZOOM_STEP = 0.05;
const VIRTUAL_ASPECT = 1920 / 1080;

export function EditablePosterCanvas({
  poster,
  selectedId,
  selectedKind,
  qaIssues = [],
  onPosterChange,
  onSelectItem,
  onSectionReorder,
  onRegenerateSection,
  onMoveSection,
  onToggleHideSection,
  onDeleteSection,
}: EditablePosterCanvasProps) {
  const [canvasEditMode, setCanvasEditMode] = useState<CanvasEditMode>("editing");
  const [fitZoom, setFitZoom] = useState(0.16);
  const [zoom, setZoom] = useState(0.16);
  const [viewportWidth, setViewportWidth] = useState(960);
  const [virtualMode, setVirtualMode] = useState(false);
  const [showLayoutCheck, setShowLayoutCheck] = useState(false);
  const [layoutWarnings, setLayoutWarnings] = useState<string[]>([]);
  const [commandBarValue, setCommandBarValue] = useState("");
  const [revisionDiff, setRevisionDiff] = useState<{ original: string; revised: string; blockId: string } | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const commandInputRef = useRef<HTMLInputElement>(null);
  const outputFrame = useMemo(() => getA0PreviewFrame(poster.format.orientation), [poster.format.orientation]);
  const palette = resolvePalette(poster.theme, poster.palette);
  const virtualFrameWidth = Math.max(320, Math.floor(viewportWidth - 36));
  const virtualFrameHeight = Math.floor(virtualFrameWidth / VIRTUAL_ASPECT);
  const virtualZoom = Number((virtualFrameHeight / outputFrame.height).toFixed(4));
  const zoomLabel = `${Math.round(zoom * 100)}%`;

  const updateFitZoom = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return 0.16;

    const rect = viewport.getBoundingClientRect();
    setViewportWidth(rect.width);
    const availableWidth = Math.max(1, rect.width - 36);
    const availableHeight = Math.max(1, rect.height - 36);
    const nextZoom = Math.max(0.1, Math.min(0.5, availableWidth / outputFrame.width, availableHeight / outputFrame.height));
    const roundedZoom = Number(nextZoom.toFixed(3));
    setFitZoom(roundedZoom);
    return roundedZoom;
  }, [outputFrame.height, outputFrame.width]);

  function setBoundedZoom(nextZoom: number | ((current: number) => number)) {
    setZoom((current) => {
      const rawZoom = typeof nextZoom === "function" ? nextZoom(current) : nextZoom;
      return Number(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, rawZoom)).toFixed(3));
    });
  }

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }

    const nextFitZoom = updateFitZoom();
    setZoom((current) => (current === 0.16 ? nextFitZoom : current));
    const observer = new ResizeObserver(updateFitZoom);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [updateFitZoom]);

  useEffect(() => {
    if (!showLayoutCheck) {
      setLayoutWarnings([]);
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      setLayoutWarnings(collectEditorLayoutWarnings(stageRef.current));
    });

    return () => window.cancelAnimationFrame(frame);
  }, [poster, showLayoutCheck, zoom]);

  useEffect(() => {
    if (!selectedId) {
      setBoundedZoom(updateFitZoom());
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      focusEditableTarget(stageRef.current, viewportRef.current, selectedId);
      if (selectedKind === "section") {
        sectionZoomFocus(stageRef.current, viewportRef.current, selectedId, zoom, setBoundedZoom);
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [poster, selectedId, selectedKind, updateFitZoom, zoom]);

  useEffect(() => {
    function handleKeyboard(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey)) return;

      if (event.key === "0") {
        event.preventDefault();
        setBoundedZoom(fitZoom);
      } else if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        setBoundedZoom((current) => current + ZOOM_STEP);
      } else if (event.key === "-") {
        event.preventDefault();
        setBoundedZoom((current) => current - ZOOM_STEP);
      } else if (event.key.toLowerCase() === "k" && selectedKind === "block") {
        event.preventDefault();
        commandInputRef.current?.focus();
      }
    }

    document.addEventListener("keydown", handleKeyboard);
    return () => document.removeEventListener("keydown", handleKeyboard);
  }, [fitZoom, selectedKind]);

  function updatePosterField(field: "title" | "subtitle", value: string) {
    if (poster[field] === value) {
      return;
    }

    onPosterChange({ ...poster, [field]: value });
  }

  function updateSectionTitle(sectionId: string, title: string) {
    onPosterChange({
      ...poster,
      sections: poster.sections.map((section) => (section.id === sectionId ? { ...section, title } : section)),
    });
  }

  function updateTextBlock(blockId: string, text: string) {
    const parsed = parseBlockId(blockId);
    if (!parsed) {
      return;
    }

    onPosterChange({
      ...poster,
      sections: poster.sections.map((section) => {
        if (section.id !== parsed.sectionId) {
          return section;
        }

        return {
          ...section,
          blocks: section.blocks.map((block, index) => (index === parsed.index && block.type === "text" ? { ...block, text } : block)),
        };
      }),
    });
  }

  async function handleBlockRevise() {
    if (!selectedId || selectedKind !== "block" || commandBarValue.trim().length === 0) {
      return;
    }

    const selectedBlock = findTextBlock(poster, selectedId);
    if (!selectedBlock) {
      return;
    }

    const revised = await reviseTextBlock(selectedBlock.block, commandBarValue.trim(), selectedBlock.section.title, poster.title);
    setRevisionDiff({ original: selectedBlock.block.text, revised, blockId: selectedId });
    setCommandBarValue("");
  }

  return (
    <section className="preview-panel editable-poster-panel" aria-label="Editable poster canvas">
      <div className="panel-header">
        <h2>Poster Editor</h2>
        <span>{`A0 ${outputFrame.orientation} · ${canvasEditMode} · ${zoomLabel}`}</span>
      </div>
      <SectionNavigator poster={poster} selectedId={selectedId} qaIssues={qaIssues} onSelectSection={(id) => onSelectItem(id, "section")} />
      <div className="preview-toolbar" aria-label="Editor view controls">
        <button className={virtualMode ? "active" : ""} type="button" title="Virtual session view" aria-label="Virtual session view" onClick={() => setVirtualMode((current) => !current)}>
          <Monitor size={15} />
        </button>
        {!virtualMode ? (
          <>
            <button type="button" title="Fit poster" aria-label="Fit poster" onClick={() => setBoundedZoom(fitZoom)}>
              <Maximize2 size={15} />
            </button>
            <button type="button" title="Zoom out" aria-label="Zoom out" onClick={() => setBoundedZoom((current) => current - ZOOM_STEP)}>
              <Minus size={15} />
            </button>
            <strong>{zoomLabel}</strong>
            <button type="button" title="Zoom in" aria-label="Zoom in" onClick={() => setBoundedZoom((current) => current + ZOOM_STEP)}>
              <Plus size={15} />
            </button>
          </>
        ) : (
          <strong>{`Virtual · 1920x1080 · ${Math.round(virtualZoom * 100)}%`}</strong>
        )}
        <button
          className={canvasEditMode === "preview" ? "active" : ""}
          type="button"
          title={canvasEditMode === "editing" ? "Preview poster" : "Edit poster"}
          aria-label={canvasEditMode === "editing" ? "Preview poster" : "Edit poster"}
          onClick={() => setCanvasEditMode((current) => (current === "editing" ? "preview" : "editing"))}
        >
          {canvasEditMode === "editing" ? <Eye size={15} /> : <Pencil size={15} />}
        </button>
        <button
          className={showLayoutCheck ? "active" : ""}
          type="button"
          title="Toggle layout check"
          aria-label="Toggle layout check"
          onClick={() => setShowLayoutCheck((current) => !current)}
        >
          {layoutWarnings.length > 0 ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} />}
        </button>
        <span>{virtualMode ? "Virtual session framing." : canvasEditMode === "editing" ? "Click sections, visuals, and text blocks to edit." : "Preview mode disables in-canvas text editing."}</span>
        {showLayoutCheck ? (
          <span className={layoutWarnings.length > 0 ? "render-check warning" : "render-check passed"} title={layoutWarnings.slice(0, 4).join("\n")}>
            {layoutWarnings.length > 0 ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} />}
            {layoutWarnings.length > 0 ? `${layoutWarnings.length} layout warning${layoutWarnings.length === 1 ? "" : "s"}` : "Layout check passed"}
          </span>
        ) : null}
      </div>
      <div
        ref={viewportRef}
        className="preview-viewport"
        onWheel={(e) => {
          if (virtualMode) return;
          e.preventDefault();
          const delta = e.deltaY > 0 ? -0.05 : 0.05;
          setBoundedZoom((current) => current + delta);
        }}
      >
        {virtualMode ? (
          <div
            className="virtual-screen-frame"
            style={{
              width: virtualFrameWidth,
              height: virtualFrameHeight,
              background: palette.colors.background,
            }}
          >
            <div style={{ width: outputFrame.width, height: outputFrame.height, transform: `scale(${virtualZoom})`, transformOrigin: "center top", flexShrink: 0 }}>
              <PosterCanvas poster={poster} mode="preview" />
            </div>
          </div>
        ) : (
          <>
            <div ref={stageRef} className="a0-preview-stage" style={{ width: outputFrame.width * zoom, height: outputFrame.height * zoom }}>
              <div style={{ transform: `scale(${zoom})`, transformOrigin: "top left" }}>
                <PosterCanvas
                  poster={poster}
                  mode={canvasEditMode === "editing" ? "edit" : "preview"}
                  selectedId={selectedId}
                  qaIssues={qaIssues}
                  onSelectItem={onSelectItem}
                  onUpdatePosterField={updatePosterField}
                  onUpdateSectionTitle={updateSectionTitle}
                  onUpdateTextBlock={updateTextBlock}
                  onSectionReorder={onSectionReorder}
                  onRegenerateSection={onRegenerateSection}
                  onMoveSection={onMoveSection}
                  onToggleHideSection={onToggleHideSection}
                  onDeleteSection={onDeleteSection}
                />
              </div>
            </div>
            <PosterMinimap poster={poster} currentZoom={zoom} viewportRef={viewportRef} stageRef={stageRef} />
          </>
        )}
      </div>
      {selectedKind === "block" ? (
        <div className="command-bar" role="search">
          <Wand2 size={14} aria-hidden="true" />
          <input
            ref={commandInputRef}
            placeholder='Edit this block... "make shorter" or "rephrase for executives"'
            value={commandBarValue}
            onChange={(event) => setCommandBarValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void handleBlockRevise();
            }}
          />
          <kbd>Enter</kbd>
        </div>
      ) : null}
      {revisionDiff ? (
        <BlockRevisionDiff
          original={revisionDiff.original}
          revised={revisionDiff.revised}
          onAccept={() => {
            updateTextBlock(revisionDiff.blockId, revisionDiff.revised);
            setRevisionDiff(null);
          }}
          onReject={() => setRevisionDiff(null)}
        />
      ) : null}
    </section>
  );
}

function collectEditorLayoutWarnings(root: HTMLElement | null) {
  if (!root) {
    return [];
  }

  const tolerance = 2;
  const warnings: string[] = [];
  const canvas = root.querySelector<HTMLElement>(".a0-preview-canvas");
  if (!canvas) {
    return ["A0 poster canvas was not found."];
  }

  const canvasRect = canvas.getBoundingClientRect();
  const measuredElements = [...root.querySelectorAll<HTMLElement>("[data-poster-id], [data-visual-id], [data-block-id]")].filter(isMeasurableElement);

  for (const element of measuredElements) {
    const id = getElementId(element);
    const rect = element.getBoundingClientRect();

    if (rect.width <= tolerance || rect.height <= tolerance) {
      warnings.push(`${id} has zero or near-zero rendered size.`);
    }

    if (element.scrollWidth > element.clientWidth + tolerance || element.scrollHeight > element.clientHeight + tolerance) {
      warnings.push(`${id} clips content inside its assigned poster region.`);
    }

    if (
      rect.left < canvasRect.left - tolerance ||
      rect.top < canvasRect.top - tolerance ||
      rect.right > canvasRect.right + tolerance ||
      rect.bottom > canvasRect.bottom + tolerance
    ) {
      warnings.push(`${id} extends outside the A0 canvas.`);
    }
  }

  const gridItems = [...root.querySelectorAll<HTMLElement>(".poster-grid > .poster-card")]
    .filter(isMeasurableElement)
    .map((element) => ({
      id: getElementId(element),
      rect: element.getBoundingClientRect(),
    }));

  for (let firstIndex = 0; firstIndex < gridItems.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < gridItems.length; secondIndex += 1) {
      const first = gridItems[firstIndex];
      const second = gridItems[secondIndex];
      if (!first || !second) continue;
      const overlapWidth = Math.max(0, Math.min(first.rect.right, second.rect.right) - Math.max(first.rect.left, second.rect.left));
      const overlapHeight = Math.max(0, Math.min(first.rect.bottom, second.rect.bottom) - Math.max(first.rect.top, second.rect.top));

      if (overlapWidth > tolerance && overlapHeight > tolerance) {
        warnings.push(`${first.id} overlaps ${second.id}.`);
      }
    }
  }

  for (const image of [...root.querySelectorAll<HTMLImageElement>("img")]) {
    if (!image.complete || image.naturalWidth === 0 || image.naturalHeight === 0) {
      warnings.push(`${image.alt || image.currentSrc || "Image asset"} did not load.`);
    }
  }

  return warnings;
}

function getElementId(element: HTMLElement) {
  return element.getAttribute("data-poster-id") ?? element.getAttribute("data-visual-id") ?? element.getAttribute("data-block-id") ?? element.tagName.toLowerCase();
}

function isMeasurableElement(element: HTMLElement) {
  const style = getComputedStyle(element);
  return style.display !== "none" && style.visibility !== "hidden" && element.getClientRects().length > 0;
}

function focusEditableTarget(stage: HTMLElement | null, viewport: HTMLElement | null, selectedId: string | undefined) {
  if (!stage || !viewport) {
    return;
  }

  const target = findFocusTarget(stage, selectedId);
  if (!target) {
    return;
  }

  const targetRect = target.getBoundingClientRect();
  const viewportRect = viewport.getBoundingClientRect();
  const inset = 24;

  viewport.scrollTo({
    left: viewport.scrollLeft + targetRect.left - viewportRect.left - inset,
    top: viewport.scrollTop + targetRect.top - viewportRect.top - inset,
    behavior: "smooth",
  });
}

function sectionZoomFocus(
  stage: HTMLElement | null,
  viewport: HTMLElement | null,
  selectedId: string,
  currentZoom: number,
  setZoom: (nextZoom: number | ((current: number) => number)) => void,
) {
  if (!stage || !viewport) {
    return;
  }

  const target = stage.querySelector<HTMLElement>(`[data-poster-id="${cssEscape(selectedId)}"]`);
  if (!target) {
    return;
  }

  const scaledHeight = target.getBoundingClientRect().height;
  const naturalHeight = scaledHeight / Math.max(currentZoom, 0.001);
  if (naturalHeight <= 0) {
    return;
  }

  const targetZoom = Math.min(1, (viewport.clientHeight * 0.7) / naturalHeight);
  setZoom(Number(targetZoom.toFixed(3)));
}

function findFocusTarget(stage: HTMLElement, selectedId: string | undefined) {
  if (selectedId) {
    const selected = stage.querySelector<HTMLElement>(
      `[data-poster-id="${cssEscape(selectedId)}"], [data-visual-id="${cssEscape(selectedId)}"], [data-block-id="${cssEscape(selectedId)}"]`,
    );
    if (selected) {
      return selected.closest<HTMLElement>('[data-poster-kind="section"]') ?? selected;
    }
  }

  return stage.querySelector<HTMLElement>('[data-poster-kind="section"]');
}

function findTextBlock(poster: PosterProject, blockId: string) {
  const parsed = parseBlockId(blockId);
  if (!parsed) return undefined;
  const section = poster.sections.find((item) => item.id === parsed.sectionId);
  const block = section?.blocks[parsed.index];
  return section && block?.type === "text" ? { section, block } : undefined;
}

function cssEscape(value: string) {
  return typeof CSS !== "undefined" && CSS.escape ? CSS.escape(value) : value.replace(/["\\]/g, "\\$&");
}
