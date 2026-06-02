import { describe, expect, it } from "vitest";
import { examplePoster } from "../data/examplePoster";
import { buildImagePrompt, listImageAssetRequests } from "./imagePrompts";

describe("image asset prompt planning", () => {
  it("lists generated visual and project asset requests from the sample poster", () => {
    const requests = listImageAssetRequests(examplePoster);

    expect(requests.map((request) => request.id)).toEqual(["asset_generated_panel", "asset_hero_atmosphere"]);
    expect(requests[0]).toMatchObject({
      id: "asset_generated_panel",
      visualId: "vis_generated_panel",
      role: "section_art",
      model: "gpt-image-1.5",
      size: "1536x1024",
      outputPath: "public/generated-assets/asset_generated_panel.png",
      metadataPath: "public/generated-assets/asset_generated_panel.json",
    });
  });

  it("adds non-factual guardrails to image prompts", () => {
    const visual = examplePoster.visuals.find((item) => item.id === "vis_generated_panel");
    const prompt = buildImagePrompt(visual?.asset!, visual);

    expect(prompt).toContain("Use this only as non-factual section art");
    expect(prompt).toContain("Do not render exact text, numbers, code, equations, labels, charts, tables, logos, or factual evidence.");
    expect(prompt).toContain("Theme: comic-strip.");
    expect(prompt).toContain("Palette: comic-ink.");
  });
});
