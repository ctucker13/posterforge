import { FileText, LayoutTemplate, Maximize2, Monitor, Users } from "lucide-react";
import type { PosterChangeOptions } from "../app/posterHistory";
import type { PosterLayoutId, PosterProject } from "../domain/poster";
import { layoutTemplates, resolveLayoutTemplate } from "../layouts";

interface ProjectEditorProps {
  poster: PosterProject;
  onPosterChange: (poster: PosterProject, options?: PosterChangeOptions) => void;
}

export function ProjectEditor({ poster, onPosterChange }: ProjectEditorProps) {
  const selectedLayout = resolveLayoutTemplate(poster.layout);

  function updateField<Key extends keyof PosterProject>(key: Key, value: PosterProject[Key]) {
    onPosterChange({ ...poster, [key]: value });
  }

  // Text inputs fire per keystroke — coalesce each field's burst into one undo step.
  function updateTextField(key: "title" | "subtitle" | "audience", value: string) {
    onPosterChange({ ...poster, [key]: value }, { coalesce: `project:${key}` });
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
          <input value={poster.title} onChange={(event) => updateTextField("title", event.target.value)} />
        </label>

        <label className="field">
          <span>
            <FileText size={15} /> Subtitle
          </span>
          <input value={poster.subtitle ?? ""} onChange={(event) => updateTextField("subtitle", event.target.value)} />
        </label>

        <div className="field-grid">
          <label className="field">
            <span>
              <LayoutTemplate size={15} /> Layout
            </span>
            <select value={poster.layout} onChange={(event) => updateField("layout", event.target.value as PosterLayoutId)}>
              {layoutTemplates.map((layout) => (
                <option value={layout.id} key={layout.id}>
                  {layout.name}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>
              <Users size={15} /> Audience
            </span>
            <input value={poster.audience ?? ""} onChange={(event) => updateTextField("audience", event.target.value)} />
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

        <label className="field">
          <span>
            <Monitor size={15} /> Output intent
          </span>
          <select value={poster.outputIntent ?? "both"} onChange={(event) => updateField("outputIntent", event.target.value as PosterProject["outputIntent"])}>
            <option value="both">Print and virtual</option>
            <option value="print">Print only</option>
            <option value="virtual">Virtual session only</option>
          </select>
        </label>

        <aside className="layout-note">
          <strong>{selectedLayout.name}</strong>
          <p>{selectedLayout.description}</p>
          <div>
            {selectedLayout.motifs.map((motif) => (
              <span key={motif}>{motif}</span>
            ))}
          </div>
        </aside>

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
