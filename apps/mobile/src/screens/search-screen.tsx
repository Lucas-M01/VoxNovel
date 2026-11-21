import type { Novel } from '@core/api/schemas';
import type { HttpResource } from '@core/http-resource';
import { SearchView } from '@features/search/search-view';

type Props = { onOpen: (novel: Novel) => void; request?: HttpResource; existing?: Novel | undefined };
export default function SearchScreen(props: Props) { return <SearchView {...props} />; }
