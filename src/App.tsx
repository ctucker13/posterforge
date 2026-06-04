import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ClipboardCheck, Database, FileSearch, FolderOpen, Globe2, Layers3, Play, Route, Settings2, Sparkles } from "lucide-react";
import { EditablePosterCanvas } from "./components/EditablePosterCanvas";
import { EvidencePanel } from "./components/EvidencePanel";
import { ExportPanel } from "./components/ExportPanel";
import { JsonProjectControls } from "./components/JsonProjectControls";
import { ModeBar, type AppMode } from "./components/ModeBar";
import { OutlineConfirmDialog } from "./components/OutlineConfirmDialog";
import { PosterInspector } from "./components/PosterInspector";
import { ProjectEditor } from "./components/ProjectEditor";
import { QaPanel } from "./components/QaPanel";
import { SourceSearchPanel } from "./components/SourceSearchPanel";
import { SectionRevisionDiff } from "./components/SectionRevisionDiff";
import { ThemePicker } from "./components/ThemePicker";
import { TracePanel } from "./components/TracePanel";
import { VisualRegistryPanel } from "./components/VisualRegistryPanel";
import { generateOutline, generatePoster, generationTrace, regenerateSection, type GenerationOptions } from "./domain/generator";
import { migratePosterProject } from "./domain/migration";
import { examplePoster } from "./data/examplePoster";
import type { PosterOutline, PosterProject, PosterSection, QaIssue, TraceEvent } from "./domain/poster";
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
  const [generationWarning, setGenerationWarning] = useState<string | null>(null);
  const [pendingOutline, setPendingOutline] = useState<PosterOutline | null>(null);
  const [pendingSectionRevision, setPendingSectionRevision] = useState<{ sectionId: string; original: PosterSection; revised: PosterSection } | null>(null);
  const [selectedCanvasItem, setSelectedCanvasItem] = useState<{ id: string; kind: PosterCanvasItemKind } | undefined>();
  const [appMode, setAppMode] = useState<AppMode>("edit");
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("edit");
  const generationIdRef = useRef(0);

  const selectedTheme = themes[theme];
  const selectedPalette = palettes[palette];
  const highQaCount = qaIssues.filter((issue) => issue.severity === "high").length;
  const realSourceCount = poster.sources.filter((s) => !s.url?.startsWith("mock://")).length;

  const debouncedRunQa = useMemo(() => debounce((p: PosterProject) => {
    const issues = runQa(p);
    setQaIssues(issues);
    setPoster((prev) => ({ ...prev, qaResults: issues }));
  }, 400), []);

  useEffect(() => () => debouncedRunQa.cancel(), [debouncedRunQa]);

  async function handleGenerate() {
    setIsGenerating(true);
    setGenerationWarning(null);
    setTrace(createQueuedTrace());

    try {
      const outline = await generateOutline({
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
      });
      setPendingOutline(outline);
    } catch (err) {
      console.error("[posterforge] Outline generation error:", err);
      setGenerationWarning(`Outline generation failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleConfirmOutline(confirmedOutline: PosterOutline) {
    const thisId = ++generationIdRef.current;
    setIsGenerating(true);
    setPendingOutline(null);
    setGenerationWarning(null);
    const startedAt = new Date().toISOString();
    setTrace(createQueuedTrace());
    const completedStepIds = new Set<string>();

    function onProgress(stepId: string) {
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
          outline: confirmedOutline,
        },
        onProgress,
        (msg) => setGenerationWarning(msg),
      );

      if (generationIdRef.current !== thisId) return;

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
      if (generationIdRef.current !== thisId) return;
      console.error("[posterforge] Generation error:", err);
      setGenerationWarning(`Generation failed: ${err instanceof Error ? err.message : String(err)}`);
      setTrace((events) =>
        events.map((e) =>
          e.status === "running"
            ? { ...e, status: "complete" as const, detail: `Error: ${err instanceof Error ? err.message : String(err)}` }
            : e,
        ),
      );
    } finally {
      if (generationIdRef.current === thisId) setIsGenerating(false);
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
    const { poster: migrated, changes } = migratePosterProject(nextPoster);
    if (changes.length > 0) {
      console.info("[posterforge] Schema migration applied:", changes);
    }
    const nextTheme = themes[migrated.theme] ? migrated.theme : "clean-academic";
    const nextPalette = migrated.palette && palettes[migrated.palette] ? migrated.palette : themes[nextTheme]?.palette ?? "clean-blue";
    const normalizedPoster = { ...migrated, theme: nextTheme, palette: nextPalette };
    const nextQaIssues = runQa(normalizedPoster);
    setTheme(nextTheme);
    setPalette(nextPalette);
    if (migrated.metadata?.prompt) setPrompt(migrated.metadata.prompt);
    setPoster({ ...normalizedPoster, qaResults: nextQaIssues });
    setQaIssues(nextQaIssues);
    setTrace(migrated.traces?.length ? migrated.traces : createQueuedTrace());
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

  function handleQaNavigate(location: string) {
    const [collection, id] = location.split(".");
    if (!id) return;

    if (collection === "visuals") {
      setSelectedCanvasItem({ id, kind: "visual" });
    } else if (collection === "sections") {
      setSelectedCanvasItem({ id, kind: "section" });
    }
    setAppMode("edit");
    setActiveTab("edit");
  }

  function handleSectionReorder(orderedIds: string[]) {
    handlePosterStateChange({
      ...poster,
      sections: poster.sections.map((section) => ({
        ...section,
        layout: {
          ...(section.layout ?? {}),
          order: orderedIds.indexOf(section.id),
        },
      })),
    });
  }

  function handleMoveSection(sectionId: string, direction: -1 | 1) {
    const orderedSections = [...poster.sections].sort((a, b) => (a.layout?.order ?? poster.sections.indexOf(a)) - (b.layout?.order ?? poster.sections.indexOf(b)));
    const index = orderedSections.findIndex((section) => section.id === sectionId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= orderedSections.length) return;
    const [section] = orderedSections.splice(index, 1);
    if (!section) return;
    orderedSections.splice(nextIndex, 0, section);
    handleSectionReorder(orderedSections.map((item) => item.id));
  }

  function handleToggleHideSection(sectionId: string) {
    handlePosterStateChange({
      ...poster,
      sections: poster.sections.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              layout: {
                ...(section.layout ?? {}),
                hidden: !section.layout?.hidden,
              },
            }
          : section,
      ),
    });
  }

  function handleDeleteSection(sectionId: string) {
    handlePosterStateChange({
      ...poster,
      sections: poster.sections.filter((section) => section.id !== sectionId).map((section, order) => ({ ...section, layout: { ...(section.layout ?? {}), order } })),
    });
    if (selectedCanvasItem?.id === sectionId) {
      setSelectedCanvasItem(undefined);
    }
  }

  async function handleRegenerateSection(sectionId: string, instruction?: string) {
    const section = poster.sections.find((item) => item.id === sectionId);
    if (!section) return;
    const revised = await regenerateSection(section, instruction, poster);
    setPendingSectionRevision({ sectionId, original: section, revised });
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

      {generationWarning ? (
        <div className="generation-warning" role="alert">
          <span>{generationWarning}</span>
          <button type="button" aria-label="Dismiss" onClick={() => setGenerationWarning(null)}>✕</button>
        </div>
      ) : null}

      {pendingOutline ? <OutlineConfirmDialog outline={pendingOutline} onConfirm={handleConfirmOutline} onBack={() => setPendingOutline(null)} /> : null}

      <section className="control-panel tool-panel" aria-label="PosterForge controls">
        <ModeBar mode={appMode} onModeChange={setAppMode} qaIssueCount={qaIssues.length} />
        <div className="panel-header">
          <h2>{getAppModeLabel(appMode)}</h2>
          <span>{appMode === "generate" && realSourceCount > 0 ? `${realSourceCount} real source${realSourceCount !== 1 ? "s" : ""}` : appMode}</span>
        </div>

        {appMode === "generate" ? (
          <>
            <label className="field">
              <span>Prompt</span>
              <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} rows={6} />
            </label>

            <ThemePicker selectedTheme={theme} selectedPalette={palette} onThemeChange={handleThemeChange} onPaletteChange={handlePaletteChange} />

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

            {selectedTheme && selectedPalette ? (
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
            ) : null}
          </>
        ) : null}

        {appMode === "edit" ? (
          <>
            <ProjectEditor poster={poster} onPosterChange={handlePosterStateChange} />
            <PosterInspector
              poster={poster}
              selectedId={selectedCanvasItem?.id}
              selectedKind={selectedCanvasItem?.kind}
              onPosterChange={handlePosterStateChange}
              onMoveSection={handleMoveSection}
              onToggleHideSection={handleToggleHideSection}
            />
          </>
        ) : null}

        {appMode === "review" ? <QaPanel issues={qaIssues} onRunQa={handleRunQa} onApplyFix={handleQaFix} onNavigate={handleQaNavigate} /> : null}

        {appMode === "export" ? (
          <>
            <ExportPanel poster={poster} />
            <JsonProjectControls poster={poster} onImport={handleProjectImport} onReset={handleResetProject} />
          </>
        ) : null}
      </section>

      <section className="inspector-column" aria-label="Poster inspectors">
        {appMode === "edit" ? (
          <>
            <div className="workspace-tabs" role="tablist" aria-label="Workspace panels">
              <WorkspaceTabButton active={activeTab === "edit"} icon={<Settings2 size={15} />} label="Edit" onClick={() => setActiveTab("edit")} />
              <WorkspaceTabButton active={activeTab === "sources"} icon={<FileSearch size={15} />} label="Sources" onClick={() => setActiveTab("sources")} />
              <WorkspaceTabButton active={activeTab === "qa"} icon={<ClipboardCheck size={15} />} label="QA" onClick={() => setActiveTab("qa")} />
              <WorkspaceTabButton active={activeTab === "trace"} icon={<Route size={15} />} label="Trace" onClick={() => setActiveTab("trace")} />
              <WorkspaceTabButton active={activeTab === "visuals"} icon={<Layers3 size={15} />} label="Visuals" onClick={() => setActiveTab("visuals")} />
            </div>

            <div className="workspace-tab-panel">
              {activeTab === "edit" ? <VisualRegistryPanel poster={poster} /> : null}
              {activeTab === "sources" ? (
                <>
                  <SourceSearchPanel poster={poster} sourceMode={sourceMode} onPosterChange={handlePosterStateChange} />
                  <EvidencePanel poster={poster} />
                </>
              ) : null}
              {activeTab === "qa" ? <QaPanel issues={qaIssues} onRunQa={handleRunQa} onApplyFix={handleQaFix} onNavigate={handleQaNavigate} /> : null}
              {activeTab === "trace" ? <TracePanel events={trace} /> : null}
              {activeTab === "visuals" ? <VisualRegistryPanel poster={poster} /> : null}
            </div>
          </>
        ) : null}

        {appMode === "generate" ? (
          <div className="workspace-tab-panel">
            <SourceSearchPanel poster={poster} sourceMode={sourceMode} onPosterChange={handlePosterStateChange} />
            <EvidencePanel poster={poster} />
          </div>
        ) : null}

        {appMode === "review" ? (
          <div className="workspace-tab-panel">
            <TracePanel events={trace} />
          </div>
        ) : null}
      </section>

      <section className="preview-column" aria-label="Poster workspace">
        <EditablePosterCanvas
          poster={poster}
          selectedId={selectedCanvasItem?.id}
          selectedKind={selectedCanvasItem?.kind}
          qaIssues={appMode === "review" ? qaIssues : []}
          onPosterChange={handlePosterStateChange}
          onSectionReorder={handleSectionReorder}
          onRegenerateSection={handleRegenerateSection}
          onMoveSection={handleMoveSection}
          onToggleHideSection={handleToggleHideSection}
          onDeleteSection={handleDeleteSection}
          onSelectItem={(id, kind) => {
            setSelectedCanvasItem({ id, kind });
            setAppMode("edit");
            setActiveTab("edit");
          }}
        />
        {pendingSectionRevision ? (
          <SectionRevisionDiff
            original={pendingSectionRevision.original}
            revised={pendingSectionRevision.revised}
            onAccept={() => {
              handlePosterStateChange({
                ...poster,
                sections: poster.sections.map((section) => (section.id === pendingSectionRevision.sectionId ? pendingSectionRevision.revised : section)),
              });
              setPendingSectionRevision(null);
            }}
            onReject={() => setPendingSectionRevision(null)}
          />
        ) : null}
      </section>
    </main>
  );
}

function getAppModeLabel(mode: AppMode) {
  return mode.charAt(0).toUpperCase() + mode.slice(1);
}

function WorkspaceTabButton({ active, icon, label, onClick }: { active: boolean; icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <button className={active ? "active" : ""} type="button" role="tab" aria-selected={active} onClick={onClick}>
      {icon}
      {label}
    </button>
  );
}
