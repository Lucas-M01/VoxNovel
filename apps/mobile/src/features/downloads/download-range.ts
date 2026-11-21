import { z } from 'zod';
import { chapterSchema } from '@core/api/schemas';

const numericRange = z.object({ start: chapterSchema, end: chapterSchema }).superRefine((value, context) => {
  if (value.end < value.start) context.addIssue({ code: 'custom', message: 'Intervalo inválido.' });
  if (value.end - value.start + 1 > 50) context.addIssue({ code: 'custom', message: 'Máximo de 50 capítulos por vez.' });
});
const numberInput = z.string().trim().regex(/^\d+$/).transform(Number).pipe(chapterSchema);
export const rangeInputSchema = z.object({ start: numberInput, end: numberInput });
export type RangeProgress = { done: number; total: number; pending: readonly number[] };
export type RangeResult = { attempted: number; skipped: number; errors: Record<number, string> };

export function planDownloadRange(start: number, end: number, maximum: number | null, existing: ReadonlySet<number>): number[] {
  const parsed = numericRange.safeParse({ start, end });
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    throw new Error(first?.code === 'custom' ? first.message : 'Intervalo inválido.');
  }
  if (maximum !== null && end > maximum) throw new Error(`Máximo disponível: ${maximum}.`);
  return Array.from({ length: end - start + 1 }, (_, index) => start + index).filter(chapter => !existing.has(chapter));
}

export async function downloadChapterRange({ start, end, maximum, existing, download, onProgress, onChapterError }: {
  start: number; end: number; maximum: number | null; existing: ReadonlySet<number>;
  download: (chapter: number) => Promise<unknown>; onProgress: (value: RangeProgress) => void;
  onChapterError?: (chapter: number, message: string) => void;
}): Promise<RangeResult> {
  const chapters = planDownloadRange(start, end, maximum, existing);
  if (!chapters.length) throw new Error('Todos os capítulos desse intervalo já estão offline.');
  const errors: Record<number, string> = {};
  let done = 0;
  onProgress({ done, total: chapters.length, pending: [] });
  for (let index = 0; index < chapters.length; index += 5) {
    const group = chapters.slice(index, index + 5);
    onProgress({ done, total: chapters.length, pending: group });
    await Promise.all(group.map(async chapter => {
      try { await download(chapter); }
      catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao baixar capítulo.';
        errors[chapter] = message; onChapterError?.(chapter, message);
      }
    }));
    done += group.length;
    onProgress({ done, total: chapters.length, pending: [] });
  }
  return { attempted: done, skipped: end - start + 1 - chapters.length, errors };
}
