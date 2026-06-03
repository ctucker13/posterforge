export type VisualDataResult<T> = { ok: true; data: T } | { ok: false; message: string };

export type TableCell = string | number | boolean | null;
export type TableRow = Record<string, TableCell> | TableCell[];

export interface ConfusionMatrixData {
  labels: [string, string];
  matrix: [[number, number], [number, number]];
}

export interface TableData {
  columns: string[];
  rows: TableRow[];
}

export interface SankeyLink {
  source: string;
  target: string;
  value: number;
}

export interface SankeyData {
  nodes?: string[] | undefined;
  links: SankeyLink[];
}

export interface TimelineEventData {
  date: string;
  label: string;
  detail?: string | undefined;
}

export interface TimelineData {
  events: TimelineEventData[];
}

export interface GanttTaskData {
  label: string;
  start: string;
  end: string;
  status?: string | undefined;
}

export interface GanttData {
  tasks: GanttTaskData[];
}

export interface FlowRow {
  label: string;
  detail?: string | undefined;
  weight: number;
  note?: string | undefined;
}

export interface FlowData {
  rows: FlowRow[];
}

export interface SourceTextData {
  source: string;
}

export interface CodeBlockData {
  code: string;
  language?: string | undefined;
}

export interface MetricCardData {
  label: string;
  value: string | number;
  note?: string | undefined;
}

export interface GeneratedVisualData {
  prompt?: string | undefined;
}

export type SupportedRendererData =
  | FlowData
  | ConfusionMatrixData
  | TableData
  | SankeyData
  | TimelineData
  | GanttData
  | SourceTextData
  | CodeBlockData
  | MetricCardData
  | GeneratedVisualData;

export function parseConfusionMatrixData(data: unknown): VisualDataResult<ConfusionMatrixData> {
  if (!isRecord(data)) {
    return invalid("confusion_matrix data must be an object.");
  }

  if (!isTwoStringTuple(data.labels)) {
    return invalid("confusion_matrix requires labels with exactly two strings.");
  }

  if (!isTwoByTwoNumberMatrix(data.matrix)) {
    return invalid("confusion_matrix requires a 2x2 numeric matrix.");
  }

  return {
    ok: true,
    data: {
      labels: data.labels,
      matrix: data.matrix,
    },
  };
}

export function parseTableData(data: unknown): VisualDataResult<TableData> {
  if (!isRecord(data)) {
    return invalid("table data must be an object.");
  }

  if (!isNonEmptyStringArray(data.columns)) {
    return invalid("table requires a non-empty columns array.");
  }

  if (!Array.isArray(data.rows) || !data.rows.every(isTableRow)) {
    return invalid("table requires rows as arrays or objects containing primitive cell values.");
  }

  return {
    ok: true,
    data: {
      columns: data.columns,
      rows: data.rows,
    },
  };
}

export function parseSankeyData(data: unknown): VisualDataResult<SankeyData> {
  if (!isRecord(data)) {
    return invalid("sankey data must be an object.");
  }

  if (data.nodes !== undefined && !isStringArray(data.nodes)) {
    return invalid("sankey nodes must be an array of strings when provided.");
  }

  if (!Array.isArray(data.links) || !data.links.every(isSankeyLink)) {
    return invalid("sankey requires links with source, target, and numeric value.");
  }

  return {
    ok: true,
    data: {
      nodes: data.nodes,
      links: data.links,
    },
  };
}

export function parseTimelineData(data: unknown): VisualDataResult<TimelineData> {
  if (!isRecord(data)) {
    return invalid("timeline data must be an object.");
  }

  if (!Array.isArray(data.events) || !data.events.every(isTimelineEvent)) {
    return invalid("timeline requires events with date and label strings.");
  }

  return { ok: true, data: { events: data.events } };
}

export function parseGanttData(data: unknown): VisualDataResult<GanttData> {
  if (!isRecord(data)) {
    return invalid("gantt data must be an object.");
  }

  if (!Array.isArray(data.tasks) || !data.tasks.every(isGanttTask)) {
    return invalid("gantt requires tasks with label, start, and end strings.");
  }

  return { ok: true, data: { tasks: data.tasks } };
}

export function parseFlowData(data: unknown): VisualDataResult<FlowData> {
  if (!isRecord(data)) {
    return invalid("flow data must be an object.");
  }

  if (!Array.isArray(data.rows) || !data.rows.every(isFlowRow)) {
    return invalid("flow requires rows with a label string and numeric weight.");
  }

  return { ok: true, data: { rows: data.rows } };
}

