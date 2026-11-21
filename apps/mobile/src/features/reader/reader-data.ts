import { queryOptions, type QueryClient } from '@tanstack/react-query';
import { apiMutations, apiQueries } from '@core/queries';
import { chapterSchema, type Novel } from '@core/api/schemas';
import { activeSource, sourceChapterUrl } from '@core/chapter-source';
import { httpResource, type HttpResource } from '@core/http-resource';
import { localStorage, type LocalStorage } from '@core/local-storage';
import type { TextMode } from '@core/text-mode';

export const readingKeys = {
  content: (novelId: string, sourceId: string, chapter: number, mode: TextMode = 'translated') => ['reading', novelId, sourceId, chapter, mode],
  progress: (novelId: string, sourceId: string, chapter: number) => ['reading-progress', novelId, sourceId, chapter],
};
export type ReaderServices = { request: HttpResource; storage: LocalStorage };
export const readerServices: ReaderServices = { request: httpResource, storage: localStorage };

export function readingChapterOptions(client: QueryClient, novel: Novel, chapter: number, services = readerServices, onReady?: (chapter: number) => void, mode: TextMode = 'translated') {
  chapterSchema.parse(chapter);
  const source = activeSource(novel);
  return queryOptions({
    queryKey: readingKeys.content(novel.id, source?.id ?? '', chapter, mode),
    networkMode: 'always', gcTime: 0,
    queryFn: async ({ signal }) => {
      if (!source) throw new Error('Nenhuma fonte disponível para esta obra.');
      const url = sourceChapterUrl(source, chapter);
      if (!url) throw new Error(`Capítulo ${chapter} não disponível nesta fonte.`);
      const data = await client.fetchQuery({ ...apiQueries(services.request, services.storage).chapter({ novelId: novel.id, sourceId: source.id }, url, chapter, mode), staleTime: Infinity });
      if (!signal.aborted) {
        const options = apiMutations(client, services.request).progress();
        const mutation = client.getMutationCache().build(client, {
          ...options, mutationKey: readingKeys.progress(novel.id, source.id, chapter),
        });
        void mutation.execute({ id: novel.id, chapter }).catch(() => {});
        onReady?.(chapter);
      }
      return data;
    },
    refetchOnWindowFocus: false, refetchOnReconnect: false, refetchOnMount: false,
  });
}
