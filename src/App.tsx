import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ClipboardCheck, Database, FileSearch, FolderOpen, Globe2, Layers3, Palette, Play, Route, Settings2, Sparkles } from "lucide-react";
import { EditablePosterCanvas } from "./components/EditablePosterCanvas";
import { EvidencePanel } from "./components/EvidencePanel";
import { ExportPanel } from "./components/ExportPanel";
import { JsonProjectControls } from "./components/JsonProjectControls";
import { PosterInspector } from "./components/PosterInspector";
import { ProjectEditor } from "./components/ProjectEditor";
import { QaPanel } from "./components/QaPanel";
import { SourceSearchPanel } from "./components/SourceSearchPanel";
import { TracePanel } from "./components/TracePanel";
import { VisualRegistryPanel } from "./components/VisualRegistryPanel";
import { generatePoster, generationTrace, type GenerationOptions } from "./domain/generator";
import { examplePoster } from "./data/examplePoster";
import type { PosterProject, QaIssue, TraceEvent } from "./domain/poster";
import type { PosterCanvasItemKind } from "./components/PosterCanvas";
import { applyQaFix, runQa } from "./qa";
import { palettes, themes } from "./themes";
import { debounce } from "./utils/debounce";
import "./styles/app.css";

const defaultPrompt =
  "Create a results-first poster about fraud model monitoring. Use a polished theme, include a workflow diagram, confusion matrix, Sankey decision flow, and a QA summary.";

function createQueuedTrace(): TraceEvent[] {
  return generationTrace.map((event) => ({ ...event, status: "queued" }));
}

