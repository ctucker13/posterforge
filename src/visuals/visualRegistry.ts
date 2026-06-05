export type VisualCategory = "chart" | "diagram" | "equation" | "table";

export interface FieldDefinition {
  key: string;
  label: string;
  type: "text" | "number" | "array-of-strings" | "array-of-numbers" | "textarea" | "boolean";
}

export interface VisualDefinition {
  id: string;
  name: string;
  category: VisualCategory;
  description: string;
  icon: string;
  defaultData: object;
  editableFields: FieldDefinition[];
}

export const VISUAL_REGISTRY: VisualDefinition[] = [
  {
    id: "bar-chart",
    name: "Bar Chart",
    category: "chart",
    description: "Compare values across categories",
    icon: "📊",
    defaultData: { labels: ["A", "B", "C", "D"], datasets: [{ label: "Series 1", values: [42, 67, 31, 55] }] },
    editableFields: [
      { key: "labels", label: "Categories", type: "array-of-strings" },
      { key: "datasets.0.label", label: "Series name", type: "text" },
      { key: "datasets.0.values", label: "Values", type: "array-of-numbers" },
    ],
  },
  {
    id: "line-chart",
    name: "Line Chart",
    category: "chart",
    description: "Show trends over a sequence",
    icon: "📈",
    defaultData: { labels: ["Jan", "Feb", "Mar", "Apr", "May"], series: [{ name: "Metric", values: [10, 22, 18, 35, 29] }] },
    editableFields: [
      { key: "labels", label: "X-axis labels", type: "array-of-strings" },
      { key: "series.0.name", label: "Series name", type: "text" },
      { key: "series.0.values", label: "Values", type: "array-of-numbers" },
    ],
  },
  {
    id: "area-chart",
    name: "Area Chart",
    category: "chart",
    description: "Emphasise volume over time",
    icon: "🏔️",
    defaultData: { labels: ["Q1", "Q2", "Q3", "Q4"], series: [{ name: "Revenue", values: [100, 150, 130, 200] }] },
    editableFields: [
      { key: "labels", label: "X labels", type: "array-of-strings" },
      { key: "series.0.name", label: "Series", type: "text" },
      { key: "series.0.values", label: "Values", type: "array-of-numbers" },
    ],
  },
  {
    id: "pie-chart",
    name: "Pie / Donut",
    category: "chart",
    description: "Show part-to-whole proportions",
    icon: "🥧",
    defaultData: { segments: [{ name: "Alpha", value: 40 }, { name: "Beta", value: 30 }, { name: "Gamma", value: 30 }] },
    editableFields: [
      { key: "segments.0.name", label: "Segment 1 name", type: "text" },
      { key: "segments.0.value", label: "Segment 1 value", type: "number" },
    ],
  },
  {
    id: "scatter",
    name: "Scatter Plot",
    category: "chart",
    description: "Explore correlation between two variables",
    icon: "🔵",
    defaultData: { points: [{ x: 1, y: 2 }, { x: 3, y: 5 }, { x: 4, y: 3 }, { x: 7, y: 8 }, { x: 9, y: 6 }] },
    editableFields: [],
  },
  {
    id: "flow-diagram",
    name: "Flow Diagram",
    category: "diagram",
    description: "Process flow using Mermaid DSL",
    icon: "🔄",
    defaultData: { definition: "graph TD\n  A[Start] --> B{Decision}\n  B -->|Yes| C[Action]\n  B -->|No| D[End]" },
    editableFields: [
      { key: "definition", label: "Mermaid diagram definition", type: "textarea" },
    ],
  },
  {
    id: "timeline",
    name: "Timeline",
    category: "diagram",
    description: "Sequence of dated events",
    icon: "📅",
    defaultData: {
      events: [
        { date: "2023 Q1", label: "Data collection" },
        { date: "2023 Q3", label: "Model training" },
        { date: "2024 Q1", label: "Evaluation" },
        { date: "2024 Q2", label: "Deployment" },
      ],
    },
    editableFields: [
      { key: "events.0.date", label: "Date 1", type: "text" },
      { key: "events.0.label", label: "Event 1", type: "text" },
    ],
  },
  {
    id: "equation",
    name: "Equation",
    category: "equation",
    description: "LaTeX mathematical equation",
    icon: "∑",
    defaultData: { latex: "E = mc^2", display: true },
    editableFields: [
      { key: "latex", label: "LaTeX expression", type: "textarea" },
      { key: "display", label: "Display mode", type: "boolean" },
    ],
  },
  {
    id: "data-table",
    name: "Data Table",
    category: "table",
    description: "Rows and columns of structured data",
    icon: "🗂️",
    defaultData: {
      headers: ["Method", "Accuracy", "F1"],
      rows: [["Baseline", "72.3%", "0.71"], ["Proposed", "89.1%", "0.88"]],
    },
    editableFields: [
      { key: "headers", label: "Column headers", type: "array-of-strings" },
    ],
  },
  {
    id: "metric_card",
    name: "Metric Card",
    category: "chart",
    description: "A single key metric with label and note",
    icon: "🎯",
    defaultData: { label: "Accuracy", value: 89.1, note: "on hold-out test set" },
    editableFields: [
      { key: "label", label: "Metric label", type: "text" },
      { key: "value", label: "Value", type: "number" },
      { key: "note", label: "Note", type: "text" },
    ],
  },
  {
    id: "confusion_matrix",
    name: "Confusion Matrix",
    category: "chart",
    description: "2×2 classification performance matrix",
    icon: "🔲",
    defaultData: {
      labels: ["Positive", "Negative"],
      matrix: [[850, 50], [30, 720]],
    },
    editableFields: [
      { key: "labels.0", label: "Class 1 name", type: "text" },
      { key: "labels.1", label: "Class 2 name", type: "text" },
    ],
  },
  {
    id: "sankey",
    name: "Sankey / Flow",
    category: "diagram",
    description: "Flow values between stages",
    icon: "🌊",
    defaultData: {
      links: [
        { source: "Input", target: "Model", value: 1000 },
        { source: "Model", target: "Approved", value: 720 },
        { source: "Model", target: "Rejected", value: 280 },
      ],
    },
    editableFields: [],
  },
  {
    id: "histogram",
    name: "Histogram",
    category: "chart",
    description: "Distribution of a numeric variable",
    icon: "📉",
    defaultData: { values: [2, 3, 3, 4, 4, 4, 5, 5, 5, 5, 6, 6, 7, 8], bins: 6 },
    editableFields: [
      { key: "values", label: "Raw values", type: "array-of-numbers" },
      { key: "bins", label: "Bin count", type: "number" },
    ],
  },
  {
    id: "heatmap",
    name: "Heatmap",
    category: "chart",
    description: "Matrix of values as colour intensity",
    icon: "🟧",
    defaultData: {
      rows: ["R1", "R2", "R3"],
      cols: ["C1", "C2", "C3"],
      values: [[1, 2, 3], [4, 5, 6], [7, 8, 9]],
    },
    editableFields: [
      { key: "rows", label: "Row labels", type: "array-of-strings" },
      { key: "cols", label: "Col labels", type: "array-of-strings" },
    ],
  },
  {
    id: "network-graph",
    name: "Network Graph",
    category: "diagram",
    description: "Nodes and edges relationship diagram",
    icon: "🕸️",
    defaultData: {
      nodes: [{ id: "1", label: "Input" }, { id: "2", label: "Model" }, { id: "3", label: "Output" }],
      edges: [{ source: "1", target: "2" }, { source: "2", target: "3" }],
    },
    editableFields: [],
  },
];

export function getVisual(id: string): VisualDefinition | undefined {
  return VISUAL_REGISTRY.find((v) => v.id === id);
}

export function getVisualsByCategory(category: VisualCategory): VisualDefinition[] {
  return VISUAL_REGISTRY.filter((v) => v.category === category);
}
