import type { EvidenceItem, PosterSource, SourceDocument, SourceSummary } from "../domain/poster";

export type SourceConnectorKind = "local_file" | "web" | "research_paper" | "confluence" | "gitlab" | "github";

export interface SourceConnectorCapability {
  kind: SourceConnectorKind;
  acquisition: "search" | "fetch" | "upload" | "url";
  status: "available" | "planned";
}

export interface SourceRef {
  connectorId: string;
  sourceId: string;
}

export interface SourceSearchResult {
  ref: SourceRef;
  title: string;
  snippet: string;
  source: PosterSource;
}

export interface SourceConnector {
  id: string;
  name: string;
  kind: SourceConnectorKind;
  capabilities: SourceConnectorCapability[];
  search(query: string): Promise<SourceSearchResult[]>;
  fetch(ref: SourceRef): Promise<SourceDocument>;
}

export interface SourceInterpretation {
  source: PosterSource;
  sourceDocument: SourceDocument;
  sourceSummary: SourceSummary;
  evidence: EvidenceItem[];
}
