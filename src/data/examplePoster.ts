import type { PosterProject } from "../domain/poster";

export const examplePoster: PosterProject = {
  id: "poster_demo_fraud_model",
  title: "Source-Grounded Fraud Model Monitoring",
  subtitle: "A demonstration poster generated from mock project evidence",
  format: {
    size: "A0",
    orientation: "landscape",
  },
  theme: "natwest-group",
  palette: "natwest-group",
  layout: "results-first",
  audience: "internal data science poster session",
  sources: [
    {
      id: "src_confluence_001",
      type: "mock",
      title: "Fraud Model Project Overview",
      trust_level: "high",
    },
    {
      id: "src_gitlab_001",
      type: "mock",
      title: "Model Evaluation README",
      trust_level: "high",
    },
    {
      id: "src_paper_001",
      type: "research_paper",
      title: "Calibration and Interpretability in Risk Models",
      trust_level: "medium",
    },
  ],
  claims: [
    {
      id: "claim_001",
      text: "The monitoring workflow separates model performance, calibration, explainability, and operational impact.",
      source_ids: ["src_confluence_001"],
      confidence: "high",
    },
    {
      id: "claim_002",
      text: "The prototype prioritises deterministic visuals for factual charts and generated images for atmosphere.",
      source_ids: ["src_gitlab_001"],
      confidence: "high",
    },
  ],
  sections: [
    {
      id: "hero",
      type: "hero",
      title: "The poster tells the evidence trail, not just the result",
      blocks: [
        {
          type: "text",
          text: "A source-grounded workflow turns project notes, code evidence, papers, and metrics into a print-ready academic poster with traceable claims.",
        },
      ],
    },
    {
      id: "methods",
      type: "methods",
      title: "Generation workflow",
      blocks: [{ type: "visual_ref", visual_id: "vis_mermaid_workflow" }],
    },
    {
      id: "results",
      type: "results",
      title: "Model monitoring visuals",
      blocks: [
        { type: "visual_ref", visual_id: "vis_confusion_matrix" },
        { type: "visual_ref", visual_id: "vis_sankey" },
      ],
    },
    {
      id: "qa",
      type: "discussion",
      title: "Built-in quality control",
      blocks: [
        {
          type: "text",
          text: "The QA loop checks source links, poster readability, visual integrity, and export readiness before final handoff.",
        },
      ],
    },
  ],
  visuals: [
    {
      id: "vis_mermaid_workflow",
      type: "mermaid_flow",
      title: "Poster generation workflow",
      source_ids: ["src_confluence_001"],
      data: {
        source:
          "flowchart LR\nA[Prompt] --> B[Sources]\nB --> C[Evidence map]\nC --> D[Poster spec]\nD --> E[Render]\nE --> F[QA]\nF --> G[Exports]",
      },
    },
    {
      id: "vis_confusion_matrix",
      type: "confusion_matrix",
      title: "Example confusion matrix",
      source_ids: ["src_gitlab_001"],
      data: {
        labels: ["Legitimate", "Fraud"],
        matrix: [
          [9412, 188],
          [73, 327],
        ],
      },
      options: {
        show_counts: true,
        show_percentages: true,
        highlight_errors: true,
      },
    },
    {
      id: "vis_sankey",
      type: "sankey",
      title: "Decision flow",
      source_ids: ["src_gitlab_001"],
      data: {
        nodes: ["Applications", "Low risk", "Manual review", "Declined", "Approved"],
        links: [
          { source: "Applications", target: "Low risk", value: 8200 },
          { source: "Applications", target: "Manual review", value: 1100 },
          { source: "Manual review", target: "Declined", value: 260 },
          { source: "Manual review", target: "Approved", value: 840 },
        ],
      },
    },
  ],
  references: [],
};
