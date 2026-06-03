export function parseBlockId(blockId: string): { sectionId: string; index: number } | undefined {
  const match = blockId.match(/^(.+):block:(\d+)$/);
  if (!match) return undefined;
  return { sectionId: match[1], index: Number(match[2]) };
}
