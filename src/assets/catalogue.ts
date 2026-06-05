import type { PosterAsset } from "../domain/poster";

export interface AssetCatalogueEntry {
  id: string;
  title: string;
  theme: string;
  role: string;
  type: string;
  publicUrl: string;
  width_px: number;
  height_px: number;
  generatedAt: string;
}

export interface AssetCatalogue {
  schemaVersion: string;
  updatedAt?: string | undefined;
  assets: AssetCatalogueEntry[];
}

export async function loadAssetCatalogue(): Promise<AssetCatalogue | null> {
  const response = await fetch("/generated-assets/asset-catalogue.json");
  if (!response.ok) return null;
  return response.json() as Promise<AssetCatalogue>;
}

export function findThemeBackgroundAsset(catalogue: AssetCatalogue | null, themeId: string): AssetCatalogueEntry | undefined {
  return catalogue?.assets.find((asset) => asset.theme === themeId && asset.role === "background");
}

export function catalogueEntryToPosterAsset(entry: AssetCatalogueEntry): PosterAsset {
  return {
    id: entry.id,
    type: entry.type as PosterAsset["type"],
    role: entry.role as PosterAsset["role"],
    title: entry.title,
    theme: entry.theme,
    url: entry.publicUrl,
    width_px: entry.width_px,
    height_px: entry.height_px,
  };
}
