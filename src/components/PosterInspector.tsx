import { useEffect, useState } from "react";
import { AlignCenter, AlignLeft, AlignRight, ArrowDown, ArrowUp, CheckCircle2, ChevronDown, Eye, EyeOff, MousePointer2, Plus } from "lucide-react";
import type { PosterChangeOptions } from "../app/posterHistory";
import type { PosterBlock, PosterProject, PosterSection, PosterSectionLayout, PosterVisual } from "../domain/poster";
import type { PosterCanvasItemKind } from "./PosterCanvas";
import { resolvePalette, type PosterPalette } from "../themes";
import { parseBlockId } from "./posterUtils";
import { VisualRegistryPanel } from "./VisualRegistryPanel";
import { VisualPicker } from "./VisualPicker";
import { VisualDataEditor } from "./VisualDataEditor";
import { getVisual } from "../visuals/visualRegistry";
import type { VisualDefinition } from "../visuals/visualRegistry";
import {
  parseCodeBlockData,
  parseConfusionMatrixData,
  parseFlowData,
  parseGanttData,
  parseGeneratedVisualData,
  parseMetricCardData,
  parseSankeyData,
  parseSourceTextData,
  parseTableData,
  parseTimelineData,
  type TableRow,
} from "../visuals/data";

interface PosterInspectorProps {
  poster: PosterProject;
  selectedId?: string | undefined;
  selectedKind?: PosterCanvasItemKind | undefined;
  onPosterChange: (poster: PosterProject, options?: PosterChangeOptions) => void;
  onMoveSection?: (sectionId: string, direction: -1 | 1) => void;
  onToggleHideSection?: (sectionId: string) => void;
}

