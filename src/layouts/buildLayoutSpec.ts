import type { GeneratedImageSlot, PosterProject } from "../domain/poster";
import type { SlotTemplate } from "../themes";
import { themes } from "../themes";
import imagegenThemes from "../themes/imagegen-themes.json";

export interface ContentRegionSpec {
  id: string;
  x: string;
  y: string;
  width: string;
  height: string;
  type: "text" | "chart" | "metric" | "diagram-node" | "image";
}

export interface LayoutSection {
  id: string;
  role: string;
  width_px: number;
  height_px: number;
  content_anchor: string;
  output_format: string;
  background_strategy: string;
  seed?: number | undefined;
  content_regions: ContentRegionSpec[];
}

export interface LayoutSpec {
  theme_id: string;
  project_title: string;
  project_subtitle?: string | undefined;
  quality: "low" | "medium" | "high";
  sections: LayoutSection[];
}

export interface AssetSidecar {
  id: string;
  publicUrl: string;
  status: "complete" | "pending" | "error";
  seed?: number | undefined;
  contentAnchor?: string | undefined;
  contentRegions?: ContentRegionSpec[] | undefined;
  layoutSectionId?: string | undefined;
  generationParams?: Record<string, unknown> | undefined;
}

type ThemeEntry = {
  id: string;
  backgroundStrategy: "svg" | "svg-hybrid" | "raster";
  density?: string | undefined;
};

const themeMap = new Map<string, ThemeEntry>(
  (imagegenThemes.themes as ThemeEntry[]).map((t) => [t.id, t]),
);

// Fallback sets for any theme not present in imagegen-themes.json
const SVG_THEMES_FALLBACK = new Set([
  "blueprint-engineering", "circuit-board-systems", "swiss-grid-modernism",
  "metro-map-systems-poster", "patent-diagram-poster", "transit-wayfinding-poster",
  "minimalist-conference-poster", "bauhaus-data-poster", "low-poly-geometric-science",
  "infographic-dashboard", "clean-corporate-analytics",
]);

const SVG_HYBRID_THEMES_FALLBACK = new Set([
  "retro-computing-terminal", "whiteboard-explainer", "elegant-mathematical-atlas",
  "academic-chalkboard", "scandinavian-soft-minimal",
]);

export function backgroundStrategyForTheme(themeId: string): "svg" | "svg-hybrid" | "raster" {
  const entry = themeMap.get(themeId);
  if (entry?.backgroundStrategy) return entry.backgroundStrategy;
  if (SVG_THEMES_FALLBACK.has(themeId)) return "svg";
  if (SVG_HYBRID_THEMES_FALLBACK.has(themeId)) return "svg-hybrid";
  return "raster";
}

export function getThemeDensity(themeId: string): "low" | "medium" | "high" {
  const density = themeMap.get(themeId)?.density;
  if (density === "low" || density === "high") return density;
  return "medium";
}

export const SECTION_ART_CONTENT_REGIONS: ContentRegionSpec[] = [
  { id: "title", x: "5%",  y: "5%",  width: "90%", height: "15%", type: "text" },
  { id: "body",  x: "5%",  y: "22%", width: "58%", height: "55%", type: "text" },
  { id: "chart", x: "65%", y: "22%", width: "30%", height: "55%", type: "chart" },
];

/**
 * Converts a theme's `slotTemplates` into concrete `GeneratedImageSlot[]` for a
 * poster. Each `section_art` template is expanded once per `sectionId`; all other
 * roles produce a single slot per template entry.
 */
export function buildSlotsFromTemplates(
  templates: SlotTemplate[],
  sectionIds: string[],
): GeneratedImageSlot[] {
  const slots: GeneratedImageSlot[] = [];
  for (const tmpl of templates) {
    const base = {
      width_px: tmpl.widthPx,
      height_px: tmpl.heightPx,
      ...(tmpl.x != null && { x: tmpl.x }),
      ...(tmpl.y != null && { y: tmpl.y }),
      ...(tmpl.objectPosition != null && { objectPosition: tmpl.objectPosition }),
      ...(tmpl.contentRegions != null && { contentRegions: tmpl.contentRegions.map((r) => ({ ...r })) }),
    };

    if (tmpl.role === "section_art") {
      for (const sectionId of sectionIds) {
        slots.push({
          id: `${tmpl.id}_${sectionId}`,
          role: "section_art",
          outputFormat: "png",
          ...base,
          // section_art positions are layout-dependent; clear template x/y so
          // Phase 4 can compute them from the live DOM.
          x: undefined,
          y: undefined,
          contentRegions: tmpl.contentRegions?.map((r) => ({ ...r })),
        });
      }
    } else {
      slots.push({
        id: tmpl.id,
        role: tmpl.role,
        outputFormat: tmpl.role === "background" ? "webp" : "png",
        ...base,
      });
    }
  }
  return slots;
}

export function buildLayoutSpec(
  poster: PosterProject,
  quality: "low" | "medium" | "high" = "medium",
  canvasW = 1536,
  canvasH = 864,
): LayoutSpec {
  const bgStrategy = backgroundStrategyForTheme(poster.theme);
  const theme = themes[poster.theme];
  const sectionIds = poster.sections.slice(0, 4).map((s) => s.id);

  const header = {
    theme_id: poster.theme,
    project_title: poster.title,
    ...(poster.subtitle ? { project_subtitle: poster.subtitle } : {}),
    quality,
  };

  // If the theme defines slot templates, derive sections from them.
  if (theme?.slotTemplates && theme.slotTemplates.length > 0) {
    const sections: LayoutSection[] = [];
    for (const tmpl of theme.slotTemplates) {
      if (tmpl.role === "section_art") {
        for (const sectionId of sectionIds) {
          sections.push({
            id: `${tmpl.id}_${sectionId}`,
            role: "section_art",
            width_px: tmpl.widthPx,
            height_px: tmpl.heightPx,
            content_anchor: "center",
            output_format: "png",
            background_strategy: "raster",
            content_regions: (tmpl.contentRegions ?? []).map((r) => ({ ...r })),
          });
        }
      } else {
        sections.push({
          id: tmpl.id,
          role: tmpl.role,
          width_px: tmpl.widthPx,
          height_px: tmpl.heightPx,
          content_anchor: "center",
          output_format: tmpl.role === "background" ? "webp" : "png",
          // background role respects theme strategy; all other roles (hero_illustration,
          // section_art) always need raster generation regardless of theme background type
          background_strategy: tmpl.role === "background" ? bgStrategy : "raster",
          content_regions: (tmpl.contentRegions ?? []).map((r) => ({ ...r })),
        });
      }
    }
    return { ...header, sections: sections.filter((s) => s.background_strategy === "raster") };
  }

  // Fallback: hardcoded slot structure
  const sections: LayoutSection[] = [];

  sections.push({
    id: "hero-background",
    role: "background",
    width_px: canvasW,
    height_px: canvasH,
    content_anchor: "center",
    output_format: "webp",
    background_strategy: bgStrategy,
    content_regions: [],
  });

  if (bgStrategy === "raster") {
    for (const sectionId of sectionIds) {
      sections.push({
        id: `section-art-${sectionId}`,
        role: "section_art",
        width_px: 720,
        height_px: 480,
        content_anchor: "center",
        output_format: "png",
        background_strategy: "raster",
        content_regions: SECTION_ART_CONTENT_REGIONS,
      });
    }
  }

  return { ...header, sections: sections.filter((s) => s.background_strategy === "raster") };
}
