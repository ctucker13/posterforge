export function parseBlockId(blockId: string): { sectionId: string; index: number } | undefined {
  const match = blockId.match(/^(.+):block:(\d+)$/);
  if (!match) return undefined;
  const sectionId = match[1];
  const indexStr = match[2];
  if (!sectionId || !indexStr) return undefined;
  return { sectionId, index: Number(indexStr) };
}
