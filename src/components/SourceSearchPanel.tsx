import { useMemo, useState } from "react";
import { FilePlus2, FileSearch, Github, Globe2 } from "lucide-react";
import type { PosterProject, SourceDocument } from "../domain/poster";
import { buildClaimMap } from "../domain/evidence";
import { createReferencesFromSources } from "../sources/sourceFixtures";
import type { SourceInterpretation } from "../sources";
import { fetchRepoFiles, parseRepoUrl, type RepoFile } from "../sources/repoConnectors";

interface SourceSearchPanelProps {
  poster: PosterProject;
  onPosterChange: (poster: PosterProject) => void;
  onUseExampleRepo?: () => void;
}

const GABECHOICE_REPO_URL = "https://github.com/ctucker13/gabechoice";

export function SourceSearchPanel({ poster, onPosterChange, onUseExampleRepo }: SourceSearchPanelProps) {
  const [repoUrl, setRepoUrl] = useState(GABECHOICE_REPO_URL);
  const [repoFiles, setRepoFiles] = useState<RepoFile[]>([]);

  // shared state
  const [selectedDocument, setSelectedDocument] = useState<SourceDocument | null>(poster.sourceDocuments?.[0] ?? null);
  const [selectedInterpretation, setSelectedInterpretation] = useState<SourceInterpretation | null>(null);
  const [status, setStatus] = useState("Use the GabeChoice example or paste another GitHub / GitLab repo URL.");
  const [isFetching, setIsFetching] = useState(false);

  const attachedSourceIds = useMemo(() => new Set(poster.sources.map((s) => s.id)), [poster.sources]);

  // ── Repo URL fetch ──────────────────────────────────────────────────────────

  async function handleRepoFetch() {
    await fetchRepoUrl(repoUrl);
  }

  async function handleExampleRepoFetch() {
    onUseExampleRepo?.();
    setRepoUrl(GABECHOICE_REPO_URL);
    await fetchRepoUrl(GABECHOICE_REPO_URL);
  }

  async function fetchRepoUrl(url: string) {
    const parsed = parseRepoUrl(url);
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

  function handleAttachAllRepoFiles() {
    if (repoFiles.length === 0) {
      setStatus("Fetch a repository before attaching all files.");
      return;
    }

    const interpretations = repoFiles.map((file) => file.interpretation);
    const sources = upsertById(poster.sources, interpretations.map((item) => item.source));
    const sourceDocuments = upsertById(poster.sourceDocuments ?? [], interpretations.map((item) => item.sourceDocument));
    const sourceSummaries = upsertByKey(poster.sourceSummaries ?? [], interpretations.map((item) => item.sourceSummary), "source_id");
    const evidence = upsertById(poster.evidence ?? [], interpretations.flatMap((item) => item.evidence));
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
    setStatus(`Attached ${repoFiles.length} repository file${repoFiles.length === 1 ? "" : "s"}. Generate will use these sources.`);
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <section className="source-search-panel tool-panel" aria-label="Source search">
      <div className="panel-header">
        <h2>Sources</h2>
        <span>{poster.sources.length} attached</span>
      </div>

      <div className="source-search-body">
        <button type="button" className="github-example-action" onClick={handleExampleRepoFetch} disabled={isFetching}>
          <Github size={16} /> {isFetching ? "Fetching GabeChoice…" : "Use GabeChoice example"}
        </button>

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

          {repoFiles.length > 0 ? (
            <button type="button" onClick={handleAttachAllRepoFiles}>
              <FilePlus2 size={16} /> Attach all files
            </button>
          ) : null}
        </div>

        <div className="source-search-status">{status}</div>

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
