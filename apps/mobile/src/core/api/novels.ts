import { z } from 'zod';
import { httpResource, type HttpResource } from '@core/http-resource';
import { chapterSchema, idSchema, novelInputSchema, novelSchema, sourceInputSchema, type NovelInput, type SourceInput } from '@core/api/schemas';

export function novelResources(request: HttpResource = httpResource) {
  const path = (id: string) => `/novels/${idSchema.parse(id)}`;
  return {
    list: (signal?: AbortSignal) => request('/novels', z.array(novelSchema), { signal }),
    get: (id: string, signal?: AbortSignal) => request(path(id), novelSchema, { signal }),
    create: (input: NovelInput) => request('/novels', novelSchema, { method: 'POST', body: novelInputSchema.parse(input) }),
    remove: (id: string) => request(path(id), z.undefined(), { method: 'DELETE' }),
    progress: (id: string, chapter: number) => request(`${path(id)}/progress`, novelSchema, { method: 'PATCH', body: { chapter: chapterSchema.parse(chapter) } }),
    addSource: (id: string, input: SourceInput) => request(`${path(id)}/sources`, novelSchema, { method: 'POST', body: sourceInputSchema.parse(input) }),
    activateSource: (id: string, sourceId: string) => request(`${path(id)}/active-source`, novelSchema, { method: 'PATCH', body: { source_id: idSchema.parse(sourceId) } }),
    removeSource: (id: string, sourceId: string) => request(`${path(id)}/sources/${idSchema.parse(sourceId)}`, novelSchema, { method: 'DELETE' }),
  };
}
