import { metadataSchema } from '@core/api/schemas';
import { sourceChapterUrl } from '@core/chapter-source';
import { createHttpResource } from '@core/http-resource';
import { initialMetadataChapter, metadataSource, saveSearchSelection } from '@features/search/search-service';
import { jsonResponse, readerNovel } from './reader-fixture';

const metadata = metadataSchema.parse({ provider: 'RoyalRoad', title: 'Synthetic story', slug: 'synthetic', url_base: 'https://www.royalroad.com/fiction/10/synthetic', chapter_url_pattern: 'https://www.royalroad.com/fiction/10/synthetic/chapter/{cap}', chapter_ids: [150, 298, 403], total_chapters: 3, image_url: null, authors: [], genres: [], rating: null });

test('starting from a RoyalRoad chapter URL maps its identifier to the ordered index and preserves IDs in the source payload', async () => {
  expect(initialMetadataChapter(metadata, 'https://www.royalroad.com/fiction/10/synthetic/chapter/298/a-title')).toBe(2);
  const source = await metadataSource(metadata, 2);
  expect(source.chapter_ids).toEqual([150, 298, 403]);
  expect(source.url_base).toBe('https://www.royalroad.com/fiction/10/synthetic/chapter/298');
  expect(sourceChapterUrl(source, 3)).toBe('https://www.royalroad.com/fiction/10/synthetic/chapter/403');
  const transport = jest.fn(async (_url: string, init: RequestInit) => {
    const payload: unknown = JSON.parse(String(init.body));
    expect(payload).toMatchObject({ current_chapter: 2, sources: [expect.objectContaining({ chapter_ids: [150, 298, 403], current_chapter: 2 })] });
    return jsonResponse(readerNovel);
  });
  const request = createHttpResource({ baseUrl: () => 'https://api.example', transport });
  await saveSearchSelection(request, [metadata], 2);
  expect(transport).toHaveBeenCalledTimes(1);
});

test('unknown RoyalRoad identifiers and unavailable indices fail instead of opening the wrong chapter', async () => {
  expect(() => initialMetadataChapter(metadata, 'https://www.royalroad.com/fiction/10/synthetic/chapter/999')).toThrow('não está na lista');
  expect(initialMetadataChapter(metadata, metadata.url_base)).toBe(1);
  expect(sourceChapterUrl(metadata, 4)).toBeNull();
  await expect(metadataSource({ ...metadata, total_chapters: null }, 4)).rejects.toThrow('não disponível');
  expect(initialMetadataChapter({ ...metadata, chapter_ids: null }, 'https://example.org/chapter-2')).toBe(1);
});
