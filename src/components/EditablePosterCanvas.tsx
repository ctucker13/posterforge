import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import type { PosterProject } from "../domain/poster";
import { getA0PreviewFrame, PosterCanvas, type PosterCanvasItemKind } from "./PosterCanvas";

interface EditablePosterCanvasProps {
  poster: PosterProject;
  onPosterChange: (poster: PosterProject) => void;
  onSelectItem: (id: string, kind: PosterCanvasItemKind) => void;
  selectedId?: string;
}

type EditorViewMode = "fit" | "edit" | "check";
const editZoom = 0.52;
const checkZoom = 0.16;

export function EditablePosterCanvas({ poster, selectedId, onPosterChange, onSelectItem }: EditablePosterCanvasProps) {
  const [viewMode, setViewMode] = useState<EditorViewMode>("fit");
  const [fitZoom, setFitZoom] = useState(0.16);
  const [layoutWarnings, setLayoutWarnings] = useState<string[]>([]);
  const viewportRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const outputFrame = useMemo(() => getA0PreviewFrame(poster.format.orientation), [poster.format.orientation]);
  const zoom = viewMode === "fit" ? fitZoom : viewMode === "edit" ? editZoom : checkZoom;
  const zoomLabel = `${Math.round(zoom * 100)}%`;

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }

    function updateFitZoom() {
      const rect = viewport!.getBoundingClientRect();
      const availableWidth = Math.max(1, rect.width - 36);
      const availableHeight = Math.max(1, rect.height - 36);
      const nextZoom = Math.max(0.1, Math.min(0.5, availableWidth / outputFrame.width, availableHeight / outputFrame.height));
      setFitZoom(Number(nextZoom.toFixed(3)));
    }

    updateFitZoom();
    const observer = new ResizeObserver(updateFitZoom);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [outputFrame.height, outputFrame.width]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setLayoutWarnings(collectEditorLayoutWarnings(stageRef.current));
    });

    return () => window.cancelAnimationFrame(frame);
  }, [poster, zoom]);

  useEffect(() => {
    if (viewMode !== "edit") {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      focusEditableTarget(stageRef.current, viewportRef.current, selectedId);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [poster, selectedId, viewMode, zoom]);

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

  return (
    <section className="preview-panel editable-poster-panel" aria-label="Editable poster canvas">
      <div className="panel-header">
        <h2>Poster Editor</h2>
        <span>{`A0 ${outputFrame.orientation} · ${viewMode} · ${zoomLabel}`}</span>
      </div>
      <div className="preview-toolbar" aria-label="Editor view controls">
        <div className="view-mode-toggle" role="tablist" aria-label="Poster editor view mode">
          <button className={viewMode === "fit" ? "active" : ""} type="button" role="tab" aria-selected={viewMode === "fit"} onClick={() => setViewMode("fit")}>
            Fit
          </button>
          <button className={viewMode === "edit" ? "active" : ""} type="button" role="tab" aria-selected={viewMode === "edit"} onClick={() => setViewMode("edit")}>
            Edit
          </button>
          <button className={viewMode === "check" ? "active" : ""} type="button" role="tab" aria-selected={viewMode === "check"} onClick={() => setViewMode("check")}>
            Check
          </button>
        </div>
        <strong>{zoomLabel}</strong>
        <span>
          {viewMode === "edit"
            ? "Selected section is focused for editing. Click another section to focus it."
            : viewMode === "check"
              ? "Export framing and layout warnings."
              : "Whole poster fitted to the workspace."}
        </span>
        <span className={layoutWarnings.length > 0 ? "render-check warning" : "render-check passed"} title={layoutWarnings.slice(0, 4).join("\n")}>
          {layoutWarnings.length > 0 ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} />}
          {layoutWarnings.length > 0 ? `${layoutWarnings.length} layout warning${layoutWarnings.length === 1 ? "" : "s"}` : "Layout check passed"}
        </span>
      </div>
      <div ref={viewportRef} className="preview-viewport">
        <div ref={stageRef} className="a0-preview-stage" style={{ width: outputFrame.width * zoom, height: outputFrame.height * zoom }}>
          <div style={{ transform: `scale(${zoom})`, transformOrigin: "top left" }}>
            <PosterCanvas
              poster={poster}
              mode={viewMode === "check" ? "preview" : "edit"}
              selectedId={selectedId}
              onSelectItem={onSelectItem}
              onUpdatePosterField={updatePosterField}
              onUpdateSectionTitle={updateSectionTitle}
              onUpdateTextBlock={updateTextBlock}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function parseBlockId(blockId: string): { sectionId: string; index: number } | undefined {
  const match = blockId.match(/^(.+):block:(\d+)$/);
  if (!match) {
    return undefined;
  }

  return { sectionId: match[1], index: Number(match[2]) };
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

function cssEscape(value: string) {
  return typeof CSS !== "undefined" && CSS.escape ? CSS.escape(value) : value.replace(/["\\]/g, "\\$&");
}
