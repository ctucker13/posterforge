export type SourceType =
  | "mock"
  | "local_file"
  | "web"
  | "research_paper"
  | "confluence"
  | "gitlab"
  | "github";

export type TrustLevel = "low" | "medium" | "high";
export type TraceStatus = "queued" | "running" | "complete";
export type QaSeverity = "high" | "medium" | "low";
export type PosterLayoutId =
  | "three-column-academic"
  | "results-first"
  | "timeline-process"
  | "dashboard-poster"
  | "comic-strip-narrative"
  | "case-study-poster";

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

export interface SourceDocument {
  id: string;
  source: PosterSource;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
}

export interface SourceSummary {
  source_id: string;
  summary: string;
  methods?: string[];
  metrics?: string[];
  figures?: string[];
}

export type EvidenceKind = "claim" | "method" | "metric" | "figure" | "code_summary" | "reference";

export interface EvidenceItem {
  id: string;
  source_id: string;
  kind: EvidenceKind;
  text: string;
  location?: string;
  confidence?: TrustLevel;
}

export interface PosterClaim {
  id: string;
  text: string;
  source_ids: string[];
  confidence?: TrustLevel;
}

export interface ClaimMapEntry {
  claim_id: string;
  claim_text: string;
  source_ids: string[];
  evidence_ids: string[];
  section_ids: string[];
  confidence?: TrustLevel;
}

export interface ClaimMap {
  entries: ClaimMapEntry[];
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
  layout?: PosterSectionLayout;
  blocks: PosterBlock[];
}

export interface PosterSectionLayout {
  order?: number;
  columnSpan?: 1 | 2 | 3 | 4;
  rowSpan?: 1 | 2;
  emphasis?: "normal" | "featured" | "hero";
  hidden?: boolean;
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
  schemaVersion?: string;
  metadata?: PosterMetadata;
  title: string;
  subtitle?: string;
  logo?: string;
  format: {
    size: "A0" | "A1" | "A2" | "custom";
    orientation: "portrait" | "landscape";
  };
  theme: string;
  palette?: string;
  layout: PosterLayoutId;
  audience?: string;
  sources: PosterSource[];
  sourceDocuments?: SourceDocument[];
  sourceSummaries?: SourceSummary[];
  evidence?: EvidenceItem[];
  claimMap?: ClaimMap;
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
