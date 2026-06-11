import { useEffect, useRef } from "react";

interface ShortcutEntry {
  keys: string[];
  desc: string;
}

interface ShortcutGroup {
  label: string;
  shortcuts: ShortcutEntry[];
}

const GROUPS: ShortcutGroup[] = [
  {
    label: "Global",
    shortcuts: [
      { keys: ["⌘Z"], desc: "Undo" },
      { keys: ["⌘⇧Z"], desc: "Redo" },
      { keys: ["?"], desc: "Toggle shortcuts" },
      { keys: ["Esc"], desc: "Deselect / close" },
    ],
  },
  {
    label: "Section selected",
    shortcuts: [
      { keys: ["↑", "↓"], desc: "Move section up / down" },
      { keys: ["Del"], desc: "Hide / show section" },
    ],
  },
  {
    label: "Image slot focused",
    shortcuts: [
      { keys: ["←", "→", "↑", "↓"], desc: "Nudge 1 px" },
      { keys: ["⇧ + arrow"], desc: "Nudge 10 px" },
      { keys: ["Del"], desc: "Remove slot" },
      { keys: ["⌘D"], desc: "Duplicate slot" },
    ],
  },
];

export function KeyboardShortcutsOverlay({ onClose }: { onClose: () => void }) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" || e.key === "?") { onClose(); return; }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Focus trap
  useEffect(() => {
    const modal = modalRef.current;
    if (!modal) return;
    const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const all = Array.from(modal.querySelectorAll<HTMLElement>(FOCUSABLE));
    const first = all[0];
    const last = all[all.length - 1];
    first?.focus();
    function onTab(e: KeyboardEvent) {
      if (e.key !== "Tab") return;
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last?.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    }
    modal.addEventListener("keydown", onTab);
    return () => modal.removeEventListener("keydown", onTab);
  }, []);

  return (
    <div className="shortcuts-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Keyboard shortcuts">
      <div ref={modalRef} className="shortcuts-modal" onClick={(e) => e.stopPropagation()}>
        <div className="shortcuts-modal-header">
          <h3>Keyboard shortcuts</h3>
          <button type="button" className="shortcuts-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        {GROUPS.map((group) => (
          <div key={group.label} className="shortcuts-group">
            <h4>{group.label}</h4>
            {group.shortcuts.map((s, i) => (
              <div key={i} className="shortcut-row">
                <div className="shortcut-keys">
                  {s.keys.map((k, j) => <kbd key={j}>{k}</kbd>)}
                </div>
                <span>{s.desc}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
