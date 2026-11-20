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
}, 20000);

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
