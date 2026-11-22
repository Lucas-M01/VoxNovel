import { chapterSchema, type Novel } from '@core/api/schemas';
import type { TextMode } from '@core/text-mode';
import { initialSpeechChapter } from '@core/initial-speech-chapter';
import { activeSource } from '@core/chapter-source';
import { PlaybackView, type PlaybackServices } from '@features/speech/playback-view';
import { ErrorMessage } from '@ui/error-message';

type Props = { novel: Novel; initialChapter?: number | undefined; initialMode?: TextMode | undefined; services?: PlaybackServices | undefined; onRead?: ((chapter: number, mode: TextMode) => void) | undefined };
export default function SpeechScreen({ novel, services, initialChapter, initialMode, onRead }: Props) {
  if (!activeSource(novel)) return <ErrorMessage message="Nenhuma fonte disponível para esta obra." />;
  const chapter = chapterSchema.safeParse(initialSpeechChapter(novel, initialChapter));
  if (!chapter.success) return <ErrorMessage message="Capítulo inválido." />;
  return <PlaybackView key={`${novel.id}:${activeSource(novel)?.id ?? ''}:${initialChapter ?? 'saved'}:${initialMode ?? 'translated'}`} novel={novel} initialChapter={chapter.data} initialMode={initialMode} services={services} onRead={onRead} />;
}
