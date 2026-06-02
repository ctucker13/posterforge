import type { PosterSource } from "../domain/poster";

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

export interface SourceDocument {
  id: string;
  source: PosterSource;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
}

export interface SourceConnector {
  id: string;
  name: string;
  search(query: string): Promise<SourceSearchResult[]>;
  fetch(ref: SourceRef): Promise<SourceDocument>;
}
