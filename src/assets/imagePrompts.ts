import type { PosterAsset, PosterProject, PosterVisual } from "../domain/poster";

export interface ImageAssetRequest {
  id: string;
  visualId?: string | undefined;
  title: string;
  prompt: string;
  role: PosterAsset["role"];
  theme?: string | undefined;
  palette?: string | undefined;
  model: string;
  size: string;
  outputPath: string;
  metadataPath: string;
}

export const generatedVisualTypes = new Set(["ai_image", "generated_background", "generated_comic_panel"]);
export const generatedAssetTypes = new Set(["ai_image", "generated_background", "generated_panel"]);

export function listImageAssetRequests(poster: PosterProject): ImageAssetRequest[] {
  const visualRequests = poster.visuals.flatMap((visual) => {
    if (!generatedVisualTypes.has(visual.type) || !visual.asset || visual.asset.url) {
      return [];
    }

    return [toImageAssetRequest(visual.asset, visual)];
  });

  const projectAssetRequests = (poster.assets ?? [])
    .filter((asset) => generatedAssetTypes.has(asset.type) && !asset.url)
    .map((asset) => toImageAssetRequest(asset));

  return [...visualRequests, ...projectAssetRequests];
}

export function buildImagePrompt(asset: PosterAsset, visual?: PosterVisual): string {
  const basePrompt = asset.prompt?.trim() || String(visual?.data?.prompt ?? "").trim();
  const roleText = asset.role.replace(/_/g, " ");
  const themeText = asset.theme ? `Theme: ${asset.theme}.` : "";
  const paletteText = asset.palette ? `Palette: ${asset.palette}.` : "";

  return [
    basePrompt,
    `Use this only as non-factual ${roleText} for an academic/data science poster.`,
    "Do not render exact text, numbers, code, equations, labels, charts, tables, logos, or factual evidence.",
    "Avoid misleading data-like marks; keep factual content for deterministic renderers.",
    themeText,
    paletteText,
  ]
    .filter(Boolean)
    .join(" ");
}

function toImageAssetRequest(asset: PosterAsset, visual?: PosterVisual): ImageAssetRequest {
  return {
    id: asset.id,
    visualId: visual?.id,
    title: asset.title ?? visual?.title ?? asset.id,
    prompt: buildImagePrompt(asset, visual),
    role: asset.role,
    theme: asset.theme,
    palette: asset.palette,
    model: asset.model ?? "gpt-image-1.5",
    size: inferImageSize(asset),
    outputPath: `public/generated-assets/${asset.id}.png`,
    metadataPath: `public/generated-assets/${asset.id}.json`,
  };
}

function inferImageSize(asset: PosterAsset): string {
  const width = asset.width_px ?? 0;
  const height = asset.height_px ?? 0;

  if (width > height) {
    return "1536x1024";
  }

  if (height > width) {
    return "1024x1536";
  }

  return "1024x1024";
}
