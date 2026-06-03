import { describe, expect, it } from "vitest";
import { generatePoster } from "./generator";

describe("generatePoster", () => {
  it("creates a source-grounded poster project with evidence artifacts", async () => {
    const poster = await generatePoster({
      prompt: "Explain fraud model monitoring.",
      theme: "clean-academic",
      palette: "clean-blue",
      sourceMode: "mock",
    });

    expect(poster.theme).toBe("clean-academic");
    expect(poster.palette).toBe("clean-blue");
    expect(poster.sourceDocuments?.length).toBeGreaterThan(0);
    expect(poster.sourceSummaries?.length).toBeGreaterThan(0);
    expect(poster.evidence?.length).toBeGreaterThan(0);
    expect(poster.claimMap?.entries.length).toBe(poster.claims.length);
    expect(poster.references?.length).toBe(poster.sources.length);
  });

  it("filters mock sources by requested source mode", async () => {
    const webPoster = await generatePoster({
      prompt: "Use web and paper evidence.",
      theme: "clean-academic",
      palette: "clean-blue",
      sourceMode: "web",
    });
    const localPoster = await generatePoster({
      prompt: "Use local project evidence.",
      theme: "clean-academic",
      palette: "clean-blue",
      sourceMode: "local",
    });

    expect(new Set(webPoster.sources.map((source) => source.type))).toEqual(new Set(["web", "research_paper"]));
    expect(new Set(localPoster.sources.map((source) => source.type))).toEqual(new Set(["gitlab", "confluence"]));
  });
});
