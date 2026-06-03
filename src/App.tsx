import { useState } from "react";
import { Database, FolderOpen, Globe2, Palette, Play, Sparkles } from "lucide-react";
import { EditablePosterCanvas } from "./components/EditablePosterCanvas";
import { EvidencePanel } from "./components/EvidencePanel";
import { ExportPanel } from "./components/ExportPanel";
import { JsonProjectControls } from "./components/JsonProjectControls";
import { PosterInspector } from "./components/PosterInspector";
import { PosterPreview } from "./components/PosterPreview";
import { ProjectEditor } from "./components/ProjectEditor";
import { QaPanel } from "./components/QaPanel";
import { SourceSearchPanel } from "./components/SourceSearchPanel";
import { TracePanel } from "./components/TracePanel";
import { VisualRegistryPanel } from "./components/VisualRegistryPanel";
import { generatePoster, generationTrace, type GenerationOptions } from "./domain/generator";
import type { PosterProject, QaIssue, TraceEvent } from "./domain/poster";
import type { PosterCanvasItemKind } from "./components/PosterCanvas";
import { applyQaFix, runQa } from "./qa";
import { palettes, themes } from "./themes";
import "./styles/app.css";

const defaultPrompt =
  "Create a results-first poster about fraud model monitoring. Use a polished theme, include a workflow diagram, confusion matrix, Sankey decision flow, and a QA summary.";

function createQueuedTrace(): TraceEvent[] {
  return generationTrace.map((event) => ({ ...event, status: "queued" }));
}

const initialTrace = createQueuedTrace();
const initialPoster = generatePoster({
  prompt: defaultPrompt,
  theme: "natwest-group",
  palette: "natwest-group",
  sourceMode: "mock",
});
const initialQaIssues = runQa(initialPoster);

