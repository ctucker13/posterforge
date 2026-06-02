import type { PosterBlock, PosterProject, PosterSection, PosterVisual } from "../domain/poster";
import { resolvePalette } from "../themes";

export interface PptxPosterCell {
  sectionId: string;
  title: string;
  x: number;
  y: number;
  w: number;
  h: number;
  blockCount: number;
}

export interface PptxPosterPlan {
  slideWidth: number;
  slideHeight: number;
  cells: PptxPosterCell[];
}

const slideWidth = 13.333;
const slideHeight = 7.5;

export function buildPptxPosterPlan(poster: PosterProject): PptxPosterPlan {
  const margin = 0.35;
  const headerHeight = 0.95;
  const footerHeight = 0.28;
  const gap = 0.18;
  const columns = poster.sections.length <= 4 ? 2 : 3;
  const rows = Math.max(1, Math.ceil(poster.sections.length / columns));
  const contentY = margin + headerHeight;
  const contentHeight = slideHeight - contentY - footerHeight - margin;
  const cellWidth = (slideWidth - margin * 2 - gap * (columns - 1)) / columns;
  const cellHeight = (contentHeight - gap * (rows - 1)) / rows;

  return {
    slideWidth,
    slideHeight,
    cells: poster.sections.map((section, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);

      return {
        sectionId: section.id,
        title: section.title,
        x: margin + column * (cellWidth + gap),
        y: contentY + row * (cellHeight + gap),
        w: cellWidth,
        h: cellHeight,
        blockCount: section.blocks.length,
      };
    }),
  };
}

export async function downloadPosterPptx(poster: PosterProject) {
  const pptx = await buildPosterPptx(poster);
  await pptx.writeFile({ fileName: `${poster.id || "poster"}.pptx` });
}

export async function buildPosterPptx(poster: PosterProject) {
  const { default: pptxgen } = await import("pptxgenjs");
  const pptx = new pptxgen();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "PosterForge";
  pptx.company = "PosterForge";
  pptx.subject = poster.metadata?.prompt ?? "Source-grounded academic poster";
  pptx.title = poster.title;

  const palette = resolvePalette(poster.theme, poster.palette);
  const colors = {
    primary: toHex(palette.colors.primary),
    accent: toHex(palette.colors.accent),
    background: toHex(palette.colors.background),
    panel: toHex(palette.colors.panel),
    ink: toHex(palette.colors.ink),
    muted: "667085",
    white: "FFFFFF",
  };

  const slide = pptx.addSlide();
  slide.background = { color: colors.background };

  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: slideWidth,
    h: 0.18,
    fill: { color: colors.primary },
    line: { color: colors.primary },
  });
  slide.addText(poster.title, {
    x: 0.35,
    y: 0.32,
    w: 9.3,
    h: 0.42,
    margin: 0,
    fontFace: "Aptos Display",
    fontSize: 25,
    bold: true,
    color: colors.ink,
    fit: "shrink",
  });
  slide.addText(poster.subtitle ?? poster.audience ?? "", {
    x: 0.36,
    y: 0.76,
    w: 9.2,
    h: 0.28,
    margin: 0,
    fontFace: "Aptos",
    fontSize: 8.5,
    color: colors.muted,
    fit: "shrink",
  });
  slide.addText(`${poster.layout.replace(/-/g, " ")} | ${poster.theme} | ${poster.palette ?? "theme default"}`, {
    x: 10.15,
    y: 0.38,
    w: 2.95,
    h: 0.32,
    margin: 0,
    fontFace: "Aptos",
    fontSize: 8,
    bold: true,
    align: "right",
    color: colors.primary,
    fit: "shrink",
  });

  const plan = buildPptxPosterPlan(poster);
  const visualMap = new Map(poster.visuals.map((visual) => [visual.id, visual]));
  for (const cell of plan.cells) {
    const section = poster.sections.find((item) => item.id === cell.sectionId);
    if (section) {
      await renderSection(slide, pptx, section, cell, visualMap, colors);
    }
  }

  slide.addText(`Sources: ${poster.sources.length} | Claims: ${poster.claims.length} | Generated from PosterProject JSON`, {
    x: 0.35,
    y: 7.18,
    w: 12.6,
    h: 0.18,
    margin: 0,
    fontFace: "Aptos",
    fontSize: 6.5,
    color: colors.muted,
  });

  return pptx;
}

