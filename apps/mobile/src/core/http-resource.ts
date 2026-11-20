import { z } from 'zod';
import { apiBaseUrl, apiTimeoutMs } from '@core/config';

type ErrorKind = 'configuration' | 'network' | 'timeout' | 'cancelled' | 'response' | 'http';
export class ApiError extends Error {
  constructor(message: string, readonly kind: ErrorKind, readonly status?: number) {
    super(message);
    this.name = 'ApiError';
  }
}

type HttpResponse = { status: number; ok: boolean; text: () => Promise<string> };
export type HttpTransport = (url: string, init: RequestInit) => Promise<HttpResponse>;
type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number>;
  signal?: AbortSignal | undefined;
};

function httpMessage(status: number): string {
  if (status === 404) return 'O conteúdo solicitado não foi encontrado.';
  if (status === 409) return 'Este item já está na biblioteca.';
  if (status === 400 || status === 422) return 'Confira os dados e tente novamente.';
  if (status === 503) return 'O serviço está ocupado ou indisponível. Tente novamente.';
  return 'Não foi possível concluir a solicitação.';
}

export function createHttpResource({
  baseUrl = apiBaseUrl,
  transport = fetch,
  timeoutMs = apiTimeoutMs,
}: {
  baseUrl?: () => string;
  transport?: HttpTransport;
  timeoutMs?: number;
} = {}) {
  return async function request<T>(path: string, schema: z.ZodType<T>, options: RequestOptions = {}): Promise<T> {
    let base: string;
    try { base = baseUrl(); }
    catch { throw new ApiError('Configure o endereço da API para continuar.', 'configuration'); }
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(options.query ?? {})) query.set(key, String(value));
    const suffix = query.size ? `?${query.toString()}` : '';
    const controller = new AbortController();
    const cancel = () => controller.abort();
    options.signal?.addEventListener('abort', cancel, { once: true });
    if (options.signal?.aborted) controller.abort();
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
    try {
      if (controller.signal.aborted) throw new ApiError('Solicitação cancelada.', 'cancelled');
      const response = await transport(`${base}/api/v1${path}${suffix}`, {
        method: options.method ?? 'GET',
        headers: { Accept: 'application/json', ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }) },
        ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
        signal: controller.signal,
      });
      if (!response.ok) throw new ApiError(httpMessage(response.status), 'http', response.status);
      const text = await response.text();
      let payload: unknown = undefined;
      if (text) {
        try { payload = JSON.parse(text); }
        catch { throw new ApiError('A API retornou uma resposta inválida.', 'response'); }
      }
      const parsed = schema.safeParse(payload);
      if (!parsed.success) throw new ApiError('A API retornou dados incompatíveis.', 'response');
      return parsed.data;
    } catch (error) {
      if (options.signal?.aborted) throw new ApiError('Solicitação cancelada.', 'cancelled');
      if (timedOut) throw new ApiError('A solicitação demorou demais. Tente novamente.', 'timeout');
      if (error instanceof ApiError) throw error;
      throw new ApiError('Não foi possível conectar à API. Verifique a conexão.', 'network');
    } finally {
      clearTimeout(timer);
      options.signal?.removeEventListener('abort', cancel);
    }
  };
}

export type HttpResource = ReturnType<typeof createHttpResource>;
export const httpResource = createHttpResource();
