import { useMemo, useState } from "react";
import { Maximize2, ZoomIn, ZoomOut } from "lucide-react";
import type { PosterProject } from "../domain/poster";
import { getA0PreviewFrame, PosterCanvas, type PosterCanvasItemKind } from "./PosterCanvas";

interface EditablePosterCanvasProps {
  poster: PosterProject;
  onPosterChange: (poster: PosterProject) => void;
  onSelectItem: (id: string, kind: PosterCanvasItemKind) => void;
  selectedId?: string;
}

export function EditablePosterCanvas({ poster, selectedId, onPosterChange, onSelectItem }: EditablePosterCanvasProps) {
  const [zoom, setZoom] = useState(0.45);
  const outputFrame = useMemo(() => getA0PreviewFrame(poster.format.orientation), [poster.format.orientation]);
  const zoomLabel = `${Math.round(zoom * 100)}%`;

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
        <span>Click text to edit. Select sections for layout controls.</span>
      </div>
      <div className="preview-viewport">
        <div className="a0-preview-stage" style={{ width: outputFrame.width * zoom, height: outputFrame.height * zoom }}>
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
