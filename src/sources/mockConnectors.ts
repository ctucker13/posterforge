import type { EvidenceItem, PosterProject, PosterSource, SourceDocument, SourceSummary } from "../domain/poster";
import type { SourceConnector, SourceConnectorKind, SourceInterpretation, SourceRef, SourceSearchResult } from "./index";

interface MockDocumentSeed {
  source: PosterSource;
  body: string;
  metadata: {
    summary: string;
    methods?: string[];
    metrics?: string[];
    figures?: string[];
    evidence: Array<Omit<EvidenceItem, "id" | "source_id">>;
  };
}

export interface MockSourcePackage {
  sources: PosterSource[];
  sourceDocuments: SourceDocument[];
  sourceSummaries: SourceSummary[];
  evidence: EvidenceItem[];
}

export type MockSourceArtifacts = SourceInterpretation;

const mockDocumentSeeds: MockDocumentSeed[] = [
  {
    source: {
      id: "src_confluence_001",
      type: "confluence",
      title: "Fraud Model Project Overview",
      url: "mock://confluence/fraud-model-project-overview",
      accessed_at: "2026-06-01T00:00:00.000Z",
      trust_level: "high",
    },
    body:
      "The monitoring poster should separate workflow, evidence extraction, performance monitoring, calibration, explainability, and operational impact. The delivery narrative should be results-first for an internal data science poster session.",
    metadata: {
      summary:
        "Project overview describing the monitoring workflow, target poster audience, and required separation between evidence streams.",
      methods: ["results-first poster narrative", "separate performance, calibration, explainability, and operational evidence"],
      evidence: [
        {
          kind: "claim",
          text: "The monitoring workflow separates model performance, calibration, explainability, and operational impact.",
          location: "Project overview / monitoring scope",
          confidence: "high",
        },
        {
          kind: "method",
          text: "Use a results-first poster narrative for an internal data science poster session.",
          location: "Project overview / poster brief",
          confidence: "high",
        },
      ],
    },
  },
  {
    source: {
      id: "src_gitlab_001",
      type: "gitlab",
      title: "Model Evaluation README",
      url: "mock://gitlab/fraud-monitoring/README.md",
      accessed_at: "2026-06-01T00:00:00.000Z",
      trust_level: "high",
    },
    body:
      "The README records a sample confusion matrix for legitimate and fraud classes: 9412 true legitimate, 188 false legitimate, 73 false fraud, and 327 true fraud. It also notes that factual visuals should be rendered deterministically.",
    metadata: {
      summary: "Code summary containing sample model evaluation counts and renderer guidance.",
      metrics: ["9412 true legitimate", "188 false legitimate", "73 false fraud", "327 true fraud"],
      figures: ["confusion matrix", "decision flow"],
      evidence: [
        {
          kind: "metric",
          text: "The sample monitoring confusion matrix contains 9412 true legitimate, 188 false legitimate, 73 false fraud, and 327 true fraud cases.",
          location: "README / evaluation metrics",
          confidence: "high",
        },
        {
          kind: "claim",
          text: "The prototype prioritises deterministic visuals for factual charts and generated images for atmosphere.",
          location: "README / renderer guidance",
          confidence: "high",
        },
      ],
    },
  },
  {
    source: {
      id: "src_gitlab_002",
      type: "gitlab",
      title: "Experiment Log And Monitoring Notes",
      url: "mock://gitlab/fraud-monitoring/experiments.md",
      accessed_at: "2026-06-01T00:00:00.000Z",
      trust_level: "medium",
    },
    body:
      "The experiment log tracks review capture rate, false positives, false negatives, and periodic review of calibration drift. It recommends surfacing the review capture rate as a headline metric.",
    metadata: {
      summary: "Experiment notes describing operational monitoring metrics and suggested poster emphasis.",
      metrics: ["review capture rate", "false positives", "false negatives", "calibration drift"],
      evidence: [
        {
          kind: "metric",
          text: "Review capture rate should be surfaced as a headline monitoring metric.",
          location: "Experiment log / poster emphasis",
          confidence: "medium",
        },
        {
          kind: "method",
          text: "False positives, false negatives, and calibration drift are tracked separately.",
          location: "Experiment log / monitoring checklist",
          confidence: "medium",
        },
      ],
    },
  },
  {
    source: {
      id: "src_paper_001",
      type: "research_paper",
      title: "Calibration and Interpretability in Risk Models",
      url: "mock://paper/calibration-interpretability-risk-models",
      accessed_at: "2026-06-01T00:00:00.000Z",
      trust_level: "medium",
    },
    body:
      "The paper summary recommends reporting calibration separately from classification metrics. Expected calibration error can be summarized with binned accuracy and confidence differences. Interpretability should not be conflated with model performance.",
    metadata: {
      summary: "Research paper summary on calibration, interpretability, and risk-model reporting.",
      methods: ["expected calibration error", "separate interpretability from model performance"],
      evidence: [
        {
          kind: "claim",
          text: "Calibration monitoring is treated as a separate evidence stream from raw classification performance.",
          location: "Paper summary / methods",
          confidence: "medium",
        },
        {
          kind: "method",
          text: "Expected calibration error uses binned accuracy and confidence differences.",
          location: "Paper summary / calibration metric",
          confidence: "medium",
        },
      ],
    },
  },
  {
    source: {
      id: "src_web_001",
      type: "web",
      title: "Public Model Monitoring Report Summary",
      url: "mock://web/public-model-monitoring-report",
      accessed_at: "2026-06-01T00:00:00.000Z",
      trust_level: "medium",
    },
    body:
      "A public report summary describes common monitoring dashboards with source traceability, model performance, drift checks, and operational review loops. It emphasizes chart readability and explicit references.",
    metadata: {
      summary: "Public report summary describing common monitoring dashboard and poster-quality reporting practices.",
      methods: ["source traceability", "chart readability", "explicit references"],
      evidence: [
        {
          kind: "reference",
          text: "Monitoring reports should include source traceability, chart readability, and explicit references.",
          location: "Public report summary / reporting practice",
          confidence: "medium",
        },
      ],
    },
  },
];

