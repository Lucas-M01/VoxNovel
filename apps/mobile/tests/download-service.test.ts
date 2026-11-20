import { createHttpResource, type HttpTransport } from '@core/http-resource';
import { createLocalStorage, LocalStorageError } from '@core/local-storage';
import { createDownloadService } from '@features/downloads/download-service';
import { keys } from '@core/keys';
import { memoryFiles } from './local-files';
import { readerNovel, readerScope, readerQueryClient, jsonResponse } from './reader-fixture';
import { flushSpeech } from './speech-driver';

function setup(transport: HttpTransport) {
  const memory = memoryFiles(); const storage = createLocalStorage(memory.files); const client = readerQueryClient();
  const request = createHttpResource({ baseUrl: () => 'https://api.example', transport, timeoutMs: 1000 });
  return { ...memory, storage, client, service: createDownloadService(client, readerNovel, { storage, request }) };
}

test('individual downloads deduplicate requests, persist only text, and never update reading progress', async () => {
  const transport = jest.fn(async (url: string, init: RequestInit) => {
    expect(init.method).toBe('GET'); expect(new URL(url).searchParams.get('url')).toBe('https://example.org/chapter-2');
    return jsonResponse({ url: 'https://example.org/chapter-2', chapter: 2, text: 'Texto salvo.' });
  });
  const data = setup(transport);
  try {
    const first = data.service.download(2); const second = data.service.download(2);
    expect(first).toBe(second); await expect(first).resolves.toBe('saved');
    await expect(data.storage.readChapter(readerScope, 2)).resolves.toEqual({ chapter: 2, text: 'Texto salvo.' });
    await expect(data.service.download(2)).resolves.toBe('cache');
    expect(transport).toHaveBeenCalledTimes(1); expect(data.files.write).toHaveBeenCalledTimes(1);
    expect(data.client.getMutationCache().getAll()).toHaveLength(0);
    expect(data.client.getQueryData(keys.chapter(readerScope, 'https://example.org/chapter-2', 2))).toMatchObject({ text: 'Texto salvo.' });
  } finally { data.client.clear(); }
});

test('failed writes are not reported as saved and explicit retry can succeed', async () => {
  const transport = jest.fn(async () => jsonResponse({ url: 'https://example.org/chapter-2', chapter: 2, text: 'Texto salvo.' }));
  const data = setup(transport);
  const save = jest.spyOn(data.storage, 'saveChapter').mockRejectedValueOnce(new LocalStorageError());
  try {
    await expect(data.service.download(2)).rejects.toBeInstanceOf(LocalStorageError);
    await expect(data.storage.hasChapter(readerScope, 2)).resolves.toBe(false);
    await expect(data.service.download(2)).resolves.toBe('saved');
    expect(save).toHaveBeenCalledTimes(2); expect(transport).toHaveBeenCalledTimes(2);
  } finally { data.client.clear(); }
});

test('source or HTTP failure keeps the local chapter absent', async () => {
  const data = setup(async () => jsonResponse({}, 503));
  try {
    await expect(data.service.download(2)).rejects.toMatchObject({ kind: 'http' });
    await expect(data.storage.hasChapter(readerScope, 2)).resolves.toBe(false);
    await expect(data.service.download(6)).rejects.toThrow('Capítulo fora do intervalo.');
  } finally { data.client.clear(); }
});

test('local removal succeeds before remote cleanup and preserves a different source', async () => {
  let release = () => {}; const pending = new Promise<void>(resolve => { release = resolve; });
  const transport = jest.fn(async (_url: string, init: RequestInit) => { expect(init.method).toBe('DELETE'); await pending; return jsonResponse({}, 503); });
  const data = setup(transport);
  const other = { ...readerScope, sourceId: 'other-source' };
  await data.storage.saveChapter(readerScope, 2, 'Fonte atual.'); await data.storage.saveChapter(other, 2, 'Outra fonte.');
  try {
    await expect(data.service.remove(2)).resolves.toBeUndefined();
    await expect(data.storage.readChapter(readerScope, 2)).resolves.toBeNull();
    await expect(data.storage.readChapter(other, 2)).resolves.toMatchObject({ text: 'Outra fonte.' });
    expect(transport).toHaveBeenCalledTimes(1);
    release(); await flushSpeech();
  } finally { release(); data.client.clear(); }
});

test('an unconfirmed local removal reports failure and does not clear the remote cache', async () => {
  const transport = jest.fn(async () => jsonResponse({ removed: [] })); const data = setup(transport);
  await data.storage.saveChapter(readerScope, 2, 'Preservar.');
  jest.spyOn(data.storage, 'removeChapter').mockResolvedValueOnce([]);
  try {
    await expect(data.service.remove(2)).rejects.toThrow('Não foi possível confirmar a remoção');
    await expect(data.storage.readChapter(readerScope, 2)).resolves.toMatchObject({ text: 'Preservar.' });
    expect(transport).not.toHaveBeenCalled();
  } finally { data.client.clear(); }
});
