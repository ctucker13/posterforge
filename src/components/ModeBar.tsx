import { ClipboardCheck, Download, Pencil, Sparkles } from "lucide-react";

export type AppMode = "generate" | "edit" | "review" | "export";

export function ModeBar({
  mode,
  onModeChange,
  qaIssueCount,
}: {
  mode: AppMode;
  onModeChange: (mode: AppMode) => void;
  qaIssueCount: number;
}) {
  const modes: Array<{ id: AppMode; label: string; icon: JSX.Element }> = [
    { id: "generate", label: "Generate", icon: <Sparkles size={15} /> },
    { id: "edit", label: "Edit", icon: <Pencil size={15} /> },
    { id: "review", label: "Review", icon: <ClipboardCheck size={15} /> },
    { id: "export", label: "Export", icon: <Download size={15} /> },
  ];

  return (
    <div className="mode-bar" role="tablist" aria-label="Application mode">
      {modes.map((item) => (
        <button type="button" className={mode === item.id ? "active" : ""} role="tab" aria-selected={mode === item.id} key={item.id} onClick={() => onModeChange(item.id)}>
          {item.icon}
          <span>{item.label}</span>
          {item.id === "review" && qaIssueCount > 0 ? <strong>{qaIssueCount}</strong> : null}
        </button>
      ))}
    </div>
  );
}
