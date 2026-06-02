import type { PosterBlock, PosterProject, PosterSection, PosterVisual } from "../domain/poster";
import { buildGanttSegments, formatPercent, summarizeConfusionMatrix, summarizeSankeyLinks } from "../renderers/derived";
import { resolvePalette } from "../themes";
import {
  parseCodeBlockData,
  parseConfusionMatrixData,
  parseGanttData,
  parseGeneratedVisualData,
  parseMetricCardData,
  parseSankeyData,
  parseSourceTextData,
  parseTableData,
  parseTimelineData,
  type TableCell,
} from "../visuals/data";

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
  const previewCards = getPreviewCards(poster);
  const margin = 0.35;
  const headerHeight = 0.95;
  const footerHeight = 0.28;
  const gap = 0.18;
  const columns = previewCards.length <= 4 ? 2 : 3;
  const rows = Math.max(1, Math.ceil(previewCards.length / columns));
  const contentY = margin + headerHeight;
  const contentHeight = slideHeight - contentY - footerHeight - margin;
  const cellWidth = (slideWidth - margin * 2 - gap * (columns - 1)) / columns;
  const cellHeight = (contentHeight - gap * (rows - 1)) / rows;

  return {
    slideWidth,
    slideHeight,
    cells: previewCards.map((section, index) => {
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
  const previewCards = getPreviewCards(poster);
  for (const cell of plan.cells) {
    const section = previewCards.find((item) => item.id === cell.sectionId);
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

function getPreviewCards(poster: PosterProject): PosterSection[] {
  const claimMap: PosterSection = {
    id: "claim_map",
    type: "custom",
    title: "Claim map",
    blocks: poster.claims.map((claim) => ({
      type: "text",
      text: `${claim.text} Source links: ${claim.source_ids.map((sourceId) => poster.sources.find((source) => source.id === sourceId)?.title ?? sourceId).join(", ") || "No source"}`,
    })),
  };

  const sourceBundle: PosterSection = {
    id: "source_bundle",
    type: "custom",
    title: "Source bundle",
    blocks: poster.sources.map((source) => ({
      type: "text",
      text: `${source.title}${source.trust_level ? ` (${source.trust_level} trust)` : ""}`,
    })),
  };

  return [...poster.sections, claimMap, sourceBundle];
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
  for (const [index, block] of section.blocks.entries()) {
    const remaining = maxY - cursorY;
    if (remaining < 0.2) {
      break;
    }
    const remainingBlocks = section.blocks.length - index;
    const blockHeight = Math.min(remaining, Math.max(0.36, remaining / remainingBlocks - 0.08));

    const usedHeight = await renderBlock(slide, pptx, block, visualMap, colors, {
      x: cell.x + 0.14,
      y: cursorY,
      w: cell.w - 0.28,
      h: blockHeight,
    });
    cursorY += usedHeight + 0.08;
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
    const text = compactText(block.text, 420);
    slide.addText(text, {
      ...box,
      h: Math.max(0.22, Math.min(box.h, text.length / 360 + 0.18)),
      margin: 0.03,
      fontFace: "Aptos",
      fontSize: 7.1,
      color: colors.ink,
      breakLine: false,
      fit: "shrink",
    });
    return Math.max(0.24, Math.min(box.h, text.length / 360 + 0.2));
  }

  const visual = visualMap.get(block.visual_id);
  if (!visual) {
    renderPlaceholderVisual(slide, pptx, block.visual_id, "missing visual", colors, box);
    return box.h;
  }

  const imageUrl = visual?.asset?.url;
  const imageData = imageUrl ? await fetchImageAsDataUri(imageUrl) : undefined;

  if (imageData) {
    slide.addImage({
      data: imageData,
      x: box.x,
      y: box.y,
      w: box.w,
      h: box.h,
      sizing: { type: "cover", x: box.x, y: box.y, w: box.w, h: box.h },
      altText: visual?.title ?? block.visual_id,
    });
    return box.h;
  }

  renderVisual(slide, pptx, visual, colors, box);
  return box.h;
}

function renderVisual(
  slide: any,
  pptx: any,
  visual: PosterVisual,
  colors: Record<string, string>,
  box: { x: number; y: number; w: number; h: number },
) {
  if (visual.type === "confusion_matrix") {
    const parsed = parseConfusionMatrixData(visual.data);
    if (!parsed.ok) {
      renderPlaceholderVisual(slide, pptx, visual.title, parsed.message, colors, box);
      return;
    }

    const summary = summarizeConfusionMatrix(parsed.data);
    const [labelA, labelB] = parsed.data.labels;
    const cells = [
      [`True ${labelA}`, parsed.data.matrix[0][0], summary.cellPercentages[0][0], false],
      [`False ${labelA}`, parsed.data.matrix[0][1], summary.cellPercentages[0][1], true],
      [`False ${labelB}`, parsed.data.matrix[1][0], summary.cellPercentages[1][0], true],
      [`True ${labelB}`, parsed.data.matrix[1][1], summary.cellPercentages[1][1], false],
    ] as const;

    renderVisualShell(slide, pptx, visual.title, `${summary.total.toLocaleString()} cases`, colors, box);
    const gridY = box.y + 0.32;
    const cellW = (box.w - 0.26) / 2;
    const cellH = Math.max(0.18, (box.h - 0.62) / 2);
    cells.forEach(([label, value, percent, error], index) => {
      const x = box.x + 0.08 + (index % 2) * (cellW + 0.1);
      const y = gridY + Math.floor(index / 2) * (cellH + 0.08);
      slide.addShape(pptx.ShapeType.roundRect, {
        x,
        y,
        w: cellW,
        h: cellH,
        rectRadius: 0.03,
        fill: { color: error ? "FFF1F1" : "F2F7F2" },
        line: { color: error ? "E90000" : colors.primary, width: 0.35 },
      });
      slide.addText(label, { x: x + 0.05, y: y + 0.04, w: cellW - 0.1, h: 0.11, margin: 0, fontSize: 4.8, color: colors.muted, fit: "shrink" });
      slide.addText(value.toLocaleString(), { x: x + 0.05, y: y + 0.15, w: cellW - 0.1, h: 0.14, margin: 0, fontSize: 8, bold: true, color: colors.ink, fit: "shrink" });
      slide.addText(formatPercent(percent), { x: x + 0.05, y: y + 0.3, w: cellW - 0.1, h: 0.1, margin: 0, fontSize: 4.6, color: colors.muted, fit: "shrink" });
    });
    renderFooterText(slide, `Accuracy ${formatPercent(summary.accuracy)} | Precision ${formatPercent(summary.precision)} | Recall ${formatPercent(summary.recall)}`, colors, box);
    return;
  }

  if (visual.type === "metric_card") {
    const parsed = parseMetricCardData(visual.data);
    if (!parsed.ok) {
      renderPlaceholderVisual(slide, pptx, visual.title, parsed.message, colors, box);
      return;
    }

    renderVisualShell(slide, pptx, visual.title, parsed.data.label, colors, box);
    slide.addText(String(parsed.data.value), {
      x: box.x + 0.12,
      y: box.y + 0.42,
      w: box.w - 0.24,
      h: Math.max(0.22, box.h - 0.7),
      margin: 0,
      fontSize: 16,
      bold: true,
      color: colors.primary,
      fit: "shrink",
    });
    if (parsed.data.note) {
      renderFooterText(slide, parsed.data.note, colors, box);
    }
    return;
  }

  if (visual.type === "table") {
    const parsed = parseTableData(visual.data);
    if (!parsed.ok) {
      renderPlaceholderVisual(slide, pptx, visual.title, parsed.message, colors, box);
      return;
    }

    renderVisualShell(slide, pptx, visual.title, `${parsed.data.rows.length} rows`, colors, box);
    const columns = parsed.data.columns.slice(0, 3);
    const rows = parsed.data.rows.slice(0, 3);
    const rowH = Math.max(0.12, (box.h - 0.44) / Math.max(rows.length + 1, 1));
    const colW = (box.w - 0.18) / columns.length;
    columns.forEach((column, index) => {
      slide.addText(column, { x: box.x + 0.08 + index * colW, y: box.y + 0.32, w: colW - 0.03, h: rowH, margin: 0.02, fontSize: 4.9, bold: true, color: colors.primary, fit: "shrink" });
    });
    rows.forEach((row, rowIndex) => {
      columns.forEach((column, columnIndex) => {
        const value = Array.isArray(row) ? row[columnIndex] : row[column];
        slide.addText(formatTableCell(value), {
          x: box.x + 0.08 + columnIndex * colW,
          y: box.y + 0.32 + (rowIndex + 1) * rowH,
          w: colW - 0.03,
          h: rowH,
          margin: 0.02,
          fontSize: 4.6,
          color: colors.ink,
          fit: "shrink",
        });
      });
    });
    return;
  }

  if (visual.type === "sankey") {
    const parsed = parseSankeyData(visual.data);
    if (!parsed.ok) {
      renderPlaceholderVisual(slide, pptx, visual.title, parsed.message, colors, box);
      return;
    }

    const summaries = summarizeSankeyLinks(parsed.data.links).slice(0, 4);
    const total = parsed.data.links.reduce((sum, link) => sum + link.value, 0);
    renderVisualShell(slide, pptx, visual.title, `${summaries.length} flows`, colors, box);
    summaries.forEach((link, index) => {
      const y = box.y + 0.34 + index * Math.max(0.13, (box.h - 0.48) / Math.max(summaries.length, 1));
      slide.addText(`${link.source} -> ${link.target}`, { x: box.x + 0.08, y, w: box.w * 0.5, h: 0.12, margin: 0, fontSize: 4.8, color: colors.ink, fit: "shrink" });
      slide.addShape(pptx.ShapeType.rect, { x: box.x + box.w * 0.55, y: y + 0.02, w: (box.w * 0.32 * link.widthPercent) / 100, h: 0.06, fill: { color: colors.accent }, line: { color: colors.accent } });
      slide.addText(link.value.toLocaleString(), { x: box.x + box.w * 0.88, y, w: box.w * 0.1, h: 0.1, margin: 0, fontSize: 4.4, color: colors.muted, fit: "shrink" });
    });
    renderFooterText(slide, `Total flow: ${total.toLocaleString()}`, colors, box);
    return;
  }

  if (visual.type === "timeline") {
    const parsed = parseTimelineData(visual.data);
    if (!parsed.ok) {
      renderPlaceholderVisual(slide, pptx, visual.title, parsed.message, colors, box);
      return;
    }

    renderVisualShell(slide, pptx, visual.title, `${parsed.data.events.length} milestones`, colors, box);
    parsed.data.events.slice(0, 4).forEach((event, index) => {
      const y = box.y + 0.34 + index * Math.max(0.15, (box.h - 0.42) / Math.max(parsed.data.events.length, 1));
      slide.addShape(pptx.ShapeType.ellipse, { x: box.x + 0.08, y: y + 0.01, w: 0.12, h: 0.12, fill: { color: colors.accent }, line: { color: colors.accent } });
      slide.addText(`${event.date}: ${event.label}`, { x: box.x + 0.26, y, w: box.w - 0.34, h: 0.12, margin: 0, fontSize: 5, bold: true, color: colors.ink, fit: "shrink" });
      if (event.detail) {
        slide.addText(event.detail, { x: box.x + 0.26, y: y + 0.12, w: box.w - 0.34, h: 0.1, margin: 0, fontSize: 4.2, color: colors.muted, fit: "shrink" });
      }
    });
    return;
  }

  if (visual.type === "gantt") {
    const parsed = parseGanttData(visual.data);
    if (!parsed.ok) {
      renderPlaceholderVisual(slide, pptx, visual.title, parsed.message, colors, box);
      return;
    }

    const segments = buildGanttSegments(parsed.data.tasks).slice(0, 4);
    renderVisualShell(slide, pptx, visual.title, `${segments.length} tasks`, colors, box);
    segments.forEach((task, index) => {
      const y = box.y + 0.34 + index * Math.max(0.13, (box.h - 0.48) / Math.max(segments.length, 1));
      slide.addText(task.label, { x: box.x + 0.08, y, w: box.w * 0.35, h: 0.11, margin: 0, fontSize: 4.7, color: colors.ink, fit: "shrink" });
      slide.addShape(pptx.ShapeType.rect, { x: box.x + box.w * 0.45, y: y + 0.02, w: box.w * 0.42, h: 0.06, fill: { color: "EAECF0" }, line: { color: "EAECF0" } });
      slide.addShape(pptx.ShapeType.rect, { x: box.x + box.w * 0.45 + (box.w * 0.42 * task.offsetPercent) / 100, y: y + 0.02, w: (box.w * 0.42 * task.widthPercent) / 100, h: 0.06, fill: { color: colors.primary }, line: { color: colors.primary } });
      if (task.status) {
        slide.addText(task.status, { x: box.x + box.w * 0.88, y, w: box.w * 0.1, h: 0.1, margin: 0, fontSize: 4.1, color: colors.muted, fit: "shrink" });
      }
    });
    return;
  }

  if (visual.type === "mermaid_flow" || visual.type === "math") {
    const parsed = parseSourceTextData(visual.data, visual.type);
    renderCodeLikeVisual(slide, pptx, visual.title, parsed.ok ? parsed.data.source : parsed.message, colors, box);
    return;
  }

  if (visual.type === "code_block") {
    const parsed = parseCodeBlockData(visual.data);
    renderCodeLikeVisual(slide, pptx, visual.title, parsed.ok ? parsed.data.code : parsed.message, colors, box);
    return;
  }

  if (["ai_image", "generated_background", "generated_comic_panel"].includes(visual.type)) {
    const parsed = parseGeneratedVisualData(visual.data);
    renderPlaceholderVisual(slide, pptx, visual.title, visual.asset?.prompt ?? (parsed.ok ? parsed.data.prompt : parsed.message) ?? "Generated visual asset slot", colors, box);
    return;
  }

  renderPlaceholderVisual(slide, pptx, visual.title, `${visual.type} renderer pending`, colors, box);
}

function renderVisualShell(slide: any, pptx: any, title: string, meta: string, colors: Record<string, string>, box: { x: number; y: number; w: number; h: number }) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x: box.x,
    y: box.y,
    w: box.w,
    h: box.h,
    rectRadius: 0.04,
    fill: { color: colors.white },
    line: { color: "D0D5DD", width: 0.45 },
  });
  slide.addText(title, {
    x: box.x + 0.08,
    y: box.y + 0.08,
    w: box.w * 0.66,
    h: 0.18,
    margin: 0,
    fontFace: "Aptos",
    fontSize: 6.2,
    bold: true,
    color: colors.ink,
    fit: "shrink",
  });
  slide.addText(meta, {
    x: box.x + box.w * 0.68,
    y: box.y + 0.08,
    w: box.w * 0.28,
    h: 0.18,
    margin: 0,
    fontFace: "Aptos",
    fontSize: 4.8,
    align: "right",
    color: colors.muted,
    fit: "shrink",
  });
}

function renderPlaceholderVisual(slide: any, pptx: any, title: string, detail: string, colors: Record<string, string>, box: { x: number; y: number; w: number; h: number }) {
  renderVisualShell(slide, pptx, title, "placeholder", colors, box);
  slide.addText(compactText(detail, 220), { x: box.x + 0.08, y: box.y + 0.34, w: box.w - 0.16, h: Math.max(0.12, box.h - 0.42), margin: 0, fontSize: 5.1, color: colors.muted, fit: "shrink" });
}

function renderCodeLikeVisual(slide: any, pptx: any, title: string, source: string, colors: Record<string, string>, box: { x: number; y: number; w: number; h: number }) {
  renderVisualShell(slide, pptx, title, "source", colors, box);
  slide.addText(compactText(source, 300), {
    x: box.x + 0.08,
    y: box.y + 0.32,
    w: box.w - 0.16,
    h: Math.max(0.12, box.h - 0.4),
    margin: 0.03,
    fontFace: "Cascadia Mono",
    fontSize: 4.8,
    color: colors.ink,
    fit: "shrink",
  });
}

function renderFooterText(slide: any, text: string, colors: Record<string, string>, box: { x: number; y: number; w: number; h: number }) {
  slide.addText(compactText(text, 180), {
    x: box.x + 0.08,
    y: box.y + box.h - 0.16,
    w: box.w - 0.16,
    h: 0.1,
    margin: 0,
    fontSize: 4.3,
    color: colors.muted,
    fit: "shrink",
  });
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

function formatTableCell(value: TableCell) {
  if (typeof value === "number") {
    return value.toLocaleString();
  }

  return String(value ?? "");
}

function toHex(color: string) {
  return color.replace("#", "").toUpperCase();
}
