import type { PosterLayoutId, PosterSection } from "../domain/poster";

export interface LayoutTemplate {
  id: PosterLayoutId;
  name: string;
  description: string;
  cssClass: string;
  columns: 2 | 3 | 4;
  emphasis: "balanced" | "results" | "process" | "dashboard" | "narrative" | "case_study";
  featuredSectionTypes: PosterSection["type"][];
  motifs: string[];
}

export const layoutTemplates: LayoutTemplate[] = [
  {
    id: "three-column-academic",
    name: "Three-column academic",
    description: "Classic conference poster structure with evenly weighted sections.",
    cssClass: "three-column-academic",
    columns: 3,
    emphasis: "balanced",
    featuredSectionTypes: ["hero", "results"],
    motifs: ["three columns", "balanced panels", "conference scanning"],
  },
  {
    id: "results-first",
    name: "Results-first",
    description: "Gives findings and evidence visuals more space before supporting methods.",
    cssClass: "results-first",
    columns: 3,
    emphasis: "results",
    featuredSectionTypes: ["results", "key_findings"],
    motifs: ["findings first", "wide evidence panels", "compact support sections"],
  },
  {
    id: "timeline-process",
    name: "Timeline/process",
    description: "Emphasizes sequence, workflow, delivery path, and milestone visuals.",
    cssClass: "timeline-process",
    columns: 3,
    emphasis: "process",
    featuredSectionTypes: ["timeline", "methods"],
    motifs: ["sequence bands", "milestones", "process diagrams"],
  },
  {
    id: "dashboard-poster",
    name: "Dashboard poster",
    description: "Dense operational poster layout for metric cards, charts, and status panels.",
    cssClass: "dashboard-poster",
    columns: 4,
    emphasis: "dashboard",
    featuredSectionTypes: ["results", "key_findings"],
    motifs: ["metric grid", "status cards", "compact chart tiles"],
  },
  {
    id: "comic-strip-narrative",
    name: "Comic-strip narrative",
    description: "Panel-led research storytelling with larger narrative beats.",
    cssClass: "comic-strip-narrative",
    columns: 3,
    emphasis: "narrative",
    featuredSectionTypes: ["hero", "discussion"],
    motifs: ["panel gutters", "story beats", "caption-like sections"],
  },
  {
    id: "case-study-poster",
    name: "Case-study poster",
    description: "Problem, approach, intervention, result, and takeaway structure.",
    cssClass: "case-study-poster",
    columns: 2,
    emphasis: "case_study",
    featuredSectionTypes: ["background", "methods", "results"],
    motifs: ["problem-solution flow", "before and after", "takeaways"],
  },
];

export function resolveLayoutTemplate(layoutId: string): LayoutTemplate {
  // layoutTemplates is a non-empty hard-coded array; [0] always exists
  return layoutTemplates.find((layout) => layout.id === layoutId) ?? layoutTemplates[0]!;
}

export function isFeaturedSection(layout: LayoutTemplate, section: PosterSection) {
  return layout.featuredSectionTypes.includes(section.type);
}
