import { DndContext, closestCenter, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowDown, ArrowUp, GripVertical, Plus, Trash2 } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { useState } from "react";
import type { PosterOutline, PosterSection } from "../domain/poster";

const sectionTypes: PosterSection["type"][] = ["hero", "background", "methods", "results", "key_findings", "discussion", "timeline", "references", "custom"];

export function OutlineConfirmDialog({
  outline,
  onConfirm,
  onBack,
}: {
  outline: PosterOutline;
  onConfirm: (outline: PosterOutline) => void;
  onBack: () => void;
}) {
  const [draft, setDraft] = useState(outline);

  function updateSection(index: number, updates: Partial<PosterOutline["sections"][number]>) {
    setDraft((current) => ({
      ...current,
      sections: current.sections.map((section, sectionIndex) => (sectionIndex === index ? { ...section, ...updates } : section)),
    }));
  }

  function moveSection(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= draft.sections.length) return;
    setDraft((current) => {
      const sections = [...current.sections];
      const [section] = sections.splice(index, 1);
      if (!section) return current;
      sections.splice(nextIndex, 0, section);
      return { ...current, sections };
    });
  }

  function deleteSection(index: number) {
    setDraft((current) => ({ ...current, sections: current.sections.filter((_, sectionIndex) => sectionIndex !== index) }));
  }

  function addSection() {
    setDraft((current) => ({
      ...current,
      sections: [
        ...current.sections,
        {
          id: `section_${current.sections.length + 1}`,
          type: "custom",
          title: "New section",
          description: "",
        },
      ],
    }));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setDraft((current) => {
      const oldIndex = current.sections.findIndex((section) => section.id === active.id);
      const newIndex = current.sections.findIndex((section) => section.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return current;
      return { ...current, sections: arrayMove(current.sections, oldIndex, newIndex) };
    });
  }

  return (
    <dialog className="outline-confirm-dialog" open aria-labelledby="outline-confirm-title">
      <div className="panel-header compact">
        <h2 id="outline-confirm-title">Confirm Outline</h2>
        <span>{draft.sections.length} sections</span>
      </div>

      <label className="field">
        <span>Poster title</span>
        <input value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} />
      </label>

      <label className="field">
        <span>Subtitle</span>
        <input value={draft.subtitle} onChange={(event) => setDraft((current) => ({ ...current, subtitle: event.target.value }))} />
      </label>

      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={draft.sections.map((section) => section.id)} strategy={verticalListSortingStrategy}>
          <div className="outline-section-list">
            {draft.sections.map((section, index) => (
              <SortableOutlineRow id={section.id} key={`${section.id}-${index}`}>
                {(dragHandleProps) => (
                  <>
                    <div className="outline-section-actions">
                      <button type="button" aria-label="Drag to reorder" {...dragHandleProps}>
                        <GripVertical size={14} />
                      </button>
                      <button type="button" aria-label="Move up" onClick={() => moveSection(index, -1)}>
                        <ArrowUp size={14} />
                      </button>
                      <button type="button" aria-label="Move down" onClick={() => moveSection(index, 1)}>
                        <ArrowDown size={14} />
                      </button>
                    </div>
                    <label className="field">
                      <span>Title</span>
                      <input value={section.title} onChange={(event) => updateSection(index, { title: event.target.value })} />
                    </label>
                    <label className="field">
                      <span>Type</span>
                      <select value={section.type} onChange={(event) => updateSection(index, { type: event.target.value as PosterSection["type"] })}>
                        {sectionTypes.map((type) => (
                          <option value={type} key={type}>
                            {type.replace(/_/g, " ")}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button type="button" aria-label="Delete section" onClick={() => deleteSection(index)}>
                      <Trash2 size={15} />
                    </button>
                  </>
                )}
              </SortableOutlineRow>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <button className="outline-add-section" type="button" onClick={addSection}>
        <Plus size={15} /> Add section
      </button>

      <div className="outline-confirm-actions">
        <button type="button" onClick={() => onConfirm(draft)}>
          Generate poster
        </button>
        <button type="button" onClick={onBack}>
          Back
        </button>
      </div>
    </dialog>
  );
}

function SortableOutlineRow({ id, children }: { id: string; children: (dragHandleProps: Record<string, unknown>) => ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  } as CSSProperties;

  return (
    <article className="outline-section-row" ref={setNodeRef} style={style}>
      {children({ ...attributes, ...listeners })}
    </article>
  );
}
