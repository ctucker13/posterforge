import type { PosterVisual } from "../domain/poster";

interface TimelineEvent {
  date: string;
  label: string;
  detail?: string;
}

interface GanttTask {
  label: string;
  start: string;
  end: string;
  status?: string;
}

export function VisualRenderer({ visual }: { visual: PosterVisual }) {
  if (visual.type === "confusion_matrix") {
    const matrix = visual.data?.matrix as number[][] | undefined;
    const labels = visual.data?.labels as string[] | undefined;
    const values = matrix ?? [
      [0, 0],
      [0, 0],
    ];
    const names = labels ?? ["Negative", "Positive"];
    return (
      <div className="visual-box">
        <h3>{visual.title}</h3>
        <div className="matrix">
          <MatrixCell label={`True ${names[0]}`} value={values[0][0]} />
          <MatrixCell label={`False ${names[0]}`} value={values[0][1]} error />
          <MatrixCell label={`False ${names[1]}`} value={values[1][0]} error />
          <MatrixCell label={`True ${names[1]}`} value={values[1][1]} />
        </div>
      </div>
    );
  }

  if (visual.type === "table") {
    const columns = (visual.data?.columns as string[] | undefined) ?? [];
    const rows = (visual.data?.rows as Array<Record<string, unknown> | unknown[]> | undefined) ?? [];

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
    const links = (visual.data?.links as Array<{ source: string; target: string; value: number }> | undefined) ?? [];
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
    const events = (visual.data?.events as TimelineEvent[] | undefined) ?? [];
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
    const tasks = (visual.data?.tasks as GanttTask[] | undefined) ?? [];
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
    return (
      <div className="visual-box">
        <h3>{visual.title}</h3>
        <pre className="diagram-source">{String(visual.data?.source ?? "")}</pre>
      </div>
    );
  }

  if (visual.type === "math") {
    return (
      <div className="visual-box">
        <h3>{visual.title}</h3>
        <div className="math-placeholder">
          <span>LaTeX source</span>
          <code>{String(visual.data?.source ?? visual.data?.latex ?? "")}</code>
        </div>
      </div>
    );
  }

  if (visual.type === "code_block") {
    return (
      <div className="visual-box">
        <h3>{visual.title}</h3>
        <pre className="code-placeholder">
          <code>{String(visual.data?.code ?? "")}</code>
        </pre>
      </div>
    );
  }

  if (visual.type === "metric_card") {
    return (
      <div className="visual-box">
        <h3>{visual.title}</h3>
        <div className="metric-card">
          <span>{String(visual.data?.label ?? "Metric")}</span>
          <strong>{String(visual.data?.value ?? "-")}</strong>
          <p>{String(visual.data?.note ?? "")}</p>
        </div>
      </div>
    );
  }

  if (["ai_image", "generated_background", "generated_comic_panel"].includes(visual.type)) {
    return (
      <div className="visual-box generated-asset">
        <h3>{visual.title}</h3>
        <div className="generated-asset-frame">
          <span>{visual.type.replace(/_/g, " ")}</span>
          <p>{String(visual.asset?.prompt ?? visual.data?.prompt ?? "Generated visual asset placeholder.")}</p>
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

function formatCell(value: unknown) {
  if (typeof value === "number") {
    return value.toLocaleString();
  }

  return String(value ?? "");
}

function MatrixCell({ label, value, error = false }: { label: string; value: number; error?: boolean }) {
  return (
    <div className={`matrix-cell ${error ? "error" : ""}`}>
      <span>{label}</span>
      <strong>{value.toLocaleString()}</strong>
    </div>
  );
}
