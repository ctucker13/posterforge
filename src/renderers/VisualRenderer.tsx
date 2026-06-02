import type { PosterVisual } from "../domain/poster";

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

  if (visual.type === "mermaid_flow") {
    return (
      <div className="visual-box">
        <h3>{visual.title}</h3>
        <pre className="diagram-source">{String(visual.data?.source ?? "")}</pre>
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

function MatrixCell({ label, value, error = false }: { label: string; value: number; error?: boolean }) {
  return (
    <div className={`matrix-cell ${error ? "error" : ""}`}>
      <span>{label}</span>
      <strong>{value.toLocaleString()}</strong>
    </div>
  );
}
