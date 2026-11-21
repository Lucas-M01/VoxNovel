import type { Novel } from '@core/api/schemas';
import { activeSource } from '@core/chapter-source';

export function initialSpeechChapter(novel: Novel, explicit?: number): number {
  return explicit ?? activeSource(novel)?.current_chapter ?? novel.current_chapter ?? 1;
}
