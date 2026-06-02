import { FileText, LayoutTemplate, Maximize2, Users } from "lucide-react";
import type { PosterProject } from "../domain/poster";

interface ProjectEditorProps {
  poster: PosterProject;
  onPosterChange: (poster: PosterProject) => void;
}

export function ProjectEditor({ poster, onPosterChange }: ProjectEditorProps) {
  function updateField<Key extends keyof PosterProject>(key: Key, value: PosterProject[Key]) {
    onPosterChange({ ...poster, [key]: value });
  }

  return (
    <section className="project-editor tool-panel" aria-label="Poster project editor">
      <div className="panel-header">
        <h2>Project Spec</h2>
        <span>poster.json</span>
      </div>

      <div className="project-editor-body">
        <label className="field">
          <span>
            <FileText size={15} /> Title
          </span>
          <input value={poster.title} onChange={(event) => updateField("title", event.target.value)} />
        </label>

        <label className="field">
          <span>
            <FileText size={15} /> Subtitle
          </span>
          <input value={poster.subtitle ?? ""} onChange={(event) => updateField("subtitle", event.target.value)} />
        </label>

        <div className="field-grid">
          <label className="field">
            <span>
              <LayoutTemplate size={15} /> Layout
            </span>
            <select value={poster.layout} onChange={(event) => updateField("layout", event.target.value)}>
              <option value="results-first">Results first</option>
              <option value="methods-first">Methods first</option>
              <option value="narrative">Narrative</option>
              <option value="dashboard">Dashboard</option>
            </select>
          </label>

          <label className="field">
            <span>
              <Users size={15} /> Audience
            </span>
            <input value={poster.audience ?? ""} onChange={(event) => updateField("audience", event.target.value)} />
          </label>
        </div>

        <div className="field-grid">
          <label className="field">
            <span>
              <Maximize2 size={15} /> Size
            </span>
            <select
              value={poster.format.size}
              onChange={(event) =>
                updateField("format", {
                  ...poster.format,
                  size: event.target.value as PosterProject["format"]["size"],
                })
              }
            >
              <option value="A0">A0</option>
              <option value="A1">A1</option>
              <option value="A2">A2</option>
              <option value="custom">Custom</option>
            </select>
          </label>

          <label className="field">
            <span>
              <Maximize2 size={15} /> Orientation
            </span>
            <select
              value={poster.format.orientation}
              onChange={(event) =>
                updateField("format", {
                  ...poster.format,
                  orientation: event.target.value as PosterProject["format"]["orientation"],
                })
              }
            >
              <option value="landscape">Landscape</option>
              <option value="portrait">Portrait</option>
            </select>
          </label>
        </div>

        <dl className="spec-metrics" aria-label="Project counts">
          <div>
            <dt>Sources</dt>
            <dd>{poster.sources.length}</dd>
          </div>
          <div>
            <dt>Claims</dt>
            <dd>{poster.claims.length}</dd>
          </div>
          <div>
            <dt>Visuals</dt>
            <dd>{poster.visuals.length}</dd>
          </div>
          <div>
            <dt>Sections</dt>
            <dd>{poster.sections.length}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
