import { metadataSchema } from '@core/api/schemas';
import { createHttpResource } from '@core/http-resource';
import { findDuplicate, metadataSource, normalizeNovelSlug, saveSearchSelection, startingChapterSchema } from '@features/search/search-service';
import { readerNovel, jsonResponse } from './reader-fixture';

const syntheticMetadata = metadataSchema.parse({ provider: 'Synthetic', title: 'Livro sintético', slug: 'synthetic-web-novel-123', url_base: 'https://example.org/book', image_url: null, total_chapters: 5, chapter_url_pattern: 'https://example.org/chapter-{cap}', chapter_ids: null, authors: ['Autor sintético'], rating: null, genres: [] });

test('slug duplicate matching strips repeated known suffixes and initial chapter validation rejects malformed values', () => {
  expect(normalizeNovelSlug('SYNTHETIC-web-novel-123')).toBe('synthetic');
  expect(findDuplicate([readerNovel], syntheticMetadata)).toBe(readerNovel);
  expect(findDuplicate([readerNovel], { ...syntheticMetadata, slug: null })).toBeUndefined();
  expect(startingChapterSchema.safeParse('2x').success).toBe(false);
  expect(startingChapterSchema.safeParse('0').success).toBe(false);
  expect(startingChapterSchema.parse(' 2 ')).toBe(2);
});

test('source creation resolves selected chapter and rejects a chapter beyond the known end', async () => {
  await expect(metadataSource(syntheticMetadata, 6)).rejects.toThrow('apenas 5 capítulos');
  expect(await metadataSource(syntheticMetadata, 3)).toMatchObject({ current_chapter: 3, url_base: 'https://example.org/chapter-3' });
});

test('multiple selected sources preserve selection order and a failed extra keeps the saved novel recoverable', async () => {
  const bodies: unknown[] = [];
  const request = createHttpResource({ baseUrl: () => 'https://api.example', transport: async (url, init) => {
    if (init.method === 'GET') return jsonResponse({ url: 'https://example.org/chapter-1' });
    bodies.push(JSON.parse(String(init.body)));
    return url.endsWith('/sources') ? jsonResponse({}, 503) : jsonResponse(readerNovel);
  } });
  const result = await saveSearchSelection(request, [syntheticMetadata, { ...syntheticMetadata, provider: 'Second' }], 2);
  expect(result.novel.id).toBe(readerNovel.id); expect(result.failedProviders).toEqual(['Second']);
  expect(bodies).toEqual([expect.objectContaining({ current_chapter: 2, sources: [expect.objectContaining({ provider: 'Synthetic', current_chapter: 2 })] }), expect.objectContaining({ provider: 'Second', current_chapter: 1 })]);
});
