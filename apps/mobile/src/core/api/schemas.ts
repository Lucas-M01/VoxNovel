import { z } from 'zod';

export const chapterSchema = z.int().positive();
export const idSchema = z.uuid();
const timestamp = z.iso.datetime({ offset: true });
const text = z.string().trim().min(1);
export const sourceInputSchema = z.object({
  provider: text, title: text, url_base: z.httpUrl(),
  slug: z.string().nullable().optional(),
  chapter_url_pattern: z.string().nullable().optional(),
  chapter_ids: z.array(chapterSchema).nullable().optional(),
  total_chapters: chapterSchema.nullable().optional(),
  image_url: z.httpUrl().nullable().optional(),
  current_chapter: chapterSchema.nullable().optional(),
});
export const sourceSchema = sourceInputSchema.extend({
  id: idSchema, novel_id: idSchema, current_chapter: chapterSchema, updated_at: timestamp,
});
export const novelInputSchema = z.object({
  title: text, slug: z.string().nullable().optional(),
  current_chapter: chapterSchema.optional(), sources: z.array(sourceInputSchema).optional(),
});
export const novelSchema = z.object({
  id: idSchema, title: text, slug: text, current_chapter: chapterSchema,
  image_url: z.httpUrl().nullable(), total_chapters: chapterSchema.nullable(),
  active_source_id: idSchema.nullable(), sources: z.array(sourceSchema), updated_at: timestamp,
}).refine(novel => {
  const ids = novel.sources.map(source => source.id);
  return new Set(ids).size === ids.length &&
    novel.sources.every(source => source.novel_id === novel.id) &&
    (novel.active_source_id === null || ids.includes(novel.active_source_id));
});
export const metadataSchema = z.object({
  provider: text, title: text, url_base: z.httpUrl(), slug: z.string().nullable(),
  image_url: z.httpUrl().nullable(), total_chapters: chapterSchema.nullable(),
  chapter_url_pattern: z.string().nullable(), chapter_ids: z.array(chapterSchema).nullable(),
  authors: z.array(z.string()), rating: z.string().nullable(), genres: z.array(z.string()),
});
export const filtersSchema = z.object({ words: z.array(z.string()), phrases: z.array(z.string()), regex: z.array(z.string()) });
export const filterStateSchema = filtersSchema.extend({ updated_at: timestamp });
export const speedSchema = z.object({ speed: z.number().positive() });
export const speedStateSchema = speedSchema.extend({ updated_at: timestamp });
export const chapterTextSchema = z.object({ chapter: chapterSchema, text: z.string() });
export const chapterResultSchema = chapterTextSchema.extend({ url: z.httpUrl() });
export const downloadListSchema = z.object({ novel_id: idSchema, chapters: z.array(chapterSchema) });
export const downloadResultSchema = z.object({ status: z.enum(['ok', 'cache']), novel_id: idSchema, chapter: chapterSchema });
export const removedPathsSchema = z.object({ removed: z.array(z.string()) });
export type Novel = z.infer<typeof novelSchema>;
export type NovelInput = z.infer<typeof novelInputSchema>;
export type SourceInput = z.infer<typeof sourceInputSchema>;
export type Filters = z.infer<typeof filtersSchema>;
export type FilterKind = 'words' | 'phrases' | 'regex';
