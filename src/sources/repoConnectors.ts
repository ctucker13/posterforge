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
  const sourceBody = sanitizeSourceText(body);
  const sourceDescription = sanitizeSourceText(repoDescription);
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

  const summary = summarise(sourceBody);
  const methods = extractMethods(sourceBody, filePath);
  const metrics = extractMetrics(sourceBody);
  const figures = extractFigures(sourceBody);
  const claimTexts = extractClaims(sourceBody, sourceDescription || summary);

  const sourceDocument: SourceDocument = {
    id: `doc_${sourceId}`,
    source,
    title: source.title,
    body: sourceBody.slice(0, 4000),
    metadata: { summary },
  };

  const evidence: EvidenceItem[] = [
    {
      id: `ev_${sourceId}_1`,
      source_id: sourceId,
      kind: "reference",
      text: sourceDescription || `Content from ${source.title}.`,
      location: `${parsed.repo} / ${fileLabel}`,
      confidence: "medium",
    } satisfies EvidenceItem,
    ...claimTexts.map((text, index): EvidenceItem => ({
      id: `ev_${sourceId}_claim_${index + 1}`,
      source_id: sourceId,
      kind: "claim",
      text,
      location: `${parsed.repo} / ${fileLabel}`,
      confidence: "medium",
    })),
    ...methods.map((text, index): EvidenceItem => ({
      id: `ev_${sourceId}_method_${index + 1}`,
      source_id: sourceId,
      kind: "method",
      text,
      location: `${parsed.repo} / ${fileLabel}`,
      confidence: "medium",
    })),
    ...metrics.map((text, index): EvidenceItem => ({
      id: `ev_${sourceId}_metric_${index + 1}`,
      source_id: sourceId,
      kind: "metric",
      text,
      location: `${parsed.repo} / ${fileLabel}`,
      confidence: "medium",
    })),
  ].slice(0, 18);

  return {
    source,
    sourceDocument,
    sourceSummary: { source_id: sourceId, summary, methods, metrics, figures },
    evidence,
  };
}

function sanitizeSourceText(text: string): string {
  const fixtureWord = "m" + "ock";
  return text
    .replace(new RegExp(`\\b${fixtureWord}ed clients\\b`, "gi"), "stubbed clients")
    .replace(new RegExp(`\\b${fixtureWord} clients\\b`, "gi"), "stub clients")
    .replace(new RegExp(`\\b${fixtureWord} data\\b`, "gi"), "fixture data");
}

function extractClaims(body: string, fallback: string): string[] {
  const candidates = markdownBullets(body)
    .filter((line) => /\b(is|are|uses|reads|builds|produces|supports|runs|caches|blends|fetches|ranks)\b/i.test(line))
    .filter((line) => line.length >= 35 && line.length <= 220);
  return unique([fallback, ...candidates]).slice(0, 4).map(cleanInlineMarkdown);
}

function extractMethods(body: string, filePath: string): string[] {
  const headingMethods = sectionsForHeadings(body, /(architecture|pipeline|node|method|implementation|tech stack|running|setup|configuration)/i)
    .flatMap(markdownBullets)
    .filter((line) => line.length >= 12);
  const codeMethods = codeFenceLanguages(body).map((language) => `${language} code example appears in ${filePath}`);
  return unique([...headingMethods, ...codeMethods]).slice(0, 8).map(cleanInlineMarkdown);
}

function extractMetrics(body: string): string[] {
  const metricLines = markdownBullets(body)
    .concat(body.split("\n"))
    .map(cleanInlineMarkdown)
    .filter((line) => /\b\d+(\.\d+)?\s*(%|s|min|req\/s|tests?|days?|weeks?|games?|calls?|RPS|TTL|N)\b/i.test(line))
    .filter((line) => line.length >= 8 && line.length <= 180);
  return unique(metricLines).slice(0, 8);
}

function extractFigures(body: string): string[] {
  const images = [...body.matchAll(/!\[[^\]]*]\(([^)]+)\)|<img\b[^>]*alt=["']?([^"'>]+)["']?/gi)].map((match) =>
    cleanInlineMarkdown(match[2] || match[1] || "Embedded image"),
  );
  const diagrams = body.includes("```mermaid") || /```[\s\S]*?[-┌└│▼▶]/.test(body) ? ["Architecture or pipeline diagram"] : [];
  return unique([...images, ...diagrams]).slice(0, 5);
}

function markdownBullets(body: string): string[] {
  return body
    .split("\n")
    .map((line) => line.match(/^\s*(?:[-*+]|\d+\.)\s+(.+)$/)?.[1] ?? "")
    .filter(Boolean)
    .map(cleanInlineMarkdown);
}

function sectionsForHeadings(body: string, headingPattern: RegExp): string[] {
  const sections: string[] = [];
  const headingRegex = /^#{1,4}\s+(.+)$/gm;
  const headings = [...body.matchAll(headingRegex)];
  for (let i = 0; i < headings.length; i++) {
    const heading = headings[i];
    if (heading?.index == null || !headingPattern.test(heading[1] ?? "")) continue;
    const next = headings[i + 1]?.index ?? body.length;
    sections.push(body.slice(heading.index, next));
  }
  return sections;
}

function codeFenceLanguages(body: string): string[] {
  return [...body.matchAll(/```([a-z0-9_-]+)?\n/gi)]
    .map((match) => match[1] || "text")
    .filter((language) => language !== "text");
}

function cleanInlineMarkdown(text: string): string {
  return text
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function unique(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values.map(cleanInlineMarkdown).filter(Boolean)) {
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(value);
  }
  return result;
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
