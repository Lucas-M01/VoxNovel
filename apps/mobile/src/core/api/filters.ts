import { z } from 'zod';
import { httpResource, type HttpResource } from '@core/http-resource';
import { filtersSchema, filterStateSchema, type Filters, type FilterKind } from '@core/api/schemas';

export function filterResources(request: HttpResource = httpResource) {
  const term = (method: 'POST' | 'DELETE', kind: FilterKind, value: string) => request('/filters/term', filterStateSchema, { method, body: { kind: z.enum(['words', 'phrases', 'regex']).parse(kind), value: z.string().min(1).parse(value) } });
  return {
    get: (signal?: AbortSignal) => request('/filters', filterStateSchema, { signal }),
    replace: (input: Filters) => request('/filters', filterStateSchema, { method: 'PUT', body: filtersSchema.parse(input) }),
    clear: () => request('/filters', filterStateSchema, { method: 'DELETE' }),
    add: (kind: FilterKind, value: string) => term('POST', kind, value),
    remove: (kind: FilterKind, value: string) => term('DELETE', kind, value),
  };
}
