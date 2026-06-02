import { useRef, useState, type ChangeEvent } from "react";
import { AlertTriangle, CheckCircle2, Download, FileJson, RotateCcw, Upload } from "lucide-react";
import type { PosterProject } from "../domain/poster";

interface JsonProjectControlsProps {
  poster: PosterProject;
  onImport: (poster: PosterProject) => void;
  onReset: () => void;
}

type ImportStatus = { kind: "idle" | "success" | "error"; message: string };

export function JsonProjectControls({ poster, onImport, onReset }: JsonProjectControlsProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [status, setStatus] = useState<ImportStatus>({ kind: "idle", message: "No imported file" });

  function handleExport() {
    const json = JSON.stringify(poster, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${poster.id || "poster"}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setStatus({ kind: "success", message: "Exported poster JSON" });
  }

  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    try {
      const parsed = JSON.parse(await file.text()) as unknown;
      if (!isPosterProject(parsed)) {
        throw new Error("File is not a PosterProject spec.");
      }

      onImport(parsed);
      setStatus({ kind: "success", message: `Imported ${file.name}` });
    } catch (error) {
      setStatus({
        kind: "error",
        message: error instanceof Error ? error.message : "Could not import poster JSON.",
      });
    }
  }

  return (
    <section className="json-controls" aria-label="Poster JSON controls">
      <div className="panel-header compact">
        <h2>Poster JSON</h2>
        <span>{poster.id}</span>
      </div>

      <div className="json-actions">
        <button type="button" onClick={handleExport}>
          <Download size={17} /> Export
        </button>
        <button type="button" onClick={() => fileInputRef.current?.click()}>
          <Upload size={17} /> Import
        </button>
        <button type="button" onClick={onReset}>
          <RotateCcw size={17} /> Reset
        </button>
        <input ref={fileInputRef} type="file" accept="application/json,.json" onChange={handleImport} />
      </div>

      <div className={`json-status ${status.kind}`}>
        {status.kind === "error" ? <AlertTriangle size={16} /> : status.kind === "success" ? <CheckCircle2 size={16} /> : <FileJson size={16} />}
        <span>{status.message}</span>
      </div>
    </section>
  );
}

function isPosterProject(value: unknown): value is PosterProject {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<PosterProject>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.title === "string" &&
    Boolean(candidate.format) &&
    typeof candidate.format?.size === "string" &&
    typeof candidate.format?.orientation === "string" &&
    typeof candidate.theme === "string" &&
    typeof candidate.layout === "string" &&
    Array.isArray(candidate.sources) &&
    Array.isArray(candidate.claims) &&
    Array.isArray(candidate.sections) &&
    Array.isArray(candidate.visuals)
  );
}
