import { httpResource, type HttpResource } from '@core/http-resource';
import { speedSchema, speedStateSchema } from '@core/api/schemas';

export function settingsResources(request: HttpResource = httpResource) {
  return {
    get: (signal?: AbortSignal) => request('/settings', speedStateSchema, { signal }),
    save: (speed: number) => request('/settings', speedStateSchema, { method: 'PUT', body: speedSchema.parse({ speed }) }),
  };
}
