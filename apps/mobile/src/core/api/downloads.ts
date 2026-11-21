import { httpResource, type HttpResource } from '@core/http-resource';
import { chapterSchema, idSchema, chapterTextSchema, downloadListSchema, downloadResultSchema, removedPathsSchema } from '@core/api/schemas';

export function downloadResources(request: HttpResource = httpResource) {
  const path = (id: string) => `/downloads/${idSchema.parse(id)}`;
  const chapterPath = (id: string, chapter: number) => `${path(id)}/${chapterSchema.parse(chapter)}`;
  return {
    list: (id: string, signal?: AbortSignal) => request(path(id), downloadListSchema, { signal }),
    generate: (id: string, chapter: number) => request(chapterPath(id, chapter), downloadResultSchema, { method: 'POST' }),
    text: (id: string, chapter: number, signal?: AbortSignal) => request(`${chapterPath(id, chapter)}/text`, chapterTextSchema, { signal }),
    removeChapter: (id: string, chapter: number) => request(chapterPath(id, chapter), removedPathsSchema, { method: 'DELETE' }),
    removeNovel: (id: string) => request(path(id), removedPathsSchema, { method: 'DELETE' }),
  };
}
