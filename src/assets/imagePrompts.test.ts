import { describe, expect, it } from "vitest";
import { examplePoster } from "../data/examplePoster";
import { buildImagePrompt, listImageAssetRequests } from "./imagePrompts";

describe("image asset prompt planning", () => {
  it("lists generated visual and project asset requests from the sample poster", () => {
    const requests = listImageAssetRequests(examplePoster);

    expect(requests).toEqual([]);
  });

  it("adds non-factual guardrails to image prompts", () => {
    const prompt = buildImagePrompt({
      id: "asset_gabechoice_panel",
      type: "ai_image",
      role: "section_art",
      prompt: "abstract Steam recommendation workflow panel",
      theme: "clean-academic",
      palette: "clean-blue",
    });

    expect(prompt).toContain("Use this only as non-factual section art");
    expect(prompt).toContain("Do not render exact text, numbers, code, equations, labels, charts, tables, logos, or factual evidence.");
    expect(prompt).toContain("Theme: clean-academic.");
    expect(prompt).toContain("Palette: clean-blue.");
  });
});
