import type { PosterProject } from "../domain/poster";

export type ExportTarget = "poster_json" | "pptx" | "pdf" | "png" | "project_bundle";
export type ExportArtifactStatus = "planned" | "ready" | "running" | "complete" | "failed";

export type ExportArtifactKind =
  | "poster_spec"
  | "html_preview"
  | "source_document"
  | "source_summary"
  | "evidence"
  | "claim_map"
  | "asset"
  | "trace_log"
  | "qa_report"
  | "reference"
  | "export"
  | "manifest";

export interface ExportArtifact {
  id: string;
  target: ExportTarget | "html_preview";
  kind: ExportArtifactKind;
  path: string;
  mimeType: string;
  status: ExportArtifactStatus;
  label: string;
  createdAt?: string;
  count?: number;
  metadata?: Record<string, unknown>;
}

export interface ExportJob {
  id: string;
  posterId: string;
  target: ExportTarget;
  status: ExportArtifactStatus;
  requestedAt: string;
  completedAt?: string;
  artifacts: ExportArtifact[];
  messages: string[];
}

export interface ExportManifest {
  id: string;
  posterId: string;
  createdAt: string;
  schemaVersion: string;
  artifacts: ExportArtifact[];
}

export function createExportJob(poster: PosterProject, target: ExportTarget, requestedAt = new Date().toISOString()): ExportJob {
  return {
    id: `${poster.id || "poster"}_${target}_${requestedAt.replace(/\W/g, "")}`,
    posterId: poster.id,
    target,
    status: "planned",
    requestedAt,
    artifacts: [],
    messages: [],
  };
}
