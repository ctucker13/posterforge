import { Palette } from "lucide-react";
import { useState } from "react";
import { palettes, themes } from "../themes";

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
  const [showOverride, setShowOverride] = useState(false);

  return (
    <div className="theme-picker">
      <div className="theme-card-grid">
        {Object.values(themes).map((theme) => {
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
