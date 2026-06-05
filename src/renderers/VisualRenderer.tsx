import type { PosterVisual } from "../domain/poster";
import type { PosterPalette, ComponentSkins, SkinTokens } from "../themes";
import { Image } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  BarChart, Bar, LineChart, Line, ScatterChart, Scatter,
  PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { BlockMath, InlineMath } from "react-katex";
import "katex/dist/katex.min.css";
import { buildGanttSegments, formatPercent, summarizeConfusionMatrix, summarizeSankeyLinks } from "./derived";
import { nearestApiSize } from "../utils/imageSize";
import {
  parseCodeBlockData,
  parseConfusionMatrixData,
  parseFlowData,
  parseGanttData,
  parseGeneratedVisualData,
  parseMetricCardData,
  parseSankeyData,
  parseSourceTextData,
  parseTableData,
  parseTimelineData,
  type TableCell,
} from "../visuals/data";

const CHART_COLOURS: string[] = ["var(--theme-accent, #2176AE)", "var(--theme-primary, #17324D)", "var(--theme-accent-dark, #F59E0B)", "#10B981", "#8B5CF6", "#F43F5E"];

function colour(palette: string[], i: number): string {
  return palette[i % palette.length] ?? "#2176AE";
}

function MermaidDiagram({ definition }: { definition: string }) {
  const [svg, setSvg] = useState("");
  const [error, setError] = useState("");
  const id = useRef(`mermaid-${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    import("mermaid").then(({ default: mermaid }) => {
      mermaid.initialize({
        startOnLoad: false,
        theme: "neutral",
        flowchart: {
          htmlLabels: true,
          nodeSpacing: 28,
          rankSpacing: 42,
          padding: 10,
          useMaxWidth: true,
        },
      });
      mermaid.render(id.current, definition)
        .then(({ svg: rendered }) => setSvg(normalizeMermaidSvg(rendered)))
        .catch((e: unknown) => setError(String(e)));
    });
  }, [definition]);

  if (error) return <div style={{ color: "red", fontFamily: "monospace", fontSize: 12, padding: 8 }}>{error}</div>;
  if (!svg) return <div style={{ color: "#888", padding: 8, fontSize: 12 }}>Rendering diagram…</div>;
  return <div className="mermaid-diagram" dangerouslySetInnerHTML={{ __html: svg }} />;
}

function normalizeMermaidSvg(rendered: string): string {
  return rendered
    .replace(/<svg\b/, '<svg preserveAspectRatio="xMidYMid meet"')
    .replace(/\sstyle="max-width:[^"]*;?"/, "")
    .replace(/\sheight="[^"]*"/, ' height="100%"')
    .replace(/\swidth="[^"]*"/, ' width="100%"');
}

function toSkinVars(tokens: SkinTokens | undefined): React.CSSProperties {
  return (tokens ?? {}) as React.CSSProperties;
}

function pickSkin(skins: ComponentSkins | undefined, type: string): SkinTokens | undefined {
  if (!skins) return undefined;
  if (type === "metric_card") return skins.metricCard;
  if (type === "flow_diagram" || type === "flow-diagram" || type === "mermaid_flow") return skins.mermaidDiagram;
  if (type === "data-table" || type === "data_table" || type === "table") return skins.dataTable;
  if (type === "code_block") return skins.codeBlock;
  return undefined;
}

export function VisualRenderer({ visual, palette, skins }: { visual: PosterVisual; palette?: PosterPalette | undefined; skins?: ComponentSkins | undefined }) {
  const skinVars = toSkinVars(pickSkin(skins, visual.type));
  const chartColors: string[] = [
    palette?.colors.accent ?? CHART_COLOURS[0] ?? "#2176AE",
    palette?.colors.primary ?? CHART_COLOURS[1] ?? "#17324D",
    palette?.colors.accentDark ?? CHART_COLOURS[2] ?? "#F59E0B",
    "#10B981", "#8B5CF6", "#F43F5E",
  ];
  const accentColor = chartColors[0] ?? "#2176AE";

  try {
  if (visual.type === "confusion_matrix") {
    const parsed = parseConfusionMatrixData(visual.data);
    if (!parsed.ok) {
      return <InvalidVisualData visual={visual} message={parsed.message} />;
    }

    const { labels, matrix } = parsed.data;
    const summary = summarizeConfusionMatrix(parsed.data);

    return (
      <div className="visual-box">
        <VisualHeader title={visual.title} meta={`${summary.total.toLocaleString()} cases`} />
        <div className="matrix">
          <MatrixCell label={`True ${labels[0]}`} value={matrix[0][0]} percent={summary.cellPercentages[0][0]} />
          <MatrixCell label={`False ${labels[0]}`} value={matrix[0][1]} percent={summary.cellPercentages[0][1]} error />
          <MatrixCell label={`False ${labels[1]}`} value={matrix[1][0]} percent={summary.cellPercentages[1][0]} error />
          <MatrixCell label={`True ${labels[1]}`} value={matrix[1][1]} percent={summary.cellPercentages[1][1]} />
        </div>
        <dl className="matrix-summary">
          <div>
            <dt>Accuracy</dt>
            <dd>{formatPercent(summary.accuracy)}</dd>
          </div>
          <div>
            <dt>Precision</dt>
            <dd>{formatPercent(summary.precision)}</dd>
          </div>
          <div>
            <dt>Recall</dt>
            <dd>{formatPercent(summary.recall)}</dd>
          </div>
        </dl>
      </div>
    );
  }

  if (visual.type === "table") {
    const parsed = parseTableData(visual.data);
    if (!parsed.ok) {
      return <InvalidVisualData visual={visual} message={parsed.message} />;
    }

    const { columns, rows } = parsed.data;

    return (
      <div className="visual-box" style={skinVars}>
        <VisualHeader title={visual.title} meta={`${rows.length} row${rows.length === 1 ? "" : "s"}`} />
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column}>{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {columns.map((column, columnIndex) => (
                    <td key={column}>
                      {Array.isArray(row) ? formatCell(row[columnIndex] ?? null) : formatCell(row[column] ?? null)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 ? <p className="visual-empty">No table rows supplied.</p> : null}
        </div>
      </div>
    );
  }

  if (visual.type === "sankey") {
    const parsed = parseSankeyData(visual.data);
    if (!parsed.ok) {
      return <InvalidVisualData visual={visual} message={parsed.message} />;
    }

    const { links } = parsed.data;
    const summaries = summarizeSankeyLinks(links);
    const total = links.reduce((sum, link) => sum + link.value, 0);

    return (
      <div className="visual-box">
        <VisualHeader title={visual.title} meta={`${links.length} flows`} />
        <div className="flow-list">
          {summaries.map((link) => (
            <div className="flow-row" key={`${link.source}-${link.target}`}>
              <span>{`${link.source} to ${link.target}`}</span>
              <div className="flow-track">
                <div className="flow-bar" style={{ width: `${link.widthPercent}%` }} />
              </div>
              <strong>{link.value.toLocaleString()}</strong>
              <em>{formatPercent(link.share)} of total</em>
            </div>
          ))}
        </div>
        {links.length === 0 ? <p className="visual-empty">No flow links supplied.</p> : <p className="flow-total">Total flow: {total.toLocaleString()}</p>}
      </div>
    );
  }

  if (visual.type === "timeline") {
    const parsed = parseTimelineData(visual.data);
    if (!parsed.ok) {
      return <InvalidVisualData visual={visual} message={parsed.message} />;
    }

    const { events } = parsed.data;
    return (
      <div className="visual-box">
        <VisualHeader title={visual.title} meta={`${events.length} milestone${events.length === 1 ? "" : "s"}`} />
        <ol className="timeline-list">
          {events.map((event, index) => (
            <li key={`${event.date}-${event.label}`}>
              <span className="timeline-marker">{index + 1}</span>
              <time>{event.date}</time>
              <strong>{event.label}</strong>
              {event.detail ? <p>{event.detail}</p> : null}
            </li>
          ))}
        </ol>
        {events.length === 0 ? <p className="visual-empty">No timeline events supplied.</p> : null}
      </div>
    );
  }

  if (visual.type === "gantt") {
    const parsed = parseGanttData(visual.data);
    if (!parsed.ok) {
      return <InvalidVisualData visual={visual} message={parsed.message} />;
    }

    const { tasks } = parsed.data;
    const segments = buildGanttSegments(tasks);

    return (
      <div className="visual-box">
        <VisualHeader title={visual.title} meta={`${tasks.length} task${tasks.length === 1 ? "" : "s"}`} />
        <div className="gantt-list">
          {segments.map((task) => (
            <div className="gantt-row" key={`${task.label}-${task.start}`}>
              <div>
                <strong>{task.label}</strong>
                <span>{`${task.start} to ${task.end}`}</span>
                {task.status ? <em>{task.status}</em> : null}
              </div>
              <div className="gantt-track">
                <div className="gantt-bar" style={{ marginLeft: `${task.offsetPercent}%`, width: `${task.widthPercent}%` }} />
              </div>
            </div>
          ))}
        </div>
        {tasks.length === 0 ? <p className="visual-empty">No Gantt tasks supplied.</p> : null}
      </div>
    );
  }

  if (visual.type === "flow") {
    const parsed = parseFlowData(visual.data);
    if (!parsed.ok) {
      return <InvalidVisualData visual={visual} message={parsed.message} />;
    }

    const { rows } = parsed.data;
    const maxWeight = Math.max(...rows.map((r) => r.weight), 1);

    return (
      <div className="visual-box">
        <VisualHeader title={visual.title} meta={`${rows.length} item${rows.length === 1 ? "" : "s"}`} />
        <div className="flow-list">
          {rows.map((row) => (
            <div className="flow-row" key={row.label}>
              <span>{row.label}</span>
              <div className="flow-track">
                <div className="flow-bar" style={{ width: `${Math.max(7, (row.weight / maxWeight) * 100)}%` }} />
              </div>
              <strong>{row.weight}%</strong>
              <em>{row.note ?? row.detail ?? ""}</em>
            </div>
          ))}
        </div>
        {rows.length === 0 ? <p className="visual-empty">No flow rows supplied.</p> : null}
      </div>
    );
  }

  if (visual.type === "code_block") {
    const parsed = parseCodeBlockData(visual.data);
    if (!parsed.ok) {
      return <InvalidVisualData visual={visual} message={parsed.message} />;
    }

    return (
      <div className="visual-box" style={skinVars}>
        <h3>{visual.title}</h3>
        <pre className="code-placeholder">
          <code>{parsed.data.code}</code>
        </pre>
      </div>
    );
  }

  if (visual.type === "metric_card") {
    const parsed = parseMetricCardData(visual.data);
    if (!parsed.ok) {
      return <InvalidVisualData visual={visual} message={parsed.message} />;
    }

    return (
      <div className="visual-box" style={skinVars}>
        <h3>{visual.title}</h3>
        <div className="metric-card">
          <span>{parsed.data.label}</span>
          <strong>{parsed.data.value.toLocaleString()}</strong>
          {parsed.data.note ? <p>{parsed.data.note}</p> : null}
        </div>
      </div>
    );
  }

  // ── Mermaid flow diagram ──────────────────────────────────────────────────
  if (visual.type === "flow_diagram" || visual.type === "flow-diagram") {
    const src = (visual.data as Record<string, unknown>)?.definition as string | undefined;
    if (!src) return <InvalidVisualData visual={visual} message="No diagram definition provided." />;
    return (
      <div className="visual-box" style={skinVars}>
        <VisualHeader title={visual.title} />
        <MermaidDiagram definition={src} />
      </div>
    );
  }

  // Upgrade existing mermaid_flow to actual rendering
  if (visual.type === "mermaid_flow") {
    const parsed = parseSourceTextData(visual.data, "mermaid_flow");
    if (!parsed.ok) return <InvalidVisualData visual={visual} message={parsed.message} />;
    return (
      <div className="visual-box" style={skinVars}>
        <VisualHeader title={visual.title} />
        <MermaidDiagram definition={parsed.data.source} />
      </div>
    );
  }

  // ── KaTeX equation ────────────────────────────────────────────────────────
  if (visual.type === "equation") {
    const data = visual.data as Record<string, unknown> | undefined;
    const latex = (data?.latex as string | undefined) ?? (data?.source as string | undefined) ?? "";
    const display = (data?.display as boolean | undefined) ?? true;
    if (!latex) return <InvalidVisualData visual={visual} message="No LaTeX expression provided." />;
    return (
      <div className="visual-box">
        <VisualHeader title={visual.title} />
        <div className="math-rendered" style={{ padding: "12px 8px", overflowX: "auto" }}>
          {display ? <BlockMath math={latex} /> : <InlineMath math={latex} />}
        </div>
      </div>
    );
  }

  // Upgrade existing math type to KaTeX
  if (visual.type === "math") {
    const parsed = parseSourceTextData(visual.data, "math");
    if (!parsed.ok) return <InvalidVisualData visual={visual} message={parsed.message} />;
    return (
      <div className="visual-box">
        <VisualHeader title={visual.title} />
        <div className="math-rendered" style={{ padding: "12px 8px", overflowX: "auto" }}>
          <BlockMath math={parsed.data.source} />
        </div>
      </div>
    );
  }

  // ── Recharts: bar chart ───────────────────────────────────────────────────
  if (visual.type === "bar-chart" || visual.type === "bar_chart") {
    const data = visual.data as Record<string, unknown>;
    const labels: string[] = (data?.labels as string[]) ?? [];
    const datasets: Array<{ label: string; values: number[] }> = (data?.datasets as Array<{ label: string; values: number[] }>) ?? [];
    const chartData = labels.map((label, i) => ({
      name: label,
      ...Object.fromEntries(datasets.map((ds) => [ds.label, ds.values[i] ?? 0])),
    }));
    return (
      <div className="visual-box">
        <VisualHeader title={visual.title} />
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            {datasets.map((ds, i) => (
              <Bar key={ds.label} dataKey={ds.label} fill={colour(chartColors, i)} radius={[3, 3, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // ── Recharts: line chart ──────────────────────────────────────────────────
  if (visual.type === "line-chart" || visual.type === "line_chart") {
    const data = visual.data as Record<string, unknown>;
    const labels: string[] = (data?.labels as string[]) ?? [];
    const series: Array<{ name: string; values: number[] }> = (data?.series as Array<{ name: string; values: number[] }>) ?? [];
    const chartData = labels.map((label, i) => ({
      name: label,
      ...Object.fromEntries(series.map((s) => [s.name, s.values[i] ?? 0])),
    }));
    return (
      <div className="visual-box">
        <VisualHeader title={visual.title} />
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            {series.map((s, i) => (
              <Line key={s.name} type="monotone" dataKey={s.name} stroke={colour(chartColors, i)} strokeWidth={2} dot={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // ── Recharts: area chart ──────────────────────────────────────────────────
  if (visual.type === "area-chart" || visual.type === "area_chart") {
    const data = visual.data as Record<string, unknown>;
    const labels: string[] = (data?.labels as string[]) ?? [];
    const series: Array<{ name: string; values: number[] }> = (data?.series as Array<{ name: string; values: number[] }>) ?? [];
    const chartData = labels.map((label, i) => ({
      name: label,
      ...Object.fromEntries(series.map((s) => [s.name, s.values[i] ?? 0])),
    }));
    return (
      <div className="visual-box">
        <VisualHeader title={visual.title} />
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            {series.map((s, i) => (
              <Area key={s.name} type="monotone" dataKey={s.name} stroke={colour(chartColors, i)} fill={colour(chartColors, i)} fillOpacity={0.15} strokeWidth={2} />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // ── Recharts: scatter ─────────────────────────────────────────────────────
  if (visual.type === "scatter") {
    const data = visual.data as Record<string, unknown>;
    const points: Array<{ x: number; y: number; label?: string }> = (data?.points as Array<{ x: number; y: number }>) ?? [];
    return (
      <div className="visual-box">
        <VisualHeader title={visual.title} meta={`${points.length} points`} />
        <ResponsiveContainer width="100%" height={200}>
          <ScatterChart margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" />
            <XAxis dataKey="x" type="number" tick={{ fontSize: 11 }} />
            <YAxis dataKey="y" type="number" tick={{ fontSize: 11 }} />
            <Tooltip cursor={{ strokeDasharray: "3 3" }} />
            <Scatter data={points} fill={accentColor as string} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // ── Recharts: pie / donut ─────────────────────────────────────────────────
  if (visual.type === "pie-chart" || visual.type === "pie_chart") {
    const data = visual.data as Record<string, unknown>;
    const segments: Array<{ name: string; value: number }> = (data?.segments as Array<{ name: string; value: number }>) ?? [];
    return (
      <div className="visual-box">
        <VisualHeader title={visual.title} />
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie data={segments} cx="50%" cy="50%" innerRadius={40} outerRadius={80} dataKey="value" label={({ name }) => name}>
              {segments.map((_, i) => (
                <Cell key={i} fill={colour(chartColors, i)} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // ── Data table (new schema: headers/rows) ─────────────────────────────────
  if (visual.type === "data-table" || visual.type === "data_table") {
    const data = visual.data as Record<string, unknown>;
    const headers: string[] = (data?.headers as string[]) ?? [];
    const rows: string[][] = (data?.rows as string[][]) ?? [];
    return (
      <div className="visual-box" style={skinVars}>
        <VisualHeader title={visual.title} meta={`${rows.length} row${rows.length === 1 ? "" : "s"}`} />
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>{headers.map((h) => <th key={h}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i}>{row.map((cell, j) => <td key={j}>{cell}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (["ai_image", "generated_background", "generated_comic_panel"].includes(visual.type)) {
    const parsed = parseGeneratedVisualData(visual.data);
    if (!parsed.ok) {
      return <InvalidVisualData visual={visual} message={parsed.message} />;
    }

    const imageUrl = visual.asset?.url;
    const widthPx = visual.asset?.width_px;
    const heightPx = visual.asset?.height_px;
    const aspectRatio = widthPx && heightPx && widthPx > 0 && heightPx > 0 ? widthPx / heightPx : undefined;
    const apiSize = aspectRatio ? nearestApiSize(aspectRatio) : undefined;

    return (
      <div className="visual-box generated-asset">
        <VisualHeader title={visual.title} meta={apiSize} />
        <div className={`generated-asset-frame ${imageUrl ? "has-image" : "is-placeholder"}`} style={aspectRatio ? { aspectRatio: String(aspectRatio) } : undefined}>
          {imageUrl ? (
            <img className="generated-asset-image" src={imageUrl} alt={visual.asset?.title ?? visual.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <>
              <Image size={28} aria-hidden="true" />
              <span>{visual.type.replace(/_/g, " ")}</span>
              {apiSize ? <code className="asset-size-badge">{apiSize}</code> : null}
              <p className="asset-prompt-preview">{visual.asset?.prompt ?? parsed.data.prompt ?? "No prompt yet."}</p>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Histogram ─────────────────────────────────────────────────────────────
  if (visual.type === "histogram") {
    const data = visual.data as Record<string, unknown>;
    const rawValues: number[] = (data?.values as number[]) ?? [];
    const binCount = Math.max(2, Math.min(20, (data?.bins as number) ?? 6));
    if (rawValues.length === 0) return <div className="visual-box"><VisualHeader title={visual.title} /><p className="visual-empty">No values.</p></div>;
    const min = Math.min(...rawValues);
    const max = Math.max(...rawValues);
    const width = max === min ? 1 : (max - min) / binCount;
    const bins = Array.from({ length: binCount }, (_, i) => ({
      name: `${(min + i * width).toFixed(1)}`,
      count: rawValues.filter((v) => v >= min + i * width && (i === binCount - 1 ? v <= min + (i + 1) * width : v < min + (i + 1) * width)).length,
    }));
    return (
      <div className="visual-box">
        <VisualHeader title={visual.title} meta={`n=${rawValues.length}`} />
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={bins} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="count" fill={accentColor as string} radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // ── Heatmap ────────────────────────────────────────────────────────────────
  if (visual.type === "heatmap") {
    const data = visual.data as Record<string, unknown>;
    const rowLabels: string[] = (data?.rows as string[]) ?? [];
    const colLabels: string[] = (data?.cols as string[]) ?? [];
    const matrix: number[][] = (data?.values as number[][]) ?? [];
    const allVals = matrix.flat();
    const minVal = Math.min(...allVals);
    const maxVal = Math.max(...allVals);
    const range = maxVal - minVal || 1;
    const toOpacity = (v: number) => 0.08 + 0.82 * ((v - minVal) / range);
    return (
      <div className="visual-box">
        <VisualHeader title={visual.title} />
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", fontSize: 11, width: "100%" }}>
            <thead>
              <tr>
                <th style={{ padding: "2px 6px" }} />
                {colLabels.map((c) => <th key={c} style={{ padding: "2px 6px", fontWeight: 600, color: "#555", textAlign: "center" }}>{c}</th>)}
              </tr>
            </thead>
            <tbody>
              {rowLabels.map((row, ri) => (
                <tr key={row}>
                  <td style={{ padding: "2px 6px", fontWeight: 600, color: "#555" }}>{row}</td>
                  {colLabels.map((_, ci) => {
                    const v = matrix[ri]?.[ci] ?? 0;
                    return (
                      <td key={ci} style={{ padding: "4px 8px", textAlign: "center", background: `${accentColor}${Math.round(toOpacity(v) * 255).toString(16).padStart(2, "0")}`, borderRadius: 3 }}>
                        {v}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ── Network graph ──────────────────────────────────────────────────────────
  if (visual.type === "network-graph") {
    const data = visual.data as Record<string, unknown>;
    const nodes: Array<{ id: string; label: string }> = (data?.nodes as Array<{ id: string; label: string }>) ?? [];
    const edges: Array<{ source: string; target: string }> = (data?.edges as Array<{ source: string; target: string }>) ?? [];
    const W = 340, H = 160;
    const positions: Record<string, { x: number; y: number }> = {};
    nodes.forEach((n, i) => {
      const angle = (2 * Math.PI * i) / nodes.length - Math.PI / 2;
      positions[n.id] = { x: W / 2 + (W * 0.38) * Math.cos(angle), y: H / 2 + (H * 0.38) * Math.sin(angle) };
    });
    return (
      <div className="visual-box">
        <VisualHeader title={visual.title} meta={`${nodes.length} nodes · ${edges.length} edges`} />
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", maxHeight: 160 }}>
          <defs>
            <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M 0 0 L 6 3 L 0 6 z" fill={accentColor as string} />
            </marker>
          </defs>
          {edges.map((e, i) => {
            const s = positions[e.source]; const t = positions[e.target];
            if (!s || !t) return null;
            return <line key={i} x1={s.x} y1={s.y} x2={t.x} y2={t.y} stroke={accentColor as string} strokeWidth={1.5} strokeOpacity={0.6} markerEnd="url(#arrow)" />;
          })}
          {nodes.map((n) => {
            const p = positions[n.id]; if (!p) return null;
            return (
              <g key={n.id}>
                <circle cx={p.x} cy={p.y} r={18} fill="white" stroke={accentColor as string} strokeWidth={1.5} />
                <text x={p.x} y={p.y + 1} textAnchor="middle" dominantBaseline="middle" fontSize={9} fill="#333" fontWeight={600}>{n.label}</text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  }

  return (
    <div className="visual-box">
      <h3>{visual.title}</h3>
      <p style={{ color: "#888", fontSize: 12 }}>{visual.type} — renderer not yet available.</p>
    </div>
  );

  } catch (_err) {
    return (
      <div className="visual-box visual-data-error">
        <h3>{visual.title}</h3>
        <p style={{ fontSize: 12, color: "#888" }}>{visual.type} — rendering error.</p>
      </div>
    );
  }
}

function formatCell(value: TableCell) {
  if (typeof value === "number") {
    return value.toLocaleString();
  }

  return String(value ?? "");
}

function VisualHeader({ title, meta }: { title: string; meta?: string | undefined }) {
  return (
    <div className="visual-header">
      <h3>{title}</h3>
      {meta ? <span>{meta}</span> : null}
    </div>
  );
}

function InvalidVisualData({ visual, message }: { visual: PosterVisual; message: string }) {
  return (
    <div className="visual-box visual-data-error">
      <h3>{visual.title}</h3>
      <p>{message}</p>
    </div>
  );
}

function MatrixCell({ label, value, percent, error = false }: { label: string; value: number; percent: number; error?: boolean }) {
  return (
    <div className={`matrix-cell ${error ? "error" : ""}`}>
      <span>{label}</span>
      <strong>{value.toLocaleString()}</strong>
      <em>{formatPercent(percent)}</em>
    </div>
  );
}