const initialTrace = createQueuedTrace();
// Use the pre-built example poster as the initial state — avoids an async
// call at module init time. generatePoster() is called on explicit Generate.
const initialPoster = examplePoster;
const initialQaIssues = runQa(initialPoster);
type WorkspaceTab = "edit" | "sources" | "qa" | "trace" | "visuals";

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
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("edit");

  const selectedTheme = themes[theme];
  const selectedPalette = palettes[palette];
  const highQaCount = qaIssues.filter((issue) => issue.severity === "high").length;
  const realSourceCount = poster.sources.filter((s) => !s.url?.startsWith("mock://")).length;

  const debouncedRunQa = useMemo(() => debounce((p: PosterProject) => {
    const issues = runQa(p);
    setQaIssues(issues);
    setPoster((prev) => ({ ...prev, qaResults: issues }));
  }, 400), []);

  async function handleGenerate() {
    setIsGenerating(true);
    const startedAt = new Date().toISOString();
    setTrace(createQueuedTrace());
    const completedStepIds = new Set<string>();

    function onProgress(stepId: string) {
      // Mark the previous in-progress step as complete, start the new one
      setTrace((events) =>
        events.map((event) => {
          if (event.id === stepId) return { ...event, status: "running" as const, timestamp: new Date().toISOString() };
          if (event.status === "running") {
            completedStepIds.add(event.id);
            return { ...event, status: "complete" as const };
          }
          return event;
        }),
      );
    }

    try {
      const nextPoster = await generatePoster(
        {
          prompt,
          theme,
          palette,
          sourceMode,
          currentSources: {
            sources: poster.sources,
            sourceDocuments: poster.sourceDocuments ?? [],
            sourceSummaries: poster.sourceSummaries ?? [],
            evidence: poster.evidence ?? [],
          },
        },
        onProgress,
      );

      const completedTrace = generationTrace.map((step) => ({
        ...step,
        status: "complete" as const,
        timestamp: startedAt,
      }));

      const nextQaIssues = runQa(nextPoster);
      setPoster({ ...nextPoster, qaResults: nextQaIssues, traces: completedTrace });
      setQaIssues(nextQaIssues);
      setTrace(completedTrace);
    } catch (err) {
      console.error("[posterforge] Generation error:", err);
      setTrace((events) =>
        events.map((e) =>
          e.status === "running"
            ? { ...e, status: "complete" as const, detail: `Error: ${err instanceof Error ? err.message : String(err)}` }
            : e,
        ),
      );
    } finally {
      setIsGenerating(false);
    }
  }

  function handleThemeChange(nextTheme: string) {
    const nextQaIssues = runQa({ ...poster, theme: nextTheme });
    const nextPoster = { ...poster, theme: nextTheme, logo: themes[nextTheme]?.logoUrl, qaResults: nextQaIssues };
    setTheme(nextTheme);
    setPoster(nextPoster);
    setQaIssues(nextQaIssues);
  }

  function handlePaletteChange(nextPalette: string) {
    const nextQaIssues = runQa({ ...poster, palette: nextPalette });
    const nextPoster = { ...poster, palette: nextPalette, qaResults: nextQaIssues };
    setPalette(nextPalette);
    setPoster(nextPoster);
    setQaIssues(nextQaIssues);
  }

  function handleProjectImport(nextPoster: PosterProject) {
    const nextTheme = themes[nextPoster.theme] ? nextPoster.theme : "clean-academic";
    const nextPalette = nextPoster.palette && palettes[nextPoster.palette] ? nextPoster.palette : themes[nextTheme].palette ?? "clean-blue";
    const normalizedPoster = { ...nextPoster, theme: nextTheme, palette: nextPalette };
    const nextQaIssues = runQa(normalizedPoster);
    setTheme(nextTheme);
    setPalette(nextPalette);
    if (nextPoster.metadata?.prompt) setPrompt(nextPoster.metadata.prompt);
    setPoster({ ...normalizedPoster, qaResults: nextQaIssues });
    setQaIssues(nextQaIssues);
    setTrace(nextPoster.traces?.length ? nextPoster.traces : createQueuedTrace());
  }

  async function handleResetProject() {
    const nextPoster = await generatePoster({ prompt: defaultPrompt, theme: "natwest-group", palette: "natwest-group", sourceMode: "mock" });
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
    setPoster(nextPoster);
    debouncedRunQa(nextPoster);
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
          <span>{realSourceCount > 0 ? `${realSourceCount} real source${realSourceCount !== 1 ? "s" : ""}` : sourceMode}</span>
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
          {isGenerating ? "Generating…" : realSourceCount > 0 ? `Generate from ${realSourceCount} source${realSourceCount !== 1 ? "s" : ""}` : "Generate poster"}
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
        <div className="workspace-tabs" role="tablist" aria-label="Workspace panels">
          <WorkspaceTabButton active={activeTab === "edit"} icon={<Settings2 size={15} />} label="Edit" onClick={() => setActiveTab("edit")} />
          <WorkspaceTabButton active={activeTab === "sources"} icon={<FileSearch size={15} />} label="Sources" onClick={() => setActiveTab("sources")} />
          <WorkspaceTabButton active={activeTab === "qa"} icon={<ClipboardCheck size={15} />} label="QA" onClick={() => setActiveTab("qa")} />
          <WorkspaceTabButton active={activeTab === "trace"} icon={<Route size={15} />} label="Trace" onClick={() => setActiveTab("trace")} />
          <WorkspaceTabButton active={activeTab === "visuals"} icon={<Layers3 size={15} />} label="Visuals" onClick={() => setActiveTab("visuals")} />
        </div>

        <div className="workspace-tab-panel">
          {activeTab === "edit" ? (
            <>
              <ProjectEditor poster={poster} onPosterChange={handlePosterStateChange} />
              <PosterInspector
                poster={poster}
                selectedId={selectedCanvasItem?.id}
                selectedKind={selectedCanvasItem?.kind}
                onPosterChange={handlePosterStateChange}
              />
            </>
          ) : null}

          {activeTab === "sources" ? (
            <>
              <SourceSearchPanel poster={poster} onPosterChange={handlePosterStateChange} />
              <EvidencePanel poster={poster} />
            </>
          ) : null}

          {activeTab === "qa" ? <QaPanel issues={qaIssues} onRunQa={handleRunQa} onApplyFix={handleQaFix} /> : null}
          {activeTab === "trace" ? <TracePanel events={trace} /> : null}
          {activeTab === "visuals" ? <VisualRegistryPanel poster={poster} /> : null}
        </div>
      </section>

      <section className="preview-column" aria-label="Poster workspace">
        <EditablePosterCanvas
          poster={poster}
          selectedId={selectedCanvasItem?.id}
          onPosterChange={handlePosterStateChange}
          onSelectItem={(id, kind) => setSelectedCanvasItem({ id, kind })}
        />
      </section>
    </main>
  );
}

function WorkspaceTabButton({ active, icon, label, onClick }: { active: boolean; icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <button className={active ? "active" : ""} type="button" role="tab" aria-selected={active} onClick={onClick}>
      {icon}
      {label}
    </button>
  );
}