export function PosterInspector({ poster, selectedId, selectedKind, onPosterChange, onMoveSection, onToggleHideSection }: PosterInspectorProps) {
  const selectedSection = selectedKind === "section" ? poster.sections.find((section) => section.id === selectedId) : undefined;
  const selectedBlock = selectedKind === "block" && selectedId ? findTextBlock(poster, selectedId) : undefined;
  const selectedVisual = selectedKind === "visual" ? poster.visuals.find((visual) => visual.id === selectedId) : undefined;
  const [showVisualPicker, setShowVisualPicker] = useState(false);

  function handlePickVisual(definition: VisualDefinition) {
    const newVisual: PosterVisual = {
      id: `visual-${Date.now()}`,
      type: definition.id,
      title: definition.name,
      data: structuredClone(definition.defaultData) as Record<string, unknown>,
    };
    // Prefer the currently selected section; fall back to first visible non-hero section
    const NON_CONTENT_TYPES = new Set(["hero", "background"]);
    const fallbackSection = poster.sections.find(
      (s) => !s.layout?.hidden && !NON_CONTENT_TYPES.has(s.type),
    ) ?? poster.sections.find((s) => !s.layout?.hidden) ?? poster.sections[0];
    const targetSectionId = selectedSection?.id ?? fallbackSection?.id;
    onPosterChange({
      ...poster,
      visuals: [...poster.visuals, newVisual],
      sections: poster.sections.map((section) =>
        section.id === targetSectionId
          ? { ...section, blocks: [...section.blocks, { type: "visual_ref" as const, visual_id: newVisual.id }] }
          : section,
      ),
    });
    setShowVisualPicker(false);
  }

  function updateSection(sectionId: string, updater: (section: PosterSection) => PosterSection) {
    onPosterChange({
      ...poster,
      sections: poster.sections.map((section) => (section.id === sectionId ? updater(section) : section)),
    });
  }

  function updateSectionLayout(sectionId: string, layout: Partial<PosterSectionLayout>) {
    updateSection(sectionId, (section) => ({
      ...section,
      layout: {
        ...(section.layout ?? {}),
        ...layout,
      },
    }));
  }

  function moveSection(sectionId: string, direction: -1 | 1) {
    const index = poster.sections.findIndex((section) => section.id === sectionId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= poster.sections.length) {
      return;
    }

    const sections = [...poster.sections];
    const [section] = sections.splice(index, 1);
    if (!section) return;
    sections.splice(nextIndex, 0, section);
    onPosterChange({
      ...poster,
      sections: sections.map((item, order) => ({
        ...item,
        layout: {
          ...(item.layout ?? {}),
          order,
        },
      })),
    });
  }

  function updateTextBlock(blockId: string, text: string) {
    const parsed = parseBlockId(blockId);
    if (!parsed) {
      return;
    }

    onPosterChange(
      {
        ...poster,
        sections: poster.sections.map((section) => {
          if (section.id !== parsed.sectionId) {
            return section;
          }

          return {
            ...section,
            blocks: section.blocks.map((block, index) => (index === parsed.index && block.type === "text" ? { ...block, text } : block)),
          };
        }),
      },
      // The textarea fires per keystroke — keep each typing burst as one undo step.
      { coalesce: `block-text:${blockId}` },
    );
  }

  return (
    <section className="poster-inspector tool-panel" aria-label="Poster selection inspector">
      <div className="panel-header">
        <h2>Inspector</h2>
        <button className="panel-header-action" type="button" onClick={() => setShowVisualPicker(true)} title="Add visual">
          <Plus size={15} /> Add visual
        </button>
      </div>

      {showVisualPicker && <VisualPicker onSelect={handlePickVisual} onClose={() => setShowVisualPicker(false)} />}

      {!selectedId ? (
        <div className="inspector-empty-state">
          <div className="empty-inspector">
            <MousePointer2 size={18} />
            <p>Select a section, visual, or text block on the poster canvas.</p>
          </div>
          <VisualRegistryPanel poster={poster} />
        </div>
      ) : null}

      {selectedSection ? (
        <div key={selectedSection.id} className="project-editor-body panel-enter-sm">
          <label className="field">
            <span>Section title</span>
            <input
              value={selectedSection.title}
              onChange={(event) =>
                onPosterChange(
                  {
                    ...poster,
                    sections: poster.sections.map((section) => (section.id === selectedSection.id ? { ...section, title: event.target.value } : section)),
                  },
                  { coalesce: `section-title:${selectedSection.id}` },
                )
              }
            />
          </label>

          {/* A9: text size + alignment */}
          <div className="inspector-style-row">
            <div className="inspector-field-group">
              <span className="inspector-field-label">Size</span>
              <div className="inspector-btn-group">
                {(["sm", "md", "lg"] as const).map((scale) => (
                  <button
                    key={scale}
                    type="button"
                    className={`inspector-btn${(selectedSection.layout?.textScale ?? "md") === scale ? " active" : ""}`}
                    title={{ sm: "Small text", md: "Default text size", lg: "Large text" }[scale]}
                    onClick={() => updateSectionLayout(selectedSection.id, { textScale: scale === "md" ? undefined : scale })}
                  >
                    {scale === "sm" ? "S" : scale === "md" ? "M" : "L"}
                  </button>
                ))}
              </div>
            </div>
            <div className="inspector-field-group">
              <span className="inspector-field-label">Align</span>
              <div className="inspector-btn-group">
                {(["left", "center", "right"] as const).map((align) => (
                  <button
                    key={align}
                    type="button"
                    className={`inspector-btn${(selectedSection.layout?.textAlign ?? "left") === align ? " active" : ""}`}
                    title={`Align ${align}`}
                    onClick={() => updateSectionLayout(selectedSection.id, { textAlign: align === "left" ? undefined : align })}
                  >
                    {align === "left" ? <AlignLeft size={12} /> : align === "center" ? <AlignCenter size={12} /> : <AlignRight size={12} />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* A9: accent color */}
          <div className="inspector-field-group">
            <span className="inspector-field-label">Accent</span>
            <SectionAccentPicker
              value={selectedSection.layout?.accentColor}
              palette={resolvePalette(poster.theme, poster.palette)}
              onChange={(color) => updateSectionLayout(selectedSection.id, { accentColor: color })}
            />
          </div>

          <div className="inspector-actions">
            <button type="button" onClick={() => (onMoveSection ?? moveSection)(selectedSection.id, -1)}>
              <ArrowUp size={15} /> Up
            </button>
            <button type="button" onClick={() => (onMoveSection ?? moveSection)(selectedSection.id, 1)}>
              <ArrowDown size={15} /> Down
            </button>
            <button type="button" onClick={() => (onToggleHideSection ? onToggleHideSection(selectedSection.id) : updateSectionLayout(selectedSection.id, { hidden: !selectedSection.layout?.hidden }))}>
              {selectedSection.layout?.hidden ? <Eye size={15} /> : <EyeOff size={15} />}
              {selectedSection.layout?.hidden ? "Show" : "Hide"}
            </button>
          </div>

          {/* F2: structural layout behind disclosure */}
          <details className="inspector-disclosure">
            <summary>
              <ChevronDown size={14} /> Layout
            </summary>
            <div className="field-grid">
              <label className="field">
                <span>Column span</span>
                <select
                  value={selectedSection.layout?.columnSpan ?? ""}
                  onChange={(event) =>
                    updateSectionLayout(selectedSection.id, {
                      columnSpan: event.target.value ? (Number(event.target.value) as PosterSectionLayout["columnSpan"]) : undefined,
                    })
                  }
                >
                  <option value="">Auto</option>
                  <option value="1">1 column</option>
                  <option value="2">2 columns</option>
                  <option value="3">3 columns</option>
                  <option value="4">4 columns</option>
                </select>
              </label>

              <label className="field">
                <span>Emphasis</span>
                <select
                  value={selectedSection.layout?.emphasis ?? "normal"}
                  onChange={(event) => updateSectionLayout(selectedSection.id, { emphasis: event.target.value as PosterSectionLayout["emphasis"] })}
                >
                  <option value="normal">Normal</option>
                  <option value="featured">Featured</option>
                  <option value="hero">Hero</option>
                </select>
              </label>
            </div>
          </details>
        </div>
      ) : null}

      {selectedBlock ? (
        <div key={selectedBlock.id} className="project-editor-body panel-enter-sm">
          <label className="field">
            <span>Text block</span>
            <textarea value={selectedBlock.block.text} onChange={(event) => updateTextBlock(selectedBlock.id, event.target.value)} rows={7} />
          </label>
        </div>
      ) : null}

      {selectedVisual ? (
        <VisualDataInspector poster={poster} visual={selectedVisual} onPosterChange={onPosterChange} />
      ) : null}

      {selectedId && !selectedSection && !selectedBlock && !selectedVisual ? (
        <div className="empty-inspector">
          <p>{selectedKind === "visual" ? "Visual selection is read-only in this first editing slice." : "No editable fields for this selection."}</p>
        </div>
      ) : null}
    </section>
  );
}

function VisualDataInspector({ poster, visual, onPosterChange }: {
  poster: PosterProject;
  visual: PosterVisual;
  onPosterChange: (poster: PosterProject, options?: PosterChangeOptions) => void;
}) {
  function updateVisual(patch: Partial<PosterVisual>) {
    onPosterChange({
      ...poster,
      visuals: poster.visuals.map((v) => v.id === visual.id ? { ...v, ...patch } : v),
    });
  }
  const [draft, setDraft] = useState(formatVisualData(visual.data));
  const [message, setMessage] = useState<string | undefined>();
  const parseError = getVisualParseError(visual);

  useEffect(() => {
    setDraft(formatVisualData(visual.data));
    setMessage(undefined);
  }, [visual.id, visual.data]);

  function saveVisualData() {
    let parsedData: unknown;
    try {
      parsedData = JSON.parse(draft);
    } catch (error) {
      setMessage(error instanceof Error ? `Invalid JSON: ${error.message}` : "Invalid JSON.");
      return;
    }

    const validationError = getVisualParseError({ ...visual, data: parsedData as Record<string, unknown> });
    if (validationError) {
      setMessage(validationError);
      return;
    }

    onPosterChange({
      ...poster,
      visuals: poster.visuals.map((item) => (item.id === visual.id ? { ...item, data: parsedData as Record<string, unknown> } : item)),
    });
    setMessage("Visual data saved.");
  }

  return (
    <div className="project-editor-body visual-data-inspector">
      {/* A10: visual size control */}
      <div className="inspector-field-group">
        <span className="inspector-field-label">Size</span>
        <div className="inspector-btn-group">
          {(["compact", "default", "expanded"] as const).map((sz) => (
            <button
              key={sz}
              type="button"
              className={`inspector-btn${(visual.size ?? "default") === sz ? " active" : ""}`}
              title={{ compact: "Compact — shorter height", default: "Default height", expanded: "Expanded — taller height" }[sz]}
              onClick={() => updateVisual({ size: sz === "default" ? undefined : sz })}
            >
              {sz === "compact" ? "S" : sz === "default" ? "M" : "L"}
            </button>
          ))}
        </div>
      </div>

      <div className={parseError ? "visual-data-status error" : "visual-data-status ready"}>
        {parseError ? null : <CheckCircle2 size={15} />}
        <span>{parseError ?? "Visual data is valid."}</span>
      </div>

      <VisualEditor visual={visual} onSave={saveStructuredVisualData} />

      {message ? <div className={message === "Visual data saved." ? "visual-data-message ready" : "visual-data-message error"}>{message}</div> : null}

      <details className="inspector-disclosure">
        <summary>
          <ChevronDown size={14} /> Advanced
        </summary>

        <dl className="visual-data-summary">
          <div>
            <dt>Type</dt>
            <dd>{visual.type}</dd>
          </div>
          <div>
            <dt>Sources</dt>
            <dd>{visual.source_ids?.length ?? 0}</dd>
          </div>
        </dl>

        <label className="field">
          <span>Visual data JSON</span>
          <textarea value={draft} onChange={(event) => setDraft(event.target.value)} rows={10} spellCheck={false} />
        </label>

        <div className="inspector-actions single-action">
          <button type="button" onClick={saveVisualData}>
            Save JSON
          </button>
        </div>
      </details>
    </div>
  );

  function saveStructuredVisualData(newData: Record<string, unknown>) {
    const validationError = getVisualParseError({ ...visual, data: newData });
    if (validationError) {
      setMessage(validationError);
      return;
    }

    onPosterChange(
      {
        ...poster,
        visuals: poster.visuals.map((item) => (item.id === visual.id ? { ...item, data: newData } : item)),
      },
      // Live field editors fire per keystroke — coalesce per visual.
      { coalesce: `visual-data:${visual.id}` },
    );
    setMessage("Visual data saved.");
  }
}

function VisualEditor({ visual, onSave }: { visual: PosterVisual; onSave: (data: Record<string, unknown>) => void }) {
  if (visual.type === "metric_card") {
    return <MetricCardEditor visual={visual} onSave={onSave} />;
  }

  if (visual.type === "table") {
    return <TableEditor visual={visual} onSave={onSave} />;
  }

  if (visual.type === "mermaid_flow" || visual.type === "math" || visual.type === "code_block") {
    return <SourceVisualEditor visual={visual} onSave={onSave} />;
  }

  if (visual.type === "confusion_matrix") {
    return <ConfusionMatrixEditor visual={visual} onSave={onSave} />;
  }

  if (["ai_image", "generated_background", "generated_comic_panel"].includes(visual.type)) {
    return <GeneratedVisualEditor visual={visual} onSave={onSave} />;
  }

  // Fallback: use VisualDataEditor for any registry-defined chart/diagram type
  const regDef = getVisual(visual.type);
  if (regDef && regDef.editableFields.length > 0) {
    return (
      <VisualDataEditor
        visual={visual}
        onChange={(updated) => onSave(updated.data ?? {})}
      />
    );
  }

  return null;
}

function MetricCardEditor({ visual, onSave }: { visual: PosterVisual; onSave: (data: Record<string, unknown>) => void }) {
  const parsed = parseMetricCardData(visual.data);
  const [label, setLabel] = useState(parsed.ok ? parsed.data.label : "");
  const [value, setValue] = useState(parsed.ok ? String(parsed.data.value) : "");
  const [note, setNote] = useState(parsed.ok ? parsed.data.note ?? "" : "");

  useEffect(() => {
    const next = parseMetricCardData(visual.data);
    setLabel(next.ok ? next.data.label : "");
    setValue(next.ok ? String(next.data.value) : "");
    setNote(next.ok ? next.data.note ?? "" : "");
  }, [visual.id, visual.data]);

  return (
    <div className="visual-editor-form">
      <label className="field">
        <span>Label</span>
        <input value={label} onChange={(event) => setLabel(event.target.value)} />
      </label>
      <label className="field">
        <span>Value</span>
        <input value={value} onChange={(event) => setValue(event.target.value)} />
      </label>
      <label className="field">
        <span>Note</span>
        <input value={note} onChange={(event) => setNote(event.target.value)} />
      </label>
      <button type="button" onClick={() => onSave({ label, value, note })}>
        Save visual
      </button>
    </div>
  );
}

function TableEditor({ visual, onSave }: { visual: PosterVisual; onSave: (data: Record<string, unknown>) => void }) {
  const parsed = parseTableData(visual.data);
  const [columns, setColumns] = useState(parsed.ok ? parsed.data.columns : ["Column"]);
  const [rows, setRows] = useState<string[][]>(() => tableRowsToGrid(parsed.ok ? parsed.data.columns : ["Column"], parsed.ok ? parsed.data.rows : []));

  useEffect(() => {
    const next = parseTableData(visual.data);
    const nextColumns = next.ok ? next.data.columns : ["Column"];
    setColumns(nextColumns);
    setRows(tableRowsToGrid(nextColumns, next.ok ? next.data.rows : []));
  }, [visual.id, visual.data]);

  function updateCell(rowIndex: number, columnIndex: number, value: string) {
    setRows((current: string[][]) => current.map((row, rIndex) => (rIndex === rowIndex ? row.map((cell, cIndex) => (cIndex === columnIndex ? value : cell)) : row)));
  }

  return (
    <div className="visual-editor-form">
      <label className="field">
        <span>Columns</span>
        <input value={columns.join(", ")} onChange={(event) => setColumns(event.target.value.split(",").map((item) => item.trim()).filter(Boolean))} />
      </label>
      <div className="visual-table-editor">
        {rows.slice(0, 8).map((row, rowIndex) => (
          <div className="visual-table-editor-row" key={rowIndex}>
            {columns.map((column, columnIndex) => (
              <input aria-label={`${column} row ${rowIndex + 1}`} value={row[columnIndex] ?? ""} key={`${column}-${columnIndex}`} onChange={(event) => updateCell(rowIndex, columnIndex, event.target.value)} />
            ))}
          </div>
        ))}
      </div>
      <button type="button" onClick={() => setRows((current: string[][]) => [...current, columns.map(() => "")])}>
        Add row
      </button>
      <button type="button" onClick={() => onSave({ columns, rows: rows.map((row) => Object.fromEntries(columns.map((column, index) => [column, row[index] ?? ""]))) })}>
        Save visual
      </button>
    </div>
  );
}

function SourceVisualEditor({ visual, onSave }: { visual: PosterVisual; onSave: (data: Record<string, unknown>) => void }) {
  const isCode = visual.type === "code_block";
  const [source, setSource] = useState(getSourceEditorText(visual));
  const [language, setLanguage] = useState(getSourceEditorLanguage(visual));

  useEffect(() => {
    setSource(getSourceEditorText(visual));
    setLanguage(getSourceEditorLanguage(visual));
  }, [isCode, visual.id, visual.data, visual.type]);

  return (
    <div className="visual-editor-form">
      {isCode ? (
        <label className="field">
          <span>Language</span>
          <input value={language} onChange={(event) => setLanguage(event.target.value)} />
        </label>
      ) : null}
      <label className="field">
        <span>{isCode ? "Code" : "Source"}</span>
        <textarea value={source} rows={7} onChange={(event) => setSource(event.target.value)} />
      </label>
      <pre className="visual-editor-preview">{source}</pre>
      <button type="button" onClick={() => onSave(isCode ? { code: source, language } : { source })}>
        Save visual
      </button>
    </div>
  );
}

function ConfusionMatrixEditor({ visual, onSave }: { visual: PosterVisual; onSave: (data: Record<string, unknown>) => void }) {
  const parsed = parseConfusionMatrixData(visual.data);
  const [labels, setLabels] = useState<[string, string]>(parsed.ok ? parsed.data.labels : ["Negative", "Positive"]);
  const [matrix, setMatrix] = useState<[[number, number], [number, number]]>(parsed.ok ? parsed.data.matrix : [[0, 0], [0, 0]]);
  const total = matrix.flat().reduce((sum, value) => sum + value, 0);
  const accuracy = total > 0 ? (matrix[0][0] + matrix[1][1]) / total : 0;
  const precision = matrix[1][1] + matrix[0][1] > 0 ? matrix[1][1] / (matrix[1][1] + matrix[0][1]) : 0;
  const recall = matrix[1][1] + matrix[1][0] > 0 ? matrix[1][1] / (matrix[1][1] + matrix[1][0]) : 0;

  useEffect(() => {
    const next = parseConfusionMatrixData(visual.data);
    setLabels(next.ok ? next.data.labels : ["Negative", "Positive"]);
    setMatrix(next.ok ? next.data.matrix : [[0, 0], [0, 0]]);
  }, [visual.id, visual.data]);

  function setMatrixValue(row: 0 | 1, col: 0 | 1, value: number) {
    setMatrix((current) => current.map((items, rowIndex) => items.map((item, colIndex) => (rowIndex === row && colIndex === col ? value : item))) as [[number, number], [number, number]]);
  }

  return (
    <div className="visual-editor-form">
      <div className="field-grid">
        <label className="field">
          <span>Label 1</span>
          <input value={labels[0]} onChange={(event) => setLabels([event.target.value, labels[1]])} />
        </label>
        <label className="field">
          <span>Label 2</span>
          <input value={labels[1]} onChange={(event) => setLabels([labels[0], event.target.value])} />
        </label>
      </div>
      <div className="field-grid">
        {matrix.flat().map((value, index) => (
          <label className="field" key={index}>
            <span>{["TP", "FP", "FN", "TN"][index]}</span>
            <input type="number" value={value} onChange={(event) => setMatrixValue(Math.floor(index / 2) as 0 | 1, (index % 2) as 0 | 1, Number(event.target.value))} />
          </label>
        ))}
      </div>
      <div className="visual-derived-metrics">
        <span>Accuracy {Math.round(accuracy * 100)}%</span>
        <span>Precision {Math.round(precision * 100)}%</span>
        <span>Recall {Math.round(recall * 100)}%</span>
      </div>
      <button type="button" onClick={() => onSave({ labels, matrix })}>
        Save visual
      </button>
    </div>
  );
}

function GeneratedVisualEditor({ visual, onSave }: { visual: PosterVisual; onSave: (data: Record<string, unknown>) => void }) {
  const parsed = parseGeneratedVisualData(visual.data);
  const currentData = (visual.data ?? {}) as Record<string, unknown>;
  const [prompt, setPrompt] = useState(parsed.ok ? parsed.data.prompt ?? visual.asset?.prompt ?? "" : "");
  const [model, setModel] = useState(String(currentData.model ?? visual.asset?.model ?? "gpt-image-1.5"));

  useEffect(() => {
    const next = parseGeneratedVisualData(visual.data);
    const data = (visual.data ?? {}) as Record<string, unknown>;
    setPrompt(next.ok ? next.data.prompt ?? visual.asset?.prompt ?? "" : "");
    setModel(String(data.model ?? visual.asset?.model ?? "gpt-image-1.5"));
  }, [visual.id, visual.data, visual.asset?.prompt, visual.asset?.model]);

  return (
    <div className="visual-editor-form">
      <label className="field">
        <span>Prompt</span>
        <textarea value={prompt} rows={5} onChange={(event) => setPrompt(event.target.value)} />
      </label>
      <label className="field">
        <span>Model</span>
        <select value={model} onChange={(event) => setModel(event.target.value)}>
          <option value="gpt-image-1.5">gpt-image-1.5</option>
          <option value="gpt-image-1">gpt-image-1</option>
          <option value="gpt-image-1-mini">gpt-image-1-mini</option>
        </select>
      </label>
      <code>npm run image:generate -- --asset {visual.asset?.id ?? visual.id}</code>
      <button type="button" onClick={() => onSave({ prompt, model })}>
        Save visual
      </button>
    </div>
  );
}

function tableRowsToGrid(columns: string[], rows: TableRow[]): string[][] {
  if (!Array.isArray(rows) || rows.length === 0) {
    return [columns.map(() => "")];
  }

  return rows.slice(0, 8).map((row) => columns.map((column, index) => (Array.isArray(row) ? String(row[index] ?? "") : String(row[column] ?? ""))));
}

function getSourceEditorText(visual: PosterVisual) {
  if (visual.type === "code_block") {
    const parsed = parseCodeBlockData(visual.data);
    return parsed.ok ? parsed.data.code : "";
  }

  if (visual.type === "mermaid_flow" || visual.type === "math") {
    const parsed = parseSourceTextData(visual.data, visual.type);
    return parsed.ok ? parsed.data.source : "";
  }

  return "";
}

function getSourceEditorLanguage(visual: PosterVisual) {
  if (visual.type !== "code_block") return "";
  const parsed = parseCodeBlockData(visual.data);
  return parsed.ok ? parsed.data.language ?? "" : "";
}

function formatVisualData(data: PosterVisual["data"]) {
  return JSON.stringify(data ?? {}, null, 2);
}

function getVisualParseError(visual: PosterVisual): string | undefined {
  const result = parseVisualData(visual);
  return result.ok ? undefined : result.message;
}

function parseVisualData(visual: PosterVisual) {
  switch (visual.type) {
    case "confusion_matrix":
      return parseConfusionMatrixData(visual.data);
    case "table":
      return parseTableData(visual.data);
    case "sankey":
      return parseSankeyData(visual.data);
    case "timeline":
      return parseTimelineData(visual.data);
    case "gantt":
      return parseGanttData(visual.data);
    case "flow":
      return parseFlowData(visual.data);
    case "mermaid_flow":
    case "math":
      return parseSourceTextData(visual.data, visual.type);
    case "code_block":
      return parseCodeBlockData(visual.data);
    case "metric_card":
      return parseMetricCardData(visual.data);
    case "ai_image":
    case "generated_background":
    case "generated_comic_panel":
      return parseGeneratedVisualData(visual.data);
    default:
      return { ok: true as const, data: visual.data ?? {} };
  }
}

function SectionAccentPicker({
  value,
  palette,
  onChange,
}: {
  value: string | undefined;
  palette: PosterPalette;
  onChange: (color: string | undefined) => void;
}) {
  const swatches: Array<{ color: string | undefined; label: string }> = [
    { color: undefined, label: "Default" },
    { color: palette.colors.primary, label: "Primary" },
    { color: palette.colors.accent, label: "Accent" },
    ...(palette.colors.accentDark ? [{ color: palette.colors.accentDark, label: "Dark accent" }] : []),
    { color: palette.colors.ink, label: "Ink" },
  ];

  return (
    <div className="section-accent-swatches">
      {swatches.map(({ color, label }) => (
        <button
          key={label}
          type="button"
          className={`accent-swatch${value === color ? " active" : ""}`}
          style={color ? { background: color } : undefined}
          title={label}
          aria-pressed={value === color}
          onClick={() => onChange(color)}
        >
          {!color && "×"}
        </button>
      ))}
    </div>
  );
}

function findTextBlock(poster: PosterProject, blockId: string): { id: string; block: Extract<PosterBlock, { type: "text" }> } | undefined {
  const parsed = parseBlockId(blockId);
  if (!parsed) {
    return undefined;
  }

  const section = poster.sections.find((item) => item.id === parsed.sectionId);
  const block = section?.blocks[parsed.index];
  return block?.type === "text" ? { id: blockId, block } : undefined;
}
