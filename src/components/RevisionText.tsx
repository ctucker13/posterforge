export function RevisionText({ original, revised, side }: { original: string; revised: string; side: "original" | "revised" }) {
  const parts = diffWords(original, revised);
  return (
    <p>
      {parts
        .filter((part) => (side === "original" ? part.kind !== "added" : part.kind !== "removed"))
        .map((part, index) => {
          const className = part.kind === "added" ? "diff-added" : part.kind === "removed" ? "diff-removed" : undefined;
          return (
            <span className={className} key={`${part.word}-${index}`}>
              {part.word}
              {index < parts.length - 1 ? " " : ""}
            </span>
          );
        })}
    </p>
  );
}

type DiffPart = { kind: "same" | "added" | "removed"; word: string };

function diffWords(original: string, revised: string): DiffPart[] {
  const left = original.split(/\s+/).filter(Boolean);
  const right = revised.split(/\s+/).filter(Boolean);
  const table = Array.from({ length: left.length + 1 }, () => Array<number>(right.length + 1).fill(0));

  for (let i = left.length - 1; i >= 0; i -= 1) {
    for (let j = right.length - 1; j >= 0; j -= 1) {
      table[i]![j] = left[i] === right[j] ? table[i + 1]![j + 1]! + 1 : Math.max(table[i + 1]![j]!, table[i]![j + 1]!);
    }
  }

  const parts: DiffPart[] = [];
  let i = 0;
  let j = 0;
  while (i < left.length && j < right.length) {
    if (left[i] === right[j]) {
      parts.push({ kind: "same", word: left[i]! });
      i += 1;
      j += 1;
    } else if (table[i + 1]![j]! >= table[i]![j + 1]!) {
      parts.push({ kind: "removed", word: left[i]! });
      i += 1;
    } else {
      parts.push({ kind: "added", word: right[j]! });
      j += 1;
    }
  }

  while (i < left.length) {
    parts.push({ kind: "removed", word: left[i]! });
    i += 1;
  }

  while (j < right.length) {
    parts.push({ kind: "added", word: right[j]! });
    j += 1;
  }

  return parts;
}
