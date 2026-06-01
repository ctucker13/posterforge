import { useMemo, useState } from "react";
import { Database, Github, Globe2, Palette, Play, Sparkles } from "lucide-react";
import { PosterPreview } from "./components/PosterPreview";
import { TracePanel } from "./components/TracePanel";
import { generatePoster, generationTrace, type GenerationOptions } from "./domain/generator";
import type { TraceEvent } from "./domain/poster";
import { themes } from "./domain/themes";
import { visualRegistry } from "./domain/visualRegistry";
import "./styles/app.css";

const defaultPrompt =
  "Create a results-first poster about fraud model monitoring. Use a polished theme, include a workflow diagram, confusion matrix, Sankey decision flow, and a QA summary.";

const initialTrace: TraceEvent[] = generationTrace.map((event) => ({ ...event, status: "queued" }));

export default function App() {
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [theme, setTheme] = useState("natwest-group");
  const [palette, setPalette] = useState("natwest-group");
  const [sourceMode, setSourceMode] = useState<GenerationOptions["sourceMode"]>("mock");
  const [trace, setTrace] = useState<TraceEvent[]>(initialTrace);
  const [poster, setPoster] = useState(() =>
    generatePoster({ prompt: defaultPrompt, theme: "natwest-group", palette: "natwest-group", sourceMode: "mock" }),
  );
  const [isGenerating, setIsGenerating] = useState(false);

  const selectedTheme = themes[theme];
  const visibleVisuals = useMemo(() => visualRegistry.slice(0, 10), []);

  async function handleGenerate() {
    setIsGenerating(true);
    setTrace(initialTrace);

    for (const step of generationTrace) {
      setTrace((events) => events.map((event) => (event.id === step.id ? { ...event, status: "running" } : event)));
      await new Promise((resolve) => setTimeout(resolve, 260));
      setTrace((events) => events.map((event) => (event.id === step.id ? { ...event, status: "complete" } : event)));
    }

    setPoster(generatePoster({ prompt, theme, palette, sourceMode }));
    setIsGenerating(false);
  }

  return (
    <main className="app-shell">
      <section className="control-panel" aria-label="Generation controls">
        <div className="product-mark">
          <div className="mark-icon">
            <Sparkles size={24} />
          </div>
          <div>
            <p>PosterForge</p>
            <h1>Source-grounded poster generation</h1>
          </div>
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
            <select value={theme} onChange={(event) => setTheme(event.target.value)}>
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
            <select value={palette} onChange={(event) => setPalette(event.target.value)}>
              <option value="natwest-group">NatWest Group</option>
              <option value="clean-blue">Clean Blue</option>
              <option value="comic-ink">Comic Ink</option>
              <option value="retro-lab">Retro Lab</option>
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
            <Github size={18} /> Local
          </button>
        </div>

        <button className="primary-action" type="button" onClick={handleGenerate} disabled={isGenerating}>
          <Play size={18} />
          {isGenerating ? "Generating" : "Generate poster"}
        </button>

        <aside className="theme-note">
          <strong>{selectedTheme.name}</strong>
          <p>{selectedTheme.description}</p>
        </aside>

        <section className="visual-registry">
          <h2>Visual registry</h2>
          <div>
            {visibleVisuals.map((visual) => (
              <span key={visual.id}>{visual.id.replace(/_/g, " ")}</span>
            ))}
          </div>
        </section>
      </section>

      <TracePanel events={trace} />
      <PosterPreview poster={poster} />
    </main>
  );
}