export function parseSourceTextData(data: unknown, visualType: "mermaid_flow" | "math"): VisualDataResult<SourceTextData> {
  if (!isRecord(data)) {
    return invalid(`${visualType} data must be an object.`);
  }

  const source = data.source ?? data.latex;
  if (typeof source !== "string" || source.trim().length === 0) {
    return invalid(`${visualType} requires a non-empty source string.`);
  }

  return { ok: true, data: { source } };
}

export function parseCodeBlockData(data: unknown): VisualDataResult<CodeBlockData> {
  if (!isRecord(data)) {
    return invalid("code_block data must be an object.");
  }

  if (typeof data.code !== "string" || data.code.trim().length === 0) {
    return invalid("code_block requires a non-empty code string.");
  }

  if (data.language !== undefined && typeof data.language !== "string") {
    return invalid("code_block language must be a string when provided.");
  }

  return {
    ok: true,
    data: {
      code: data.code,
      language: data.language,
    },
  };
}

export function parseMetricCardData(data: unknown): VisualDataResult<MetricCardData> {
  if (!isRecord(data)) {
    return invalid("metric_card data must be an object.");
  }

  if (typeof data.label !== "string" || data.label.trim().length === 0) {
    return invalid("metric_card requires a non-empty label string.");
  }

  if (typeof data.value !== "string" && typeof data.value !== "number") {
    return invalid("metric_card requires a string or numeric value.");
  }

  if (data.note !== undefined && typeof data.note !== "string") {
    return invalid("metric_card note must be a string when provided.");
  }

  return {
    ok: true,
    data: {
      label: data.label,
      value: data.value,
      note: data.note,
    },
  };
}

export function parseGeneratedVisualData(data: unknown): VisualDataResult<GeneratedVisualData> {
  if (data === undefined) {
    return { ok: true, data: {} };
  }

  if (!isRecord(data)) {
    return invalid("generated visual data must be an object when provided.");
  }

  if (data.prompt !== undefined && typeof data.prompt !== "string") {
    return invalid("generated visual prompt must be a string when provided.");
  }

  return { ok: true, data: { prompt: data.prompt } };
}

function invalid(message: string): VisualDataResult<never> {
  return { ok: false, message };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isTwoStringTuple(value: unknown): value is [string, string] {
  return Array.isArray(value) && value.length === 2 && value.every((item) => typeof item === "string");
}

function isTwoByTwoNumberMatrix(value: unknown): value is [[number, number], [number, number]] {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    value.every((row) => Array.isArray(row) && row.length === 2 && row.every((item) => typeof item === "number" && Number.isFinite(item)))
  );
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isNonEmptyStringArray(value: unknown): value is string[] {
  return isStringArray(value) && value.length > 0;
}

function isTableRow(value: unknown): value is TableRow {
  if (Array.isArray(value)) {
    return value.every(isTableCell);
  }

  return isRecord(value) && Object.values(value).every(isTableCell);
}

function isTableCell(value: unknown): value is TableCell {
  return value === null || ["string", "number", "boolean"].includes(typeof value);
}

function isSankeyLink(value: unknown): value is SankeyLink {
  return (
    isRecord(value) &&
    typeof value.source === "string" &&
    typeof value.target === "string" &&
    typeof value.value === "number" &&
    Number.isFinite(value.value)
  );
}

function isTimelineEvent(value: unknown): value is TimelineEventData {
  return (
    isRecord(value) &&
    typeof value.date === "string" &&
    typeof value.label === "string" &&
    (value.detail === undefined || typeof value.detail === "string")
  );
}

function isFlowRow(value: unknown): value is FlowRow {
  return (
    isRecord(value) &&
    typeof value.label === "string" &&
    typeof value.weight === "number" &&
    Number.isFinite(value.weight) &&
    (value.detail === undefined || typeof value.detail === "string") &&
    (value.note === undefined || typeof value.note === "string")
  );
}

function isGanttTask(value: unknown): value is GanttTaskData {
  return (
    isRecord(value) &&
    typeof value.label === "string" &&
    typeof value.start === "string" &&
    typeof value.end === "string" &&
    (value.status === undefined || typeof value.status === "string")
  );
}
