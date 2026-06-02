import { describe, expect, it } from "vitest";
import { buildMockSourcePackage, getMockSourceArtifacts, interpretMockSourceDocument, mockSourceConnectors } from "./mockConnectors";

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

  it("declares connector kind and acquisition capabilities", () => {
    const capabilities = mockSourceConnectors.flatMap((connector) => connector.capabilities.map((capability) => `${connector.kind}:${capability.acquisition}`));

    expect(capabilities).toEqual(
      expect.arrayContaining(["confluence:search", "gitlab:fetch", "research_paper:search", "web:fetch"]),
    );
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

  it("keeps acquisition separate from mock source interpretation", async () => {
    const connector = mockSourceConnectors.find((candidate) => candidate.id === "mock_confluence")!;
    const [result] = await connector.search("workflow");
    const document = await connector.fetch(result.ref);
    const interpretation = interpretMockSourceDocument(document);

    expect(interpretation?.sourceDocument.id).toBe(document.id);
    expect(interpretation?.sourceSummary.summary).toContain("workflow");
    expect(interpretation?.evidence.length).toBeGreaterThan(0);
  });
});
