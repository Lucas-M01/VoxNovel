import { idSchema, type Novel } from '@core/api/schemas';
import { DetailView } from '@features/detail/detail-view';
import type { ReaderServices } from '@features/reader/reader-data';
import { ErrorMessage } from '@ui/error-message';

type Props = { id: string; services?: ReaderServices; onNavigate: (destination: 'reading' | 'speech' | 'downloads', novel: Novel) => void; onAddSource: (novel: Novel) => void; onDeleted: () => void };
export default function DetailScreen(props: Props) {
  if (!idSchema.safeParse(props.id).success) return <ErrorMessage message="Obra inválida." />;
  return <DetailView key={props.id} {...props} />;
}
