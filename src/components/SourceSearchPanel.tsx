import { useMemo, useState } from "react";
import { Database, FilePlus2, FileSearch, Globe2, Search } from "lucide-react";
import type { PosterProject, SourceDocument } from "../domain/poster";
import { buildClaimMap } from "../domain/evidence";
import { createReferencesFromSources } from "../sources/mockConnectors";
import { getMockSourceArtifacts, mockSourceConnectors } from "../sources/mockConnectors";
import type { SourceConnector, SourceInterpretation, SourceSearchResult } from "../sources";
import { fetchRepoFiles, parseRepoUrl, type RepoFile } from "../sources/repoConnectors";

interface SourceSearchPanelProps {
  poster: PosterProject;
  onPosterChange: (poster: PosterProject) => void;
}

interface DecoratedSearchResult extends SourceSearchResult {
  connectorName: string;
}

type PanelMode = "search" | "url";

export function SourceSearchPanel({ poster, onPosterChange }: SourceSearchPanelProps) {
  const [mode, setMode] = useState<PanelMode>("search");

  // keyword-search state
  const [query, setQuery] = useState("fraud monitoring calibration");
  const [connectorId, setConnectorId] = useState("all");
  const [results, setResults] = useState<DecoratedSearchResult[]>([]);

  // repo-url state
  const [repoUrl, setRepoUrl] = useState("");
  const [repoFiles, setRepoFiles] = useState<RepoFile[]>([]);

  // shared state
  const [selectedDocument, setSelectedDocument] = useState<SourceDocument | null>(poster.sourceDocuments?.[0] ?? null);
  const [selectedInterpretation, setSelectedInterpretation] = useState<SourceInterpretation | null>(null);
  const [status, setStatus] = useState("Search mock connectors, or paste a GitHub / GitLab repo URL.");
  const [isFetching, setIsFetching] = useState(false);

  const attachedSourceIds = useMemo(() => new Set(poster.sources.map((s) => s.id)), [poster.sources]);

  // ── Keyword search ──────────────────────────────────────────────────────────

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
    setStatus(nextResults.length === 0 ? "No mock sources matched the query." : `${nextResults.length} result${nextResults.length === 1 ? "" : "s"} found.`);
  }

  async function handleFetch(result: DecoratedSearchResult) {
    const connector = mockSourceConnectors.find((c) => c.id === result.ref.connectorId);
    if (!connector) {
      setStatus(`Connector '${result.ref.connectorId}' not available.`);
      return;
    }
    const document = await connector.fetch(result.ref);
    const interpretation = getMockSourceArtifacts(document.source.id) ?? null;
    setSelectedDocument(document);
    setSelectedInterpretation(interpretation);
    setStatus(`Loaded ${document.title}.`);
  }

  // ── Repo URL fetch ──────────────────────────────────────────────────────────

  async function handleRepoFetch() {
    const parsed = parseRepoUrl(repoUrl);
    if (!parsed) {
      setStatus("Enter a valid GitHub or GitLab repo URL (e.g. https://github.com/owner/repo).");
      return;
    }
    setIsFetching(true);
    setRepoFiles([]);
    setSelectedDocument(null);
    setSelectedInterpretation(null);
    setStatus(`Fetching files from ${parsed.kind === "github" ? "GitHub" : "GitLab"}…`);
    try {
      const files = await fetchRepoFiles(parsed);
      if (files.length === 0) {
        setStatus("No recognised files found (looked for README.md, SPEC.md, AGENTS.md, CONTRIBUTING.md, ARCHITECTURE.md).");
      } else {
        setRepoFiles(files);
        setStatus(`Found ${files.length} file${files.length === 1 ? "" : "s"}. Select one to preview.`);
      }
    } catch (err) {
      setStatus(`Fetch failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsFetching(false);
    }
  }

  function handleSelectRepoFile(file: RepoFile) {
    setSelectedDocument(file.interpretation.sourceDocument);
    setSelectedInterpretation(file.interpretation);
    setStatus(`Previewing ${file.path}.`);
  }

  // ── Attach ──────────────────────────────────────────────────────────────────

  function handleAttach() {
    const interpretation = selectedInterpretation;
    if (!interpretation) {
      setStatus("No source loaded to attach.");
      return;
    }

    const sources = upsertById(poster.sources, [interpretation.source]);
    const sourceDocuments = upsertById(poster.sourceDocuments ?? [], [interpretation.sourceDocument]);
    const sourceSummaries = upsertByKey(poster.sourceSummaries ?? [], [interpretation.sourceSummary], "source_id");
    const evidence = upsertById(poster.evidence ?? [], interpretation.evidence);
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
    setStatus(`Attached ${interpretation.source.title}.`);
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <section className="source-search-panel tool-panel" aria-label="Source search">
      <div className="panel-header">
        <h2>Sources</h2>
        <span>{poster.sources.length} attached</span>
      </div>

      <div className="source-search-body">
        <div className="source-mode-toggle view-mode-toggle">
          <button type="button" className={mode === "search" ? "active" : ""} onClick={() => setMode("search")}>
            <Search size={13} /> Search
          </button>
          <button type="button" className={mode === "url" ? "active" : ""} onClick={() => setMode("url")}>
            <Globe2 size={13} /> Repo URL
          </button>
        </div>

        {mode === "search" ? (
          <div className="source-search-controls">
            <label className="field">
              <span>
                <Search size={15} /> Search query
              </span>
              <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSearch()} />
            </label>

            <label className="field">
              <span>
                <Database size={15} /> Connector
              </span>
              <select value={connectorId} onChange={(e) => setConnectorId(e.target.value)}>
                <option value="all">All mock connectors</option>
                {mockSourceConnectors.map((c) => (
                  <option value={c.id} key={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>

            <button type="button" onClick={handleSearch}>
              <Search size={16} /> Search
            </button>
          </div>
        ) : (
          <div className="source-search-controls">
            <label className="field">
              <span>
                <Globe2 size={15} /> GitHub or GitLab repo URL
              </span>
              <input
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleRepoFetch()}
                placeholder="https://github.com/owner/repo"
              />
            </label>

            <button type="button" onClick={handleRepoFetch} disabled={isFetching}>
              <Globe2 size={16} /> {isFetching ? "Fetching…" : "Fetch files"}
            </button>
          </div>
        )}

        <div className="source-search-status">{status}</div>

        {mode === "search" ? (
          <div className="source-results">
            {results.map((result) => (
              <button type="button" key={`${result.ref.connectorId}-${result.ref.sourceId}`} onClick={() => handleFetch(result)}>
                <span>{result.connectorName}</span>
                <strong>{result.title}</strong>
                <p>{result.snippet}</p>
              </button>
            ))}
          </div>
        ) : (
          <div className="source-results">
            {repoFiles.map((file) => (
              <button
                type="button"
                key={file.path}
                onClick={() => handleSelectRepoFile(file)}
                className={selectedDocument?.id === file.interpretation.sourceDocument.id ? "selected" : ""}
              >
                <span>{file.interpretation.source.type}</span>
                <strong>{file.path}</strong>
                <p>{file.interpretation.sourceSummary.summary.slice(0, 120)}</p>
              </button>
            ))}
          </div>
        )}

        {selectedDocument ? (
          <article className="source-document-viewer">
            <div className="source-document-header">
              <div>
                <span>{selectedDocument.source.type.replace(/_/g, " ")}</span>
                <h3>{selectedDocument.title}</h3>
              </div>
              <button type="button" onClick={handleAttach} disabled={!selectedInterpretation}>
                <FilePlus2 size={15} />
                {attachedSourceIds.has(selectedDocument.source.id) ? "Refresh" : "Attach"}
              </button>
            </div>
            <p>{String(selectedDocument.metadata?.summary ?? "")}</p>
            <pre>{selectedDocument.body.slice(0, 800)}</pre>
          </article>
        ) : (
          <div className="source-document-empty">
            <FileSearch size={18} />
            <span>Select a file to preview.</span>
          </div>
        )}
      </div>
    </section>
  );
}

function getActiveConnectors(connectorId: string): SourceConnector[] {
  if (connectorId === "all") return mockSourceConnectors;
  return mockSourceConnectors.filter((c) => c.id === connectorId);
}

function upsertById<Item extends { id: string }>(current: Item[], incoming: Item[]) {
  const byId = new Map(current.map((item) => [item.id, item]));
  for (const item of incoming) byId.set(item.id, item);
  return [...byId.values()];
}

function upsertByKey<Item extends Record<Key, string>, Key extends keyof Item>(current: Item[], incoming: Item[], key: Key) {
  const byKey = new Map(current.map((item) => [item[key], item]));
  for (const item of incoming) byKey.set(item[key], item);
  return [...byKey.values()];
}
