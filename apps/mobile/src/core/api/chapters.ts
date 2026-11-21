import { z } from 'zod';
import { httpResource, type HttpResource } from '@core/http-resource';
import { chapterResultSchema, chapterSchema } from '@core/api/schemas';
import type { TextMode } from '@core/text-mode';

export function chapterResources(request: HttpResource = httpResource) {
  return {
    text: (url: string, chapter: number, signal?: AbortSignal, mode: TextMode = 'translated') => request('/chapters/text', chapterResultSchema, { query: { url: z.httpUrl().parse(url), chapter: chapterSchema.parse(chapter), ...(mode === 'original' ? { translate: 'false' } : {}) }, signal }),
  };
}
