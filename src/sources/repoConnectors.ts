import type { EvidenceItem, PosterSource, SourceDocument } from "../domain/poster";
import type { SourceInterpretation } from "./index";

// ── URL detection ─────────────────────────────────────────────────────────────

export type RepoKind = "github" | "gitlab";

export interface ParsedRepoUrl {
  kind: RepoKind;
  owner: string;
  repo: string;
  baseUrl: string;
}

export function parseRepoUrl(raw: string): ParsedRepoUrl | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }

  const parts = url.pathname.replace(/^\//, "").replace(/\.git$/, "").split("/").filter(Boolean);

  if (url.hostname === "github.com") {
    if (parts.length < 2) return null;
    const owner = parts[0];
    const repo = parts[1];
    if (!owner || !repo) return null;
    return { kind: "github", owner, repo, baseUrl: `https://github.com/${owner}/${repo}` };
  }

  if (url.hostname === "gitlab.com") {
    if (parts.length < 2) return null;
    const repo = parts[parts.length - 1];
    const owner = parts.slice(0, parts.length - 1).join("/");
    if (!owner || !repo) return null;
    return { kind: "gitlab", owner, repo, baseUrl: `https://gitlab.com/${owner}/${repo}` };
  }

  return null;
}

// ── Candidate files to fetch ──────────────────────────────────────────────────

const CANDIDATE_FILES = ["README.md", "SPEC.md", "AGENTS.md", "CONTRIBUTING.md", "ARCHITECTURE.md"];

// ── GitHub ────────────────────────────────────────────────────────────────────

interface GithubTreeEntry {
  name: string;
  path: string;
  type: "file" | "dir";
  download_url: string | null;
}

async function githubRepoDescription(owner: string, repo: string): Promise<string> {
  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
    if (!res.ok) return "";
    const data: { description?: string } = await res.json();
    return data.description ?? "";
  } catch {
    return "";
  }
}

async function githubListFiles(owner: string, repo: string): Promise<{ path: string; downloadUrl: string }[]> {
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/`);
  if (!res.ok) throw new Error(`GitHub API ${res.status}: ${res.statusText}`);
  const entries: GithubTreeEntry[] = await res.json();
  return entries
    .filter((e) => e.type === "file" && CANDIDATE_FILES.includes(e.name) && e.download_url)
    .map((e) => ({ path: e.path, downloadUrl: e.download_url! }));
}

// ── GitLab ────────────────────────────────────────────────────────────────────

interface GitlabProjectInfo {
  id: number;
  description: string;
  default_branch: string;
}

async function gitlabProjectInfo(owner: string, repo: string): Promise<GitlabProjectInfo> {
  const ns = encodeURIComponent(`${owner}/${repo}`);
  const res = await fetch(`https://gitlab.com/api/v4/projects/${ns}`);
  if (!res.ok) throw new Error(`GitLab API ${res.status}: ${res.statusText}`);
  return res.json();
}

async function gitlabListFiles(projectId: number, branch: string): Promise<{ path: string }[]> {
  const res = await fetch(`https://gitlab.com/api/v4/projects/${projectId}/repository/tree?ref=${branch}&per_page=100`);
  if (!res.ok) throw new Error(`GitLab tree ${res.status}`);
  const entries: { name: string; path: string; type: string }[] = await res.json();
  return entries.filter((e) => e.type === "blob" && CANDIDATE_FILES.includes(e.name)).map((e) => ({ path: e.path }));
}

async function gitlabFetchFile(projectId: number, path: string, branch: string): Promise<string> {
  const res = await fetch(
    `https://gitlab.com/api/v4/projects/${projectId}/repository/files/${encodeURIComponent(path)}/raw?ref=${branch}`,
  );
  if (!res.ok) throw new Error(`GitLab file ${res.status}: ${path}`);
  return res.text();
}

// ── Interpretation builder ────────────────────────────────────────────────────

function slug(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/, "");
}

function summarise(body: string): string {
  const stripped = body.replace(/^#{1,3}[^\n]+\n+/, "").trim();
  const para = stripped.split(/\n\n/)[0]?.replace(/\n/g, " ").trim() ?? "";
  const text = para || stripped;
  return text.length > 320 ? text.slice(0, 317) + "…" : text;
}

function buildInterpretation(parsed: ParsedRepoUrl, filePath: string, body: string, repoDescription: string): SourceInterpretation {
  const fileLabel = filePath.replace(/\.md$/i, "").replace(/[_-]/g, " ");
  const sourceId = `src_${parsed.kind}_${slug(parsed.owner)}_${slug(parsed.repo)}_${slug(filePath)}`;
  const fileUrl =
    parsed.kind === "github"
      ? `${parsed.baseUrl}/blob/main/${filePath}`
      : `${parsed.baseUrl}/-/blob/main/${filePath}`;

  const source: PosterSource = {
    id: sourceId,
    type: parsed.kind,
    title: `${parsed.repo} / ${fileLabel}`,
    url: fileUrl,
    accessed_at: new Date().toISOString(),
    trust_level: "medium",
  };

  const summary = summarise(body);

  const sourceDocument: SourceDocument = {
    id: `doc_${sourceId}`,
    source,
    title: source.title,
    body: body.slice(0, 4000),
    metadata: { summary },
  };

  const evidence: EvidenceItem[] = [
    {
      id: `ev_${sourceId}_1`,
      source_id: sourceId,
      kind: "reference",
      text: repoDescription || `Content from ${source.title}.`,
      location: `${parsed.repo} / ${fileLabel}`,
      confidence: "medium",
    },
  ];

  return {
    source,
    sourceDocument,
    sourceSummary: { source_id: sourceId, summary },
    evidence,
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface RepoFile {
  path: string;
  interpretation: SourceInterpretation;
}

export async function fetchRepoFiles(parsed: ParsedRepoUrl): Promise<RepoFile[]> {
  if (parsed.kind === "github") {
    const [files, description] = await Promise.all([
      githubListFiles(parsed.owner, parsed.repo),
      githubRepoDescription(parsed.owner, parsed.repo),
    ]);
    return Promise.all(
      files.map(async ({ path, downloadUrl }) => {
        const body = await (await fetch(downloadUrl)).text();
        return { path, interpretation: buildInterpretation(parsed, path, body, description) };
      }),
    );
  }

  // gitlab
  const info = await gitlabProjectInfo(parsed.owner, parsed.repo);
  const files = await gitlabListFiles(info.id, info.default_branch);
  return Promise.all(
    files.map(async ({ path }) => {
      const body = await gitlabFetchFile(info.id, path, info.default_branch);
      return { path, interpretation: buildInterpretation(parsed, path, body, info.description) };
    }),
  );
}
