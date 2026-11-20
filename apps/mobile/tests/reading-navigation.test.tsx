import { QueryClientProvider } from '@tanstack/react-query';
import NetInfo, { NetInfoStateType } from '@react-native-community/netinfo';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { createHttpResource, type HttpTransport } from '@core/http-resource';
import { createLocalStorage } from '@core/local-storage';
import ReadingScreen from '@screens/reading-screen';
import { memoryFiles } from './local-files';
import { jsonResponse, readerNovel, readerScope, readerQueryClient } from './reader-fixture';

jest.mock('@react-native-community/netinfo', () => jest.requireActual('@react-native-community/netinfo/jest/netinfo-mock.js'));

function setup() {
  const files = memoryFiles();
  const storage = createLocalStorage(files.files);
  const calls: { path: string; method: string | undefined }[] = [];
  const transport: HttpTransport = async (url, init) => {
    calls.push({ path: new URL(url).pathname, method: init.method });
    if (init.method === 'PATCH') return jsonResponse(readerNovel);
    const chapter = Number(new URL(url).searchParams.get('chapter'));
    return jsonResponse({ url: `https://example.org/chapter-${chapter}`, chapter, text: `Texto sintético do capítulo ${chapter}.` });
  };
  return { client: readerQueryClient(), storage, request: createHttpResource({ baseUrl: () => 'https://api.example', transport }), calls };
}

test('navigation and chapter selection respect bounds and do not advance at 95% scroll', async () => {
  const data = setup();
  try {
    await render(<QueryClientProvider client={data.client}><ReadingScreen novel={readerNovel} services={data} /></QueryClientProvider>);
    await screen.findByText('Texto sintético do capítulo 1.');
    expect(screen.getByRole('button', { name: 'Capítulo anterior' })).toBeDisabled();
    await fireEvent.press(screen.getByRole('button', { name: 'Próximo capítulo' }));
    await screen.findByText('Texto sintético do capítulo 2.');
    await fireEvent.press(screen.getByRole('button', { name: 'Cap. 2 / 5' }));
    await fireEvent.changeText(screen.getByLabelText('Número do capítulo'), '6');
    await fireEvent.press(screen.getByRole('button', { name: 'Ir' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Capítulo fora do intervalo.');
    await fireEvent.changeText(screen.getByLabelText('Número do capítulo'), '5');
    await fireEvent.press(screen.getByRole('button', { name: 'Ir' }));
    await screen.findByText('Texto sintético do capítulo 5.');
    expect(screen.getByRole('button', { name: 'Próximo capítulo' })).toBeDisabled();
    await fireEvent.scroll(screen.getByTestId('reading-scroll'), { nativeEvent: { contentOffset: { x: 0, y: 960 }, contentSize: { width: 300, height: 1500 }, layoutMeasurement: { width: 300, height: 500 } } });
    expect(screen.getByText('Texto sintético do capítulo 5.')).toBeOnTheScreen();
    expect(screen.getByRole('progressbar', { name: 'Progresso da leitura' }).props.accessibilityValue.now).toBe(96);
    await screen.unmount();
  } finally { data.client.clear(); }
}, 20000);

test('offline navigation opens only local chapters, without fetching their content', async () => {
  const data = setup();
  await data.storage.saveChapter(readerScope, 1, 'Primeiro local.');
  await data.storage.saveChapter(readerScope, 3, 'Terceiro local.');
  jest.mocked(NetInfo.addEventListener).mockImplementationOnce(listener => { listener({ type: NetInfoStateType.none, isConnected: false, isInternetReachable: false, details: null }); return jest.fn(); });
  try {
    await render(<QueryClientProvider client={data.client}><ReadingScreen novel={readerNovel} services={data} /></QueryClientProvider>);
    await screen.findByText('Primeiro local.');
    const listener = jest.mocked(NetInfo.addEventListener).mock.calls.at(-1)?.[0];
    if (!listener) throw new Error('Expected network listener');
    await act(async () => listener({ type: NetInfoStateType.none, isConnected: false, isInternetReachable: false, details: null }));
    expect(screen.getByRole('button', { name: 'Próximo capítulo' })).toBeDisabled();
    await fireEvent.press(screen.getByRole('button', { name: 'Cap. 1 / 5' }));
    await fireEvent.changeText(screen.getByLabelText('Número do capítulo'), '2');
    await fireEvent.press(screen.getByRole('button', { name: 'Ir' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Capítulo 2 não está baixado e você está offline.');
    await fireEvent.changeText(screen.getByLabelText('Número do capítulo'), '3');
    await fireEvent.press(screen.getByRole('button', { name: 'Ir' }));
    expect(await screen.findByText('Terceiro local.')).toBeOnTheScreen();
    expect(data.calls.every(call => call.method === 'PATCH')).toBe(true);
    await screen.unmount();
  } finally { data.client.clear(); }
}, 20000);

test('tapping the body hides/shows controls and dragging suppresses accidental toggles', async () => {
  const data = setup();
  try {
    await render(<QueryClientProvider client={data.client}><ReadingScreen novel={readerNovel} services={data} /></QueryClientProvider>);
    await screen.findByText('Texto sintético do capítulo 1.');
    await fireEvent.press(screen.getByTestId('reading-body-touch'));
    expect(screen.queryByRole('button', { name: 'Próximo capítulo' })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Mostrar controles' }));
    expect(screen.getByRole('button', { name: 'Próximo capítulo' })).toBeOnTheScreen();
    await fireEvent(screen.getByTestId('reading-scroll'), 'scrollBeginDrag');
    await fireEvent.press(screen.getByTestId('reading-body-touch'));
    expect(screen.getByRole('button', { name: 'Próximo capítulo' })).toBeOnTheScreen();
    await fireEvent(screen.getByTestId('reading-scroll'), 'scrollEndDrag');
    await screen.unmount();
  } finally { data.client.clear(); }
});
