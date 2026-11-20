import { z } from 'zod';
import { httpResource, type HttpResource } from '@core/http-resource';
import { chapterSchema, metadataSchema } from '@core/api/schemas';

export function sourceResources(request: HttpResource = httpResource) {
  return {
    identify: (url: string, signal?: AbortSignal) => request('/sources/identify', metadataSchema, { query: { url: z.httpUrl().parse(url) }, signal }),
    search: (name: string, signal?: AbortSignal) => request('/sources/search', z.object({ name: z.string(), results: z.array(metadataSchema) }), { query: { name: z.string().trim().min(1).parse(name) }, signal }),
    chapterNumber: (url: string, signal?: AbortSignal) => request('/sources/chapter-number', z.object({ chapter: chapterSchema }), { query: { url: z.httpUrl().parse(url) }, signal }),
    detectChapter: (url: string, signal?: AbortSignal) => request('/sources/detect-chapter', z.object({ chapter: chapterSchema }), { query: { url: z.httpUrl().parse(url) }, signal }),
    chapterUrl: (pattern: string, chapter: number, signal?: AbortSignal) => request('/sources/chapter-url', z.object({ url: z.string().nullable() }), { query: { pattern, chapter: chapterSchema.parse(chapter) }, signal }),
  };
}
