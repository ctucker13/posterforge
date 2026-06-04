import { type RefObject, useDeferredValue, useEffect, useMemo, useState } from "react";
import type { PosterProject } from "../domain/poster";
import { getA0PreviewFrame, PosterCanvas } from "./PosterCanvas";

const MINIMAP_HEIGHT = 128;

interface MinimapRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export function PosterMinimap({
  poster,
  currentZoom,
  viewportRef,
  stageRef,
}: {
  poster: PosterProject;
  currentZoom: number;
  viewportRef: RefObject<HTMLDivElement>;
  stageRef: RefObject<HTMLDivElement>;
}) {
  const deferredPoster = useDeferredValue(poster);
  const outputFrame = useMemo(() => getA0PreviewFrame(poster.format.orientation), [poster.format.orientation]);
  const scale = MINIMAP_HEIGHT / outputFrame.height;
  const [viewportRect, setViewportRect] = useState<MinimapRect>({ left: 0, top: 0, width: 0, height: 0 });

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    function updateViewportRect() {
      const zoom = Math.max(currentZoom, 0.001);
      setViewportRect({
        left: (viewport!.scrollLeft / zoom) * scale,
        top: (viewport!.scrollTop / zoom) * scale,
        width: (viewport!.clientWidth / zoom) * scale,
        height: (viewport!.clientHeight / zoom) * scale,
      });
    }

    updateViewportRect();
    viewport.addEventListener("scroll", updateViewportRect, { passive: true });
    window.addEventListener("resize", updateViewportRect);
    return () => {
      viewport.removeEventListener("scroll", updateViewportRect);
      window.removeEventListener("resize", updateViewportRect);
    };
  }, [currentZoom, scale, stageRef, viewportRef]);

  return (
    <div className="poster-minimap" aria-hidden="true" style={{ width: outputFrame.width * scale, height: outputFrame.height * scale }}>
      <div className="poster-minimap-canvas" style={{ width: outputFrame.width, height: outputFrame.height, transform: `scale(${scale})` }}>
        <PosterCanvas poster={deferredPoster} mode="preview" />
      </div>
      <div
        className="poster-minimap-viewport"
        style={{
          left: viewportRect.left,
          top: viewportRect.top,
          width: viewportRect.width,
          height: viewportRect.height,
        }}
      />
    </div>
  );
}
