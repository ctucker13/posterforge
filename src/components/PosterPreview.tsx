import { useMemo, useState } from "react";
import { Maximize2, ZoomIn, ZoomOut } from "lucide-react";
import type { PosterProject } from "../domain/poster";
import { getA0PreviewFrame, PosterCanvas } from "./PosterCanvas";

interface PosterPreviewProps {
  poster: PosterProject;
}

export function PosterPreview({ poster }: PosterPreviewProps) {
  const [zoom, setZoom] = useState(0.16);
  const outputFrame = useMemo(() => getA0PreviewFrame(poster.format.orientation), [poster.format.orientation]);
  const zoomLabel = `${Math.round(zoom * 100)}%`;

  return (
    <section className="preview-panel" aria-label="Poster preview">
      <div className="panel-header">
        <h2>Preview</h2>
        <span>{`A0 ${outputFrame.orientation} · ${zoomLabel}`}</span>
      </div>
      <div className="preview-toolbar" aria-label="Preview zoom controls">
        <button type="button" onClick={() => setZoom((value) => Math.max(0.1, Number((value - 0.03).toFixed(2))))} title="Zoom out">
          <ZoomOut size={15} />
        </button>
        <strong>{zoomLabel}</strong>
        <button type="button" onClick={() => setZoom((value) => Math.min(0.5, Number((value + 0.03).toFixed(2))))} title="Zoom in">
          <ZoomIn size={15} />
        </button>
        <button type="button" onClick={() => setZoom(0.16)} title="Reset zoom">
          <Maximize2 size={15} />
        </button>
        <span>{`${outputFrame.mmWidth}mm x ${outputFrame.mmHeight}mm`}</span>
      </div>
      <div className="preview-viewport">
        <div className="a0-preview-stage" style={{ width: outputFrame.width * zoom, height: outputFrame.height * zoom }}>
          <div style={{ transform: `scale(${zoom})`, transformOrigin: "top left" }}>
            <PosterCanvas poster={poster} mode="preview" />
          </div>
        </div>
      </div>
    </section>
  );
}
