import { useState } from "react";
import { X } from "lucide-react";
import { VISUAL_REGISTRY, type VisualCategory, type VisualDefinition } from "../visuals/visualRegistry";

interface VisualPickerProps {
  onSelect: (visual: VisualDefinition) => void;
  onClose: () => void;
}

const TABS: { label: string; category: VisualCategory | "all" }[] = [
  { label: "All", category: "all" },
  { label: "Charts", category: "chart" },
  { label: "Diagrams", category: "diagram" },
  { label: "Equations", category: "equation" },
  { label: "Tables", category: "table" },
];

export function VisualPicker({ onSelect, onClose }: VisualPickerProps) {
  const [activeTab, setActiveTab] = useState<VisualCategory | "all">("all");

  const visible =
    activeTab === "all"
      ? VISUAL_REGISTRY
      : VISUAL_REGISTRY.filter((v) => v.category === activeTab);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "white",
          borderRadius: 12,
          width: 700,
          maxHeight: "82vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 24px 64px rgba(0,0,0,0.2)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#111827" }}>Add Visual</h2>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280", padding: 4, borderRadius: 6 }}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, padding: "10px 20px", borderBottom: "1px solid #e5e7eb" }}>
          {TABS.map((tab) => (
            <button
              key={tab.category}
              onClick={() => setActiveTab(tab.category)}
              style={{
                padding: "5px 14px",
                borderRadius: 20,
                border: "none",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: activeTab === tab.category ? 600 : 400,
                background: activeTab === tab.category ? "#111827" : "transparent",
                color: activeTab === tab.category ? "white" : "#6b7280",
                transition: "background 0.12s",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div
          style={{
            overflow: "auto",
            padding: 20,
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 12,
          }}
        >
          {visible.map((visual) => (
            <VisualCard key={visual.id} visual={visual} onSelect={onSelect} />
          ))}
        </div>
      </div>
    </div>
  );
}

function VisualCard({ visual, onSelect }: { visual: VisualDefinition; onSelect: (v: VisualDefinition) => void }) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={() => onSelect(visual)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 8,
        padding: 0,
        cursor: "pointer",
        background: "white",
        textAlign: "left",
        overflow: "hidden",
        boxShadow: hovered ? "0 4px 12px rgba(0,0,0,0.1)" : "none",
        transition: "box-shadow 0.12s",
      }}
    >
      {/* Preview area */}
      <div
        style={{
          height: 80,
          background: "#f9fafb",
          borderBottom: "1px solid #e5e7eb",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 36,
          color: "#374151",
        }}
      >
        {visual.icon}
      </div>
      {/* Label */}
      <div style={{ padding: "8px 10px" }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{visual.name}</div>
        <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2, lineHeight: 1.3 }}>{visual.description}</div>
      </div>
    </button>
  );
}
