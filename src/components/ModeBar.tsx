import { Pencil, Sparkles } from "lucide-react";

export type AppMode = "generate" | "edit";

export function ModeBar({
  mode,
  onModeChange,
}: {
  mode: AppMode;
  onModeChange: (mode: AppMode) => void;
}) {
  return (
    <div className="mode-bar" role="tablist" aria-label="Application mode">
      <button
        type="button"
        className={mode === "generate" ? "active" : ""}
        role="tab"
        aria-selected={mode === "generate"}
        onClick={() => onModeChange("generate")}
      >
        <Sparkles size={15} />
        <span>Generate</span>
      </button>
      <button
        type="button"
        className={mode === "edit" ? "active" : ""}
        role="tab"
        aria-selected={mode === "edit"}
        onClick={() => onModeChange("edit")}
      >
        <Pencil size={15} />
        <span>Edit</span>
      </button>
    </div>
  );
}
