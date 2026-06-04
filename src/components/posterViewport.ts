export const MIN_POSTER_ZOOM = 0.05;
export const MAX_POSTER_ZOOM = 4;
export const POSTER_ZOOM_FACTOR = 1.1;
export const VIRTUAL_SCREEN_ASPECT = 1920 / 1080;

export interface PosterFrameSize {
  width: number;
  height: number;
}

export interface ViewportSize {
  width: number;
  height: number;
}

export function clampPosterZoom(value: number) {
  return Number(Math.max(MIN_POSTER_ZOOM, Math.min(MAX_POSTER_ZOOM, value)).toFixed(4));
}

export function getZoomLabel(zoom: number) {
  return `${Math.round(zoom * 100)}%`;
}

export function zoomIn(currentZoom: number) {
  return clampPosterZoom(currentZoom * POSTER_ZOOM_FACTOR);
}

export function zoomOut(currentZoom: number) {
  return clampPosterZoom(currentZoom / POSTER_ZOOM_FACTOR);
}

export function getFitPageZoom(frame: PosterFrameSize, viewport: ViewportSize, padding = 36) {
  const availableWidth = Math.max(1, viewport.width - padding);
  const availableHeight = Math.max(1, viewport.height - padding);
  return clampPosterZoom(Math.min(availableWidth / frame.width, availableHeight / frame.height));
}

export function getFitWidthZoom(frame: PosterFrameSize, viewport: ViewportSize, padding = 36) {
  const availableWidth = Math.max(1, viewport.width - padding);
  return clampPosterZoom(availableWidth / frame.width);
}

export function getVirtualFrameSize(viewport: ViewportSize, padding = 36) {
  const availableWidth = Math.max(320, viewport.width - padding);
  const availableHeight = Math.max(180, viewport.height - padding);
  const widthFromHeight = availableHeight * VIRTUAL_SCREEN_ASPECT;
  const width = Math.floor(Math.min(availableWidth, widthFromHeight));
  return {
    width,
    height: Math.floor(width / VIRTUAL_SCREEN_ASPECT),
  };
}

export function getFitVirtualZoom(frame: PosterFrameSize, virtualFrame: PosterFrameSize) {
  return clampPosterZoom(Math.min(virtualFrame.width / frame.width, virtualFrame.height / frame.height));
}
