import { z } from 'zod';
import { chapterSchema, idSchema } from '@core/api/schemas';

export const novelRouteSchema = z.object({
  id: idSchema,
  chapter: z.string().regex(/^\d+$/).transform(Number).pipe(chapterSchema).optional(),
});
export type NovelDestination = 'reading' | 'speech' | 'downloads' | 'source';
