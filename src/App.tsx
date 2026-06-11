import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Play, Sparkles } from "lucide-react";
import { EditablePosterCanvas } from "./components/EditablePosterCanvas";
import { EvidencePanel } from "./components/EvidencePanel";
import { ExportPanel } from "./components/ExportPanel";
import { JsonProjectControls } from "./components/JsonProjectControls";
import { ModeBar, type AppMode } from "./components/ModeBar";
import { RightRailTabs, type RightPanel } from "./components/RightRailTabs";
import { OutlineConfirmDialog } from "./components/OutlineConfirmDialog";
import { PosterInspector } from "./components/PosterInspector";
import { ProjectEditor } from "./components/ProjectEditor";
import { ProjectSwitcher } from "./components/ProjectSwitcher";
import { QaPanel } from "./components/QaPanel";
import { SourceSearchPanel } from "./components/SourceSearchPanel";
import { SectionRevisionDiff } from "./components/SectionRevisionDiff";
import { ThemePicker } from "./components/ThemePicker";
import { AssetPicker } from "./components/AssetPicker";
import { TracePanel } from "./components/TracePanel";
import { KeyboardShortcutsOverlay } from "./components/KeyboardShortcutsOverlay";
import { catalogueEntryToPosterAsset, findThemeBackgroundAsset, loadAssetCatalogue, type AssetCatalogue } from "./assets/catalogue";
import { usePosterHistory, type PosterChangeOptions } from "./app/usePosterHistory";
import { createProject, getLastProjectId, loadProject, saveProject, setLastProjectId, snapshotProject } from "./app/projectStore";
import { generateOutline, generatePoster, generationTrace, regenerateSection } from "./domain/generator";
import { migratePosterProject } from "./domain/migration";
import { examplePoster } from "./data/examplePoster";
import type { PosterOutline, PosterProject, PosterSection, QaIssue, TraceEvent } from "./domain/poster";
import type { PosterCanvasItemKind } from "./components/PosterCanvas";
import { applyQaFix, runQa } from "./qa";
import { friendlyError } from "./app/friendlyError";
import { palettes, themes } from "./themes";
import { debounce } from "./utils/debounce";
import "./styles/app.css";

const gabeChoicePrompt =
  "Create a data science academic poster about GabeChoice using the attached GitHub repository as evidence. Focus on the LangGraph recommendation pipeline, Steam data ingestion, taste-profile modeling, blended LLM and Metacritic scoring, caching, evaluation signals, and limitations.";

function createQueuedTrace(): TraceEvent[] {
  return generationTrace.map((event) => ({ ...event, status: "queued" }));
}

const initialTrace = createQueuedTrace();
// Use the pre-built example poster as the initial state — avoids an async
// call at module init time. generatePoster() is called on explicit Generate.
const initialPoster = examplePoster;
const initialQaIssues = runQa(initialPoster);

