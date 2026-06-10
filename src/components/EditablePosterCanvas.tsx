import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Eye, Minus, Monitor, Pencil, Plus, Redo2, Undo2 } from "lucide-react";
import { Wand2 } from "lucide-react";
import type { PosterChangeOptions } from "../app/posterHistory";
import type { PosterProject, QaIssue } from "../domain/poster";
import { reviseTextBlock } from "../domain/generator";
import { generateImageForSlot } from "../services/imageGen";
import { getA0PreviewFrame, PosterCanvas, type PosterCanvasItemKind } from "./PosterCanvas";
import { BlockRevisionDiff } from "./BlockRevisionDiff";
import { parseBlockId } from "./posterUtils";
import { SectionNavigator } from "./SectionNavigator";
import { resolvePalette } from "../themes";
import {
  clampPosterZoom,
  getFitPageZoom,
  getFitVirtualZoom,
  getFitWidthZoom,
  getVirtualFrameSize,
  getZoomLabel,
  zoomIn,
  zoomOut,
  type ViewportSize,
} from "./posterViewport";

interface EditablePosterCanvasProps {
  poster: PosterProject;
  onPosterChange: (poster: PosterProject, options?: PosterChangeOptions) => void;
  onSelectItem: (id: string, kind: PosterCanvasItemKind) => void;
  selectedId?: string | undefined;
  selectedKind?: PosterCanvasItemKind | undefined;
  qaIssues?: QaIssue[];
  onUndo?: (() => void) | undefined;
  onRedo?: (() => void) | undefined;
  canUndo?: boolean | undefined;
  canRedo?: boolean | undefined;
  onSectionReorder?: (orderedIds: string[]) => void;
  onMoveBlock?: (fromSectionId: string, fromIndex: number, toSectionId: string, toIndex: number) => void;
  onRegenerateSection?: (sectionId: string, instruction?: string) => void;
  onMoveSection?: (sectionId: string, direction: -1 | 1) => void;
  onToggleHideSection?: (sectionId: string) => void;
  onDeleteSection?: (sectionId: string) => void;
  onDeselectItem?: () => void;
}

type CanvasEditMode = "editing" | "preview";
type ZoomMode = "fitPage" | "fitWidth" | "fitVirtual" | "custom";

