import { novelSchema } from '@core/api/schemas';
import { createQueryClient } from '@core/queries';

export const readerNovel = novelSchema.parse({
  id: '11111111-1111-4111-8111-111111111111', title: 'Livro sintético', slug: 'synthetic', current_chapter: 1,
  image_url: null, total_chapters: 5, active_source_id: '22222222-2222-4222-8222-222222222222', updated_at: '2026-11-20T00:00:00Z',
  sources: [{ id: '22222222-2222-4222-8222-222222222222', novel_id: '11111111-1111-4111-8111-111111111111', provider: 'Synthetic', title: 'Livro sintético', url_base: 'https://example.org/book', chapter_url_pattern: 'https://example.org/chapter-{cap}', current_chapter: 1, updated_at: '2026-11-20T00:00:00Z' }],
});
export const readerScope = { novelId: readerNovel.id, sourceId: readerNovel.active_source_id ?? '' };
export function readerQueryClient() {
  const client = createQueryClient();
  const defaults = client.getDefaultOptions();
  client.setDefaultOptions({ queries: { ...defaults.queries, gcTime: Infinity }, mutations: { ...defaults.mutations, gcTime: Infinity } });
  return client;
}
export function jsonResponse(value: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, text: async () => JSON.stringify(value) };
}
