import { ArrowDown, ArrowUp, Eye, EyeOff, MousePointer2 } from "lucide-react";
import type { PosterBlock, PosterProject, PosterSection, PosterSectionLayout } from "../domain/poster";
import type { PosterCanvasItemKind } from "./PosterCanvas";
import { parseBlockId } from "./posterUtils";

interface PosterInspectorProps {
  poster: PosterProject;
  selectedId?: string;
  selectedKind?: PosterCanvasItemKind;
  onPosterChange: (poster: PosterProject) => void;
}

export function PosterInspector({ poster, selectedId, selectedKind, onPosterChange }: PosterInspectorProps) {
  const selectedSection = selectedKind === "section" ? poster.sections.find((section) => section.id === selectedId) : undefined;
  const selectedBlock = selectedKind === "block" && selectedId ? findTextBlock(poster, selectedId) : undefined;

  function updateSection(sectionId: string, updater: (section: PosterSection) => PosterSection) {
    onPosterChange({
      ...poster,
      sections: poster.sections.map((section) => (section.id === sectionId ? updater(section) : section)),
    });
  }

  function updateSectionLayout(sectionId: string, layout: Partial<PosterSectionLayout>) {
    updateSection(sectionId, (section) => ({
      ...section,
      layout: {
        ...(section.layout ?? {}),
        ...layout,
      },
    }));
  }

  function moveSection(sectionId: string, direction: -1 | 1) {
    const index = poster.sections.findIndex((section) => section.id === sectionId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= poster.sections.length) {
      return;
    }

    const sections = [...poster.sections];
    const [section] = sections.splice(index, 1);
    sections.splice(nextIndex, 0, section);
    onPosterChange({
      ...poster,
      sections: sections.map((item, order) => ({
        ...item,
        layout: {
          ...(item.layout ?? {}),
          order,
        },
      })),
    });
  }

  function updateTextBlock(blockId: string, text: string) {
    const parsed = parseBlockId(blockId);
    if (!parsed) {
      return;
    }

    onPosterChange({
      ...poster,
      sections: poster.sections.map((section) => {
        if (section.id !== parsed.sectionId) {
          return section;
        }

        return {
          ...section,
          blocks: section.blocks.map((block, index) => (index === parsed.index && block.type === "text" ? { ...block, text } : block)),
        };
      }),
    });
  }

  return (
    <section className="poster-inspector tool-panel" aria-label="Poster selection inspector">
      <div className="panel-header">
        <h2>Canvas Inspector</h2>
        <span>{selectedKind ?? "none"}</span>
      </div>

      {!selectedId ? (
        <div className="empty-inspector">
          <MousePointer2 size={18} />
          <p>Select a section or text block on the poster canvas.</p>
        </div>
      ) : null}

      {selectedSection ? (
        <div className="project-editor-body">
          <label className="field">
            <span>Section title</span>
            <input value={selectedSection.title} onChange={(event) => updateSection(selectedSection.id, (section) => ({ ...section, title: event.target.value }))} />
          </label>

          <div className="inspector-actions">
            <button type="button" onClick={() => moveSection(selectedSection.id, -1)}>
              <ArrowUp size={15} /> Up
            </button>
            <button type="button" onClick={() => moveSection(selectedSection.id, 1)}>
              <ArrowDown size={15} /> Down
            </button>
            <button type="button" onClick={() => updateSectionLayout(selectedSection.id, { hidden: !selectedSection.layout?.hidden })}>
              {selectedSection.layout?.hidden ? <Eye size={15} /> : <EyeOff size={15} />}
              {selectedSection.layout?.hidden ? "Show" : "Hide"}
            </button>
          </div>

          <div className="field-grid">
            <label className="field">
              <span>Column span</span>
              <select
                value={selectedSection.layout?.columnSpan ?? ""}
                onChange={(event) =>
                  updateSectionLayout(selectedSection.id, {
                    columnSpan: event.target.value ? (Number(event.target.value) as PosterSectionLayout["columnSpan"]) : undefined,
                  })
                }
              >
                <option value="">Auto</option>
                <option value="1">1 column</option>
                <option value="2">2 columns</option>
                <option value="3">3 columns</option>
                <option value="4">4 columns</option>
              </select>
            </label>

            <label className="field">
              <span>Emphasis</span>
              <select
                value={selectedSection.layout?.emphasis ?? "normal"}
                onChange={(event) => updateSectionLayout(selectedSection.id, { emphasis: event.target.value as PosterSectionLayout["emphasis"] })}
              >
                <option value="normal">Normal</option>
                <option value="featured">Featured</option>
                <option value="hero">Hero</option>
              </select>
            </label>
          </div>
        </div>
      ) : null}

      {selectedBlock ? (
        <div className="project-editor-body">
          <label className="field">
            <span>Text block</span>
            <textarea value={selectedBlock.block.text} onChange={(event) => updateTextBlock(selectedBlock.id, event.target.value)} rows={7} />
          </label>
        </div>
      ) : null}

      {selectedId && !selectedSection && !selectedBlock ? (
        <div className="empty-inspector">
          <p>{selectedKind === "visual" ? "Visual selection is read-only in this first editing slice." : "No editable fields for this selection."}</p>
        </div>
      ) : null}
    </section>
  );
}

function findTextBlock(poster: PosterProject, blockId: string): { id: string; block: Extract<PosterBlock, { type: "text" }> } | undefined {
  const parsed = parseBlockId(blockId);
  if (!parsed) {
    return undefined;
  }

  const section = poster.sections.find((item) => item.id === parsed.sectionId);
  const block = section?.blocks[parsed.index];
  return block?.type === "text" ? { id: blockId, block } : undefined;
}

