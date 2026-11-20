import type { QueryClient } from '@tanstack/react-query';
import { chapterSchema, type Novel } from '@core/api/schemas';
import { activeSource, sourceChapterUrl } from '@core/chapter-source';
import { chapterResources } from '@core/api/chapters';
import { downloadResources } from '@core/api/downloads';
import { keys } from '@core/keys';
import type { ReaderServices } from '@features/reader/reader-data';

export function createDownloadService(client: QueryClient, novel: Novel, services: ReaderServices) {
  const source = activeSource(novel);
  if (!source) throw new Error('Nenhuma fonte disponível para esta obra.');
  const scope = { novelId: novel.id, sourceId: source.id };
  const maximum = novel.total_chapters ?? source.total_chapters ?? (source.chapter_ids?.length || null);
  const pending = new Map<number, Promise<'saved' | 'cache'>>();
  const perform = async (chapter: number): Promise<'saved' | 'cache'> => {
    if (maximum !== null && chapter > maximum) throw new Error('Capítulo fora do intervalo.');
    const url = sourceChapterUrl(source, chapter);
    if (!url) throw new Error(`Capítulo ${chapter} não disponível nesta fonte.`);
    if (await services.storage.hasChapter(scope, chapter)) return 'cache';
    const result = await chapterResources(services.request).text(url, chapter);
    await services.storage.saveChapter(scope, chapter, result.text);
    client.setQueryData(keys.chapter(scope, url, chapter), result);
    await client.invalidateQueries({ queryKey: keys.localChapters(scope) });
    return 'saved';
  };
  return {
    scope, maximum,
    download(chapter: number): Promise<'saved' | 'cache'> {
      chapterSchema.parse(chapter);
      const existing = pending.get(chapter);
      if (existing) return existing;
      const job = perform(chapter).finally(() => pending.delete(chapter));
      pending.set(chapter, job); return job;
    },
    async remove(chapter: number): Promise<void> {
      chapterSchema.parse(chapter);
      const removed = await services.storage.removeChapter(scope, chapter);
      if (!removed.length) throw new Error('Não foi possível confirmar a remoção do arquivo local.');
      const url = sourceChapterUrl(source, chapter);
      if (url) client.removeQueries({ queryKey: keys.chapter(scope, url, chapter), exact: true });
      await client.invalidateQueries({ queryKey: keys.localChapters(scope) });
      void downloadResources(services.request).removeChapter(novel.id, chapter).catch(() => {});
    },
  };
}
