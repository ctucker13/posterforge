export type SourceType =
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

export interface PosterOutline {
  title: string;
  subtitle: string;
  layout: PosterLayoutId;
  sections: Array<{
    id: string;
    type: PosterSection["type"];
    title: string;
    description: string;
  }>;
}

export interface PosterMetadata {
  prompt?: string | undefined;
  created_at?: string | undefined;
  updated_at?: string | undefined;
  generator?: string | undefined;
}

export interface PosterSource {
  id: string;
  type: SourceType;
  title: string;
  url?: string | undefined;
  accessed_at?: string | undefined;
  trust_level?: TrustLevel | undefined;
}

export interface SourceDocument {
  id: string;
  source: PosterSource;
  title: string;
  body: string;
  metadata?: Record<string, unknown> | undefined;
}

export interface SourceSummary {
  source_id: string;
  summary: string;
  methods?: string[] | undefined;
  metrics?: string[] | undefined;
  figures?: string[] | undefined;
}

export type EvidenceKind = "claim" | "method" | "metric" | "figure" | "code_summary" | "reference";

export interface EvidenceItem {
  id: string;
  source_id: string;
  kind: EvidenceKind;
  text: string;
  location?: string | undefined;
  confidence?: TrustLevel | undefined;
}

export interface PosterClaim {
  id: string;
  text: string;
  source_ids: string[];
  confidence?: TrustLevel | undefined;
}

export interface ClaimMapEntry {
  claim_id: string;
  claim_text: string;
  source_ids: string[];
  evidence_ids: string[];
  section_ids: string[];
  confidence?: TrustLevel | undefined;
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
  layout?: PosterSectionLayout | undefined;
  blocks: PosterBlock[];
}

export interface PosterSectionLayout {
  order?: number | undefined;
  columnSpan?: 1 | 2 | 3 | 4 | undefined;
  rowSpan?: 1 | 2 | undefined;
  emphasis?: "normal" | "featured" | "hero" | undefined;
  hidden?: boolean | undefined;
}

export interface ContentRegion {
  id: string;
  x: string;
  y: string;
  width: string;
  height: string;
  type: "text" | "chart" | "metric" | "diagram-node" | "image";
}

export interface GeneratedImageSlot {
  id: string;
  role: "background" | "hero_illustration" | "section_art";
  /** Stem written by image-gen CLI (e.g. "blueprint-bg-12345"). Derives URL at render time. */
  assetId?: string | null | undefined;
  outputFormat?: "png" | "webp" | undefined;
  /** Direct URL override — used when assetId is absent or for externally-hosted images. */
  url?: string | undefined;
  prompt?: string | undefined;
  seed?: number | undefined;
  width_px?: number | undefined;
  height_px?: number | undefined;
  /** Pixel offset from the left edge of the poster canvas (Phase 4 overlay positioning). */
  x?: number | undefined;
  /** Pixel offset from the top edge of the poster canvas (Phase 4 overlay positioning). */
  y?: number | undefined;
  /** CSS object-position for the rendered image (e.g. "50% 25%"). Canonical; block.objectPosition is legacy fallback. */
  objectPosition?: string | undefined;
  contentRegions?: ContentRegion[] | undefined;
}

export type PosterBlock =
  | { type: "text"; text: string; claim_ids?: string[] | undefined }
  | { type: "visual_ref"; visual_id: string; caption?: string | undefined }
  | { type: "generated_image"; slot_id: string; objectPosition?: string | undefined };

export interface PosterAsset {
  id: string;
  type: "ai_image" | "generated_background" | "generated_panel" | "uploaded_image";
  role: "atmosphere" | "section_art" | "background" | "comic_panel" | "reference";
  title?: string | undefined;
  prompt?: string | undefined;
  model?: string | undefined;
  theme?: string | undefined;
  palette?: string | undefined;
  source_ids?: string[] | undefined;
  url?: string | undefined;
  width_px?: number | undefined;
  height_px?: number | undefined;
  metadata?: Record<string, unknown> | undefined;
}

export interface PosterVisual {
  id: string;
  type: string;
  title: string;
  source_ids?: string[] | undefined;
  data?: Record<string, unknown> | undefined;
  options?: Record<string, unknown> | undefined;
  asset?: PosterAsset | undefined;
}

export interface PosterProject {
  id: string;
  schemaVersion?: string | undefined;
  metadata?: PosterMetadata | undefined;
  title: string;
  subtitle?: string | undefined;
  logo?: string | undefined;
  format: {
    size: "A0" | "A1" | "A2" | "custom";
    orientation: "portrait" | "landscape";
  };
  outputIntent?: "print" | "virtual" | "both" | undefined;
  theme: string;
  palette?: string | undefined;
  layout: PosterLayoutId;
  audience?: string | undefined;
  sources: PosterSource[];
  sourceDocuments?: SourceDocument[] | undefined;
  sourceSummaries?: SourceSummary[] | undefined;
  evidence?: EvidenceItem[] | undefined;
  claimMap?: ClaimMap | undefined;
  claims: PosterClaim[];
  sections: PosterSection[];
  visuals: PosterVisual[];
  assets?: PosterAsset[] | undefined;
  imageSlots?: GeneratedImageSlot[] | undefined;
  references?: Record<string, unknown>[] | undefined;
  traces?: PosterTraceEvent[] | undefined;
  qaResults?: PosterQaIssue[] | undefined;
}

export interface PosterQaIssue {
  id: string;
  severity: QaSeverity;
  message: string;
  location: string;
  suggestedFix?: string | undefined;
  autoFixable?: boolean | undefined;
  fixId?: "create_references" | undefined;
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
  timestamp?: string | undefined;
  artifactRefs?: PosterTraceArtifactRef[] | undefined;
}

export type QaIssue = PosterQaIssue;
export type TraceEvent = PosterTraceEvent;
