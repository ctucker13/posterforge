import { Activity, ClipboardCheck, Database, Download, SlidersHorizontal } from "lucide-react";

export type RightPanel = "inspector" | "sources" | "qa" | "export" | "trace";

export function RightRailTabs({
  active,
  onSelect,
  qaCount,
}: {
  active: RightPanel;
  onSelect: (tab: RightPanel) => void;
  qaCount: number;
}) {
  const tabs: Array<{ id: RightPanel; label: string; icon: React.ReactNode; badge?: number | undefined }> = [
    { id: "inspector", label: "Inspector", icon: <SlidersHorizontal size={13} /> },
    { id: "sources",   label: "Sources",   icon: <Database size={13} /> },
    { id: "qa",        label: "QA",        icon: <ClipboardCheck size={13} />, badge: qaCount || undefined },
    { id: "export",    label: "Export",    icon: <Download size={13} /> },
    { id: "trace",     label: "Trace",     icon: <Activity size={13} /> },
  ];

  return (
    <div className="right-rail-tabs" role="tablist" aria-label="Right panel">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={active === tab.id}
          className={active === tab.id ? "active" : ""}
          onClick={() => onSelect(tab.id)}
          title={tab.label}
        >
          {tab.icon}
          <span>{tab.label}</span>
          {tab.badge != null ? <strong key={tab.badge}>{tab.badge}</strong> : null}
        </button>
      ))}
    </div>
  );
}
