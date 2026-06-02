import { describe, expect, it } from "vitest";
import { examplePoster } from "../data/examplePoster";
import type { PosterProject } from "../domain/poster";
import { runQa } from "./index";

describe("runQa", () => {
  it("passes the bundled sample poster", () => {
    expect(runQa(examplePoster)).toEqual([]);
  });

  it("flags unsupported claims and factual visuals without sources", () => {
    const poster: PosterProject = {
      ...examplePoster,
      sources: [],
      references: [],
      claims: [
        {
          id: "claim_without_source",
          text: "A factual claim needs evidence.",
          source_ids: [],
        },
      ],
      visuals: [
        {
          id: "visual_without_source",
          type: "confusion_matrix",
          title: "Factual visual",
        },
      ],
    };

    const issueIds = runQa(poster).map((issue) => issue.id);

    expect(issueIds).toContain("poster_sources_required");
    expect(issueIds).toContain("claims_require_sources");
    expect(issueIds).toContain("visual_source_traceability");
  });

  it("flags blocks that reference missing visual IDs", () => {
    const poster: PosterProject = {
      ...examplePoster,
      sections: [
        {
          id: "results",
          type: "results",
          title: "Results",
          blocks: [{ type: "visual_ref", visual_id: "missing_visual" }],
        },
      ],
    };

    expect(runQa(poster).map((issue) => issue.id)).toContain("visual_ref_missing");
  });

  it("does not flag generated assets as requiring source links", () => {
    const poster: PosterProject = {
      ...examplePoster,
      visuals: [
        {
          id: "generated_panel",
          type: "generated_comic_panel",
          title: "Generated panel",
          asset: {
            id: "asset_generated_panel",
            type: "generated_panel",
            role: "section_art",
            width_px: 1800,
            height_px: 1200,
          },
        },
      ],
      sections: [
        {
          id: "results",
          type: "results",
          title: "Results",
          blocks: [{ type: "visual_ref", visual_id: "generated_panel" }],
        },
      ],
    };

    const issueIds = runQa(poster).map((issue) => issue.id);

    expect(issueIds).not.toContain("visual_source_traceability");
    expect(issueIds).not.toContain("ai_images_not_factual");
  });

  it("flags dense text blocks that are not linked to claims", () => {
    const poster: PosterProject = {
      ...examplePoster,
      sections: [
        {
          id: "results",
          type: "results",
          title: "Results",
          blocks: [
            {
              type: "text",
              text:
                "This poster panel contains a long paragraph that would be difficult to fit cleanly in a conference poster card. It describes results, methods, source handling, preview rendering, export readiness, quality assurance, and visual planning in one dense block that should be reduced before print export.",
            },
          ],
        },
      ],
    };

    const issueIds = runQa(poster).map((issue) => issue.id);

    expect(issueIds).toContain("text_block_claim_links");
    expect(issueIds).toContain("text_overflow_risk");
  });

  it("flags sources that have no parsed document, summary, or evidence artifacts", () => {
    const poster: PosterProject = {
      ...examplePoster,
      sourceDocuments: [],
      sourceSummaries: [],
      evidence: [],
    };

    const issueIds = runQa(poster).map((issue) => issue.id);

    expect(issueIds).toContain("source_document_missing");
    expect(issueIds).toContain("source_summary_missing");
    expect(issueIds).toContain("source_evidence_missing");
  });

  it("flags generated assets that are missing prompt or model metadata", () => {
    const poster: PosterProject = {
      ...examplePoster,
      assets: [
        {
          id: "asset_without_metadata",
          type: "generated_background",
          role: "background",
          width_px: 2400,
          height_px: 1400,
        },
      ],
    };

    const issueIds = runQa(poster).map((issue) => issue.id);

    expect(issueIds).toContain("generated_asset_prompt_missing");
    expect(issueIds).toContain("generated_asset_model_missing");
  });

  it("flags missing export artifacts by target", () => {
    const poster: PosterProject = {
      ...examplePoster,
      sourceDocuments: [],
      sourceSummaries: [],
      evidence: [],
      claimMap: { entries: [] },
      traces: [],
      qaResults: undefined,
      references: [],
      assets: [],
      visuals: examplePoster.visuals.map((visual) => ({ ...visual, asset: undefined })),
    };

    const exportIssues = runQa(poster).filter((issue) => issue.id === "export_target_readiness");

    expect(exportIssues.map((issue) => issue.location)).toContain("exports.poster_json");
    expect(exportIssues.map((issue) => issue.location)).toContain("exports.project_bundle");
  });

  it("flags visual renderer data shape problems", () => {
    const poster: PosterProject = {
      ...examplePoster,
      visuals: [
        {
          id: "bad_matrix",
          type: "confusion_matrix",
          title: "Bad matrix",
          source_ids: ["src_gitlab_001"],
          data: { labels: ["A", "B"], matrix: [[1, 2, 3]] },
        },
      ],
      sections: [
        {
          id: "results",
          type: "results",
          title: "Results",
          blocks: [{ type: "visual_ref", visual_id: "bad_matrix" }],
        },
      ],
    };

    expect(runQa(poster).map((issue) => issue.id)).toContain("renderer_data_shape");
  });

  it("flags visual label and section density risks", () => {
    const poster: PosterProject = {
      ...examplePoster,
      visuals: [
        {
          id: "long_timeline",
          type: "timeline",
          title: "Long timeline",
          source_ids: ["src_confluence_001"],
          data: {
            events: [
              {
                date: "Week 1",
                label: "A very long milestone label that will likely overflow a compact poster card",
              },
            ],
          },
          options: {
            labelStrategy: "wrap long labels",
          },
        },
      ],
      sections: [
        {
          id: "results",
          type: "results",
          title: "Results",
          blocks: [
            { type: "visual_ref", visual_id: "long_timeline" },
            { type: "visual_ref", visual_id: "long_timeline" },
            { type: "visual_ref", visual_id: "long_timeline" },
            { type: "visual_ref", visual_id: "long_timeline" },
            { type: "visual_ref", visual_id: "long_timeline" },
          ],
        },
      ],
    };

    const issueIds = runQa(poster).map((issue) => issue.id);

    expect(issueIds).toContain("visual_label_overflow_risk");
    expect(issueIds).toContain("section_density_risk");
  });
});