export default function App() {
  const [prompt, setPrompt] = useState(gabeChoicePrompt);
  const [theme, setTheme] = useState(initialPoster.theme);
  const [palette, setPalette] = useState(initialPoster.palette ?? themes[initialPoster.theme]?.palette ?? "clean-blue");
  const [trace, setTrace] = useState<TraceEvent[]>(initialTrace);
  const { poster, setPoster, reset, undo, redo, canUndo, canRedo } = usePosterHistory({ ...initialPoster, qaResults: initialQaIssues });
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [qaIssues, setQaIssues] = useState<QaIssue[]>(initialQaIssues);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationWarning, setGenerationWarning] = useState<string | null>(null);
  const [pendingOutline, setPendingOutline] = useState<PosterOutline | null>(null);
  const [pendingSectionRevision, setPendingSectionRevision] = useState<{ sectionId: string; original: PosterSection; revised: PosterSection } | null>(null);
  const [selectedCanvasItem, setSelectedCanvasItem] = useState<{ id: string; kind: PosterCanvasItemKind } | undefined>();
  const [appMode, setAppMode] = useState<AppMode>("edit");
  const [rightPanel, setRightPanel] = useState<RightPanel>("inspector");
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [assetCatalogue, setAssetCatalogue] = useState<AssetCatalogue | null>(null);
  const generationIdRef = useRef(0);
  const liveRegionRef = useRef<HTMLDivElement>(null);

  function announce(msg: string) {
    const el = liveRegionRef.current;
    if (!el) return;
    el.textContent = "";
    requestAnimationFrame(() => { el.textContent = msg; });
  }

  const selectedTheme = themes[theme];
  const selectedPalette = palettes[palette];
  const highQaCount = qaIssues.filter((issue) => issue.severity === "high").length;
  const realSourceCount = poster.sources.length;

  const debouncedRunQa = useMemo(() => debounce((p: PosterProject) => {
    const issues = runQa(p);
    setQaIssues(issues);
    // QA results are derived data — refresh them without polluting undo history.
    setPoster((prev) => ({ ...prev, qaResults: issues }), { skipHistory: true });
  }, 400), [setPoster]);

  useEffect(() => () => debouncedRunQa.cancel(), [debouncedRunQa]);

  // Theme/palette picker state follows the poster so undo/redo restores it too.
  useEffect(() => {
    setTheme(poster.theme);
    setPalette(poster.palette ?? themes[poster.theme]?.palette ?? "clean-blue");
  }, [poster.theme, poster.palette]);

  const handleUndo = useCallback(() => {
    const restored = undo();
    if (!restored) return;
    setQaIssues(restored.qaResults ?? []);
    debouncedRunQa(restored);
  }, [undo, debouncedRunQa]);

  const handleRedo = useCallback(() => {
    const restored = redo();
    if (!restored) return;
    setQaIssues(restored.qaResults ?? []);
    debouncedRunQa(restored);
  }, [redo, debouncedRunQa]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey)) return;
      const key = event.key.toLowerCase();
      const wantsRedo = (key === "z" && event.shiftKey) || key === "y";
      const wantsUndo = key === "z" && !event.shiftKey;
      if (!wantsUndo && !wantsRedo) return;
      // Inputs and contentEditable keep their native text undo.
      if (isEditableTarget(event.target)) return;
      event.preventDefault();
      if (wantsRedo) handleRedo();
      else handleUndo();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleUndo, handleRedo]);

  // F6: non-mod keyboard shortcuts (Esc, arrows, delete, ?)
  const f6StateRef = useRef({ appMode, selectedCanvasItem, handleMoveSection, handleToggleHideSection });
  f6StateRef.current = { appMode, selectedCanvasItem, handleMoveSection, handleToggleHideSection };
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (isEditableTarget(event.target)) return;
      if ((event.target as Element)?.closest?.(".freeform-slot")) return;
      if (event.metaKey || event.ctrlKey) return;

      const { appMode: mode, selectedCanvasItem: sel, handleMoveSection: moveSection, handleToggleHideSection: toggleHide } = f6StateRef.current;
      if (event.key === "?") { setShowShortcuts((s) => !s); return; }
      if (event.key === "Escape") { setShowShortcuts(false); setSelectedCanvasItem(undefined); return; }

      if (mode !== "edit" || !sel) return;
      if (sel.kind === "section") {
        if (event.key === "ArrowUp") { event.preventDefault(); moveSection(sel.id, -1); return; }
        if (event.key === "ArrowDown") { event.preventDefault(); moveSection(sel.id, 1); return; }
        if (event.key === "Delete" || event.key === "Backspace") { event.preventDefault(); toggleHide(sel.id); return; }
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let cancelled = false;
    loadAssetCatalogue()
      .then((catalogue) => {
        if (!cancelled) setAssetCatalogue(catalogue);
      })
      .catch(() => {
        if (!cancelled) setAssetCatalogue(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // On mount: load the last-opened project from IndexedDB, or create one from the example.
  useEffect(() => {
    let cancelled = false;
    async function loadLastProject() {
      try {
        const lastId = getLastProjectId();
        if (lastId) {
          const stored = await loadProject(lastId);
          if (stored && !cancelled) {
            const { poster: loaded } = migratePosterProject(stored.poster);
            const qa = runQa(loaded);
            reset({ ...loaded, qaResults: qa });
            setQaIssues(qa);
            setCurrentProjectId(lastId);
            return;
          }
        }
        // No saved project — persist the example poster as the first project.
        if (!cancelled) {
          const id = await createProject({ ...initialPoster, qaResults: initialQaIssues });
          setLastProjectId(id);
          setCurrentProjectId(id);
        }
      } catch (err) {
        console.warn("[posterforge] Could not load project from IndexedDB:", err);
      }
    }
    void loadLastProject();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced autosave: write to IndexedDB 2 s after any poster change.
  const debouncedSave = useMemo(
    () =>
      debounce((id: string, p: PosterProject) => {
        saveProject(id, p).catch((err) =>
          console.warn("[posterforge] Autosave failed:", err),
        );
      }, 2000),
    [],
  );

  useEffect(() => {
    if (!currentProjectId) return;
    debouncedSave(currentProjectId, poster);
  }, [poster, currentProjectId, debouncedSave]);

  useEffect(() => () => debouncedSave.cancel(), [debouncedSave]);

  async function handleGenerate() {
    setIsGenerating(true);
    setGenerationWarning(null);
    setTrace(createQueuedTrace());

    try {
      const outline = await generateOutline({
        prompt,
        theme,
        palette,
        sourceMode: "github",
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
      const msg = friendlyError(err);
      setGenerationWarning(msg);
      announce(msg);
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleConfirmOutline(confirmedOutline: PosterOutline) {
    const thisId = ++generationIdRef.current;
    setIsGenerating(true);
    setPendingOutline(null);
    // Snapshot before generation so the user can always recover their edited poster.
    if (currentProjectId) {
      void snapshotProject(currentProjectId, poster, "Before generation");
    }
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
          sourceMode: "github",
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
      announce(`Poster generated. QA found ${nextQaIssues.length} issue${nextQaIssues.length === 1 ? "" : "s"}.`);
    } catch (err) {
      if (generationIdRef.current !== thisId) return;
      console.error("[posterforge] Generation error:", err);
      const msg = friendlyError(err);
      setGenerationWarning(msg);
      announce(msg);
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
    const nextPalette = themes[nextTheme]?.palette ?? "clean-blue";
    const backgroundAsset = findThemeBackgroundAsset(assetCatalogue, nextTheme);
    const nextAssets = backgroundAsset
      ? [catalogueEntryToPosterAsset(backgroundAsset), ...(poster.assets ?? []).filter((asset) => asset.role !== "background")]
      : (poster.assets ?? []).filter((asset) => asset.role !== "background");
    const nextQaIssues = runQa({ ...poster, theme: nextTheme, palette: nextPalette, assets: nextAssets });
    const nextPoster = {
      ...poster,
      theme: nextTheme,
      palette: nextPalette,
      logo: themes[nextTheme]?.logoUrl,
      assets: nextAssets,
      qaResults: nextQaIssues,
    };
    setPoster(nextPoster);
    setQaIssues(nextQaIssues);
  }

  function handlePaletteChange(nextPalette: string) {
    const nextQaIssues = runQa({ ...poster, palette: nextPalette });
    const nextPoster = { ...poster, palette: nextPalette, qaResults: nextQaIssues };
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
    if (migrated.metadata?.prompt) setPrompt(migrated.metadata.prompt);
    setPoster({ ...normalizedPoster, qaResults: nextQaIssues });
    setQaIssues(nextQaIssues);
    setTrace(migrated.traces?.length ? migrated.traces : createQueuedTrace());
  }

  async function handleResetProject() {
    const nextPoster = initialPoster;
    const nextQaIssues = runQa(nextPoster);
    setPrompt(gabeChoicePrompt);
    setPoster({ ...nextPoster, qaResults: nextQaIssues });
    setQaIssues(nextQaIssues);
    setTrace(createQueuedTrace());
  }

  async function handleSwitchProject(id: string) {
    try {
      const stored = await loadProject(id);
      if (!stored) return;
      const { poster: loaded } = migratePosterProject(stored.poster);
      const qa = runQa(loaded);
      reset({ ...loaded, qaResults: qa });
      setQaIssues(qa);
      setTrace(loaded.traces?.length ? loaded.traces : createQueuedTrace());
      if (loaded.metadata?.prompt) setPrompt(loaded.metadata.prompt);
      setCurrentProjectId(id);
      setLastProjectId(id);
    } catch (err) {
      console.warn("[posterforge] Failed to switch project:", err);
    }
  }

  async function handleNewProject() {
    try {
      const blank: PosterProject = { ...initialPoster, title: "New poster", sections: initialPoster.sections };
      const qa = runQa(blank);
      const id = await createProject({ ...blank, qaResults: qa });
      setLastProjectId(id);
      reset({ ...blank, qaResults: qa });
      setQaIssues(qa);
      setTrace(createQueuedTrace());
      setCurrentProjectId(id);
    } catch (err) {
      console.warn("[posterforge] Failed to create project:", err);
    }
  }

  function handleRunQa() {
    const nextQaIssues = runQa(poster);
    setQaIssues(nextQaIssues);
    setPoster((current) => ({ ...current, qaResults: nextQaIssues }), { skipHistory: true });
    if (nextQaIssues.length > 0) setRightPanel("qa");
    announce(nextQaIssues.length === 0 ? "QA passed — no issues found." : `QA found ${nextQaIssues.length} issue${nextQaIssues.length === 1 ? "" : "s"}.`);
  }

  function handlePosterStateChange(nextPoster: PosterProject, options?: PosterChangeOptions) {
    setPoster(nextPoster, options);
    if (!options?.skipHistory) debouncedRunQa(nextPoster);
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
    if (collection === "visuals") setSelectedCanvasItem({ id, kind: "visual" });
    else if (collection === "sections") setSelectedCanvasItem({ id, kind: "section" });
    setAppMode("edit");
    setRightPanel("inspector");
  }

  function handleMoveBlock(fromSectionId: string, fromIndex: number, toSectionId: string, toIndex: number) {
    const fromSection = poster.sections.find((s) => s.id === fromSectionId);
    if (!fromSection) return;
    const block = fromSection.blocks[fromIndex];
    if (!block) return;

    if (fromSectionId === toSectionId) {
      // Within same section — reorder
      const newBlocks = [...fromSection.blocks];
      newBlocks.splice(fromIndex, 1);
      const clampedTo = Math.min(toIndex, newBlocks.length);
      newBlocks.splice(clampedTo, 0, block);
      handlePosterStateChange({
        ...poster,
        sections: poster.sections.map((s) => s.id === fromSectionId ? { ...s, blocks: newBlocks } : s),
      });
    } else {
      // Cross-section move
      const toSection = poster.sections.find((s) => s.id === toSectionId);
      if (!toSection) return;
      const fromBlocks = fromSection.blocks.filter((_, i) => i !== fromIndex);
      const toBlocks = [...toSection.blocks];
      const clampedTo = Math.min(toIndex, toBlocks.length);
      toBlocks.splice(clampedTo, 0, block);
      handlePosterStateChange({
        ...poster,
        sections: poster.sections.map((s) => {
          if (s.id === fromSectionId) return { ...s, blocks: fromBlocks };
          if (s.id === toSectionId) return { ...s, blocks: toBlocks };
          return s;
        }),
      });
    }
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
      <a href="#poster-canvas" className="skip-link">Skip to poster canvas</a>
      <div ref={liveRegionRef} aria-live="polite" aria-atomic="true" className="sr-only" />
      <header className="workspace-header">
        <div className="product-mark">
          <div className="mark-icon">
            <Sparkles size={24} />
          </div>
          <div>
            <p>PosterForge</p>
            <ProjectSwitcher
              currentProjectId={currentProjectId}
              currentProjectName={poster.title}
              onSwitch={handleSwitchProject}
              onNew={handleNewProject}
            />
          </div>
        </div>

        <ModeBar mode={appMode} onModeChange={setAppMode} />

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
        {appMode === "generate" ? (
          <>
            <label className="field">
              <span>Prompt</span>
              <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} rows={6} />
            </label>

            <ThemePicker selectedTheme={theme} selectedPalette={palette} onThemeChange={handleThemeChange} onPaletteChange={handlePaletteChange} />

            <details className="asset-picker-disclosure">
              <summary>Background asset</summary>
              <AssetPicker
                selectedTheme={theme}
                selectedAssetId={poster.assets?.find((a) => a.role === "background")?.id}
                onSelect={(asset) => {
                  const nextPoster = {
                    ...poster,
                    assets: [asset, ...(poster.assets ?? []).filter((a) => a.role !== "background")],
                  };
                  handlePosterStateChange(nextPoster);
                }}
              />
            </details>

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
        ) : (
          <ProjectEditor poster={poster} onPosterChange={handlePosterStateChange} />
        )}
      </section>

      <section className="inspector-column" aria-label="Right panel">
        <RightRailTabs active={rightPanel} onSelect={setRightPanel} qaCount={qaIssues.length} />
        <div className="right-rail-content">
          <div key={rightPanel} className="panel-enter">
            {rightPanel === "inspector" && (
              <PosterInspector
                poster={poster}
                selectedId={selectedCanvasItem?.id}
                selectedKind={selectedCanvasItem?.kind}
                onPosterChange={handlePosterStateChange}
                onMoveSection={handleMoveSection}
                onToggleHideSection={handleToggleHideSection}
              />
            )}
            {rightPanel === "sources" && (
              <div className="workspace-tab-panel">
                <SourceSearchPanel
                  poster={poster}
                  onPosterChange={handlePosterStateChange}
                  onUseExampleRepo={() => {
                    setPrompt(gabeChoicePrompt);
                    const nextTheme = "clean-academic";
                    const nextPalette = themes[nextTheme]?.palette ?? "clean-blue";
                    const nextPoster = { ...poster, theme: nextTheme, palette: nextPalette, logo: themes[nextTheme]?.logoUrl };
                    const nextQaIssues = runQa(nextPoster);
                    setPoster({ ...nextPoster, qaResults: nextQaIssues });
                    setQaIssues(nextQaIssues);
                  }}
                />
                <EvidencePanel poster={poster} />
              </div>
            )}
            {rightPanel === "qa" && (
              <QaPanel issues={qaIssues} onRunQa={handleRunQa} onApplyFix={handleQaFix} onNavigate={handleQaNavigate} />
            )}
            {rightPanel === "export" && (
              <>
                <ExportPanel poster={poster} />
                <JsonProjectControls poster={poster} onImport={handleProjectImport} onReset={handleResetProject} />
              </>
            )}
            {rightPanel === "trace" && (
              <TracePanel events={trace} />
            )}
          </div>
        </div>
      </section>

      <section id="poster-canvas" className="preview-column" aria-label="Poster workspace">
        <EditablePosterCanvas
          poster={poster}
          selectedId={selectedCanvasItem?.id}
          selectedKind={selectedCanvasItem?.kind}
          qaIssues={qaIssues}
          onPosterChange={handlePosterStateChange}
          onUndo={handleUndo}
          onRedo={handleRedo}
          canUndo={canUndo}
          canRedo={canRedo}
          onSectionReorder={handleSectionReorder}
          onMoveBlock={handleMoveBlock}
          onRegenerateSection={handleRegenerateSection}
          onMoveSection={handleMoveSection}
          onToggleHideSection={handleToggleHideSection}
          onDeleteSection={handleDeleteSection}
          onDeselectItem={() => setSelectedCanvasItem(undefined)}
          onSelectItem={(id, kind) => {
            setSelectedCanvasItem({ id, kind });
            setAppMode("edit");
            setRightPanel("inspector");
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
      {showShortcuts && <KeyboardShortcutsOverlay onClose={() => setShowShortcuts(false)} />}
    </main>
  );
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT";
}
