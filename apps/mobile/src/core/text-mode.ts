import { z } from 'zod';

export const textModeSchema = z.enum(['translated', 'original']);
export type TextMode = z.infer<typeof textModeSchema>;
