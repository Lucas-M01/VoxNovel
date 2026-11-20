import type { Novel } from '@core/api/schemas';
import { activeSource } from '@core/chapter-source';
import { PlaybackView, type PlaybackServices } from '@features/speech/playback-view';
import { ErrorMessage } from '@ui/error-message';

type Props = { novel: Novel; initialChapter?: number | undefined; services?: PlaybackServices | undefined };
export default function SpeechScreen({ novel, services }: Props) {
  if (!activeSource(novel)) return <ErrorMessage message="Nenhuma fonte disponível para esta obra." />;
  return <PlaybackView key={`${novel.id}:${activeSource(novel)?.id ?? ''}`} novel={novel} services={services} />;
}
