import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { createHttpResource } from '@core/http-resource';
import { createLocalStorage } from '@core/local-storage';
import ReadingScreen from '@screens/reading-screen';
import { memoryFiles } from './local-files';
import { readerNovel, readerQueryClient, jsonResponse } from './reader-fixture';

jest.mock('@react-native-community/netinfo', () => jest.requireActual('@react-native-community/netinfo/jest/netinfo-mock.js'));

test('reader chooses the original and carries that choice when opening voice', async () => {
  const storage = createLocalStorage(memoryFiles().files); const client = readerQueryClient(); const listen = jest.fn();
  const request = createHttpResource({ baseUrl: () => 'https://api.example', transport: async (url, init) => {
    if (init.method === 'PATCH') return jsonResponse(readerNovel);
    const input = new URL(url); const chapter = Number(input.searchParams.get('chapter'));
    return jsonResponse({ url: `https://example.org/chapter-${chapter}`, chapter, text: `Chapter ${chapter}\n\n${input.searchParams.get('translate') === 'false' ? 'Original English paragraph.' : 'Texto em português.'}` });
  } });
  try {
    await render(<QueryClientProvider client={client}><ReadingScreen novel={readerNovel} services={{ request, storage }} onListen={listen} /></QueryClientProvider>);
    expect(await screen.findByText('Texto em português.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Texto original' }));
    expect(await screen.findByText('Original English paragraph.')).toBeOnTheScreen();
    expect(screen.queryByText('Texto em português.')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Ouvir capítulo' }));
    expect(listen).toHaveBeenCalledWith(1, 'original');
    await screen.unmount();
  } finally { client.clear(); }
});
