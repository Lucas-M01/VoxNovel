import type { QueryClient } from '@tanstack/react-query';
import type { Novel } from '@core/api/schemas';
import { activeSource, sourceChapterUrl } from '@core/chapter-source';
import { apiQueries } from '@core/queries';
import { readerServices, type ReaderServices } from '@features/reader/reader-data';

export function createChapterPrefetcher(client: QueryClient, novel: Novel, services: ReaderServices = readerServices, canRequest: () => boolean = () => true) {
  const source = activeSource(novel);
  const maximum = novel.total_chapters ?? source?.total_chapters ?? (source?.chapter_ids?.length || null);
  const attempted = new Set<number>();
  let queue: number[] = [];
  let running = false;
  let disposed = false;
  let completion = Promise.resolve();
  async function drain() {
    try {
      while (!disposed && queue.length) {
        const chapter = queue.shift();
        if (chapter === undefined || !source) continue;
        const url = sourceChapterUrl(source, chapter);
        if (!url) continue;
        attempted.add(chapter);
        try {
          if (!canRequest() && !await services.storage.hasChapter({ novelId: novel.id, sourceId: source.id }, chapter)) continue;
          await client.fetchQuery({
            ...apiQueries(services.request, services.storage).chapter({ novelId: novel.id, sourceId: source.id }, url, chapter),
            staleTime: Infinity,
          });
        } catch { /* A silent prefetch failure must not interrupt reading. */ }
      }
    } finally { running = false; }
  }
  function add(chapters: number[]): Promise<void> {
    if (disposed || !source) return completion;
    for (const chapter of chapters) {
      if (chapter > 0 && (maximum === null || chapter <= maximum) && !attempted.has(chapter) && !queue.includes(chapter)) queue.push(chapter);
    }
    if (!running && queue.length) { running = true; completion = drain(); }
    return completion;
  }
  return {
    activate(chapter: number): Promise<void> {
      queue = queue.filter(number => number > chapter && number <= chapter + 3);
      return add([chapter + 1, chapter + 2, chapter + 3]);
    },
    scroll(chapter: number, fraction: number): Promise<void> {
      if (fraction > 0.95) return add([chapter + 1, chapter + 2, chapter + 3]);
      if (fraction > 0.8) return add([chapter + 1]);
      return completion;
    },
    open() { disposed = false; },
    dispose() { disposed = true; queue = []; },
  };
}
