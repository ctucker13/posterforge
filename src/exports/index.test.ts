import { describe, expect, it } from "vitest";
import { examplePoster } from "../data/examplePoster";
import { buildProjectBundleManifest, exportCapabilities } from "./index";

describe("exports", () => {
  it("marks JSON and bundle manifest export as available", () => {
    const availableIds = exportCapabilities.filter((capability) => capability.status === "available").map((capability) => capability.id);

    expect(availableIds).toEqual(expect.arrayContaining(["poster_json", "project_bundle"]));
  });

  it("builds a project bundle manifest with current and planned entries", () => {
    const manifest = buildProjectBundleManifest(examplePoster, "2026-06-02T00:00:00.000Z");

    expect(manifest.posterId).toBe(examplePoster.id);
    expect(manifest.entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "poster_json", status: "available", path: "poster.json" }),
        expect.objectContaining({ id: "source_documents", count: examplePoster.sourceDocuments?.length }),
        expect.objectContaining({ id: "pptx", status: "planned" }),
        expect.objectContaining({ id: "pdf", status: "planned" }),
      ]),
    );
  });
});
