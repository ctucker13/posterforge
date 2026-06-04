import { describe, expect, it } from "vitest";
import examplePosterJson from "../../spec/example-poster.json";
import { examplePoster } from "../data/examplePoster";
import type { PosterProject } from "./poster";
import { parsePosterProjectJson, validatePosterProject } from "./validation";
import { migratePosterProject } from "./migration";

describe("validatePosterProject", () => {
  it("accepts the generated sample poster and JSON fixture", () => {
    expect(validatePosterProject(examplePoster).valid).toBe(true);
    expect(validatePosterProject(examplePosterJson).valid).toBe(true);
  });

  it("rejects missing required top-level fields", () => {
    const poster = { ...examplePoster } as Partial<PosterProject>;
    delete poster.title;

    const result = validatePosterProject(poster);

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.issues.map((issue) => issue.path)).toContain("title");
    }
  });

  it("rejects malformed visual reference blocks", () => {
    const poster: PosterProject = {
      ...examplePoster,
      sections: [
        {
          id: "results",
          type: "results",
          title: "Results",
          blocks: [{ type: "visual_ref" } as PosterProject["sections"][number]["blocks"][number]],
        },
      ],
    };

    const result = validatePosterProject(poster);

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.issues.map((issue) => issue.path)).toContain("sections[0].blocks[0].visual_id");
    }
  });

  it("rejects unknown visual references in section blocks", () => {
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

    const result = validatePosterProject(poster);

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: "sections[0].blocks[0].visual_id",
            message: "references unknown visual 'missing_visual'.",
          }),
        ]),
      );
    }
  });

  it("parses valid imported poster JSON into app state", () => {
    const parsed = parsePosterProjectJson(JSON.stringify(examplePosterJson));

    expect(parsed.id).toBe(examplePoster.id);
    expect(parsed.sections[0]?.blocks[0]?.type).toBe("text");
  });

  it("reports JSON parse and validation errors for imports", () => {
    expect(() => parsePosterProjectJson("{")).toThrow("Invalid JSON");
    expect(() => parsePosterProjectJson(JSON.stringify({ ...examplePoster, title: "" }))).toThrow("title: must not be empty");
  });

  it("migrates legacy posters with missing schema metadata", () => {
    const legacy = { ...examplePoster, schemaVersion: undefined, format: undefined } as unknown;
    const result = migratePosterProject(legacy);

    expect(result.poster.schemaVersion).toBe("posterforge.poster.v1");
    expect(result.poster.format).toEqual({ size: "A0", orientation: "landscape" });
    expect(result.changes).toContain("Backfilled missing schemaVersion to v1");
  });

  it("accepts output intent values and rejects invalid ones", () => {
    expect(validatePosterProject({ ...examplePoster, outputIntent: "virtual" }).valid).toBe(true);
    const invalid = validatePosterProject({ ...examplePoster, outputIntent: "screen" });
    expect(invalid.valid).toBe(false);
  });
});
