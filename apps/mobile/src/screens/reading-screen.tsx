import { chapterSchema, type Novel } from '@core/api/schemas';
import type { TextMode } from '@core/text-mode';
import { activeSource } from '@core/chapter-source';
import { ReadingView } from '@features/reader/reading-view';
import type { ReaderServices } from '@features/reader/reader-data';
import { ErrorMessage } from '@ui/error-message';

type Props = { novel: Novel; initialChapter?: number | undefined; initialMode?: TextMode | undefined; services?: ReaderServices | undefined; onListen?: ((chapter: number, mode?: TextMode) => void) | undefined };
export default function ReadingScreen({ novel, initialChapter, initialMode, services, onListen }: Props) {
  const chapter = chapterSchema.safeParse(initialChapter ?? novel.current_chapter);
  if (!chapter.success) return <ErrorMessage message="Capítulo inválido." />;
  return <ReadingView key={`${novel.id}:${activeSource(novel)?.id ?? ''}:${initialMode ?? 'translated'}`} novel={novel} initialChapter={chapter.data} initialMode={initialMode} services={services} onListen={onListen} />;
}
