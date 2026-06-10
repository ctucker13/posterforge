import { useEffect, useRef, useState } from "react";
import { ChevronDown, FilePlus, FolderOpen, Trash2 } from "lucide-react";
import { deleteProject, listProjects, type StoredProject } from "../app/projectStore";

interface ProjectSwitcherProps {
  currentProjectId: string | null;
  currentProjectName: string;
  onSwitch: (id: string) => void;
  onNew: () => void;
}

type ProjectListItem = Omit<StoredProject, "poster">;

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function ProjectSwitcher({ currentProjectId, currentProjectName, onSwitch, onNew }: ProjectSwitcherProps) {
  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  async function refresh() {
    const list = await listProjects();
    setProjects(list);
  }

  useEffect(() => {
    if (open) refresh();
  }, [open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    if (id === currentProjectId) return; // can't delete active project
    await deleteProject(id);
    refresh();
  }

  return (
    <div className="project-switcher" ref={ref}>
      <button
        type="button"
        className="project-switcher-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <FolderOpen size={14} />
        <span className="project-switcher-name">{currentProjectName || "Untitled poster"}</span>
        <ChevronDown size={13} className={open ? "rotated" : ""} />
      </button>

      {open && (
        <div className="project-switcher-popover" role="listbox" aria-label="Projects">
          <div className="project-switcher-list">
            {projects.map((p) => (
              <div
                key={p.id}
                role="option"
                aria-selected={p.id === currentProjectId}
                className={`project-switcher-item${p.id === currentProjectId ? " active" : ""}`}
                tabIndex={0}
                onClick={() => {
                  if (p.id !== currentProjectId) onSwitch(p.id);
                  setOpen(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    if (p.id !== currentProjectId) onSwitch(p.id);
                    setOpen(false);
                  }
                }}
              >
                <span className="project-item-name">{p.name}</span>
                <span className="project-item-time">{formatRelativeTime(p.updatedAt)}</span>
                {p.id !== currentProjectId && (
                  <button
                    type="button"
                    className="project-item-delete"
                    title="Delete project"
                    aria-label="Delete project"
                    onClick={(e) => handleDelete(e, p.id)}
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            ))}
            {projects.length === 0 && (
              <p className="project-switcher-empty">No saved projects</p>
            )}
          </div>
          <div className="project-switcher-footer">
            <button
              type="button"
              className="project-switcher-new"
              onClick={() => { onNew(); setOpen(false); }}
            >
              <FilePlus size={14} /> New project
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
