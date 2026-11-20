import { z } from 'zod';
import { httpResource, type HttpResource } from '@core/http-resource';

export function systemResources(request: HttpResource = httpResource) {
  return {
    status: (signal?: AbortSignal) => request('/status', z.object({ status: z.literal('ok') }), { signal }),
    logs: (signal?: AbortSignal) => request('/logs', z.object({ logs: z.array(z.string()) }), { signal }),
  };
}