const connectorDocumentIds: Record<string, string[]> = {
  mock_confluence: ["src_confluence_001"],
  mock_gitlab: ["src_gitlab_001", "src_gitlab_002"],
  mock_research_paper: ["src_paper_001"],
  mock_web: ["src_web_001"],
};

export const mockSourceConnectors: SourceConnector[] = [
  createMockConnector("mock_confluence", "Mock Confluence", "confluence"),
  createMockConnector("mock_gitlab", "Mock GitLab", "gitlab"),
  createMockConnector("mock_research_paper", "Mock Research Paper", "research_paper"),
  createMockConnector("mock_web", "Mock Web Page", "web"),
];

export function buildMockSourcePackage(sourceMode: "mock" | "web" | "local"): MockSourcePackage {
  const sourceTypes =
    sourceMode === "web"
      ? new Set<PosterSource["type"]>(["web", "research_paper"])
      : sourceMode === "local"
        ? new Set<PosterSource["type"]>(["gitlab", "confluence"])
        : new Set<PosterSource["type"]>(["confluence", "gitlab", "research_paper", "web"]);

  const seeds = mockDocumentSeeds.filter((seed) => sourceTypes.has(seed.source.type));
  const sourceDocuments = seeds.map(toSourceDocument);
  const evidence = seeds.flatMap((seed) =>
    seed.metadata.evidence.map((item, index) => ({
      ...item,
      id: `ev_${seed.source.id.replace(/^src_/, "")}_${index + 1}`,
      source_id: seed.source.id,
    })),
  );

  return {
    sources: seeds.map((seed) => seed.source),
    sourceDocuments,
    sourceSummaries: seeds.map((seed) => ({
      source_id: seed.source.id,
      summary: seed.metadata.summary,
      methods: seed.metadata.methods,
      metrics: seed.metadata.metrics,
      figures: seed.metadata.figures,
    })),
    evidence,
  };
}

export function getMockSourceArtifacts(sourceId: string): MockSourceArtifacts | undefined {
  const seed = mockDocumentSeeds.find((candidate) => candidate.source.id === sourceId);
  if (!seed) {
    return undefined;
  }

  return interpretMockSeed(seed);
}

export function interpretMockSourceDocument(document: SourceDocument): SourceInterpretation | undefined {
  const seed = mockDocumentSeeds.find((candidate) => candidate.source.id === document.source.id);
  return seed ? interpretMockSeed(seed) : undefined;
}

function createMockConnector(id: string, name: string, kind: SourceConnectorKind): SourceConnector {
  return {
    id,
    name,
    kind,
    capabilities: [
      { kind, acquisition: "search", status: "available" },
      { kind, acquisition: "fetch", status: "available" },
    ],
    async search(query: string) {
      const tokens = query.toLowerCase().split(/\W+/).filter(Boolean);
      return getConnectorSeeds(id)
        .filter((seed) => {
          const haystack = `${seed.source.title} ${seed.body} ${seed.metadata.summary}`.toLowerCase();
          return tokens.length === 0 || tokens.some((token) => haystack.includes(token));
        })
        .map((seed) => ({
          ref: { connectorId: id, sourceId: seed.source.id },
          title: seed.source.title,
          snippet: seed.metadata.summary,
          source: seed.source,
        }));
    },
    async fetch(ref: SourceRef) {
      const seed = getConnectorSeeds(id).find((candidate) => candidate.source.id === ref.sourceId);
      if (!seed) {
        throw new Error(`Mock source '${ref.sourceId}' was not found in connector '${id}'.`);
      }

      return toSourceDocument(seed);
    },
  };
}

function interpretMockSeed(seed: MockDocumentSeed): SourceInterpretation {
  return {
    source: seed.source,
    sourceDocument: toSourceDocument(seed),
    sourceSummary: {
      source_id: seed.source.id,
      summary: seed.metadata.summary,
      methods: seed.metadata.methods,
      metrics: seed.metadata.metrics,
      figures: seed.metadata.figures,
    },
    evidence: seed.metadata.evidence.map((item, index) => ({
      ...item,
      id: `ev_${seed.source.id.replace(/^src_/, "")}_${index + 1}`,
      source_id: seed.source.id,
    })),
  };
}

function getConnectorSeeds(connectorId: string) {
  const ids = connectorDocumentIds[connectorId] ?? [];
  return mockDocumentSeeds.filter((seed) => ids.includes(seed.source.id));
}

function toSourceDocument(seed: MockDocumentSeed): SourceDocument {
  return {
    id: `doc_${seed.source.id}`,
    source: seed.source,
    title: seed.source.title,
    body: seed.body,
    metadata: {
      summary: seed.metadata.summary,
      methods: seed.metadata.methods,
      metrics: seed.metadata.metrics,
      figures: seed.metadata.figures,
    },
  };
}

export function createReferencesFromSources(sources: PosterProject["sources"]) {
  return sources.map((source) => ({
    id: source.id,
    title: source.title,
    type: source.type,
    url: source.url,
    accessed_at: source.accessed_at,
  }));
}
