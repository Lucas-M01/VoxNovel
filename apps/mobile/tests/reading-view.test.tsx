import { QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { createHttpResource, type HttpTransport } from '@core/http-resource';
import { createLocalStorage } from '@core/local-storage';
import { apiQueries } from '@core/queries';
import { readingChapterOptions, readingKeys } from '@features/reader/reader-data';
import ReadingScreen from '@screens/reading-screen';
import { memoryFiles } from './local-files';
import { readerNovel, readerScope, readerQueryClient, jsonResponse } from './reader-fixture';

jest.mock('@react-native-community/netinfo', () => jest.requireActual('@react-native-community/netinfo/jest/netinfo-mock.js'));

function services(transport: HttpTransport) {
  const memory = memoryFiles();
  return { ...memory, storage: createLocalStorage(memory.files), request: createHttpResource({ baseUrl: () => 'https://api.example', transport, timeoutMs: 1000 }) };
}

test('downloaded text renders offline without requesting content and a progress failure does not hide it', async () => {
  const transport = jest.fn(async (_url: string, init: RequestInit) => {
    expect(init.method).toBe('PATCH');
    expect(init.body).toBe(JSON.stringify({ chapter: 2 }));
    return jsonResponse({}, 503);
  });
  const data = services(transport);
  await data.storage.saveChapter(readerScope, 2, 'Livro sintético - Capítulo 2: Local\nTexto offline.\n— Diálogo offline.');
  const client = readerQueryClient();
  try {
    await render(<QueryClientProvider client={client}><ReadingScreen novel={readerNovel} initialChapter={2} services={data} /></QueryClientProvider>);
    expect(await screen.findByText('Texto offline.')).toBeOnTheScreen();
    expect(await screen.findByText('Não foi possível salvar o progresso.')).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Capítulo 2: Local' })).toBeOnTheScreen();
    expect(screen.getByText('— Diálogo offline.')).toHaveStyle({ marginLeft: 18 });
    expect(transport).toHaveBeenCalledTimes(1);
    await screen.unmount();
  } finally { client.clear(); }
});

test('online text is readable while progress is still pending, and is not saved as a download', async () => {
  let finishProgress = () => {};
  const pending = new Promise<void>(resolve => { finishProgress = resolve; });
  const transport: HttpTransport = async (_url, init) => {
    if (init.method === 'PATCH') { await pending; return jsonResponse(readerNovel); }
    return jsonResponse({ url: 'https://example.org/chapter-1', chapter: 1, text: 'Texto online sintético.' });
  };
  const data = services(transport); const client = readerQueryClient();
  try {
    await render(<QueryClientProvider client={client}><ReadingScreen novel={readerNovel} services={data} /></QueryClientProvider>);
    expect(await screen.findByText('Texto online sintético.')).toBeOnTheScreen();
    await expect(data.storage.readChapter(readerScope, 1)).resolves.toBeNull();
    await act(async () => { finishProgress(); });
    await screen.unmount();
  } finally { finishProgress(); client.clear(); }
});

test('reading preferences restyle the rendered text without refetching content', async () => {
  const transport = jest.fn(async (_url: string, init: RequestInit) => init.method === 'PATCH' ? jsonResponse(readerNovel) : jsonResponse({ url: 'https://example.org/chapter-1', chapter: 1, text: 'Parágrafo sintético.' }));
  const data = services(transport); const client = readerQueryClient();
  try {
    await render(<QueryClientProvider client={client}><ReadingScreen novel={readerNovel} services={data} /></QueryClientProvider>);
    await screen.findByText('Parágrafo sintético.');
    await waitFor(() => expect(transport).toHaveBeenCalledTimes(2));
    await fireEvent.press(screen.getByRole('button', { name: 'Personalização' }));
    await fireEvent.press(screen.getByRole('button', { name: '23' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Serif' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Claro' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Fechar' }));
    expect(screen.getByText('Parágrafo sintético.')).toHaveStyle({ fontSize: 23, fontFamily: 'serif', color: '#2C2C2C' });
    expect(transport).toHaveBeenCalledTimes(2);
    await screen.unmount();
  } finally { client.clear(); }
}, 20000);

test('invalid chapter guard and missing sources do not attempt to save progress', async () => {
  const transport = jest.fn(async () => jsonResponse(readerNovel));
  const data = services(transport); const client = readerQueryClient();
  try {
    await render(<QueryClientProvider client={client}><ReadingScreen novel={readerNovel} initialChapter={0} services={data} /></QueryClientProvider>);
    expect(screen.getByRole('alert')).toHaveTextContent('Capítulo inválido.');
    await screen.unmount();
    await render(<QueryClientProvider client={client}><ReadingScreen novel={{ ...readerNovel, sources: [], active_source_id: null }} services={data} /></QueryClientProvider>);
    expect(await screen.findByRole('alert')).toHaveTextContent('Nenhuma fonte disponível para esta obra.');
    expect(transport).not.toHaveBeenCalled();
    await screen.unmount();
  } finally { client.clear(); }
});

test('content failure supports an explicit retry without phantom progress writes', async () => {
  let failed = true;
  const transport = jest.fn(async (_url: string, init: RequestInit) => {
    if (failed) return jsonResponse({}, 503);
    return init.method === 'PATCH' ? jsonResponse(readerNovel) : jsonResponse({ url: 'https://example.org/chapter-1', chapter: 1, text: 'Texto recuperado.' });
  });
  const data = services(transport); const client = readerQueryClient();
  try {
    await render(<QueryClientProvider client={client}><ReadingScreen novel={readerNovel} services={data} /></QueryClientProvider>);
    await screen.findByRole('alert');
    expect(transport).toHaveBeenCalledTimes(1);
    failed = false;
    await fireEvent.press(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByText('Texto recuperado.')).toBeOnTheScreen();
    await screen.unmount();
  } finally { client.clear(); }
});

test('a prefetched raw chapter does not save progress until opened and invalidated text is refreshed', async () => {
  let text = 'Texto anterior.';
  const transport = jest.fn(async (_url: string, init: RequestInit) => init.method === 'PATCH' ? jsonResponse(readerNovel) : jsonResponse({ url: 'https://example.org/chapter-1', chapter: 1, text }));
  const data = services(transport); const client = readerQueryClient();
  try {
    const options = apiQueries(data.request, data.storage).chapter(readerScope, 'https://example.org/chapter-1', 1);
    await client.fetchQuery({ ...options, staleTime: Infinity });
    expect(transport).toHaveBeenCalledTimes(1);
    const result = await client.fetchQuery(readingChapterOptions(client, readerNovel, 1, data));
    expect(result.text).toBe('Texto anterior.');
    text = 'Texto atualizado.';
    await client.invalidateQueries({ queryKey: options.queryKey });
    await expect(client.fetchQuery(readingChapterOptions(client, readerNovel, 1, data))).resolves.toMatchObject({ text: 'Texto atualizado.' });
  } finally { client.clear(); }
});

test('abandoning a chapter during fetch cannot save stale progress when it completes', async () => {
  let finish = () => {};
  const pending = new Promise<void>(resolve => { finish = resolve; });
  const transport = jest.fn(async (_url: string, init: RequestInit) => {
    if (init.method === 'PATCH') return jsonResponse(readerNovel);
    await pending;
    return jsonResponse({ url: 'https://example.org/chapter-1', chapter: 1, text: 'Texto atrasado.' });
  });
  const data = services(transport); const client = readerQueryClient();
  const read = client.fetchQuery(readingChapterOptions(client, readerNovel, 1, data));
  const assertion = expect(read).rejects.toBeDefined();
  await client.cancelQueries({ queryKey: readingKeys.content(readerNovel.id, readerScope.sourceId, 1) });
  finish(); await assertion;
  await client.fetchQuery({ ...apiQueries(data.request, data.storage).chapter(readerScope, 'https://example.org/chapter-1', 1), staleTime: Infinity });
  expect(transport.mock.calls.every(([, init]) => init.method === 'GET')).toBe(true);
  client.clear();
});
