import { z } from 'zod';
import { chapterSchema, idSchema } from '@core/api/schemas';
import { textModeSchema } from '@core/text-mode';

export const novelRouteSchema = z.object({
  id: idSchema,
  chapter: z.string().regex(/^\d+$/).transform(Number).pipe(chapterSchema).optional(),
  mode: textModeSchema.optional(),
});
export type NovelDestination = 'reading' | 'speech' | 'downloads' | 'source';
