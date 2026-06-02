import type { PosterVisual } from "../domain/poster";
import {
  parseCodeBlockData,
  parseConfusionMatrixData,
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

    return (
      <div className="visual-box">
        <h3>{visual.title}</h3>
        <div className="matrix">
          <MatrixCell label={`True ${labels[0]}`} value={matrix[0][0]} />
          <MatrixCell label={`False ${labels[0]}`} value={matrix[0][1]} error />
          <MatrixCell label={`False ${labels[1]}`} value={matrix[1][0]} error />
          <MatrixCell label={`True ${labels[1]}`} value={matrix[1][1]} />
        </div>
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
        <h3>{visual.title}</h3>
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
    const max = Math.max(...links.map((link) => link.value), 1);
    return (
      <div className="visual-box">
        <h3>{visual.title}</h3>
        <div className="flow-list">
          {links.map((link) => (
            <div className="flow-row" key={`${link.source}-${link.target}`}>
              <span>{`${link.source} -> ${link.target}`}</span>
              <div className="flow-track">
                <div className="flow-bar" style={{ width: `${Math.max(7, (link.value / max) * 100)}%` }} />
              </div>
              <strong>{link.value.toLocaleString()}</strong>
            </div>
          ))}
        </div>
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
        <h3>{visual.title}</h3>
        <ol className="timeline-list">
          {events.map((event) => (
            <li key={`${event.date}-${event.label}`}>
              <time>{event.date}</time>
              <strong>{event.label}</strong>
              {event.detail ? <p>{event.detail}</p> : null}
            </li>
          ))}
        </ol>
      </div>
    );
  }

  if (visual.type === "gantt") {
    const parsed = parseGanttData(visual.data);
    if (!parsed.ok) {
      return <InvalidVisualData visual={visual} message={parsed.message} />;
    }

    const { tasks } = parsed.data;
    const dates = tasks.flatMap((task) => [Date.parse(task.start), Date.parse(task.end)]).filter(Number.isFinite);
    const min = dates.length ? Math.min(...dates) : 0;
    const max = dates.length ? Math.max(...dates) : min + 1;
    const span = Math.max(max - min, 1);

    return (
      <div className="visual-box">
        <h3>{visual.title}</h3>
        <div className="gantt-list">
          {tasks.map((task) => {
            const start = Date.parse(task.start);
            const end = Date.parse(task.end);
            const offset = Number.isFinite(start) ? ((start - min) / span) * 100 : 0;
            const width = Number.isFinite(start) && Number.isFinite(end) ? Math.max(((end - start) / span) * 100, 8) : 30;

            return (
              <div className="gantt-row" key={`${task.label}-${task.start}`}>
                <div>
                  <strong>{task.label}</strong>
                  <span>{task.status ?? `${task.start} to ${task.end}`}</span>
                </div>
                <div className="gantt-track">
                  <div className="gantt-bar" style={{ marginLeft: `${offset}%`, width: `${Math.min(width, 100 - offset)}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (visual.type === "mermaid_flow") {
    const parsed = parseSourceTextData(visual.data, "mermaid_flow");
    if (!parsed.ok) {
      return <InvalidVisualData visual={visual} message={parsed.message} />;
    }

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

    return (
      <div className="visual-box generated-asset">
        <h3>{visual.title}</h3>
        <div className="generated-asset-frame">
          <span>{visual.type.replace(/_/g, " ")}</span>
          <p>{visual.asset?.prompt ?? parsed.data.prompt ?? "Generated visual asset placeholder."}</p>
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

function InvalidVisualData({ visual, message }: { visual: PosterVisual; message: string }) {
  return (
    <div className="visual-box visual-data-error">
      <h3>{visual.title}</h3>
      <p>{message}</p>
    </div>
  );
}

function MatrixCell({ label, value, error = false }: { label: string; value: number; error?: boolean }) {
  return (
    <div className={`matrix-cell ${error ? "error" : ""}`}>
      <span>{label}</span>
      <strong>{value.toLocaleString()}</strong>
    </div>
  );
}
