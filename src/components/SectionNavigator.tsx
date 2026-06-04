import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
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
  const [expanded, setExpanded] = useState(true);
  const sections = getOrderedSections(poster);
  const sectionIssues = new Set(qaIssues.filter((issue) => issue.location.startsWith("sections.")).map((issue) => issue.location.split(".")[1]));

  return (
    <div className="section-navigator">
      <button className="section-navigator-toggle" type="button" onClick={() => setExpanded((current) => !current)} aria-expanded={expanded}>
        {expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
        Sections
      </button>
      {expanded ? (
        <div className="section-navigator-list" role="list">
          {sections.map((section, index) => {
            const hasContent = section.blocks.some((block) => block.type === "visual_ref" || block.text.trim().length > 0);
            const hasIssue = sectionIssues.has(section.id);
            const status = section.layout?.hidden || !hasContent ? "muted" : hasIssue ? "warning" : "ready";
            return (
              <button
                type="button"
                role="listitem"
                className={selectedId === section.id ? "active" : ""}
                key={section.id}
                onClick={() => onSelectSection(section.id)}
              >
                <span className={`section-status-dot ${status}`} />
                <span className="section-navigator-index">{index + 1}</span>
                <span>{section.title}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
