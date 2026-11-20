import type { Novel } from '@core/api/schemas';
import { activeSource } from '@core/chapter-source';
import type { ReaderServices } from '@features/reader/reader-data';
import { DownloadsView } from '@features/downloads/downloads-view';
import { ErrorMessage } from '@ui/error-message';

type Props = { novel: Novel; services?: ReaderServices | undefined; onRead: (chapter: number) => void; onListen: (chapter: number) => void };
export default function DownloadsScreen(props: Props) {
  if (!activeSource(props.novel)) return <ErrorMessage message="Nenhuma fonte disponível para esta obra." />;
  return <DownloadsView key={`${props.novel.id}:${activeSource(props.novel)?.id ?? ''}`} {...props} />;
}
