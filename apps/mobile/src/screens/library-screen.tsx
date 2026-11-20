import type { Novel } from '@core/api/schemas';
import type { ReaderServices } from '@features/reader/reader-data';
import { LibraryView } from '@features/library/library-view';

type Props = { services?: ReaderServices; onOpen: (novel: Novel) => void; onSearch: () => void; onFilters: () => void };
export default function LibraryScreen(props: Props) { return <LibraryView {...props} />; }
