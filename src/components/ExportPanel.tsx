import { useState } from "react";
import { CheckCircle2, Clock3, Download, FileJson, FileText, Image, PackageCheck, Presentation } from "lucide-react";
import type { PosterProject } from "../domain/poster";
import { downloadPosterJson, exportCapabilities, type ExportTarget } from "../exports";

interface ExportPanelProps {
  poster: PosterProject;
}

export function ExportPanel({ poster }: ExportPanelProps) {
  const [message, setMessage] = useState("JSON export is available now. Other outputs are planned.");

  function handleExport(target: ExportTarget) {
    if (target === "poster_json") {
      downloadPosterJson(poster);
      setMessage("Exported poster JSON.");
    }
  }

  return (
    <section className="export-panel" aria-label="Export actions">
      <div className="panel-header compact">
        <h2>Exports</h2>
        <span>{exportCapabilities.filter((capability) => capability.status === "available").length} available</span>
      </div>

      <div className="export-list">
        {exportCapabilities.map((capability) => (
          <article className={`export-target ${capability.status}`} key={capability.id}>
            <div className="export-target-main">
              <div className="export-target-icon">{renderExportIcon(capability.id)}</div>
              <div>
                <strong>{capability.label}</strong>
                <p>{capability.description}</p>
                <div className="export-requirements">
                  <span>{capability.output}</span>
                  {capability.requirements.map((requirement) => (
                    <span key={`${capability.id}-${requirement}`}>{requirement}</span>
                  ))}
                </div>
              </div>
            </div>
            <button type="button" disabled={capability.status !== "available"} onClick={() => handleExport(capability.id)}>
              {capability.status === "available" ? (
                <>
                  <Download size={15} /> Export
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
