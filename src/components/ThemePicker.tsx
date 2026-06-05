import { Palette, Search } from "lucide-react";
import { useState } from "react";
import { palettes, themes } from "../themes";

const CATEGORIES = Array.from(new Set(Object.values(themes).map((t) => t.category).filter(Boolean))) as string[];

export function ThemePicker({
  selectedTheme,
  selectedPalette,
  onThemeChange,
  onPaletteChange,
}: {
  selectedTheme: string;
  selectedPalette: string;
  onThemeChange: (theme: string) => void;
  onPaletteChange: (palette: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [showOverride, setShowOverride] = useState(false);

  const allThemes = Object.values(themes);
  const filtered = allThemes.filter((theme) => {
    const matchesQuery =
      !query ||
      theme.name.toLowerCase().includes(query.toLowerCase()) ||
      theme.description.toLowerCase().includes(query.toLowerCase());
    const matchesCategory = !activeCategory || theme.category === activeCategory;
    return matchesQuery && matchesCategory;
  });

  return (
    <div className="theme-picker">
      <div className="theme-picker-search">
        <Search size={14} />
        <input
          type="search"
          placeholder={`Search ${allThemes.length} themes…`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="theme-category-filters">
        <button
          type="button"
          className={activeCategory === null ? "selected" : ""}
          onClick={() => setActiveCategory(null)}
        >
          All
        </button>
        {CATEGORIES.map((cat) => (
          <button
            type="button"
            key={cat}
            className={activeCategory === cat ? "selected" : ""}
            onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="theme-card-grid">
        {filtered.map((theme) => {
          const paletteId = theme.palette ?? "clean-blue";
          const palette = palettes[paletteId] ?? Object.values(palettes)[0];
          if (!palette) return null;
          const isSelected = selectedTheme === theme.id;
          return (
            <button
              type="button"
              className={isSelected ? "selected" : ""}
              style={{ borderColor: isSelected ? palette.colors.primary : undefined }}
              key={theme.id}
              onClick={() => {
                onThemeChange(theme.id);
                onPaletteChange(theme.palette ?? "clean-blue");
              }}
            >
              <strong>{theme.name}</strong>
              <span>{theme.description}</span>
              <div className="palette-swatches" aria-label={`${theme.name} palette`}>
                <i style={{ background: palette.colors.primary }} />
                <i style={{ background: palette.colors.accent }} />
                <i style={{ background: palette.colors.background }} />
                <i style={{ background: palette.colors.ink }} />
              </div>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <p className="theme-picker-empty">No themes match "{query}"</p>
        )}
      </div>

      <button className="palette-override-toggle" type="button" onClick={() => setShowOverride((current) => !current)}>
        <Palette size={15} /> {showOverride ? "Hide palette override" : "Use palette override"}
      </button>

      {showOverride ? (
        <label className="field">
          <span>
            <Palette size={15} /> Palette override
          </span>
          <select value={selectedPalette} onChange={(event) => onPaletteChange(event.target.value)}>
            {Object.values(palettes).map((palette) => (
              <option value={palette.id} key={palette.id}>
                {palette.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </div>
  );
}
