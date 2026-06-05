import { describe, expect, it } from "vitest";
import { buildFixtureSourcePackage, getFixtureSourceArtifacts, interpretFixtureSourceDocument, sourceFixtureConnectors } from "./sourceFixtures";

describe("source fixture connectors", () => {
  it("searches and fetches documents from a connector", async () => {
    const githubConnector = sourceFixtureConnectors.find((connector) => connector.id === "fixture_github");
    expect(githubConnector).toBeDefined();

    const results = await githubConnector!.search("LangGraph");

    expect(results.length).toBeGreaterThan(0);
    expect(results[0]!.source.type).toBe("github");

    const document = await githubConnector!.fetch(results[0]!.ref);

    expect(document.title).toBe(results[0]!.title);
    expect(document.body).toContain("LangGraph");
  });

  it("declares connector kind and acquisition capabilities", () => {
    const capabilities = sourceFixtureConnectors.flatMap((connector) => connector.capabilities.map((capability) => `${connector.kind}:${capability.acquisition}`));

    expect(capabilities).toEqual(
      expect.arrayContaining(["github:search", "github:fetch"]),
    );
  });

  it("builds the bundled GitHub source package", () => {
    const sourcePackage = buildFixtureSourcePackage("github");

    expect(new Set(sourcePackage.sources.map((source) => source.type))).toEqual(new Set(["github"]));
    expect(sourcePackage.evidence.length).toBeGreaterThan(0);
    expect(sourcePackage.sourceDocuments.length).toBeGreaterThan(0);
  });

  it("returns structured artifacts for source attachment", () => {
    const artifacts = getFixtureSourceArtifacts("src_gabechoice_agents");

    expect(artifacts?.source.type).toBe("github");
    expect(artifacts?.sourceDocument.id).toBe("doc_src_gabechoice_agents");
    expect(artifacts?.sourceSummary.source_id).toBe("src_gabechoice_agents");
    expect(artifacts?.evidence.map((item) => item.source_id)).toEqual(["src_gabechoice_agents", "src_gabechoice_agents"]);
  });

  it("keeps acquisition separate from source fixture interpretation", async () => {
    const connector = sourceFixtureConnectors.find((candidate) => candidate.id === "fixture_github")!;
    const [result] = await connector.search("taste profile");
    const document = await connector.fetch(result!.ref);
    const interpretation = interpretFixtureSourceDocument(document);

    expect(interpretation?.sourceDocument.id).toBe(document.id);
    expect(interpretation?.sourceSummary.summary).toContain("GabeChoice");
    expect(interpretation?.evidence.length).toBeGreaterThan(0);
  });
});
