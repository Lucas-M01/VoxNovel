import { z } from 'zod';
import { apiBaseUrl } from '@core/config';
import { ApiError, createHttpResource, type HttpResource, type HttpTransport } from '@core/http-resource';
import { novelResources } from '@core/api/novels';
import { sourceResources } from '@core/api/sources';
import { chapterResources } from '@core/api/chapters';
import { downloadResources } from '@core/api/downloads';
import { filterResources } from '@core/api/filters';
import { settingsResources } from '@core/api/settings';
import { systemResources } from '@core/api/system';
import { apiMutations, apiQueries, createQueryClient } from '@core/queries';
import { keys } from '@core/keys';

const id = '11111111-1111-4111-8111-111111111111';
const sourceId = '22222222-2222-4222-8222-222222222222';
const updated_at = '2026-11-20T12:00:00+00:00';
const pageUrl = 'https://example.org/book?title=a&chapter=3';
const input = { provider: 'Generic', title: 'Synthetic', url_base: 'https://example.org/' };
const novel = { id, title: 'Synthetic', slug: 'synthetic', current_chapter: 3, image_url: null, total_chapters: null, active_source_id: sourceId, sources: [{ ...input, id: sourceId, novel_id: id, current_chapter: 3, updated_at }], updated_at };
const metadata = { ...input, slug: null, image_url: null, total_chapters: null, chapter_url_pattern: null, chapter_ids: null, authors: [], rating: null, genres: [] };
const filters = { words: ['synthetic'], phrases: [], regex: [], updated_at };
const speed = { speed: 1.25, updated_at };
const removed = { removed: ['synthetic/chapter_3.json'] };

type Case = { name: string; method: string; path: string; payload: unknown; run: (request: HttpResource) => Promise<unknown> };
const cases: Case[] = [
  { name: 'library', method: 'GET', path: '/novels', payload: [novel], run: r => novelResources(r).list() },
  { name: 'novel', method: 'GET', path: `/novels/${id}`, payload: novel, run: r => novelResources(r).get(id) },
  { name: 'create', method: 'POST', path: '/novels', payload: novel, run: r => novelResources(r).create({ title: 'Synthetic', sources: [input] }) },
  { name: 'delete', method: 'DELETE', path: `/novels/${id}`, payload: undefined, run: r => novelResources(r).remove(id) },
  { name: 'progress', method: 'PATCH', path: `/novels/${id}/progress`, payload: novel, run: r => novelResources(r).progress(id, 3) },
  { name: 'add source', method: 'POST', path: `/novels/${id}/sources`, payload: novel, run: r => novelResources(r).addSource(id, input) },
  { name: 'activate source', method: 'PATCH', path: `/novels/${id}/active-source`, payload: novel, run: r => novelResources(r).activateSource(id, sourceId) },
  { name: 'remove source', method: 'DELETE', path: `/novels/${id}/sources/${sourceId}`, payload: novel, run: r => novelResources(r).removeSource(id, sourceId) },
  { name: 'identify', method: 'GET', path: '/sources/identify', payload: metadata, run: r => sourceResources(r).identify(pageUrl) },
  { name: 'search', method: 'GET', path: '/sources/search', payload: { name: 'Synthetic', results: [metadata] }, run: r => sourceResources(r).search('Synthetic') },
  { name: 'chapter number', method: 'GET', path: '/sources/chapter-number', payload: { chapter: 3 }, run: r => sourceResources(r).chapterNumber(pageUrl) },
  { name: 'detect chapter', method: 'GET', path: '/sources/detect-chapter', payload: { chapter: 3 }, run: r => sourceResources(r).detectChapter(pageUrl) },
  { name: 'chapter URL', method: 'GET', path: '/sources/chapter-url', payload: { url: null }, run: r => sourceResources(r).chapterUrl('https://example.org/{chapter}', 3) },
  { name: 'chapter text', method: 'GET', path: '/chapters/text', payload: { url: pageUrl, chapter: 3, text: 'Synthetic text.' }, run: r => chapterResources(r).text(pageUrl, 3) },
  { name: 'downloads', method: 'GET', path: `/downloads/${id}`, payload: { novel_id: id, chapters: [3] }, run: r => downloadResources(r).list(id) },
  { name: 'generate', method: 'POST', path: `/downloads/${id}/3`, payload: { status: 'cache', novel_id: id, chapter: 3 }, run: r => downloadResources(r).generate(id, 3) },
  { name: 'downloaded text', method: 'GET', path: `/downloads/${id}/3/text`, payload: { chapter: 3, text: 'Synthetic text.' }, run: r => downloadResources(r).text(id, 3) },
  { name: 'remove chapter', method: 'DELETE', path: `/downloads/${id}/3`, payload: removed, run: r => downloadResources(r).removeChapter(id, 3) },
  { name: 'remove downloads', method: 'DELETE', path: `/downloads/${id}`, payload: removed, run: r => downloadResources(r).removeNovel(id) },
  { name: 'filters', method: 'GET', path: '/filters', payload: filters, run: r => filterResources(r).get() },
  { name: 'replace filters', method: 'PUT', path: '/filters', payload: filters, run: r => filterResources(r).replace({ words: [], phrases: [], regex: [] }) },
  { name: 'clear filters', method: 'DELETE', path: '/filters', payload: filters, run: r => filterResources(r).clear() },
  { name: 'add term', method: 'POST', path: '/filters/term', payload: filters, run: r => filterResources(r).add('regex', 'synthetic') },
  { name: 'remove term', method: 'DELETE', path: '/filters/term', payload: filters, run: r => filterResources(r).remove('words', 'synthetic') },
  { name: 'settings', method: 'GET', path: '/settings', payload: speed, run: r => settingsResources(r).get() },
  { name: 'save speed', method: 'PUT', path: '/settings', payload: speed, run: r => settingsResources(r).save(1.25) },
  { name: 'status', method: 'GET', path: '/status', payload: { status: 'ok' }, run: r => systemResources(r).status() },
  { name: 'logs', method: 'GET', path: '/logs', payload: { logs: ['Synthetic event.'] }, run: r => systemResources(r).logs() },
];

