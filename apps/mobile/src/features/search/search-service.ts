import { z } from 'zod';
import { chapterSchema, metadataSchema, type Novel, type SourceInput } from '@core/api/schemas';
import { novelResources } from '@core/api/novels';
import { sourceResources } from '@core/api/sources';
import type { HttpResource } from '@core/http-resource';

export type Metadata = z.infer<typeof metadataSchema>;
export const startingChapterSchema = z.string().trim().regex(/^\d+$/).transform(Number).pipe(chapterSchema);
export function normalizeNovelSlug(slug: string): string {
  let value = slug.toLowerCase(); let previous: string;
  do { previous = value; value = value.replace(/-(light-novel|web-novel|web-manga|light-manga)$/, '').replace(/-(novel|manga|manhwa|manhua|webtoon|comic|online|web|light)$/, '').replace(/-\d+$/, ''); } while (previous !== value);
  return value;
}
export function findDuplicate(novels: Novel[], metadata: Metadata): Novel | undefined {
  return metadata.slug ? novels.find(novel => normalizeNovelSlug(novel.slug) === normalizeNovelSlug(metadata.slug ?? '')) : undefined;
}
export async function metadataSource(request: HttpResource, metadata: Metadata, chapter: number): Promise<SourceInput> {
  chapterSchema.parse(chapter);
  if (metadata.total_chapters !== null && chapter > metadata.total_chapters) throw new Error(`Esta obra possui apenas ${metadata.total_chapters} capítulos.`);
  const resolved = metadata.chapter_url_pattern ? await sourceResources(request).chapterUrl(metadata.chapter_url_pattern, chapter) : null;
  return { provider: metadata.provider, title: metadata.title, slug: metadata.slug, url_base: resolved?.url ?? metadata.url_base,
    chapter_url_pattern: metadata.chapter_url_pattern, total_chapters: metadata.total_chapters, image_url: metadata.image_url, current_chapter: chapter };
}
export async function saveSearchSelection(request: HttpResource, selected: Metadata[], chapter: number, existing?: Novel) {
  const first = selected[0]; if (!first) throw new Error('Selecione ao menos uma fonte.');
  const resources = novelResources(request);
  const source = await metadataSource(request, first, chapter);
  let novel = existing ? await resources.addSource(existing.id, source) : await resources.create({ title: first.title, slug: first.slug, current_chapter: chapter, sources: [source] });
  const failedProviders: string[] = [];
  for (const extra of selected.slice(1)) {
    try { novel = await resources.addSource(novel.id, await metadataSource(request, extra, 1)); }
    catch { failedProviders.push(extra.provider); }
  }
  return { novel, failedProviders };
}
