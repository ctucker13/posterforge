import { describe, expect, it } from "vitest";
import { examplePoster } from "../data/examplePoster";
import { buildProjectBundleManifest, buildPptxPosterPlan, exportCapabilities } from "./index";
import { buildHtmlPreviewArtifact, buildHtmlPreviewDescriptor } from "./htmlPreview";
import { createExportJob } from "./model";
import { getExportReadiness, getExportReadinessForTarget } from "./readiness";

describe("exports", () => {
  it("marks JSON, A0 PDF, PPTX compatibility, and bundle manifest export as available", () => {
    const availableIds = exportCapabilities.filter((capability) => capability.status === "available").map((capability) => capability.id);

    expect(availableIds).toEqual(expect.arrayContaining(["poster_json", "pdf", "pptx", "project_bundle"]));
  });

  it("keeps browser-native HTML project export on the planned roadmap", () => {
    expect(exportCapabilities.find((capability) => capability.id === "html_project")).toEqual(
      expect.objectContaining({
        label: "Export editable HTML project",
        status: "planned",
      }),
    );
  });

  it("builds a project bundle manifest with current and planned entries", () => {
    const manifest = buildProjectBundleManifest(examplePoster, "2026-06-02T00:00:00.000Z");

    expect(manifest.posterId).toBe(examplePoster.id);
    expect(manifest.artifacts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "poster_json", status: "ready", path: "poster.json" }),
        expect.objectContaining({ id: "html_preview_descriptor", status: "ready", path: "preview/html-preview.json" }),
        expect.objectContaining({ id: "source_documents", count: examplePoster.sourceDocuments?.length }),
        expect.objectContaining({ id: "pdf", status: "ready" }),
        expect.objectContaining({ id: "html_project", status: "planned" }),
        expect.objectContaining({ id: "pptx", status: "ready" }),
      ]),
    );
  });

  it("builds export jobs using the shared export model", () => {
    const job = createExportJob(examplePoster, "poster_json", "2026-06-02T00:00:00.000Z");

    expect(job).toEqual(
      expect.objectContaining({
        posterId: examplePoster.id,
        target: "poster_json",
        status: "planned",
      }),
    );
  });

  it("reports readiness for current and planned export targets", () => {
    const readiness = getExportReadiness(examplePoster);

    expect(readiness.find((target) => target.target === "poster_json")?.status).toBe("ready");
    expect(readiness.find((target) => target.target === "pdf")?.status).toBe("ready");
    expect(readiness.find((target) => target.target === "html_project")?.status).toBe("planned");
    expect(readiness.find((target) => target.target === "project_bundle")?.status).toBe("ready");
    expect(readiness.find((target) => target.target === "pptx")?.status).toBe("ready");
  });

  it("blocks JSON readiness when trace and QA artifacts are missing", () => {
    const readiness = getExportReadinessForTarget({ ...examplePoster, traces: [], qaResults: undefined }, "poster_json");

    expect(readiness.status).toBe("blocked");
    expect(readiness.blockers).toEqual(expect.arrayContaining(["trace events are missing", "QA results field is missing"]));
  });

  it("builds an HTML preview artifact descriptor", () => {
    const descriptor = buildHtmlPreviewDescriptor(examplePoster);
    const artifact = buildHtmlPreviewArtifact(examplePoster, "2026-06-02T00:00:00.000Z");

    expect(descriptor.visualIds).toContain("vis_confusion_matrix");
    expect(artifact).toEqual(
      expect.objectContaining({
        id: "html_preview_descriptor",
        target: "html_preview",
        status: "ready",
        path: "preview/html-preview.json",
      }),
    );
  });

  it("builds a one-slide PPTX poster layout plan from sections", () => {
    const plan = buildPptxPosterPlan(examplePoster);

    expect(plan.slideWidth).toBeGreaterThan(13);
    expect(plan.slideHeight).toBe(7.5);
    expect(plan.cells).toHaveLength(examplePoster.sections.length + 2);
    expect(plan.cells[0]).toEqual(expect.objectContaining({ sectionId: "hero", blockCount: 1 }));
    expect(plan.cells.map((cell) => cell.sectionId)).toEqual(expect.arrayContaining(["claim_map", "source_bundle"]));
  });
});
