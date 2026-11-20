import { chapterSchema, type Novel } from '@core/api/schemas';
import { activeSource } from '@core/chapter-source';
import { ReadingView } from '@features/reader/reading-view';
import type { ReaderServices } from '@features/reader/reader-data';
import { ErrorMessage } from '@ui/error-message';

type Props = { novel: Novel; initialChapter?: number | undefined; services?: ReaderServices | undefined; onListen?: ((chapter: number) => void) | undefined };
export default function ReadingScreen({ novel, initialChapter, services, onListen }: Props) {
  const chapter = chapterSchema.safeParse(initialChapter ?? novel.current_chapter);
  if (!chapter.success) return <ErrorMessage message="Capítulo inválido." />;
  return <ReadingView key={`${novel.id}:${activeSource(novel)?.id ?? ''}`} novel={novel} initialChapter={chapter.data} services={services} onListen={onListen} />;
}
