import { describe, expect, it } from "vitest";
import { examplePoster } from "../data/examplePoster";
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
  parseFlowData,
} from "./data";

function sampleVisualData(id: string) {
  return examplePoster.visuals.find((visual) => visual.id === id)?.data;
}

describe("visual data parsers", () => {
  it("parses supported renderer data from the bundled sample poster", () => {
    expect(parseSourceTextData(sampleVisualData("vis_pipeline_flow"), "mermaid_flow").ok).toBe(true);
    expect(parseTableData(sampleVisualData("vis_performance_table")).ok).toBe(true);
    expect(parseFlowData(sampleVisualData("vis_taste_signals")).ok).toBe(true);
    expect(parseMetricCardData(sampleVisualData("vis_metacritic_coverage")).ok).toBe(true);
    expect(parseTimelineData(sampleVisualData("vis_build_timeline")).ok).toBe(true);
  });

  it("rejects malformed confusion matrix data", () => {
    const parsed = parseConfusionMatrixData({
      labels: ["Negative", "Positive"],
      matrix: [[1, 2, 3]],
    });

    expect(parsed).toEqual({
      ok: false,
      message: "confusion_matrix requires a 2x2 numeric matrix.",
    });
  });

  it("rejects table rows with non-primitive cell values", () => {
    const parsed = parseTableData({
      columns: ["Metric", "Value"],
      rows: [{ Metric: "AUC", Value: { nested: true } }],
    });

    expect(parsed.ok).toBe(false);
  });

  it("rejects flow, timeline, and Gantt records with missing required fields", () => {
    expect(parseSankeyData({ links: [{ source: "A", value: 10 }] }).ok).toBe(false);
    expect(parseTimelineData({ events: [{ date: "Week 1" }] }).ok).toBe(false);
    expect(parseGanttData({ tasks: [{ label: "Build", start: "2026-06-01" }] }).ok).toBe(false);
  });

  it("accepts LaTeX alias source and validates generated visual prompts", () => {
    expect(parseSourceTextData({ latex: "y = mx + b" }, "math")).toEqual({ ok: true, data: { source: "y = mx + b" } });
    expect(parseGeneratedVisualData(undefined)).toEqual({ ok: true, data: {} });
    expect(parseGeneratedVisualData({ prompt: 123 }).ok).toBe(false);
  });
});
