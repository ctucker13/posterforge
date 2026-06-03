import type { PosterVisual } from "../domain/poster";
import { buildGanttSegments, formatPercent, summarizeConfusionMatrix, summarizeSankeyLinks } from "./derived";
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

export function VisualRenderer({ visual }: { visual: PosterVisual }) {
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
      <div className="visual-box">
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
                      {Array.isArray(row) ? formatCell(row[columnIndex]) : formatCell(row[column])}
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

  if (visual.type === "mermaid_flow") {
    const parsed = parseSourceTextData(visual.data, "mermaid_flow");
    if (!parsed.ok) {
      return <InvalidVisualData visual={visual} message={parsed.message} />;
    }

    // Render as a styled code block — Mermaid rendering requires a browser plugin
    return (
      <div className="visual-box">
        <h3>{visual.title}</h3>
        <pre className="diagram-source">{parsed.data.source}</pre>
      </div>
    );
  }

  if (visual.type === "math") {
    const parsed = parseSourceTextData(visual.data, "math");
    if (!parsed.ok) {
      return <InvalidVisualData visual={visual} message={parsed.message} />;
    }

    return (
      <div className="visual-box">
        <h3>{visual.title}</h3>
        <div className="math-placeholder">
          <span>LaTeX source</span>
          <code>{parsed.data.source}</code>
        </div>
      </div>
    );
  }

  if (visual.type === "code_block") {
    const parsed = parseCodeBlockData(visual.data);
    if (!parsed.ok) {
      return <InvalidVisualData visual={visual} message={parsed.message} />;
    }

    return (
      <div className="visual-box">
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
      <div className="visual-box">
        <h3>{visual.title}</h3>
        <div className="metric-card">
          <span>{parsed.data.label}</span>
          <strong>{parsed.data.value.toLocaleString()}</strong>
          {parsed.data.note ? <p>{parsed.data.note}</p> : null}
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

    return (
      <div className="visual-box generated-asset">
        <h3>{visual.title}</h3>
        <div className={`generated-asset-frame ${imageUrl ? "has-image" : ""}`}>
          {imageUrl ? (
            <img className="generated-asset-image" src={imageUrl} alt={visual.asset?.title ?? visual.title} />
          ) : (
            <>
              <span>{visual.type.replace(/_/g, " ")}</span>
              <p>{visual.asset?.prompt ?? parsed.data.prompt ?? "Generated visual asset placeholder."}</p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="visual-box">
      <h3>{visual.title}</h3>
      <p>{visual.type} renderer pending.</p>
    </div>
  );
}

function formatCell(value: TableCell) {
  if (typeof value === "number") {
    return value.toLocaleString();
  }

  return String(value ?? "");
}

function VisualHeader({ title, meta }: { title: string; meta?: string }) {
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
