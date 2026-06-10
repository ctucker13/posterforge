import { useState } from "react";
import { CheckCircle2, Clock3, Code2, Download, FileJson, FileText, Image, Monitor, PackageCheck, Presentation } from "lucide-react";
import type { PosterProject } from "../domain/poster";
import { downloadPosterJson, downloadPosterPptx, downloadPosterZipBundle, type ExportTarget } from "../exports";
import { getExportReadiness } from "../exports/readiness";

interface ExportPanelProps {
  poster: PosterProject;
}

export function ExportPanel({ poster }: ExportPanelProps) {
  const readiness = getExportReadiness(poster);
  const [message, setMessage] = useState("Poster JSON and A0 PDF are the primary export path; PPTX is a compatibility snapshot.");
  const [pendingExport, setPendingExport] = useState<ExportTarget | null>(null);
  const pendingCapability = pendingExport ? readiness.find((item) => item.target === pendingExport) : undefined;
  const highQaCount = poster.qaResults?.filter((issue) => issue.severity === "high").length ?? 0;

  async function handleExport(target: ExportTarget) {
    if (target === "poster_json") {
      downloadPosterJson(poster);
      setMessage("Exported poster JSON.");
      return;
    }

    if (target === "pptx") {
      setMessage("Preparing PPTX compatibility snapshot.");
      try {
        await downloadPosterPptx(poster);
        setMessage("Exported PPTX compatibility snapshot.");
      } catch (error) {
        setMessage(error instanceof Error ? `PPTX export failed: ${error.message}` : "PPTX export failed.");
      }
      return;
    }

    if (target === "pdf") {
      setMessage("A0 PDF export runs from the local CLI: npm run export:pdf -- --poster spec/example-poster.json");
      return;
    }

    if (target === "screen_pdf") {
      setMessage("Screen PDF export: npm run export:screen -- --poster spec/example-poster.json");
      return;
    }

    if (target === "project_bundle") {
      try {
        await downloadPosterZipBundle(poster);
        setMessage("Exported project bundle ZIP.");
      } catch (error) {
        setMessage(error instanceof Error ? `Bundle export failed: ${error.message}` : "Bundle export failed.");
      }
    }
  }

  return (
    <section className="export-panel" aria-label="Export actions">
      <div className="panel-header compact">
        <h2>Exports</h2>
        <span>{readiness.filter((item) => item.status === "ready").length} ready</span>
      </div>

      <div className="export-list">
        {readiness.map((capability) => (
          <article className={`export-target ${capability.status}`} key={capability.target}>
            <div className="export-target-icon">{renderExportIcon(capability.target)}</div>
            <div className="export-target-info">
              <strong>{capability.label}</strong>
              <p title={capability.blockers.join("\n")}>{capability.status === "ready" ? capability.output : capability.blockers[0]}</p>
            </div>
            <button type="button" disabled={capability.status !== "ready"} onClick={() => setPendingExport(capability.target)}>
              {capability.status === "ready" ? (
                <>
                  <Download size={15} /> Export
                </>
              ) : capability.status === "blocked" ? (
                <>
                  <Clock3 size={15} /> Blocked
                </>
              ) : (
                <>
                  <Clock3 size={15} /> Planned
                </>
              )}
            </button>
          </article>
        ))}
      </div>

      <div className="export-status" aria-live="polite">
        <CheckCircle2 size={16} />
        <span>{message}</span>
      </div>

      {pendingExport && pendingCapability ? (
        <dialog
          open
          aria-labelledby="export-confirm-title"
          style={{
            width: "min(100%, 420px)",
            margin: "14px 0 0",
            border: "1px solid #d8dee6",
            borderRadius: 8,
            padding: 14,
            color: "#152033",
            background: "#ffffff",
            boxShadow: "0 12px 32px rgba(16, 24, 40, 0.14)",
          }}
        >
          <h3 id="export-confirm-title">Confirm {pendingCapability.label}</h3>
          <p>This will export the current PosterProject state.</p>

          {pendingCapability.blockers.length > 0 ? (
            <div className="export-confirm-warning">
              <strong>Readiness notes</strong>
              <ul>
                {pendingCapability.blockers.slice(0, 4).map((blocker) => (
                  <li key={`${pendingExport}-${blocker}`}>{blocker}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className={highQaCount > 0 ? "export-confirm-warning" : "export-confirm-ready"}>
            {highQaCount > 0 ? `${highQaCount} high-severity QA issue${highQaCount === 1 ? "" : "s"} remain.` : "No high-severity QA issues found."}
          </div>

          <div className="export-confirm-actions">
            <button
              type="button"
              onClick={() => {
                void handleExport(pendingExport);
                setPendingExport(null);
              }}
            >
              Export anyway
            </button>
            <button type="button" onClick={() => setPendingExport(null)}>
              Cancel
            </button>
          </div>
        </dialog>
      ) : null}
    </section>
  );
}

function renderExportIcon(target: ExportTarget) {
  if (target === "poster_json") {
    return <FileJson size={18} />;
  }

  if (target === "pptx") {
    return <Presentation size={18} />;
  }

  if (target === "pdf") {
    return <FileText size={18} />;
  }

  if (target === "screen_pdf") {
    return <Monitor size={18} />;
  }

  if (target === "html_project") {
    return <Code2 size={18} />;
  }

  if (target === "png") {
    return <Image size={18} />;
  }

  return <PackageCheck size={18} />;
}
