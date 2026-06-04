export type ApiImageSize = "1024x1024" | "1536x1024" | "1024x1536";

export function nearestApiSize(aspectRatio: number): ApiImageSize {
  const candidates = [
    { size: "1024x1024" as const, ratio: 1 },
    { size: "1536x1024" as const, ratio: 1.5 },
    { size: "1024x1536" as const, ratio: 0.667 },
  ];
  return candidates.sort((a, b) => Math.abs(a.ratio - aspectRatio) - Math.abs(b.ratio - aspectRatio))[0]!.size;
}

export function inferAssetDimensions(
  orientation: "portrait" | "landscape",
  columnSpan: 1 | 2 | 3 | 4 = 1,
): { width_px: number; height_px: number } {
  const posterW = orientation === "landscape" ? 4492 : 3179;
  const posterH = orientation === "landscape" ? 3179 : 4492;
  const gutter = 32;
  const cols = 3;
  const colW = Math.floor((posterW - gutter * (cols + 1)) / cols);
  const sectionH = Math.floor((posterH - 300) / 4);
  return {
    width_px: colW * columnSpan + gutter * (columnSpan - 1),
    height_px: sectionH,
  };
}
