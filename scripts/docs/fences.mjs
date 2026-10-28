/** Plain lines and fenced blocks; shorter fences inside a block stay literal. */
export function* fencedBlocks(source) {
  const lines = source.split('\n');
  for (let index = 0; index < lines.length; index += 1) {
    const opening = lines[index];
    const match = opening.match(/^(`{3,})(\w*)\s*(.*)$/);
    if (!match) {
      yield opening;
      continue;
    }
    const [, ticks, kind, argument] = match;
    const body = [];
    index += 1;
    while (index < lines.length && lines[index].trimEnd() !== ticks) {
      body.push(lines[index]);
      index += 1;
    }
    yield { opening, ticks, kind, argument, body, closing: lines[index] ?? ticks, closed: index < lines.length };
  }
}
