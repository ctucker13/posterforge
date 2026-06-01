export type SourceType =
  | "mock"
  | "local_file"
  | "web"
  | "research_paper"
  | "confluence"
  | "gitlab";

export type TrustLevel = "low" | "medium" | "high";

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
  type: "hero" | "background" | "methods" | "results" | "discussion" | "timeline" | "references" | "custom";
  title: string;
  blocks: PosterBlock[];
}

export type PosterBlock =
  | { type: "text"; text: string }
  | { type: "visual_ref"; visual_id: string };

export interface PosterVisual {
  id: string;
  type: string;
  title: string;
  source_ids?: string[];
  data?: Record<string, unknown>;
  options?: Record<string, unknown>;
  asset?: Record<string, unknown>;
}

export interface PosterProject {
  id: string;
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
  references?: Record<string, unknown>[];
}

export interface QaIssue {
  id: string;
  severity: "high" | "medium" | "low";
  message: string;
  location: string;
}

export interface TraceEvent {
  id: string;
  label: string;
  detail: string;
  status: "queued" | "running" | "complete";
}
