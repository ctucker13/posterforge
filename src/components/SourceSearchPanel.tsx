import { useMemo, useState } from "react";
import { Database, FilePlus2, FileSearch, Search } from "lucide-react";
import type { PosterProject, SourceDocument } from "../domain/poster";
import { buildClaimMap } from "../domain/evidence";
import { createReferencesFromSources } from "../sources/mockConnectors";
import { getMockSourceArtifacts, mockSourceConnectors } from "../sources/mockConnectors";
import type { SourceConnector, SourceSearchResult } from "../sources";

interface SourceSearchPanelProps {
  poster: PosterProject;
  onPosterChange: (poster: PosterProject) => void;
}

interface DecoratedSearchResult extends SourceSearchResult {
  connectorName: string;
}

export function SourceSearchPanel({ poster, onPosterChange }: SourceSearchPanelProps) {
  const [query, setQuery] = useState("fraud monitoring calibration");
  const [connectorId, setConnectorId] = useState("all");
  const [results, setResults] = useState<DecoratedSearchResult[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<SourceDocument | null>(poster.sourceDocuments?.[0] ?? null);
  const [status, setStatus] = useState("Search mock connectors for source documents.");
  const attachedSourceIds = useMemo(() => new Set(poster.sources.map((source) => source.id)), [poster.sources]);

  async function handleSearch() {
    const connectors = getActiveConnectors(connectorId);
    const connectorResults = await Promise.all(
      connectors.map(async (connector) =>
        (await connector.search(query)).map((result) => ({
          ...result,
          connectorName: connector.name,
        })),
      ),
    );
    const nextResults = connectorResults.flat();
    setResults(nextResults);
    setStatus(nextResults.length === 0 ? "No mock sources matched the query." : `${nextResults.length} source result${nextResults.length === 1 ? "" : "s"} found.`);
  }

  async function handleFetch(result: DecoratedSearchResult) {
    const connector = mockSourceConnectors.find((candidate) => candidate.id === result.ref.connectorId);
    if (!connector) {
      setStatus(`Connector '${result.ref.connectorId}' is not available.`);
      return;
    }

    const document = await connector.fetch(result.ref);
    setSelectedDocument(document);
    setStatus(`Loaded ${document.title}.`);
  }

  function handleAttach() {
    if (!selectedDocument) {
      return;
    }

    const artifacts = getMockSourceArtifacts(selectedDocument.source.id);
    if (!artifacts) {
      setStatus("No structured mock artifacts found for this source.");
      return;
    }

    const sources = upsertById(poster.sources, [artifacts.source]);
    const sourceDocuments = upsertById(poster.sourceDocuments ?? [], [artifacts.sourceDocument]);
    const sourceSummaries = upsertByKey(poster.sourceSummaries ?? [], [artifacts.sourceSummary], "source_id");
    const evidence = upsertById(poster.evidence ?? [], artifacts.evidence);
    const claimMap = buildClaimMap(poster.claims, poster.sections, evidence);

    onPosterChange({
      ...poster,
      sources,
      sourceDocuments,
      sourceSummaries,
      evidence,
      claimMap,
      references: createReferencesFromSources(sources),
    });
    setStatus(`Attached ${artifacts.source.title} to poster.json.`);
  }

  return (
    <section className="source-search-panel tool-panel" aria-label="Source search">
      <div className="panel-header">
        <h2>Sources</h2>
        <span>{poster.sources.length} attached</span>
      </div>

      <div className="source-search-body">
        <div className="source-search-controls">
          <label className="field">
            <span>
              <Search size={15} /> Search query
            </span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>

          <label className="field">
            <span>
              <Database size={15} /> Connector
            </span>
            <select value={connectorId} onChange={(event) => setConnectorId(event.target.value)}>
              <option value="all">All mock connectors</option>
              {mockSourceConnectors.map((connector) => (
                <option value={connector.id} key={connector.id}>
                  {connector.name}
                </option>
              ))}
            </select>
          </label>

          <button type="button" onClick={handleSearch}>
            <Search size={16} /> Search
          </button>
        </div>

        <div className="source-search-status">{status}</div>

        <div className="source-results">
          {results.map((result) => (
            <button type="button" key={`${result.ref.connectorId}-${result.ref.sourceId}`} onClick={() => handleFetch(result)}>
              <span>{result.connectorName}</span>
              <strong>{result.title}</strong>
              <p>{result.snippet}</p>
            </button>
          ))}
        </div>

        {selectedDocument ? (
          <article className="source-document-viewer">
            <div className="source-document-header">
              <div>
                <span>{selectedDocument.source.type.replace(/_/g, " ")}</span>
                <h3>{selectedDocument.title}</h3>
              </div>
              <button type="button" onClick={handleAttach}>
                <FilePlus2 size={15} />
                {attachedSourceIds.has(selectedDocument.source.id) ? "Refresh" : "Attach"}
              </button>
            </div>
            <p>{String(selectedDocument.metadata?.summary ?? "")}</p>
            <pre>{selectedDocument.body}</pre>
          </article>
        ) : (
          <div className="source-document-empty">
            <FileSearch size={18} />
            <span>Select a source result to inspect its parsed document.</span>
          </div>
        )}
      </div>
    </section>
  );
}

function getActiveConnectors(connectorId: string): SourceConnector[] {
  if (connectorId === "all") {
    return mockSourceConnectors;
  }

  return mockSourceConnectors.filter((connector) => connector.id === connectorId);
}

function upsertById<Item extends { id: string }>(current: Item[], incoming: Item[]) {
  const byId = new Map(current.map((item) => [item.id, item]));
  for (const item of incoming) {
    byId.set(item.id, item);
  }
  return [...byId.values()];
}

function upsertByKey<Item extends Record<Key, string>, Key extends keyof Item>(current: Item[], incoming: Item[], key: Key) {
  const byKey = new Map(current.map((item) => [item[key], item]));
  for (const item of incoming) {
    byKey.set(item[key], item);
  }
  return [...byKey.values()];
}
