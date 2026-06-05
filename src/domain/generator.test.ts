import { describe, expect, it } from "vitest";
import { generatePoster } from "./generator";

describe("generatePoster", () => {
  it("creates a source-grounded poster project with evidence artifacts", async () => {
    const poster = await generatePoster({
      prompt: "Explain the GabeChoice recommendation pipeline.",
      theme: "clean-academic",
      palette: "clean-blue",
      sourceMode: "github",
    });

    expect(poster.theme).toBe("clean-academic");
    expect(poster.palette).toBe("clean-blue");
    expect(poster.sourceDocuments?.length).toBeGreaterThan(0);
    expect(poster.sourceSummaries?.length).toBeGreaterThan(0);
    expect(poster.evidence?.length).toBeGreaterThan(0);
    expect(poster.claimMap?.entries.length).toBe(poster.claims.length);
    expect(poster.references?.length).toBe(poster.sources.length);
  });

  it("uses the bundled GitHub fallback package when no live sources are attached", async () => {
    const poster = await generatePoster({
      prompt: "Use GabeChoice repository evidence.",
      theme: "clean-academic",
      palette: "clean-blue",
      sourceMode: "github",
    });

    expect(new Set(poster.sources.map((source) => source.type))).toEqual(new Set(["github"]));
    expect(poster.sources.map((source) => source.title)).toEqual(expect.arrayContaining(["GabeChoice README", "GabeChoice Build Spec"]));
  });
});
