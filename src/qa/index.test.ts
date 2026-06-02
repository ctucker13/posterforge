import { describe, expect, it } from "vitest";
import { examplePoster } from "../data/examplePoster";
import type { PosterProject } from "../domain/poster";
import { runQa } from "./index";

describe("runQa", () => {
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
});
