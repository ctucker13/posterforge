export type SourceType =
  | "mock"
  | "local_file"
  | "web"
  | "research_paper"
  | "confluence"
  | "gitlab";

export type TrustLevel = "low" | "medium" | "high";
export type TraceStatus = "queued" | "running" | "complete";
export type QaSeverity = "high" | "medium" | "low";

export interface PosterMetadata {
  prompt?: string;
  created_at?: string;
  updated_at?: string;
  generator?: string;
}

export interface PosterSource {
  id: string;
  type: SourceType;
  title: string;
  url?: string;
  accessed_at?: string;
  trust_level?: TrustLevel;
}

export interface PosterClaim {
  id: string;
  text: string;
  source_ids: string[];
  confidence?: TrustLevel;
}

export interface PosterSection {
  id: string;
  type:
    | "hero"
    | "background"
    | "methods"
    | "results"
    | "key_findings"
    | "discussion"
    | "timeline"
    | "references"
    | "custom";
  title: string;
  blocks: PosterBlock[];
}

export type PosterBlock =
  | { type: "text"; text: string; claim_ids?: string[] }
  | { type: "visual_ref"; visual_id: string; caption?: string };

export interface PosterAsset {
  id: string;
  type: "ai_image" | "generated_background" | "generated_panel" | "uploaded_image";
  role: "atmosphere" | "section_art" | "background" | "comic_panel" | "reference";
  title?: string;
  prompt?: string;
  model?: string;
  theme?: string;
  palette?: string;
  source_ids?: string[];
  url?: string;
  width_px?: number;
  height_px?: number;
  metadata?: Record<string, unknown>;
}

export interface PosterVisual {
  id: string;
  type: string;
  title: string;
  source_ids?: string[];
  data?: Record<string, unknown>;
  options?: Record<string, unknown>;
  asset?: PosterAsset;
}

export interface PosterProject {
  id: string;
  metadata?: PosterMetadata;
  title: string;
  subtitle?: string;
  format: {
    size: "A0" | "A1" | "A2" | "custom";
    orientation: "portrait" | "landscape";
  };
  theme: string;
  palette?: string;
  layout: string;
  audience?: string;
  sources: PosterSource[];
  claims: PosterClaim[];
  sections: PosterSection[];
  visuals: PosterVisual[];
  assets?: PosterAsset[];
  references?: Record<string, unknown>[];
  traces?: PosterTraceEvent[];
  qaResults?: PosterQaIssue[];
}

export interface PosterQaIssue {
  id: string;
  severity: QaSeverity;
  message: string;
  location: string;
  suggestedFix?: string;
  autoFixable?: boolean;
  fixId?: "create_references";
}

export interface PosterTraceArtifactRef {
  kind:
    | "poster_spec"
    | "source_index"
    | "source_document"
    | "evidence_map"
    | "claim_map"
    | "layout_plan"
    | "visual_plan"
    | "image_prompt"
    | "render"
    | "qa_report"
    | "export";
  label: string;
}

export interface PosterTraceEvent {
  id: string;
  label: string;
  detail: string;
  status: TraceStatus;
  timestamp?: string;
  artifactRefs?: PosterTraceArtifactRef[];
}

export type QaIssue = PosterQaIssue;
export type TraceEvent = PosterTraceEvent;
