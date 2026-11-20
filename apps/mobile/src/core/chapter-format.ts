export type ReadingParagraph = { text: string; dialogue: boolean };
export type ReadingContent = { novelTitle: string; chapterTitle: string; paragraphs: ReadingParagraph[] };

export function formatReadingText(text: string): ReadingContent {
  const seen = new Set<string>();
  const kept: string[] = [];
  let chapterHeadingSeen = false;
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const normalized = line.toLowerCase();
    if (/^cap[ií]tulo\s+\d+/i.test(line)) {
      if (chapterHeadingSeen) continue;
      chapterHeadingSeen = true;
    }
    if (seen.has(normalized) || ['toque no meio da tela', 'se você encontrar algum erro', 'relatório'].some(term => normalized.includes(term)) || /^-{1,3}$/.test(line)) continue;
    seen.add(normalized); kept.push(line);
  }
  const heading = /^(.*?)\s*-\s*((?:cap[ií]tulo|chapter)\s+\d+.*?)$/i.exec(kept[0] ?? '');
  const novelTitle = heading?.[1]?.trim() ?? '';
  const chapterTitle = heading?.[2]?.trim() ?? '';
  const body = heading ? kept.slice(1) : kept;
  return { novelTitle, chapterTitle, paragraphs: body.map(line => ({ text: line, dialogue: /^["'—]/.test(line) })) };
}
