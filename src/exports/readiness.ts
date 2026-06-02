import type { PosterProject } from "../domain/poster";
import { validatePosterProject } from "../domain/validation";
import { parseCodeBlockData, parseConfusionMatrixData, parseGanttData, parseMetricCardData, parseSankeyData, parseSourceTextData, parseTableData, parseTimelineData } from "../visuals/data";
import { exportCapabilities } from "./index";
import type { ExportTarget } from "./model";

export interface ExportReadiness {
  target: ExportTarget;
  label: string;
  output: string;
  status: "ready" | "planned" | "blocked";
  requirements: string[];
  blockers: string[];
}

export function getExportReadiness(poster: PosterProject): ExportReadiness[] {
  return exportCapabilities.map((capability) => {
    const blockers = getTargetBlockers(poster, capability.id);
    const status = capability.id === "pdf" || capability.id === "png" ? "planned" : blockers.length > 0 ? "blocked" : "ready";

    return {
      target: capability.id,
      label: capability.label,
      output: capability.output,
      status,
      requirements: capability.requirements,
      blockers: capability.id === "pdf" || capability.id === "png" ? [...blockers, getPlannedBlocker(capability.id)] : blockers,
    };
  });
}

export function getExportReadinessForTarget(poster: PosterProject, target: ExportTarget): ExportReadiness {
  return getExportReadiness(poster).find((item) => item.target === target)!;
}

function getTargetBlockers(poster: PosterProject, target: ExportTarget): string[] {
  const baseBlockers = getPosterJsonBlockers(poster);

  if (target === "poster_json") {
    return baseBlockers;
  }

  if (target === "project_bundle") {
    return [...baseBlockers, ...getBundleBlockers(poster)];
  }

  if (target === "pptx") {
    return [...baseBlockers, ...getRendererBlockers(poster)];
  }

  if (target === "pdf" || target === "png") {
    return [...baseBlockers, ...getRendererBlockers(poster), "Playwright render/export pipeline is not implemented."];
  }

  return baseBlockers;
}

function getPosterJsonBlockers(poster: PosterProject): string[] {
  const validation = validatePosterProject(poster);
  const validationBlockers = validation.valid ? [] : validation.issues.slice(0, 6).map((issue) => `${issue.path}: ${issue.message}`);
  const artifactBlockers = [
    (poster.traces?.length ?? 0) === 0 ? "trace events are missing" : "",
    poster.qaResults === undefined ? "QA results field is missing" : "",
  ].filter(Boolean);

  return [...validationBlockers, ...artifactBlockers];
}

function getBundleBlockers(poster: PosterProject): string[] {
  return [
    (poster.sourceDocuments?.length ?? 0) === 0 ? "source documents are missing" : "",
    (poster.sourceSummaries?.length ?? 0) === 0 ? "source summaries are missing" : "",
    (poster.evidence?.length ?? 0) === 0 ? "evidence items are missing" : "",
    (poster.claimMap?.entries.length ?? 0) === 0 ? "claim map is missing" : "",
    poster.sources.length > 0 && (poster.references?.length ?? 0) === 0 ? "references are missing" : "",
    (poster.traces?.length ?? 0) === 0 ? "trace log is missing" : "",
  ].filter(Boolean);
}

function getRendererBlockers(poster: PosterProject): string[] {
  return poster.visuals.flatMap((visual) => {
    const message = validateRendererData(visual);
    return message ? [`${visual.id}: ${message}`] : [];
  });
}

function validateRendererData(visual: PosterProject["visuals"][number]): string | undefined {
  const result =
    visual.type === "confusion_matrix"
      ? parseConfusionMatrixData(visual.data)
      : visual.type === "table"
        ? parseTableData(visual.data)
        : visual.type === "sankey"
          ? parseSankeyData(visual.data)
          : visual.type === "timeline"
            ? parseTimelineData(visual.data)
            : visual.type === "gantt"
              ? parseGanttData(visual.data)
              : visual.type === "mermaid_flow"
                ? parseSourceTextData(visual.data, "mermaid_flow")
                : visual.type === "math"
                  ? parseSourceTextData(visual.data, "math")
                  : visual.type === "code_block"
                    ? parseCodeBlockData(visual.data)
                    : visual.type === "metric_card"
                      ? parseMetricCardData(visual.data)
                      : undefined;

  return result && !result.ok ? result.message : undefined;
}

function getPlannedBlocker(target: ExportTarget): string {
  if (target === "pdf") {
    return "Print PDF export is planned for the Playwright export layer.";
  }

  if (target === "png") {
    return "Preview PNG export is planned for the Playwright export layer.";
  }

  return "Export target is planned.";
}
