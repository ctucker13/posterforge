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
}

export type Palette = PosterPalette;
export type ThemeDefinition = PosterTheme;

export const palettes: Record<string, PosterPalette> = {
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

export const themes: Record<string, PosterTheme> = {
  "natwest-group": {
    id: "natwest-group",
    name: "NatWest Group",
    description: "Polished corporate-academic styling with geometric panels and strong purple/red contrast.",
    palette: "natwest-group",
    motifs: ["angular panels", "cube geometry", "crisp section dividers"],
    imagePromptPrefix:
      "Polished academic data science poster visual, NatWest-inspired purple and red colour palette, crisp geometric panels",
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

export function resolvePalette(themeId: string, paletteOverride?: string): PosterPalette {
  const theme = themes[themeId] ?? themes["clean-academic"];
  return palettes[paletteOverride ?? theme.palette ?? "clean-blue"] ?? palettes["clean-blue"];
}
