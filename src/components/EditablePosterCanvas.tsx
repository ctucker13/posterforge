import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Maximize2, ZoomIn, ZoomOut } from "lucide-react";
import type { PosterProject } from "../domain/poster";
import { getA0PreviewFrame, PosterCanvas, type PosterCanvasItemKind } from "./PosterCanvas";

interface EditablePosterCanvasProps {
  poster: PosterProject;
  onPosterChange: (poster: PosterProject) => void;
  onSelectItem: (id: string, kind: PosterCanvasItemKind) => void;
  selectedId?: string;
}

export function EditablePosterCanvas({ poster, selectedId, onPosterChange, onSelectItem }: EditablePosterCanvasProps) {
  const [zoom, setZoom] = useState(0.22);
  const [layoutWarnings, setLayoutWarnings] = useState<string[]>([]);
  const stageRef = useRef<HTMLDivElement>(null);
  const outputFrame = useMemo(() => getA0PreviewFrame(poster.format.orientation), [poster.format.orientation]);
  const zoomLabel = `${Math.round(zoom * 100)}%`;

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setLayoutWarnings(collectEditorLayoutWarnings(stageRef.current));
    });

    return () => window.cancelAnimationFrame(frame);
  }, [poster, zoom]);

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
        <span>{`A0 ${outputFrame.orientation} · ${zoomLabel}`}</span>
      </div>
      <div className="preview-toolbar" aria-label="Editor zoom controls">
        <button type="button" onClick={() => setZoom((value) => Math.max(0.1, Number((value - 0.04).toFixed(2))))} title="Zoom out">
          <ZoomOut size={15} />
        </button>
        <strong>{zoomLabel}</strong>
        <button type="button" onClick={() => setZoom((value) => Math.min(0.5, Number((value + 0.04).toFixed(2))))} title="Zoom in">
          <ZoomIn size={15} />
        </button>
        <button type="button" onClick={() => setZoom(0.22)} title="Reset zoom">
          <Maximize2 size={15} />
        </button>
        <span>Click text to edit. Select sections for layout controls.</span>
        <span className={layoutWarnings.length > 0 ? "render-check warning" : "render-check passed"} title={layoutWarnings.slice(0, 4).join("\n")}>
          {layoutWarnings.length > 0 ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} />}
          {layoutWarnings.length > 0 ? `${layoutWarnings.length} layout warning${layoutWarnings.length === 1 ? "" : "s"}` : "Layout check passed"}
        </span>
      </div>
      <div className="preview-viewport">
        <div ref={stageRef} className="a0-preview-stage" style={{ width: outputFrame.width * zoom, height: outputFrame.height * zoom }}>
          <div style={{ transform: `scale(${zoom})`, transformOrigin: "top left" }}>
            <PosterCanvas
              poster={poster}
              mode="edit"
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
  const measuredElements = [...root.querySelectorAll<HTMLElement>("[data-poster-id], [data-visual-id], [data-block-id]")];

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

  const gridItems = [...root.querySelectorAll<HTMLElement>(".poster-grid > .poster-card")].map((element) => ({
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
