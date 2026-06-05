import { Image, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { PosterAsset } from "../domain/poster";

interface CatalogueEntry {
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

interface AssetCatalogue {
  schemaVersion: string;
  updatedAt: string;
  assets: CatalogueEntry[];
}

export function AssetPicker({
  selectedTheme,
  selectedAssetId,
  onSelect,
}: {
  selectedTheme: string;
  selectedAssetId?: string | undefined;
  onSelect: (asset: PosterAsset) => void;
}) {
  const [catalogue, setCatalogue] = useState<AssetCatalogue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    fetch("/generated-assets/asset-catalogue.json")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: AssetCatalogue | null) => {
        setCatalogue(data);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const themeAssets = catalogue?.assets.filter((a) => a.theme === selectedTheme) ?? [];
  const otherAssets = catalogue?.assets.filter((a) => a.theme !== selectedTheme) ?? [];
  const hasThemeAssets = themeAssets.length > 0;

  if (loading) {
    return (
      <div className="asset-picker asset-picker-loading">
        <RefreshCw size={14} className="spin" />
        <span>Loading assets…</span>
      </div>
    );
  }

  if (error || !catalogue || catalogue.assets.length === 0) {
    return (
      <div className="asset-picker asset-picker-empty">
        <Image size={20} />
        <p>No pre-generated assets yet.</p>
        <p className="asset-picker-hint">
          Run image-gen with <code>--posterforge-dir</code> to generate assets.
        </p>
      </div>
    );
  }

  return (
    <div className="asset-picker">
      <div className="asset-picker-header">
        <span>{catalogue.assets.length} asset{catalogue.assets.length !== 1 ? "s" : ""} available</span>
        <button type="button" className="asset-picker-refresh" onClick={load} title="Refresh catalogue">
          <RefreshCw size={13} />
        </button>
      </div>

      {hasThemeAssets && (
        <>
          <p className="asset-picker-section-label">This theme</p>
          <AssetGrid entries={themeAssets} selectedId={selectedAssetId} onSelect={onSelect} />
        </>
      )}

      {otherAssets.length > 0 && (
        <details className="asset-picker-other" open={!hasThemeAssets}>
          <summary>Other themes ({otherAssets.length})</summary>
          <AssetGrid entries={otherAssets} selectedId={selectedAssetId} onSelect={onSelect} />
        </details>
      )}
    </div>
  );
}

function AssetGrid({
  entries,
  selectedId,
  onSelect,
}: {
  entries: CatalogueEntry[];
  selectedId?: string | undefined;
  onSelect: (asset: PosterAsset) => void;
}) {
  return (
    <div className="asset-picker-grid">
      {entries.map((entry) => (
        <button
          type="button"
          key={entry.id}
          className={`asset-picker-card${selectedId === entry.id ? " selected" : ""}`}
          onClick={() =>
            onSelect({
              id: entry.id,
              type: entry.type as PosterAsset["type"],
              role: entry.role as PosterAsset["role"],
              title: entry.title,
              theme: entry.theme,
              url: entry.publicUrl,
              width_px: entry.width_px,
              height_px: entry.height_px,
            })
          }
        >
          <img src={entry.publicUrl} alt={entry.title} loading="lazy" />
          <span>{entry.title}</span>
        </button>
      ))}
    </div>
  );
}
