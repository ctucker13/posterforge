import { RevisionText } from "./RevisionText";

export function BlockRevisionDiff({
  original,
  revised,
  onAccept,
  onReject,
}: {
  original: string;
  revised: string;
  onAccept: () => void;
  onReject: () => void;
}) {
  return (
    <div className="revision-diff block-revision-diff">
      <div>
        <strong>Original</strong>
        <RevisionText original={original} revised={revised} side="original" />
      </div>
      <div>
        <strong>Revised</strong>
        <RevisionText original={original} revised={revised} side="revised" />
      </div>
      <div className="revision-actions">
        <button type="button" onClick={onAccept}>
          Accept
        </button>
        <button type="button" onClick={onReject}>
          Reject
        </button>
      </div>
    </div>
  );
}