export default function App() {
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [theme, setTheme] = useState(initialPoster.theme);
  const [palette, setPalette] = useState(initialPoster.palette ?? themes[initialPoster.theme]?.palette ?? "clean-blue");
  const [sourceMode, setSourceMode] = useState<GenerationOptions["sourceMode"]>("mock");
  const [trace, setTrace] = useState<TraceEvent[]>(initialTrace);
  const [poster, setPoster] = useState<PosterProject>({ ...initialPoster, qaResults: initialQaIssues });
  const [qaIssues, setQaIssues] = useState<QaIssue[]>(initialQaIssues);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedCanvasItem, setSelectedCanvasItem] = useState<{ id: string; kind: PosterCanvasItemKind } | undefined>();

  const selectedTheme = themes[theme];
  const selectedPalette = palettes[palette];
  const highQaCount = qaIssues.filter((issue) => issue.severity === "high").length;

  async function handleGenerate() {
    setIsGenerating(true);
    setTrace(createQueuedTrace());
    const completedTrace: TraceEvent[] = [];

    for (const step of generationTrace) {
      setTrace((events) =>
        events.map((event) =>
          event.id === step.id ? { ...event, status: "running", timestamp: new Date().toISOString() } : event,
        ),
      );
      await new Promise((resolve) => setTimeout(resolve, 260));
      const completedEvent: TraceEvent = { ...step, status: "complete", timestamp: new Date().toISOString() };
      completedTrace.push(completedEvent);
      setTrace((events) => events.map((event) => (event.id === step.id ? completedEvent : event)));
    }

    const nextPoster = { ...generatePoster({ prompt, theme, palette, sourceMode }), traces: completedTrace };
    const nextQaIssues = runQa(nextPoster);
    setPoster({ ...nextPoster, qaResults: nextQaIssues });
    setQaIssues(nextQaIssues);
    setIsGenerating(false);
  }

  function handleThemeChange(nextTheme: string) {
    const nextPoster = { ...poster, theme: nextTheme };
    setTheme(nextTheme);
    setPoster(nextPoster);
    setQaIssues(runQa(nextPoster));
  }

  function handlePaletteChange(nextPalette: string) {
    const nextPoster = { ...poster, palette: nextPalette };
    setPalette(nextPalette);
    setPoster(nextPoster);
    setQaIssues(runQa(nextPoster));
  }

  function handleProjectImport(nextPoster: PosterProject) {
    const nextTheme = themes[nextPoster.theme] ? nextPoster.theme : "clean-academic";
    const nextPalette = nextPoster.palette && palettes[nextPoster.palette] ? nextPoster.palette : themes[nextTheme].palette ?? "clean-blue";
    const normalizedPoster = { ...nextPoster, theme: nextTheme, palette: nextPalette };
    const nextQaIssues = runQa(normalizedPoster);
    setTheme(nextTheme);
    setPalette(nextPalette);
    setPoster({ ...normalizedPoster, qaResults: nextQaIssues });
    setQaIssues(nextQaIssues);
    setTrace(nextPoster.traces?.length ? nextPoster.traces : createQueuedTrace());
  }

  function handleResetProject() {
    const nextPoster = generatePoster({ prompt: defaultPrompt, theme: "natwest-group", palette: "natwest-group", sourceMode: "mock" });
    const nextQaIssues = runQa(nextPoster);
    setPrompt(defaultPrompt);
    setTheme(nextPoster.theme);
    setPalette(nextPoster.palette ?? "natwest-group");
    setSourceMode("mock");
    setPoster({ ...nextPoster, qaResults: nextQaIssues });
    setQaIssues(nextQaIssues);
    setTrace(createQueuedTrace());
  }

  function handleRunQa() {
    const nextQaIssues = runQa(poster);
    setQaIssues(nextQaIssues);
    setPoster((current) => ({ ...current, qaResults: nextQaIssues }));
  }

  function handlePosterStateChange(nextPoster: PosterProject) {
    const nextQaIssues = runQa(nextPoster);
    setPoster({ ...nextPoster, qaResults: nextQaIssues });
    setQaIssues(nextQaIssues);
  }

  function handleQaFix(fixId: NonNullable<QaIssue["fixId"]>) {
    const nextPoster = applyQaFix(poster, fixId);
    const nextQaIssues = runQa(nextPoster);
    setPoster({ ...nextPoster, qaResults: nextQaIssues });
    setQaIssues(nextQaIssues);
  }

  return (
    <main className="app-shell">
      <header className="workspace-header">
        <div className="product-mark">
          <div className="mark-icon">
            <Sparkles size={24} />
          </div>
          <div>
            <p>PosterForge</p>
            <h1>Schema-driven poster compiler</h1>
          </div>
        </div>

        <div className="workspace-status" aria-label="Project status">
          <div>
            <span>Spec</span>
            <strong>{poster.format.size} {poster.format.orientation}</strong>
          </div>
          <div>
            <span>Theme</span>
            <strong>{selectedTheme?.name ?? poster.theme}</strong>
          </div>
          <div className={highQaCount > 0 ? "status-attention" : ""}>
            <span>QA</span>
            <strong>{qaIssues.length === 0 ? "Ready" : `${qaIssues.length} issue${qaIssues.length === 1 ? "" : "s"}`}</strong>
          </div>
        </div>
      </header>

      <section className="control-panel tool-panel" aria-label="Generation controls">
        <div className="panel-header">
          <h2>Generate</h2>
          <span>{sourceMode}</span>
        </div>

        <label className="field">
          <span>Prompt</span>
          <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} rows={6} />
        </label>

        <div className="field-grid">
          <label className="field">
            <span>
              <Palette size={15} /> Theme
            </span>
            <select value={theme} onChange={(event) => handleThemeChange(event.target.value)}>
              {Object.values(themes).map((themeDefinition) => (
                <option value={themeDefinition.id} key={themeDefinition.id}>
                  {themeDefinition.name}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>
              <Palette size={15} /> Palette
            </span>
            <select value={palette} onChange={(event) => handlePaletteChange(event.target.value)}>
              {Object.values(palettes).map((paletteDefinition) => (
                <option value={paletteDefinition.id} key={paletteDefinition.id}>
                  {paletteDefinition.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="source-options" aria-label="Source mode">
          <button className={sourceMode === "mock" ? "selected" : ""} type="button" onClick={() => setSourceMode("mock")}>
            <Database size={18} /> Mock
          </button>
          <button className={sourceMode === "web" ? "selected" : ""} type="button" onClick={() => setSourceMode("web")}>
            <Globe2 size={18} /> Web
          </button>
          <button className={sourceMode === "local" ? "selected" : ""} type="button" onClick={() => setSourceMode("local")}>
            <FolderOpen size={18} /> Local
          </button>
        </div>

        <button className="primary-action" type="button" onClick={handleGenerate} disabled={isGenerating}>
          <Play size={18} />
          {isGenerating ? "Generating" : "Generate poster"}
        </button>

        <aside className="theme-note">
          <strong>{selectedTheme.name}</strong>
          <p>{selectedTheme.description}</p>
          <div className="palette-swatches" aria-label={`${selectedPalette.name} palette`}>
            <span style={{ background: selectedPalette.colors.primary }} />
            <span style={{ background: selectedPalette.colors.accent }} />
            <span style={{ background: selectedPalette.colors.background }} />
            <span style={{ background: selectedPalette.colors.ink }} />
          </div>
        </aside>

        <JsonProjectControls poster={poster} onImport={handleProjectImport} onReset={handleResetProject} />
        <ExportPanel poster={poster} />
      </section>

      <section className="inspector-column" aria-label="Poster inspectors">
        <ProjectEditor
          poster={poster}
          onPosterChange={handlePosterStateChange}
        />
        <PosterInspector
          poster={poster}
          selectedId={selectedCanvasItem?.id}
          selectedKind={selectedCanvasItem?.kind}
          onPosterChange={handlePosterStateChange}
        />
        <SourceSearchPanel
          poster={poster}
          onPosterChange={handlePosterStateChange}
        />
        <EvidencePanel poster={poster} />
        <QaPanel issues={qaIssues} onRunQa={handleRunQa} onApplyFix={handleQaFix} />
        <TracePanel events={trace} />
      </section>

      <section className="preview-column" aria-label="Poster workspace">
        <EditablePosterCanvas
          poster={poster}
          selectedId={selectedCanvasItem?.id}
          onSelectItem={(id, kind) => setSelectedCanvasItem({ id, kind })}
        />
        <PosterPreview poster={poster} />
        <VisualRegistryPanel poster={poster} />
      </section>
    </main>
  );
}
