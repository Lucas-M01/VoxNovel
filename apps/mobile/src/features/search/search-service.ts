import { z } from 'zod';
import { chapterSchema, metadataSchema, type Novel, type SourceInput } from '@core/api/schemas';
import { novelResources } from '@core/api/novels';
import { sourceChapterUrl } from '@core/chapter-source';
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
export async function metadataSource(metadata: Metadata, chapter: number): Promise<SourceInput> {
  chapterSchema.parse(chapter);
  if (metadata.total_chapters !== null && chapter > metadata.total_chapters) throw new Error(`Esta obra possui apenas ${metadata.total_chapters} capítulos.`);
  const resolved = sourceChapterUrl(metadata, chapter);
  if (!resolved) throw new Error('Capítulo não disponível nesta fonte.');
  return { provider: metadata.provider, title: metadata.title, slug: metadata.slug, url_base: resolved,
    chapter_url_pattern: metadata.chapter_url_pattern, chapter_ids: metadata.chapter_ids, total_chapters: metadata.total_chapters, image_url: metadata.image_url, current_chapter: chapter };
}
export async function saveSearchSelection(request: HttpResource, selected: Metadata[], chapter: number, existing?: Novel) {
  const first = selected[0]; if (!first) throw new Error('Selecione ao menos uma fonte.');
  const resources = novelResources(request);
  const source = await metadataSource(first, chapter);
  let novel = existing ? await resources.addSource(existing.id, source) : await resources.create({ title: first.title, slug: first.slug, current_chapter: chapter, sources: [source] });
  const failedProviders: string[] = [];
  for (const extra of selected.slice(1)) {
    try { novel = await resources.addSource(novel.id, await metadataSource(extra, 1)); }
    catch { failedProviders.push(extra.provider); }
  }
  return { novel, failedProviders };
}

export function initialMetadataChapter(metadata: Metadata, inputUrl: string): number {
  if (!metadata.chapter_ids?.length) return 1;
  const parsed = z.httpUrl().safeParse(inputUrl);
  if (!parsed.success) return 1;
  const match = /\/chapter\/(\d+)(?:\/|$)/i.exec(new URL(parsed.data).pathname);
  if (!match) return 1;
  const index = metadata.chapter_ids.indexOf(Number(match[1]));
  if (index < 0) throw new Error('O capítulo da URL não está na lista desta fonte.');
  return index + 1;
}
