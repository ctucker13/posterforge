import { describe, expect, it } from "vitest";
import { buildGanttSegments, formatPercent, summarizeConfusionMatrix, summarizeSankeyLinks } from "./derived";

describe("renderer derived data", () => {
  it("summarizes confusion matrix performance metrics", () => {
    const summary = summarizeConfusionMatrix({
      labels: ["Legitimate", "Fraud"],
      matrix: [
        [9412, 188],
        [73, 327],
      ],
    });

    expect(summary.total).toBe(10000);
    expect(formatPercent(summary.accuracy)).toBe("97.4%");
    expect(formatPercent(summary.precision)).toBe("63.5%");
    expect(formatPercent(summary.recall)).toBe("81.8%");
    expect(formatPercent(summary.cellPercentages[0][0])).toBe("94.1%");
  });

  it("summarizes Sankey links with shares and relative widths", () => {
    const summaries = summarizeSankeyLinks([
      { source: "A", target: "B", value: 80 },
      { source: "A", target: "C", value: 20 },
    ]);

    expect(formatPercent(summaries[0]!.share)).toBe("80.0%");
    expect(summaries[0]!.widthPercent).toBe(100);
    expect(summaries[1]!.widthPercent).toBe(25);
  });

  it("builds clamped Gantt segments", () => {
    const segments = buildGanttSegments([
      { label: "A", start: "2026-06-01", end: "2026-06-04" },
      { label: "B", start: "2026-06-03", end: "2026-06-07" },
    ]);

    expect(segments[0]!.offsetPercent).toBe(0);
    expect(segments[0]!.widthPercent).toBeGreaterThan(8);
    expect(segments[1]!.offsetPercent).toBeGreaterThan(0);
    expect(segments[1]!.offsetPercent + segments[1]!.widthPercent).toBeLessThanOrEqual(100);
  });
});
