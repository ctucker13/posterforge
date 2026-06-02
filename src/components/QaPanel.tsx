import { AlertTriangle, CheckCircle2, RefreshCw, ShieldCheck, Wrench } from "lucide-react";
import type { QaIssue } from "../domain/poster";

interface QaPanelProps {
  issues: QaIssue[];
  onRunQa: () => void;
  onApplyFix: (fixId: NonNullable<QaIssue["fixId"]>) => void;
}

const severityOrder: Record<QaIssue["severity"], number> = {
  high: 0,
  medium: 1,
  low: 2,
};

export function QaPanel({ issues, onRunQa, onApplyFix }: QaPanelProps) {
  const sortedIssues = [...issues].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  const highCount = issues.filter((issue) => issue.severity === "high").length;
  const mediumCount = issues.filter((issue) => issue.severity === "medium").length;
  const lowCount = issues.filter((issue) => issue.severity === "low").length;

  return (
    <section className="qa-panel tool-panel" aria-label="Quality assurance">
      <div className="panel-header">
        <h2>QA</h2>
        <button className="panel-action" type="button" onClick={onRunQa}>
          <RefreshCw size={15} /> Run QA
        </button>
      </div>

      <div className="qa-overview">
        <div className={issues.length === 0 ? "qa-score ready" : "qa-score"}>
          {issues.length === 0 ? <ShieldCheck size={28} /> : <AlertTriangle size={28} />}
          <strong>{issues.length === 0 ? "Pass" : "Review"}</strong>
        </div>
        <dl>
          <div>
            <dt>High</dt>
            <dd>{highCount}</dd>
          </div>
          <div>
            <dt>Medium</dt>
            <dd>{mediumCount}</dd>
          </div>
          <div>
            <dt>Low</dt>
            <dd>{lowCount}</dd>
          </div>
        </dl>
      </div>

      {sortedIssues.length === 0 ? (
        <div className="qa-empty">
          <CheckCircle2 size={18} />
          <span>Claims, visuals, references, and export readiness checks passed.</span>
        </div>
      ) : (
        <ol className="qa-list">
          {sortedIssues.map((issue, index) => (
            <li className={`qa-issue ${issue.severity}`} key={`${issue.id}-${issue.location}-${index}`}>
              <div>
                <span className="severity">{issue.severity}</span>
                <strong>{issue.message}</strong>
                <p>{issue.suggestedFix}</p>
                <code>{issue.location}</code>
              </div>
              {issue.fixId ? (
                <button type="button" onClick={() => onApplyFix(issue.fixId!)}>
                  <Wrench size={15} /> Fix
                </button>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