function response(payload: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, text: async () => payload === undefined ? '' : JSON.stringify(payload) };
}
function resource(transport: HttpTransport, timeoutMs = 1000) {
  return createHttpResource({ baseUrl: () => 'http://api.example', transport, timeoutMs });
}

describe.each(cases)('$name', entry => {
  test('uses the backend contract and validates success', async () => {
    let seenUrl = '';
    let seenInit: RequestInit = {};
    const transport: HttpTransport = async (url, init) => {
      seenUrl = url;
      seenInit = init;
      return response(entry.payload, entry.payload === undefined ? 204 : 200);
    };
    await expect(entry.run(resource(transport))).resolves.toEqual(entry.payload);
    expect(new URL(seenUrl).pathname).toBe(`/api/v1${entry.path}`);
    expect(seenInit.method).toBe(entry.method);
    expect(seenInit.headers).toMatchObject({ Accept: 'application/json' });
  });
  test('rejects incompatible success payloads', async () => {
    await expect(entry.run(resource(async () => response({ incompatible: true })))).rejects.toMatchObject({ kind: 'response' });
  });
  test('rejects HTTP failure without leaking server content', async () => {
    await expect(entry.run(resource(async () => response({ detail: 'private-server-detail' }, 503)))).rejects.toMatchObject({ kind: 'http', status: 503, message: 'O serviço está ocupado ou indisponível. Tente novamente.' });
  });
});

test('encodes source URLs and request bodies without losing query parameters', async () => {
  const transport: HttpTransport = async (url, init) => {
    expect(new URL(url).searchParams.get('url')).toBe(pageUrl);
    expect(init.body).toBeUndefined();
    return response(metadata);
  };
  await sourceResources(resource(transport)).identify(pageUrl);
  await novelResources(resource(async (_url, init) => {
    expect(init.body).toBe(JSON.stringify({ chapter: 3 }));
    return response(novel);
  })).progress(id, 3);
});

test('validates configuration, accepting only HTTP URLs without credentials or query', () => {
  expect(apiBaseUrl('https://api.example///')).toBe('https://api.example');
  for (const value of ['', 'file:///tmp/test', 'ftp://api.example', 'https://user:pass@api.example', 'https://api.example?token=private', 'https://api.example#token']) {
    expect(() => apiBaseUrl(value)).toThrow('EXPO_PUBLIC_API_URL');
  }
});

test('accepts local API addresses used by physical devices and emulators', () => {
  for (const value of ['http://localhost:8000', 'http://192.0.2.1:8000', 'http://127.0.0.1:8000', 'http://[::1]:8000']) {
    expect(apiBaseUrl(value)).toBe(value);
  }
});

test('rejects invalid input before contacting the API', () => {
  const transport = jest.fn(async () => response(novel));
  const request = resource(transport);
  expect(() => novelResources(request).get('../settings')).toThrow();
  expect(() => novelResources(request).progress(id, 0)).toThrow();
  expect(() => settingsResources(request).save(Infinity)).toThrow();
  expect(() => sourceResources(request).search('  ')).toThrow();
  expect(transport).not.toHaveBeenCalled();
});

