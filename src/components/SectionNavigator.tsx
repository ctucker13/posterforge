import type { PosterProject, QaIssue } from "../domain/poster";
import { getOrderedSections } from "./PosterCanvas";

export function SectionNavigator({
  poster,
  selectedId,
  qaIssues,
  onSelectSection,
}: {
  poster: PosterProject;
  selectedId?: string | undefined;
  qaIssues: QaIssue[];
  onSelectSection: (id: string) => void;
}) {
  const sections = getOrderedSections(poster);
  const sectionIssues = new Set(qaIssues.filter((issue) => issue.location.startsWith("sections.")).map((issue) => issue.location.split(".")[1]));

  return (
    <div className="section-navigator" role="toolbar" aria-label="Poster sections">
      {sections.map((section, index) => {
        const hasContent = section.blocks.some((block) => block.type === "visual_ref" || block.type === "generated_image" || (block.type === "text" && block.text.trim().length > 0));
        const hasIssue = sectionIssues.has(section.id);
        const status = section.layout?.hidden || !hasContent ? "muted" : hasIssue ? "warning" : "ready";
        return (
          <button
            type="button"
            className={`section-chip${selectedId === section.id ? " active" : ""}`}
            title={section.title}
            key={section.id}
            onClick={() => onSelectSection(section.id)}
          >
            <span className={`section-status-dot ${status}`} />
            <span className="section-chip-index">{index + 1}</span>
            <span className="section-chip-title">{section.title}</span>
          </button>
        );
      })}
    </div>
  );
}
