export interface VisualDefinition {
  id: string;
  category: string;
  description: string;
  preferredRender: string[];
}

export const visualRegistry: VisualDefinition[] = [
  {
    id: "table",
    category: "structured_data",
    description: "Compact table for metrics, cohorts, ablations, or references.",
    preferredRender: ["pptx_native", "html", "svg"],
  },
  {
    id: "plotly_generic",
    category: "chart",
    description: "General Plotly specification for custom charts.",
    preferredRender: ["html", "svg", "png"],
  },
  {
    id: "confusion_matrix",
    category: "model_performance",
    description: "Classification performance matrix with counts, percentages, and error highlighting.",
    preferredRender: ["svg", "html", "png"],
  },
  {
    id: "roc_curve",
    category: "model_performance",
    description: "Receiver operating characteristic curve.",
    preferredRender: ["svg", "html", "png"],
  },
  {
    id: "precision_recall_curve",
    category: "model_performance",
    description: "Precision-recall curve for imbalanced classification.",
    preferredRender: ["svg", "html", "png"],
  },
  {
    id: "calibration_plot",
    category: "model_performance",
    description: "Predicted probability calibration visual.",
    preferredRender: ["svg", "html", "png"],
  },
  {
    id: "feature_importance",
    category: "explainability",
    description: "Ranked feature contribution chart.",
    preferredRender: ["svg", "html", "png"],
  },
  {
    id: "shap_summary",
    category: "explainability",
    description: "SHAP summary or beeswarm-style explanation visual.",
    preferredRender: ["png", "svg"],
  },
  {
    id: "sankey",
    category: "flow",
    description: "Flow between states, segments, decisions, or process stages.",
    preferredRender: ["svg", "html", "png"],
  },
  {
    id: "timeline",
    category: "time",
    description: "Chronological events or milestones.",
    preferredRender: ["svg", "html", "pptx_shapes"],
  },
  {
    id: "gantt",
    category: "time",
    description: "Project plan, experiment schedule, or delivery roadmap.",
    preferredRender: ["svg", "html", "pptx_shapes"],
  },
  {
    id: "mermaid_flow",
    category: "diagram",
    description: "Mermaid diagram source rendered to SVG.",
    preferredRender: ["svg", "html"],
  },
  {
    id: "math",
    category: "scientific_notation",
    description: "LaTeX equation rendered with KaTeX or MathJax.",
    preferredRender: ["svg", "html", "png"],
  },
  {
    id: "code_block",
    category: "technical_detail",
    description: "Syntax-highlighted code block rendered with Shiki.",
    preferredRender: ["svg", "html", "png"],
  },
  {
    id: "ai_image",
    category: "generated_asset",
    description: "Generated visual asset for backgrounds, panels, illustrations, and themed atmosphere.",
    preferredRender: ["png", "webp"],
  },
];
