import type { HttpResource } from '@core/http-resource';
import { FilterView } from '@features/filters/filter-view';

export default function FiltersScreen({ request }: { request?: HttpResource | undefined }) {
  return <FilterView request={request} />;
}
