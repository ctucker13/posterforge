import type { EvidenceItem, PosterProject, PosterSource, SourceDocument, SourceSummary } from "../domain/poster";
import type { SourceConnector, SourceConnectorKind, SourceInterpretation, SourceRef, SourceSearchResult } from "./index";

interface FixtureDocumentSeed {
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

export interface FixtureSourcePackage {
  sources: PosterSource[];
  sourceDocuments: SourceDocument[];
  sourceSummaries: SourceSummary[];
  evidence: EvidenceItem[];
}

export type FixtureSourceArtifacts = SourceInterpretation;

const fixtureDocumentSeeds: FixtureDocumentSeed[] = [
  {
    source: {
      id: "src_gabechoice_readme",
      type: "github",
      title: "GabeChoice README",
      url: "https://github.com/ctucker13/gabechoice/blob/main/README.md",
      accessed_at: "2026-06-05T00:00:00.000Z",
      trust_level: "high",
    },
    body:
      "GabeChoice is a personal agentic Steam recommendation tool. It reads a Steam library and wishlist, builds a taste profile from play history, and produces ranked recommendations with LLM-generated reasoning. Features include parallel Steam fetching, a SQLite enrichment cache, a 5-signal taste profile, blended scoring with 70% LLM taste-fit and 30% Metacritic quality, recent-play awareness, CLI and web entry points, and provider-agnostic LLM support.",
    metadata: {
      summary:
        "README describing GabeChoice features, local setup, Steam data flow, recommendation scoring, and known runtime constraints.",
      methods: ["parallel Steam fetching", "SQLite enrichment cache", "5-signal taste profile", "provider-agnostic LLM support"],
      metrics: ["70% LLM taste-fit", "30% Metacritic quality", "5-signal taste profile", "20-60s LLM latency", "30-day cache TTL"],
      figures: ["LangGraph pipeline diagram", "configuration reference"],
      evidence: [
        {
          kind: "claim",
          text: "GabeChoice reads a Steam library and wishlist, builds a taste profile, and ranks recommendations with LLM-generated reasoning.",
          location: "README / overview",
          confidence: "high",
        },
        {
          kind: "metric",
          text: "Recommendation scoring blends 70% LLM taste-fit with 30% Metacritic quality.",
          location: "README / features",
          confidence: "high",
        },
      ],
    },
  },
  {
    source: {
      id: "src_gabechoice_spec",
      type: "github",
      title: "GabeChoice Build Spec",
      url: "https://github.com/ctucker13/gabechoice/blob/main/SPEC.md",
      accessed_at: "2026-06-05T00:00:00.000Z",
      trust_level: "high",
    },
    body:
      "The build spec defines a LangGraph pipeline with fetch_library and fetch_wishlist running in parallel, enrich_games using Steam appdetails and SQLite cache, build_taste_profile producing structured JSON from top played games, and rank_and_explain generating recommendations. The stack uses Python 3.12, uv, Pydantic v2, LangGraph, httpx, FastAPI, SQLite, Anthropic and OpenAI providers, and vanilla frontend code.",
    metadata: {
      summary: "Build spec describing the LangGraph architecture, data models, cache strategy, LLM nodes, and implementation stack.",
      methods: ["fetch_library and fetch_wishlist run in parallel", "enrich_games uses Steam appdetails with SQLite cache", "build_taste_profile returns structured JSON", "rank_and_explain blends taste fit with quality signal"],
      metrics: ["Python 3.12", "30-day cache TTL", "0.5 req/s Steam appdetails rate limit", "top 20 most-played games"],
      figures: ["architecture overview", "project structure"],
      evidence: [
        {
          kind: "method",
          text: "The LangGraph pipeline fetches library and wishlist data in parallel before enriching games and ranking recommendations.",
          location: "SPEC / architecture overview",
          confidence: "high",
        },
        {
          kind: "metric",
          text: "The Steam appdetails client is rate-limited at 0.5 req/s and cached with a 30-day TTL.",
          location: "SPEC / architecture overview",
          confidence: "high",
        },
      ],
    },
  },
  {
    source: {
      id: "src_gabechoice_agents",
      type: "github",
      title: "GabeChoice Agent Architecture",
      url: "https://github.com/ctucker13/gabechoice/blob/main/AGENTS.md",
      accessed_at: "2026-06-05T00:00:00.000Z",
      trust_level: "medium",
    },
    body:
      "AGENTS.md describes the compiled LangGraph pipeline and each node role. Signal sources are prioritized as recently played, top played, owned unplayed, wishlisted, and trending or new games. The ranking step asks the LLM for pure taste-fit scores, then applies a server-side blend: final_score = 0.70 taste_fit + 0.30 metacritic. Missing Metacritic scores use a neutral baseline.",
    metadata: {
      summary: "Agent architecture notes describing graph node responsibilities, taste-profile signal weighting, and scoring mechanics.",
      methods: ["recently played has strongest signal weight", "LLM returns pure taste-fit scores", "server-side final score blend", "neutral baseline for missing Metacritic scores"],
      metrics: ["0.70 taste_fit", "0.30 metacritic", "top 60 owned unplayed candidates", "top 60 wishlist candidates"],
      evidence: [
        {
          kind: "claim",
          text: "Recently played games are treated as the strongest current signal in the taste profile.",
          location: "AGENTS / signal sources",
          confidence: "medium",
        },
        {
          kind: "method",
          text: "The final recommendation score is computed server-side as 0.70 taste_fit plus 0.30 Metacritic.",
          location: "AGENTS / scoring",
          confidence: "medium",
        },
      ],
    },
  },
];

const connectorDocumentIds: Record<string, string[]> = {
  fixture_github: ["src_gabechoice_readme", "src_gabechoice_spec", "src_gabechoice_agents"],
};

export const sourceFixtureConnectors: SourceConnector[] = [
  createFixtureConnector("fixture_github", "GabeChoice GitHub Fixture", "github"),
];

export function buildFixtureSourcePackage(sourceMode: "github" | "web" | "local"): FixtureSourcePackage {
  void sourceMode;
  const seeds = fixtureDocumentSeeds;
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

export function getFixtureSourceArtifacts(sourceId: string): FixtureSourceArtifacts | undefined {
  const seed = fixtureDocumentSeeds.find((candidate) => candidate.source.id === sourceId);
  if (!seed) {
    return undefined;
  }

  return interpretFixtureSeed(seed);
}

export function interpretFixtureSourceDocument(document: SourceDocument): SourceInterpretation | undefined {
  const seed = fixtureDocumentSeeds.find((candidate) => candidate.source.id === document.source.id);
  return seed ? interpretFixtureSeed(seed) : undefined;
}

function createFixtureConnector(id: string, name: string, kind: SourceConnectorKind): SourceConnector {
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
        throw new Error(`Fixture source '${ref.sourceId}' was not found in connector '${id}'.`);
      }

      return toSourceDocument(seed);
    },
  };
}

function interpretFixtureSeed(seed: FixtureDocumentSeed): SourceInterpretation {
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
  return fixtureDocumentSeeds.filter((seed) => ids.includes(seed.source.id));
}

function toSourceDocument(seed: FixtureDocumentSeed): SourceDocument {
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