async function renderSection(
  slide: any,
  pptx: any,
  section: PosterSection,
  cell: PptxPosterCell,
  visualMap: Map<string, PosterVisual>,
  colors: Record<string, string>,
) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x: cell.x,
    y: cell.y,
    w: cell.w,
    h: cell.h,
    rectRadius: 0.07,
    fill: { color: colors.panel },
    line: { color: "D0D5DD", width: 0.6 },
  });
  slide.addText(section.title, {
    x: cell.x + 0.14,
    y: cell.y + 0.12,
    w: cell.w - 0.28,
    h: 0.24,
    margin: 0,
    fontFace: "Aptos Display",
    fontSize: 10.5,
    bold: true,
    color: colors.primary,
    fit: "shrink",
  });

  let cursorY = cell.y + 0.48;
  const maxY = cell.y + cell.h - 0.16;
  for (const block of section.blocks) {
    const remaining = maxY - cursorY;
    if (remaining < 0.2) {
      break;
    }

    const usedHeight = await renderBlock(slide, pptx, block, visualMap, colors, {
      x: cell.x + 0.14,
      y: cursorY,
      w: cell.w - 0.28,
      h: Math.min(remaining, 0.7),
    });
    cursorY += usedHeight + 0.11;
  }
}

async function renderBlock(
  slide: any,
  pptx: any,
  block: PosterBlock,
  visualMap: Map<string, PosterVisual>,
  colors: Record<string, string>,
  box: { x: number; y: number; w: number; h: number },
) {
  if (block.type === "text") {
    const text = compactText(block.text, 260);
    slide.addText(text, {
      ...box,
      h: Math.max(0.28, Math.min(0.72, text.length / 360 + 0.22)),
      margin: 0.03,
      fontFace: "Aptos",
      fontSize: 7.6,
      color: colors.ink,
      breakLine: false,
      fit: "shrink",
    });
    return Math.max(0.32, Math.min(0.74, text.length / 360 + 0.24));
  }

  const visual = visualMap.get(block.visual_id);
  const imageUrl = visual?.asset?.url;
  const imageData = imageUrl ? await fetchImageAsDataUri(imageUrl) : undefined;
  const visualHeight = Math.max(0.42, Math.min(0.82, box.h));

  if (imageData) {
    slide.addImage({
      data: imageData,
      x: box.x,
      y: box.y,
      w: box.w,
      h: visualHeight,
      sizing: { type: "cover", x: box.x, y: box.y, w: box.w, h: visualHeight },
      altText: visual?.title ?? block.visual_id,
    });
    return visualHeight;
  }

  slide.addShape(pptx.ShapeType.roundRect, {
    x: box.x,
    y: box.y,
    w: box.w,
    h: visualHeight,
    rectRadius: 0.04,
    fill: { color: colors.white },
    line: { color: colors.accent, width: 0.6 },
  });
  slide.addText(visual?.title ?? block.visual_id, {
    x: box.x + 0.08,
    y: box.y + 0.08,
    w: box.w - 0.16,
    h: 0.18,
    margin: 0,
    fontFace: "Aptos",
    fontSize: 7.2,
    bold: true,
    color: colors.ink,
    fit: "shrink",
  });
  slide.addText(`${visual?.type ?? "missing visual"} | ${(visual?.source_ids ?? []).length} source link(s)`, {
    x: box.x + 0.08,
    y: box.y + 0.3,
    w: box.w - 0.16,
    h: 0.18,
    margin: 0,
    fontFace: "Aptos",
    fontSize: 5.8,
    color: colors.muted,
    fit: "shrink",
  });

  return visualHeight;
}

async function fetchImageAsDataUri(url: string): Promise<string | undefined> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return undefined;
    }

    const blob = await response.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.addEventListener("load", () => resolve(String(reader.result)));
      reader.addEventListener("error", () => resolve(undefined));
      reader.readAsDataURL(blob);
    });
  } catch {
    return undefined;
  }
}

function compactText(text: string, maxLength: number) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1).trim()}...`;
}

function toHex(color: string) {
  return color.replace("#", "").toUpperCase();
}
