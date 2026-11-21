import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { createHttpResource } from '@core/http-resource';
import { createLocalStorage, LocalStorageError } from '@core/local-storage';
import DownloadsScreen from '@screens/downloads-screen';
import { memoryFiles } from './local-files';
import { readerNovel, readerQueryClient, jsonResponse } from './reader-fixture';

function setup() {
  const memory = memoryFiles(); const storage = createLocalStorage(memory.files); const client = readerQueryClient();
  const transport = jest.fn(async (url: string, init: RequestInit) => {
    if (init.method === 'DELETE') return jsonResponse({}, 503);
    const chapter = Number(new URL(url).searchParams.get('chapter'));
    return jsonResponse({ url: `https://example.org/chapter-${chapter}`, chapter, text: `Texto ${chapter}.` });
  });
  return { client, storage, transport, request: createHttpResource({ baseUrl: () => 'https://api.example', transport, timeoutMs: 1000 }) };
}

test('downloads expose text/voice at the chosen chapter and confirmed deletion ignores remote failure', async () => {
  const data = setup(); const read = jest.fn(); const listen = jest.fn();
  try {
    await render(<QueryClientProvider client={data.client}><DownloadsScreen novel={readerNovel} services={data} onRead={read} onListen={listen} /></QueryClientProvider>);
    await screen.findByText('Nenhum capítulo baixado.');
    await fireEvent.press(screen.getByRole('button', { name: 'Baixar cap. 2' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Ler cap. 2' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Ouvir cap. 2' }));
    expect(read).toHaveBeenCalledWith(2); expect(listen).toHaveBeenCalledWith(2);
    await fireEvent.press(screen.getByRole('button', { name: 'Remover cap. 2' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByRole('button', { name: 'Ler cap. 2' })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Remover cap. 2' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Remover' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Ler cap. 2' })).toBeNull());
    expect(screen.getByText('Nenhum capítulo baixado.')).toBeOnTheScreen();
    expect(data.transport.mock.calls.some(([, init]) => init.method === 'PATCH')).toBe(false);
    await screen.unmount();
  } finally { data.client.clear(); }
}, 60000);

test('a local write failure is visible and can be retried without a false downloaded entry', async () => {
  const data = setup(); jest.spyOn(data.storage, 'saveChapter').mockRejectedValueOnce(new LocalStorageError());
  try {
    await render(<QueryClientProvider client={data.client}><DownloadsScreen novel={readerNovel} services={data} onRead={() => {}} onListen={() => {}} /></QueryClientProvider>);
    await screen.findByText('Nenhum capítulo baixado.');
    await fireEvent.press(screen.getByRole('button', { name: 'Baixar cap. 2' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível salvar o texto no aparelho.');
    expect(screen.queryByRole('button', { name: 'Ler cap. 2' })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Baixar cap. 2' }));
    expect(await screen.findByRole('button', { name: 'Ler cap. 2' })).toBeOnTheScreen();
    await screen.unmount();
  } finally { data.client.clear(); }
});

test('range form rejects invalid limits and fully downloaded intervals without HTTP work', async () => {
  const data = setup();
  const source = readerNovel.sources[0];
  if (!source) throw new Error('Missing fixture source');
  await data.storage.saveChapter({ novelId: readerNovel.id, sourceId: source.id }, 1, 'Texto local.');
  try {
    await render(<QueryClientProvider client={data.client}><DownloadsScreen novel={readerNovel} services={data} onRead={() => {}} onListen={() => {}} /></QueryClientProvider>);
    await screen.findByRole('button', { name: 'Ler cap. 1' });
    await fireEvent.press(screen.getByRole('button', { name: 'Baixar intervalo' }));
    await fireEvent.changeText(screen.getByLabelText('Capítulo inicial'), '3');
    await fireEvent.changeText(screen.getByLabelText('Capítulo final'), '2');
    await fireEvent.press(screen.getByRole('button', { name: 'Baixar' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Intervalo inválido.');
    await fireEvent.changeText(screen.getByLabelText('Capítulo inicial'), '1');
    await fireEvent.changeText(screen.getByLabelText('Capítulo final'), '6');
    await fireEvent.press(screen.getByRole('button', { name: 'Baixar' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Máximo disponível: 5.');
    await fireEvent.changeText(screen.getByLabelText('Capítulo final'), '1');
    await fireEvent.press(screen.getByRole('button', { name: 'Baixar' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Todos os capítulos desse intervalo já estão offline.');
    expect(data.transport).not.toHaveBeenCalled();
    await screen.unmount();
  } finally { data.client.clear(); }
});

test('range skips saved text, reports attempted progress and preserves per-chapter failures for retry', async () => {
  const data = setup(); const source = readerNovel.sources[0];
  if (!source) throw new Error('Missing fixture source');
  await data.storage.saveChapter({ novelId: readerNovel.id, sourceId: source.id }, 1, 'Texto local.');
  let release = () => {};
  const pending = new Promise<void>(resolve => { release = resolve; });
  data.transport.mockImplementation(async (url: string) => {
    const chapter = Number(new URL(url).searchParams.get('chapter'));
    if (chapter === 2) await pending;
    if (chapter === 3) return jsonResponse({}, 503);
    return jsonResponse({ url: `https://example.org/chapter-${chapter}`, chapter, text: `Texto ${chapter}.` });
  });
  try {
    await render(<QueryClientProvider client={data.client}><DownloadsScreen novel={readerNovel} services={data} onRead={() => {}} onListen={() => {}} /></QueryClientProvider>);
    await screen.findByRole('button', { name: 'Ler cap. 1' });
    await fireEvent.press(screen.getByRole('button', { name: 'Baixar intervalo' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Baixar' }));
    expect(await screen.findByText('Baixando 0/4')).toBeOnTheScreen();
    expect(screen.getByRole('progressbar', { name: 'Progresso dos downloads' })).toHaveAccessibilityValue({ min: 0, max: 100, now: 0 });
    expect(screen.getByRole('button', { name: 'Baixar intervalo' })).toBeDisabled();
    expect(await screen.findByRole('alert')).toBeOnTheScreen();
    release();
    await screen.findByRole('button', { name: 'Ler cap. 2' });
    await waitFor(() => expect(screen.queryByRole('progressbar')).toBeNull());
    expect(screen.getByRole('alert')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Ler cap. 3' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Ler cap. 4' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Ler cap. 5' })).toBeOnTheScreen();
    expect(data.transport.mock.calls.map(([url]) => Number(new URL(url).searchParams.get('chapter'))).sort()).toEqual([2, 3, 4, 5]);
    expect(data.transport.mock.calls.every(([, init]) => init.method === 'GET')).toBe(true);
    await screen.unmount();
  } finally { release(); data.client.clear(); }
});

test('a range continues writing local text after leaving the screen while the process stays alive', async () => {
  const data = setup(); const source = readerNovel.sources[0];
  if (!source) throw new Error('Missing fixture source');
  let release = () => {};
  const pending = new Promise<void>(resolve => { release = resolve; });
  data.transport.mockImplementation(async (url: string) => {
    await pending;
    const chapter = Number(new URL(url).searchParams.get('chapter'));
    return jsonResponse({ url: `https://example.org/chapter-${chapter}`, chapter, text: `Texto ${chapter}.` });
  });
  try {
    await render(<QueryClientProvider client={data.client}><DownloadsScreen novel={readerNovel} services={data} onRead={() => {}} onListen={() => {}} /></QueryClientProvider>);
    await screen.findByText('Nenhum capítulo baixado.');
    await fireEvent.press(screen.getByRole('button', { name: 'Baixar intervalo' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Baixar' }));
    await screen.findByText('Baixando 0/5');
    await screen.unmount(); release();
    await waitFor(async () => expect(await data.storage.listChapters({ novelId: readerNovel.id, sourceId: source.id })).toEqual([1, 2, 3, 4, 5]));
  } finally { release(); data.client.clear(); }
});
