import imagegenThemesRaw from "./imagegen-themes.json";

export interface PosterPalette {
  id: string;
  name: string;
  colors: {
    primary: string;
    accent: string;
    accentDark?: string;
    softAccent?: string;
    lightAccent?: string;
    background: string;
    panel: string;
    ink: string;
  };
}

export interface PosterTheme {
  id: string;
  name: string;
  description: string;
  palette?: string;
  motifs: string[];
  imagePromptPrefix: string;
  logoUrl?: string;
  category?: string;
  collection?: string;
  bestFor?: string[];
}

export type Palette = PosterPalette;
export type ThemeDefinition = PosterTheme;

// ── Built-in themes (take precedence over image-gen registry) ────────────────

const builtinPalettes: Record<string, PosterPalette> = {
  "natwest-group": {
    id: "natwest-group",
    name: "NatWest Group",
    colors: {
      primary: "#3C1053",
      accent: "#E90000",
      accentDark: "#C20000",
      softAccent: "#FBC9CF",
      lightAccent: "#FEDFE2",
      background: "#FFFFFF",
      panel: "#F7F3F8",
      ink: "#1E1028",
    },
  },
  "clean-blue": {
    id: "clean-blue",
    name: "Clean Blue",
    colors: {
      primary: "#17324D",
      accent: "#2176AE",
      background: "#F3F7FA",
      panel: "#FFFFFF",
      ink: "#122232",
    },
  },
  "comic-ink": {
    id: "comic-ink",
    name: "Comic Ink",
    colors: {
      primary: "#171717",
      accent: "#D1272F",
      background: "#FFF7D1",
      panel: "#FFFFFF",
      ink: "#171717",
    },
  },
  "retro-lab": {
    id: "retro-lab",
    name: "Retro Lab",
    colors: {
      primary: "#202045",
      accent: "#FF3D81",
      background: "#EEF0FF",
      panel: "#FFFFFF",
      ink: "#17172F",
    },
  },
};

const builtinThemes: Record<string, PosterTheme> = {
  "natwest-group": {
    id: "natwest-group",
    name: "NatWest Group",
    description: "Polished corporate-academic styling with geometric panels and strong purple/red contrast.",
    palette: "natwest-group",
    motifs: ["angular panels", "cube geometry", "crisp section dividers"],
    imagePromptPrefix:
      "Polished academic data science poster visual, NatWest-inspired purple and red colour palette, crisp geometric panels",
    logoUrl: "/assets/nwg-logo.png",
  },
  "comic-strip": {
    id: "comic-strip",
    name: "Comic Strip Research",
    description: "Panel-based academic storytelling with editorial comic framing and callouts.",
    palette: "comic-ink",
    motifs: ["panel gutters", "callout bubbles", "inked borders", "halftone accents"],
    imagePromptPrefix:
      "Clean editorial comic-strip research poster visual, panelled scientific storytelling, crisp linework",
  },
  "clean-academic": {
    id: "clean-academic",
    name: "Clean Academic",
    description: "Readable conference poster styling with restrained hierarchy and strong chart clarity.",
    palette: "clean-blue",
    motifs: ["thin rules", "spacious sections", "numbered findings"],
    imagePromptPrefix: "Clean academic data science poster visual, subtle scientific illustration, precise and readable",
  },
  "retro-time-lab": {
    id: "retro-time-lab",
    name: "Retro Time Lab",
    description: "Retro science-fiction research dashboard with timelines and instrument-panel motifs.",
    palette: "retro-lab",
    motifs: ["timeline arcs", "instrument panels", "neon annotations", "dashboard labels"],
    imagePromptPrefix:
      "Retro 1980s time-travel science dashboard aesthetic, neon timeline motifs, no logos, no copyrighted characters",
  },
};

// ── Image-gen 60-theme registry ──────────────────────────────────────────────

interface ImagegenThemeEntry {
  id: string;
  name: string;
  description: string;
  palette: string;
  motifs: string[];
  imagePromptPrefix: string;
  category?: string;
  collection?: string;
  bestFor?: string[];
}

interface ImagegenPaletteEntry {
  id: string;
  name: string;
  colors: {
    primary: string;
    accent: string;
    accentDark?: string | null;
    softAccent?: string | null;
    background: string;
    panel: string;
    ink: string;
  };
}

const imagegenThemes: Record<string, PosterTheme> = {};
const imagegenPalettes: Record<string, PosterPalette> = {};

for (const t of imagegenThemesRaw.themes as ImagegenThemeEntry[]) {
  imagegenThemes[t.id] = {
    id: t.id,
    name: t.name,
    description: t.description,
    palette: t.id,
    motifs: t.motifs,
    imagePromptPrefix: t.imagePromptPrefix,
    ...(t.category != null && { category: t.category }),
    ...(t.collection != null && { collection: t.collection }),
    ...(t.bestFor != null && { bestFor: t.bestFor }),
  };
}

for (const p of imagegenThemesRaw.palettes as ImagegenPaletteEntry[]) {
  imagegenPalettes[p.id] = {
    id: p.id,
    name: p.name,
    colors: {
      primary: p.colors.primary,
      accent: p.colors.accent,
      ...(p.colors.accentDark != null && { accentDark: p.colors.accentDark }),
      ...(p.colors.softAccent != null && { softAccent: p.colors.softAccent }),
      background: p.colors.background,
      panel: p.colors.panel,
      ink: p.colors.ink,
    },
  };
}

// ── Merged exports (built-in themes override image-gen on ID collision) ───────

export const palettes: Record<string, PosterPalette> = {
  ...imagegenPalettes,
  ...builtinPalettes,
};

export const themes: Record<string, PosterTheme> = {
  ...imagegenThemes,
  ...builtinThemes,
};

export function resolvePalette(themeId: string, paletteOverride?: string | undefined): PosterPalette {
  const theme = themes[themeId] ?? themes["clean-academic"];
  const paletteId = paletteOverride ?? theme?.palette ?? "clean-blue";
  return (
    palettes[paletteId] ??
    palettes["clean-blue"] ?? {
      id: "clean-blue",
      name: "Clean Blue",
      colors: { primary: "#17324D", accent: "#2176AE", background: "#F3F7FA", panel: "#FFFFFF", ink: "#122232" },
    }
  );
}
