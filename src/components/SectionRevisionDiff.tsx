import type { PosterBlock, PosterSection } from "../domain/poster";
import { RevisionText } from "./RevisionText";

export function SectionRevisionDiff({
  original,
  revised,
  onAccept,
  onReject,
}: {
  original: PosterSection;
  revised: PosterSection;
  onAccept: () => void;
  onReject: () => void;
}) {
  const originalText = getSectionText(original);
  const revisedText = getSectionText(revised);

  return (
    <section className="revision-diff section-revision-diff" aria-label="Section revision">
      <div>
        <strong>{original.title}</strong>
        <RevisionText original={originalText} revised={revisedText} side="original" />
      </div>
      <div>
        <strong>{revised.title}</strong>
        <RevisionText original={originalText} revised={revisedText} side="revised" />
      </div>
      <div className="revision-actions">
        <button type="button" onClick={onAccept}>
          Accept
        </button>
        <button type="button" onClick={onReject}>
          Reject
        </button>
      </div>
    </section>
  );
}

function getSectionText(section: PosterSection) {
  return section.blocks.map(formatBlock).join("\n\n") || "No text blocks.";
}

function formatBlock(block: PosterBlock) {
  if (block.type === "text") return block.text;
  if (block.type === "generated_image") return `[Image slot: ${block.slot_id}]`;
  return `Visual: ${block.visual_id}`;
}