test('rejects a source assigned to another novel', async () => {
  const invalid = { ...novel, sources: [{ ...novel.sources[0], novel_id: sourceId }] };
  await expect(novelResources(resource(async () => response(invalid))).get(id)).rejects.toBeInstanceOf(ApiError);
});

test('handles invalid JSON and plain HTTP overload responses', async () => {
  await expect(resource(async () => ({ ok: true, status: 200, text: async () => '<html>' }))('/status', z.unknown())).rejects.toMatchObject({ kind: 'response' });
  await expect(resource(async () => ({ ok: false, status: 503, text: async () => 'Service Unavailable' }))('/status', z.unknown())).rejects.toMatchObject({ kind: 'http', status: 503 });
});

test('redacts transport and configuration errors', async () => {
  await expect(resource(async () => { throw new Error('private-host'); })('/status', z.unknown())).rejects.toMatchObject({ kind: 'network', message: 'Não foi possível conectar à API. Verifique a conexão.' });
  await expect(createHttpResource({ baseUrl: () => { throw new Error('private-config'); } })('/status', z.unknown())).rejects.toMatchObject({ kind: 'configuration' });
});

function abortingTransport(onSignal?: (signal: AbortSignal) => void): HttpTransport {
  return async (_url, init) => new Promise((_resolve, reject) => {
    const signal = init.signal;
    if (!signal) throw new Error('Signal required');
    onSignal?.(signal);
    signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
  });
}

test('distinguishes timeout and user cancellation, cleaning timers', async () => {
  jest.useFakeTimers();
  try {
    const pending = resource(abortingTransport(), 10)('/status', z.unknown());
    const assertion = expect(pending).rejects.toMatchObject({ kind: 'timeout' });
    await jest.advanceTimersByTimeAsync(10);
    await assertion;
    const controller = new AbortController();
    const cancelled = resource(abortingTransport())('/status', z.unknown(), { signal: controller.signal });
    controller.abort();
    await expect(cancelled).rejects.toMatchObject({ kind: 'cancelled' });
    const transport = jest.fn(async () => response({ status: 'ok' }));
    await expect(resource(transport)('/status', z.unknown(), { signal: controller.signal })).rejects.toMatchObject({ kind: 'cancelled' });
    expect(transport).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
  } finally { jest.useRealTimers(); }
});

test('queries cache validated results and propagate cancellation to HTTP', async () => {
  const client = createQueryClient();
  client.setDefaultOptions({ queries: { retry: false, gcTime: Infinity }, mutations: { retry: false, gcTime: Infinity } });
  try {
    const transport = jest.fn(async () => response(novel));
    const query = apiQueries(resource(transport)).novel(id);
    await client.fetchQuery(query);
    expect(client.getQueryData(keys.novel(id))).toEqual(novel);
    await client.fetchQuery({ ...query, staleTime: Infinity });
    expect(transport).toHaveBeenCalledTimes(1);
    let activeSignal: AbortSignal | undefined;
    const pending = client.fetchQuery(apiQueries(resource(abortingTransport(signal => { activeSignal = signal; }))).status());
    const assertion = expect(pending).rejects.toBeDefined();
    await client.cancelQueries({ queryKey: keys.status() });
    await assertion;
    expect(activeSignal?.aborted).toBe(true);
  } finally { client.clear(); }
});

test('mutations invalidate relevant data only after success and do not retry writes', async () => {
  const client = createQueryClient();
  client.setDefaultOptions({ queries: { retry: false, gcTime: Infinity }, mutations: { retry: false, gcTime: Infinity } });
  try {
    client.setQueryData(keys.novels(), [novel]);
    client.setQueryData(keys.novel(id), novel);
    client.setQueryData(keys.settings(), speed);
    const options = apiMutations(client, resource(async () => response(novel))).progress();
    await client.getMutationCache().build(client, options).execute({ id, chapter: 3 });
    expect(client.getQueryState(keys.novels())?.isInvalidated).toBe(true);
    expect(client.getQueryState(keys.novel(id))?.isInvalidated).toBe(true);
    expect(client.getQueryState(keys.settings())?.isInvalidated).toBe(false);
    const failing = jest.fn(async () => response({}, 503));
    await expect(client.getMutationCache().build(client, apiMutations(client, resource(failing)).saveSpeed()).execute(1)).rejects.toBeInstanceOf(ApiError);
    expect(failing).toHaveBeenCalledTimes(1);
  } finally { client.clear(); }
});
