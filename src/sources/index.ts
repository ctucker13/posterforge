import type { PosterSource, SourceDocument } from "../domain/poster";

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
  search(query: string): Promise<SourceSearchResult[]>;
  fetch(ref: SourceRef): Promise<SourceDocument>;
}
