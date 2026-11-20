import { z } from 'zod';
import { chapterSchema, type Novel, sourceSchema } from '@core/api/schemas';

export type ReadingSource = z.infer<typeof sourceSchema>;
export function activeSource(novel: Novel): ReadingSource | null {
  return novel.sources.find(source => source.id === novel.active_source_id) ?? novel.sources[0] ?? null;
}
export function sourceChapterUrl(source: ReadingSource, chapter: number): string | null {
  chapterSchema.parse(chapter);
  const pattern = source.chapter_url_pattern;
  if (!pattern) return source.url_base;
  const identifier = source.chapter_ids?.length ? source.chapter_ids[chapter - 1] : chapter;
  return identifier === undefined ? null : pattern.replace('{cap}', String(identifier));
}
