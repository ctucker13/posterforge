import { useState } from "react";
import { CheckCircle2, Clock3, Download, FileJson, FileText, Image, PackageCheck, Presentation } from "lucide-react";
import type { PosterProject } from "../domain/poster";
import { downloadPosterJson, downloadProjectBundleManifest, type ExportTarget } from "../exports";
import { getExportReadiness } from "../exports/readiness";

interface ExportPanelProps {
  poster: PosterProject;
}

export function ExportPanel({ poster }: ExportPanelProps) {
  const readiness = getExportReadiness(poster);
  const [message, setMessage] = useState("JSON and bundle manifest exports are available when readiness checks pass.");

  function handleExport(target: ExportTarget) {
    if (target === "poster_json") {
      downloadPosterJson(poster);
      setMessage("Exported poster JSON.");
      return;
    }

    if (target === "project_bundle") {
      downloadProjectBundleManifest(poster);
      setMessage("Exported project bundle manifest.");
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
            <div className="export-target-main">
              <div className="export-target-icon">{renderExportIcon(capability.target)}</div>
              <div>
                <strong>{capability.label}</strong>
                <p>{capability.status === "ready" ? "Ready to export from the current PosterProject." : capability.blockers[0]}</p>
                <div className="export-requirements">
                  <span>{capability.output}</span>
                  {capability.requirements.map((requirement) => (
                    <span key={`${capability.target}-${requirement}`}>{requirement}</span>
                  ))}
                </div>
                {capability.blockers.length > 1 ? (
                  <ul className="export-blockers">
                    {capability.blockers.slice(1, 4).map((blocker) => (
                      <li key={`${capability.target}-${blocker}`}>{blocker}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </div>
            <button type="button" disabled={capability.status !== "ready"} onClick={() => handleExport(capability.target)}>
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

      <div className="export-status">
        <CheckCircle2 size={16} />
        <span>{message}</span>
      </div>
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

  if (target === "png") {
    return <Image size={18} />;
  }

  return <PackageCheck size={18} />;
}
