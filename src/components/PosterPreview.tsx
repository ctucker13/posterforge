import { useEffect, useMemo, useRef, useState } from "react";
import { Maximize2, ZoomIn, ZoomOut } from "lucide-react";
import type { PosterProject } from "../domain/poster";
import { getA0PreviewFrame, PosterCanvas } from "./PosterCanvas";
import { getFitPageZoom, getFitWidthZoom, getZoomLabel, zoomIn, zoomOut, type ViewportSize } from "./posterViewport";

interface PosterPreviewProps {
  poster: PosterProject;
}

export function PosterPreview({ poster }: PosterPreviewProps) {
  const [zoom, setZoom] = useState(0.16);
  const [zoomMode, setZoomMode] = useState<"fitPage" | "fitWidth" | "custom">("fitPage");
  const [viewportSize, setViewportSize] = useState<ViewportSize>({ width: 960, height: 640 });
  const viewportRef = useRef<HTMLDivElement>(null);
  const outputFrame = useMemo(() => getA0PreviewFrame(poster.format.orientation), [poster.format.orientation]);
  const fitPageZoom = useMemo(() => getFitPageZoom(outputFrame, viewportSize), [outputFrame, viewportSize]);
  const fitWidthZoom = useMemo(() => getFitWidthZoom(outputFrame, viewportSize), [outputFrame, viewportSize]);
  const zoomLabel = getZoomLabel(zoom);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    function updateViewportSize() {
      const rect = viewport!.getBoundingClientRect();
      setViewportSize({ width: rect.width, height: rect.height });
    }

    updateViewportSize();
    const observer = new ResizeObserver(updateViewportSize);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (zoomMode === "fitPage") setZoom(fitPageZoom);
    if (zoomMode === "fitWidth") setZoom(fitWidthZoom);
  }, [fitPageZoom, fitWidthZoom, zoomMode]);

  function setCustomZoom(nextZoom: (current: number) => number) {
    setZoom(nextZoom);
    setZoomMode("custom");
  }

  return (
    <section className="preview-panel" aria-label="Poster preview">
      <div className="panel-header">
        <h2>Preview</h2>
        <span>{`A0 ${outputFrame.orientation} · ${zoomLabel}`}</span>
      </div>
      <div className="preview-toolbar" aria-label="Preview zoom controls">
        <button type="button" onClick={() => setZoomMode("fitPage")} title="Fit page">
          <Maximize2 size={15} />
        </button>
        <button className={zoomMode === "fitWidth" ? "active view-preset-button" : "view-preset-button"} type="button" onClick={() => setZoomMode("fitWidth")}>
          Fit width
        </button>
        <button type="button" onClick={() => setCustomZoom(zoomOut)} title="Zoom out">
          <ZoomOut size={15} />
        </button>
        <strong>{zoomLabel}</strong>
        <button type="button" onClick={() => setCustomZoom(zoomIn)} title="Zoom in">
          <ZoomIn size={15} />
        </button>
        <span>{`${outputFrame.mmWidth}mm x ${outputFrame.mmHeight}mm`}</span>
      </div>
      <div
        ref={viewportRef}
        className="preview-viewport"
        onWheel={(event) => {
          if (!(event.metaKey || event.ctrlKey)) return;
          event.preventDefault();
          setCustomZoom(event.deltaY > 0 ? zoomOut : zoomIn);
        }}
      >
        <div className="a0-preview-stage" style={{ width: outputFrame.width * zoom, height: outputFrame.height * zoom }}>
          <div style={{ transform: `scale(${zoom})`, transformOrigin: "top left" }}>
            <PosterCanvas poster={poster} mode="preview" />
          </div>
        </div>
      </div>
    </section>
  );
}
