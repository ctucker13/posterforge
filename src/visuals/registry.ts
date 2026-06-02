export type VisualPurpose =
  | "model_performance"
  | "explainability"
  | "flow_process"
  | "scientific_technical"
  | "data_quality"
  | "other";

export interface VisualDefinition {
  id: string;
  purpose: VisualPurpose;
  description: string;
  preferredRender: string[];
  factual: boolean;
}

export interface VisualPurposeGroup {
  id: VisualPurpose;
  label: string;
  description: string;
}

export const visualPurposeGroups: VisualPurposeGroup[] = [
  {
    id: "model_performance",
    label: "Model performance",
    description: "Classification, ranking, calibration, and evaluation summaries.",
  },
  {
    id: "explainability",
    label: "Explainability",
    description: "Feature attribution and model interpretation visuals.",
  },
  {
    id: "flow_process",
    label: "Flow/process",
    description: "Workflows, transitions, timelines, and delivery plans.",
  },
  {
    id: "scientific_technical",
    label: "Scientific/technical",
    description: "Tables, math, code, and compact technical evidence blocks.",
  },
  {
    id: "data_quality",
    label: "Data quality",
    description: "Missingness, drift, outliers, and schema health.",
  },
  {
    id: "other",
    label: "Other",
    description: "Generic plotting and generated non-factual visual assets.",
  },
];

export const visualRegistry: VisualDefinition[] = [
  {
    id: "confusion_matrix",
    purpose: "model_performance",
    description: "Classification performance matrix with counts, percentages, and error highlighting.",
    preferredRender: ["svg", "html", "png"],
    factual: true,
  },
  {
    id: "roc_curve",
    purpose: "model_performance",
    description: "Receiver operating characteristic curve.",
    preferredRender: ["svg", "html", "png"],
    factual: true,
  },
  {
    id: "precision_recall_curve",
    purpose: "model_performance",
    description: "Precision-recall curve for imbalanced classification.",
    preferredRender: ["svg", "html", "png"],
    factual: true,
  },
  {
    id: "calibration_plot",
    purpose: "model_performance",
    description: "Predicted probability calibration visual.",
    preferredRender: ["svg", "html", "png"],
    factual: true,
  },
  {
    id: "lift_gains_chart",
    purpose: "model_performance",
    description: "Lift or cumulative gains chart for ranking performance.",
    preferredRender: ["svg", "html", "png"],
    factual: true,
  },
  {
    id: "feature_importance",
    purpose: "explainability",
    description: "Ranked feature contribution chart.",
    preferredRender: ["svg", "html", "png"],
    factual: true,
  },
  {
    id: "shap_summary",
    purpose: "explainability",
    description: "SHAP summary or beeswarm-style explanation visual.",
    preferredRender: ["png", "svg"],
    factual: true,
  },
  {
    id: "shap_waterfall",
    purpose: "explainability",
    description: "Single-observation SHAP waterfall explanation.",
    preferredRender: ["svg", "html", "png"],
    factual: true,
  },
  {
    id: "pdp_ice",
    purpose: "explainability",
    description: "Partial dependence and individual conditional expectation visual.",
    preferredRender: ["svg", "html", "png"],
    factual: true,
  },
  {
    id: "sankey",
    purpose: "flow_process",
    description: "Flow between states, segments, decisions, or process stages.",
    preferredRender: ["svg", "html", "png"],
    factual: true,
  },
  {
    id: "alluvial",
    purpose: "flow_process",
    description: "Multi-stage categorical flow visual.",
    preferredRender: ["svg", "html", "png"],
    factual: true,
  },
  {
    id: "funnel",
    purpose: "flow_process",
    description: "Stepwise conversion, triage, or filtering funnel.",
    preferredRender: ["svg", "html", "png"],
    factual: true,
  },
  {
    id: "mermaid_flow",
    purpose: "flow_process",
    description: "Mermaid diagram source rendered to SVG later.",
    preferredRender: ["svg", "html"],
    factual: true,
  },
  {
    id: "timeline",
    purpose: "flow_process",
    description: "Chronological events or milestones.",
    preferredRender: ["svg", "html", "pptx_shapes"],
    factual: true,
  },
  {
    id: "gantt",
    purpose: "flow_process",
    description: "Project plan, experiment schedule, or delivery roadmap.",
    preferredRender: ["svg", "html", "pptx_shapes"],
    factual: true,
  },
  {
    id: "math",
    purpose: "scientific_technical",
    description: "LaTeX equation rendered with KaTeX or MathJax later.",
    preferredRender: ["svg", "html", "png"],
    factual: true,
  },
  {
    id: "code_block",
    purpose: "scientific_technical",
    description: "Syntax-highlighted code block rendered with Shiki later.",
    preferredRender: ["svg", "html", "png"],
    factual: true,
  },
  {
    id: "table",
    purpose: "scientific_technical",
    description: "Compact table for metrics, cohorts, ablations, or references.",
    preferredRender: ["pptx_native", "html", "svg"],
    factual: true,
  },
  {
    id: "metric_card",
    purpose: "scientific_technical",
    description: "Compact headline metric with label, value, and trend.",
    preferredRender: ["pptx_shapes", "html", "svg"],
    factual: true,
  },
  {
    id: "missingness_matrix",
    purpose: "data_quality",
    description: "Missing data pattern overview across fields or cohorts.",
    preferredRender: ["svg", "html", "png"],
    factual: true,
  },
  {
    id: "null_heatmap",
    purpose: "data_quality",
    description: "Null-rate heatmap by feature, segment, or period.",
    preferredRender: ["svg", "html", "png"],
    factual: true,
  },
  {
    id: "schema_drift",
    purpose: "data_quality",
    description: "Schema change or feature drift summary.",
    preferredRender: ["svg", "html", "png"],
    factual: true,
  },
  {
    id: "outlier_plot",
    purpose: "data_quality",
    description: "Outlier distribution or anomaly summary.",
    preferredRender: ["svg", "html", "png"],
    factual: true,
  },
  {
    id: "plotly_generic",
    purpose: "other",
    description: "General Plotly specification for custom charts.",
    preferredRender: ["html", "svg", "png"],
    factual: true,
  },
  {
    id: "ai_image",
    purpose: "other",
    description: "Generated visual asset for illustrations and themed atmosphere.",
    preferredRender: ["png", "webp"],
    factual: false,
  },
  {
    id: "generated_background",
    purpose: "other",
    description: "Generated background or section atmosphere asset.",
    preferredRender: ["png", "webp"],
    factual: false,
  },
  {
    id: "generated_comic_panel",
    purpose: "other",
    description: "Generated comic panel or scene art without factual labels.",
    preferredRender: ["png", "webp"],
    factual: false,
  },
];