export function EditablePosterCanvas({
  poster,
  selectedId,
  selectedKind,
  qaIssues = [],
  onPosterChange,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  onSelectItem,
  onSectionReorder,
  onMoveBlock,
  onRegenerateSection,
  onMoveSection,
  onToggleHideSection,
  onDeleteSection,
  onDeselectItem,
}: EditablePosterCanvasProps) {
  const [canvasEditMode, setCanvasEditMode] = useState<CanvasEditMode>("editing");
  const [zoom, setZoom] = useState(0.16);
  const [zoomMode, setZoomMode] = useState<ZoomMode>("fitPage");
  const [viewportSize, setViewportSize] = useState<ViewportSize>({ width: 960, height: 640 });
  const [virtualMode, setVirtualMode] = useState(false);
  const [showLayoutCheck, setShowLayoutCheck] = useState(false);
  const [layoutWarnings, setLayoutWarnings] = useState<string[]>([]);
  const [commandBarValue, setCommandBarValue] = useState("");
  const [revisionDiff, setRevisionDiff] = useState<{ original: string; revised: string; blockId: string } | null>(null);
  const [regenerateTarget, setRegenerateTarget] = useState<{ sectionId: string; instruction: string } | null>(null);
  const [generatingSlotIds, setGeneratingSlotIds] = useState<Set<string>>(() => new Set());
  const [imageGenError, setImageGenError] = useState<string | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const commandInputRef = useRef<HTMLInputElement>(null);
  const regenerateInputRef = useRef<HTMLInputElement>(null);
  const outputFrame = useMemo(() => getA0PreviewFrame(poster.format.orientation), [poster.format.orientation]);
  const palette = resolvePalette(poster.theme, poster.palette);
  const virtualFrame = useMemo(() => getVirtualFrameSize(viewportSize), [viewportSize]);
  const fitPageZoom = useMemo(() => getFitPageZoom(outputFrame, viewportSize), [outputFrame, viewportSize]);
  const fitWidthZoom = useMemo(() => getFitWidthZoom(outputFrame, viewportSize), [outputFrame, viewportSize]);
  const fitVirtualZoom = useMemo(() => getFitVirtualZoom(outputFrame, virtualFrame), [outputFrame, virtualFrame]);
  const scaledPosterWidth = outputFrame.width * zoom;
  const scaledPosterHeight = outputFrame.height * zoom;
  const zoomLabel = getZoomLabel(zoom);

  const updateViewportSize = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const rect = viewport.getBoundingClientRect();
    setViewportSize({ width: rect.width, height: rect.height });
  }, []);

  function setCustomZoom(nextZoom: number | ((current: number) => number)) {
    setZoom((current) => {
      const rawZoom = typeof nextZoom === "function" ? nextZoom(current) : nextZoom;
      return clampPosterZoom(rawZoom);
    });
    setZoomMode("custom");
  }

  function applyZoomMode(mode: ZoomMode) {
    setZoomMode(mode);
    if (mode === "fitPage") setZoom(fitPageZoom);
    if (mode === "fitWidth") setZoom(fitWidthZoom);
    if (mode === "fitVirtual") setZoom(fitVirtualZoom);
  }

  function toggleVirtualMode() {
    setVirtualMode((current) => {
      if (!current) {
        applyZoomMode("fitVirtual");
      } else if (zoomMode === "fitVirtual") {
        setZoomMode("custom");
      }
      return !current;
    });
  }

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }

    updateViewportSize();
    const observer = new ResizeObserver(updateViewportSize);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [updateViewportSize]);

  useEffect(() => {
    if (zoomMode === "fitPage") setZoom(fitPageZoom);
    if (zoomMode === "fitWidth") setZoom(fitWidthZoom);
    if (zoomMode === "fitVirtual") setZoom(fitVirtualZoom);
  }, [fitPageZoom, fitVirtualZoom, fitWidthZoom, zoomMode]);

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
    if (!selectedId) return;

    const frame = window.requestAnimationFrame(() => {
      focusEditableTarget(stageRef.current, viewportRef.current, selectedId);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [poster, selectedId]);

  useEffect(() => {
    function handleKeyboard(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey)) return;

      if (event.key === "0") {
        event.preventDefault();
        applyZoomMode(virtualMode ? "fitVirtual" : "fitPage");
      } else if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        setCustomZoom(zoomIn);
      } else if (event.key === "-") {
        event.preventDefault();
        setCustomZoom(zoomOut);
      } else if (event.key.toLowerCase() === "k" && selectedKind === "block") {
        event.preventDefault();
        commandInputRef.current?.focus();
      }
    }

    document.addEventListener("keydown", handleKeyboard);
    return () => document.removeEventListener("keydown", handleKeyboard);
  }, [fitPageZoom, fitVirtualZoom, selectedKind, virtualMode]);

  useEffect(() => {
    regenerateInputRef.current?.focus();
  }, [regenerateTarget?.sectionId]);

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

  async function handleGenerateImageSlot(rawSlotId: string) {
    // The canvas encodes an "exact" regeneration request as "<slotId>:exact".
    const exact = rawSlotId.endsWith(":exact");
    const slotId = exact ? rawSlotId.slice(0, -":exact".length) : rawSlotId;
    if (generatingSlotIds.has(slotId)) {
      return;
    }

    const slot = (poster.imageSlots ?? []).find((s) => s.id === slotId);
    if (!slot) {
      return;
    }

    setImageGenError(null);
    setGeneratingSlotIds((prev) => new Set(prev).add(slotId));
    try {
      const { dataUrl, outputFormat } = await generateImageForSlot(slot, poster, { exact });
      // Preview lives in slot.url as a data URL; clear assetId so the canvas
      // renders the fresh preview rather than a previously-baked file.
      onPosterChange({
        ...poster,
        imageSlots: (poster.imageSlots ?? []).map((s) =>
          s.id === slotId ? { ...s, url: dataUrl, outputFormat, assetId: null } : s,
        ),
      });
    } catch (error) {
      setImageGenError(error instanceof Error ? error.message : String(error));
    } finally {
      setGeneratingSlotIds((prev) => {
        const next = new Set(prev);
        next.delete(slotId);
        return next;
      });
    }
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

  function openRegenerateInstruction(sectionId: string) {
    setRegenerateTarget({ sectionId, instruction: "" });
    onSelectItem(sectionId, "section");
  }

  function submitRegenerateInstruction() {
    if (!regenerateTarget) {
      return;
    }

    const instruction = regenerateTarget.instruction.trim();
    onRegenerateSection?.(regenerateTarget.sectionId, instruction.length > 0 ? instruction : undefined);
    setRegenerateTarget(null);
  }

  const regenerateSectionTitle = regenerateTarget ? poster.sections.find((section) => section.id === regenerateTarget.sectionId)?.title : undefined;

  return (
    <section className="preview-panel editable-poster-panel" aria-label="Editable poster canvas">
      <div className="panel-header">
        <h2>Poster Editor</h2>
        <span>{`A0 ${outputFrame.orientation} · ${canvasEditMode} · ${zoomLabel}`}</span>
      </div>
      <SectionNavigator poster={poster} selectedId={selectedId} qaIssues={qaIssues} onSelectSection={(id) => onSelectItem(id, "section")} />
      <div className="canvas-stage">
      <div className="canvas-toolbar" aria-label="Editor view controls">
        <div className="toolbar-group" role="group" aria-label="History">
          <button type="button" title="Undo (Cmd/Ctrl+Z)" aria-label="Undo" disabled={!canUndo} onClick={onUndo}>
            <Undo2 size={15} />
          </button>
          <button type="button" title="Redo (Cmd/Ctrl+Shift+Z)" aria-label="Redo" disabled={!canRedo} onClick={onRedo}>
            <Redo2 size={15} />
          </button>
        </div>
        <div className="toolbar-group" role="group" aria-label="Zoom">
          <button type="button" title="Zoom out" aria-label="Zoom out" onClick={() => setCustomZoom(zoomOut)}>
            <Minus size={15} />
          </button>
          <strong className="zoom-readout">{zoomLabel}</strong>
          <button type="button" title="Zoom in (Cmd/Ctrl + wheel also zooms)" aria-label="Zoom in" onClick={() => setCustomZoom(zoomIn)}>
            <Plus size={15} />
          </button>
          <select
            className="fit-select"
            aria-label="Fit poster to view"
            value={zoomMode}
            onChange={(event) => applyZoomMode(event.target.value as ZoomMode)}
          >
            <option value="fitPage">Fit page</option>
            <option value="fitWidth">Fit width</option>
            {virtualMode ? <option value="fitVirtual">Fit virtual</option> : null}
            <option value="custom" hidden>
              Custom
            </option>
          </select>
        </div>
        <div className="toolbar-group" role="group" aria-label="View">
          <button className={virtualMode ? "active" : ""} type="button" title="Virtual session view" aria-label="Virtual session view" onClick={toggleVirtualMode}>
            <Monitor size={15} />
          </button>
          <button
            className={canvasEditMode === "preview" ? "active" : ""}
            type="button"
            title={canvasEditMode === "editing" ? "Preview poster (disables in-canvas editing)" : "Edit poster"}
            aria-label={canvasEditMode === "editing" ? "Preview poster" : "Edit poster"}
            onClick={() => setCanvasEditMode((current) => (current === "editing" ? "preview" : "editing"))}
          >
            {canvasEditMode === "editing" ? <Eye size={15} /> : <Pencil size={15} />}
          </button>
          <button
            className={showLayoutCheck ? "active" : ""}
            type="button"
            title={showLayoutCheck && layoutWarnings.length > 0 ? layoutWarnings.slice(0, 4).join("\n") : "Toggle layout check"}
            aria-label="Toggle layout check"
            onClick={() => setShowLayoutCheck((current) => !current)}
          >
            {showLayoutCheck && layoutWarnings.length > 0 ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} />}
            {showLayoutCheck && layoutWarnings.length > 0 ? <span className="toolbar-badge">{layoutWarnings.length}</span> : null}
          </button>
        </div>
      </div>
      <div
        ref={viewportRef}
        className="preview-viewport"
        onWheel={(e) => {
          if (!(e.metaKey || e.ctrlKey)) return;
          e.preventDefault();
          setCustomZoom(e.deltaY > 0 ? zoomOut : zoomIn);
        }}
      >
        {virtualMode ? (
          <div
            className="virtual-screen-frame"
            style={{
              width: virtualFrame.width,
              height: virtualFrame.height,
              background: palette.colors.background,
            }}
          >
            <div
              className="virtual-stage-area"
              style={{
                width: Math.max(virtualFrame.width, scaledPosterWidth),
                height: Math.max(virtualFrame.height, scaledPosterHeight),
              }}
            >
              <div
                ref={stageRef}
                className="a0-preview-stage"
                style={{
                  width: scaledPosterWidth,
                  height: scaledPosterHeight,
                  marginLeft: Math.max(0, (virtualFrame.width - scaledPosterWidth) / 2),
                  marginTop: Math.max(0, (virtualFrame.height - scaledPosterHeight) / 2),
                }}
              >
                <div style={{ transform: `scale(${zoom})`, transformOrigin: "top left" }}>
                  <PosterCanvas poster={poster} mode="preview" />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div ref={stageRef} className="a0-preview-stage" style={{ width: scaledPosterWidth, height: scaledPosterHeight }}>
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
                  onMoveBlock={onMoveBlock}
                  onUpdateSectionLayout={(sectionId, layoutPatch) => {
                    onPosterChange({
                      ...poster,
                      sections: poster.sections.map((section) =>
                        section.id === sectionId ? { ...section, layout: { ...(section.layout ?? {}), ...layoutPatch } } : section,
                      ),
                    });
                  }}
                  onRegenerateSection={openRegenerateInstruction}
                  onMoveSection={onMoveSection}
                  onToggleHideSection={onToggleHideSection}
                  onDeleteSection={onDeleteSection}
                  onDeselectItem={onDeselectItem}
                  generatingSlotIds={generatingSlotIds}
                  onGenerateImageSlot={handleGenerateImageSlot}
                  onUpdateImageSlotPosition={(slotId, objectPosition) => {
                    onPosterChange({
                      ...poster,
                      // objectPosition is canonical on the slot; blocks keep legacy value for old data.
                      imageSlots: (poster.imageSlots ?? []).map((slot) =>
                        slot.id === slotId ? { ...slot, objectPosition } : slot,
                      ),
                    });
                  }}
                  onImageSlotSidecarLoaded={(slotId, patch) => {
                    // Sidecar metadata is hydration, not a user edit — keep it out of undo history.
                    onPosterChange({
                      ...poster,
                      imageSlots: (poster.imageSlots ?? []).map((slot) =>
                        slot.id === slotId ? { ...slot, ...patch } : slot,
                      ),
                    }, { skipHistory: true });
                  }}
                />
              </div>
            </div>
        )}
      </div>
      </div>
      {imageGenError ? (
        <div className="image-gen-error-bar" role="alert">
          <AlertTriangle size={14} aria-hidden="true" />
          <span>{imageGenError}</span>
          <button type="button" onClick={() => setImageGenError(null)} aria-label="Dismiss image generation error">
            ×
          </button>
        </div>
      ) : null}
      {regenerateTarget ? (
        <div className="regenerate-instruction-bar" role="form" aria-label="Section regeneration instruction">
          <Wand2 size={14} aria-hidden="true" />
          <div>
            <strong>{regenerateSectionTitle ?? "Selected section"}</strong>
            <input
              ref={regenerateInputRef}
              placeholder="Optional instruction: make this shorter, focus on results..."
              value={regenerateTarget.instruction}
              onChange={(event) => setRegenerateTarget((current) => (current ? { ...current, instruction: event.target.value } : current))}
              onKeyDown={(event) => {
                if (event.key === "Enter") submitRegenerateInstruction();
                if (event.key === "Escape") setRegenerateTarget(null);
              }}
            />
          </div>
          <button type="button" onClick={submitRegenerateInstruction}>
            Regenerate
          </button>
          <button type="button" onClick={() => setRegenerateTarget(null)}>
            Cancel
          </button>
        </div>
      ) : null}
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
