import { describe, expect, it } from "vitest";
import { getFitPageZoom, getFitVirtualZoom, getFitWidthZoom, getVirtualFrameSize, zoomIn, zoomOut } from "./posterViewport";

describe("poster viewport helpers", () => {
  const frame = { width: 4494, height: 3179 };

  it("calculates page and width fit zooms from the available viewport", () => {
    const viewport = { width: 1200, height: 800 };

    expect(getFitPageZoom(frame, viewport)).toBeCloseTo(0.2403, 4);
    expect(getFitWidthZoom(frame, viewport)).toBeCloseTo(0.259, 3);
  });

  it("fits the virtual frame to a 16:9 viewport and fits the poster inside it", () => {
    const virtualFrame = getVirtualFrameSize({ width: 1000, height: 600 });

    expect(virtualFrame.width / virtualFrame.height).toBeCloseTo(16 / 9, 2);
    expect(getFitVirtualZoom(frame, virtualFrame)).toBeCloseTo(Math.min(virtualFrame.width / frame.width, virtualFrame.height / frame.height), 4);
  });

  it("uses proportional zoom steps in both directions", () => {
    expect(zoomIn(0.2)).toBeCloseTo(0.22, 4);
    expect(zoomOut(0.22)).toBeCloseTo(0.2, 4);
  });
});
