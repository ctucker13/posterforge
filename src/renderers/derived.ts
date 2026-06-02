import type { ConfusionMatrixData, GanttTaskData, SankeyLink } from "../visuals/data";

export interface ConfusionMatrixSummary {
  total: number;
  accuracy: number;
  precision: number | null;
  recall: number | null;
  cellPercentages: [[number, number], [number, number]];
}

export interface SankeyLinkSummary extends SankeyLink {
  share: number;
  widthPercent: number;
}

export interface GanttSegment extends GanttTaskData {
  offsetPercent: number;
  widthPercent: number;
}

export function summarizeConfusionMatrix(data: ConfusionMatrixData): ConfusionMatrixSummary {
  const [[trueNegative, falsePositive], [falseNegative, truePositive]] = data.matrix;
  const total = trueNegative + falsePositive + falseNegative + truePositive;
  const safeTotal = Math.max(total, 1);
  const precisionDenominator = truePositive + falsePositive;
  const recallDenominator = truePositive + falseNegative;

  return {
    total,
    accuracy: (trueNegative + truePositive) / safeTotal,
    precision: precisionDenominator > 0 ? truePositive / precisionDenominator : null,
    recall: recallDenominator > 0 ? truePositive / recallDenominator : null,
    cellPercentages: [
      [trueNegative / safeTotal, falsePositive / safeTotal],
      [falseNegative / safeTotal, truePositive / safeTotal],
    ],
  };
}

export function summarizeSankeyLinks(links: SankeyLink[]): SankeyLinkSummary[] {
  const total = links.reduce((sum, link) => sum + link.value, 0);
  const max = Math.max(...links.map((link) => link.value), 1);
  const safeTotal = Math.max(total, 1);

  return links.map((link) => ({
    ...link,
    share: link.value / safeTotal,
    widthPercent: Math.max(7, (link.value / max) * 100),
  }));
}

export function buildGanttSegments(tasks: GanttTaskData[]): GanttSegment[] {
  const dates = tasks.flatMap((task) => [Date.parse(task.start), Date.parse(task.end)]).filter(Number.isFinite);
  const min = dates.length ? Math.min(...dates) : 0;
  const max = dates.length ? Math.max(...dates) : min + 1;
  const span = Math.max(max - min, 1);

  return tasks.map((task) => {
    const start = Date.parse(task.start);
    const end = Date.parse(task.end);
    const offsetPercent = Number.isFinite(start) ? clamp(((start - min) / span) * 100, 0, 100) : 0;
    const rawWidth = Number.isFinite(start) && Number.isFinite(end) ? ((end - start) / span) * 100 : 30;
    const widthPercent = clamp(Math.max(rawWidth, 8), 1, 100 - offsetPercent);

    return {
      ...task,
      offsetPercent,
      widthPercent,
    };
  });
}

export function formatPercent(value: number | null): string {
  return value === null ? "n/a" : `${(value * 100).toFixed(1)}%`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
