import { describe, expect, it } from "vitest";
import { buildMockSourcePackage, getMockSourceArtifacts, mockSourceConnectors } from "./mockConnectors";

describe("mock source connectors", () => {
  it("searches and fetches documents from a connector", async () => {
    const gitlabConnector = mockSourceConnectors.find((connector) => connector.id === "mock_gitlab");
    expect(gitlabConnector).toBeDefined();

    const results = await gitlabConnector!.search("confusion matrix");

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].source.type).toBe("gitlab");

    const document = await gitlabConnector!.fetch(results[0].ref);

    expect(document.title).toBe(results[0].title);
    expect(document.body).toContain("confusion matrix");
  });

  it("builds mode-specific mock source packages", () => {
    const webPackage = buildMockSourcePackage("web");
    const localPackage = buildMockSourcePackage("local");

    expect(new Set(webPackage.sources.map((source) => source.type))).toEqual(new Set(["web", "research_paper"]));
    expect(new Set(localPackage.sources.map((source) => source.type))).toEqual(new Set(["gitlab", "confluence"]));
    expect(webPackage.evidence.length).toBeGreaterThan(0);
    expect(localPackage.sourceDocuments.length).toBeGreaterThan(0);
  });

  it("returns structured artifacts for source attachment", () => {
    const artifacts = getMockSourceArtifacts("src_paper_001");

    expect(artifacts?.source.type).toBe("research_paper");
    expect(artifacts?.sourceDocument.id).toBe("doc_src_paper_001");
    expect(artifacts?.sourceSummary.source_id).toBe("src_paper_001");
    expect(artifacts?.evidence.map((item) => item.source_id)).toEqual(["src_paper_001", "src_paper_001"]);
  });
});
