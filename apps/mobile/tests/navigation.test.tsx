import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { renderRouter, screen } from 'expo-router/testing-library';
import { router } from 'expo-router';
import { createQueryClient } from '@core/queries';
import { novelRouteSchema } from '@core/navigation';
import RootLayout from '../app/_layout';
import HomeRoute from '../app/index';
import DetailRoute from '../app/detail';
import SearchRoute from '../app/search';
import ReadingRoute from '../app/reading';
import SpeechRoute from '../app/speech';
import DownloadsRoute from '../app/downloads';
import FiltersRoute from '../app/filters';
import { appNovel, appTransport, resetAppTransport } from './app-transport';

jest.mock('@react-native-community/netinfo', () => jest.requireActual('@react-native-community/netinfo/jest/netinfo-mock.js'));
jest.mock('@core/local-files', () => ({ deviceFiles: jest.requireActual('./local-files').memoryFiles().files }));
jest.mock('@core/http-resource', () => {
  const actual = jest.requireActual('@core/http-resource');
  return { ...actual, httpResource: actual.createHttpResource({ baseUrl: () => 'https://api.example', transport: jest.requireActual('./app-transport').appTransport }) };
});
jest.mock('@core/queries', () => {
  const actual = jest.requireActual('@core/queries');
  return { ...actual, createQueryClient: jest.fn(() => {
    const client = actual.createQueryClient();
    client.setDefaultOptions({ queries: { retry: false, gcTime: Infinity }, mutations: { retry: false, gcTime: Infinity, networkMode: 'always' } });
    return client;
  }) };
});
jest.mock('@core/native-speech', () => {
  const driver = jest.requireActual('./speech-driver').speechDriver().driver;
  return { nativeSpeech: driver, speechSession: jest.requireActual('@core/tts-service').createSpeechSession(driver) };
});

const routes = { _layout: RootLayout, index: HomeRoute, detail: DetailRoute, search: SearchRoute, reading: ReadingRoute, speech: SpeechRoute, downloads: DownloadsRoute, filters: FiltersRoute };
afterEach(() => { for (const result of jest.mocked(createQueryClient).mock.results) if (result.type === 'return') result.value.clear(); jest.clearAllMocks(); resetAppTransport(); });

test('real app routes connect library, details, text, voice and the chosen downloaded chapter', async () => {
  await renderRouter(routes, { initialUrl: '/' });
  await waitFor(() => expect(screen.getByRole('button', { name: `Abrir ${appNovel.title}` })).toBeOnTheScreen(), { timeout: 10000 });
  await fireEvent.press(screen.getByRole('button', { name: `Abrir ${appNovel.title}` }));
  await fireEvent.press(await screen.findByRole('button', { name: 'Continuar leitura' }));
  await screen.findByText('Texto de demonstração 1. Outra frase.');
  expect(screen).toHavePathname('/reading');
  await fireEvent.press(screen.getByRole('button', { name: 'Ouvir capítulo' }));
  await waitFor(() => expect(screen).toHavePathname('/speech'));
  expect(screen).toHaveSearchParams({ id: appNovel.id, chapter: '1' });
  await act(async () => { router.back(); });
  await act(async () => { router.back(); });
  await fireEvent.press(await screen.findByRole('button', { name: 'Downloads' }));
  await fireEvent.press(await screen.findByRole('button', { name: 'Baixar cap. 2' }));
  await fireEvent.press(await screen.findByRole('button', { name: 'Ler cap. 2' }));
  expect(screen).toHavePathname('/reading'); expect(screen).toHaveSearchParams({ id: appNovel.id, chapter: '2' });
  expect(await screen.findByText('Texto de demonstração 2. Outra frase.')).toBeOnTheScreen();
}, 120000);

test('duplicate search opens existing voice route and filters remain reachable from the library', async () => {
  await renderRouter(routes, { initialUrl: '/' });
  await waitFor(() => expect(screen.getByRole('button', { name: 'Adicionar obra' })).toBeOnTheScreen(), { timeout: 10000 });
  await fireEvent.press(screen.getByRole('button', { name: 'Adicionar obra' }));
  await fireEvent.changeText(screen.getByLabelText('Nome da obra'), 'demo');
  await fireEvent.press(screen.getByRole('button', { name: 'Buscar' }));
  await fireEvent.press(await screen.findByRole('button', { name: 'Selecionar Synthetic' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Continuar' }));
  await fireEvent.press(await screen.findByRole('button', { name: 'Abrir obra existente' }));
  await waitFor(() => expect(screen).toHavePathname('/speech'));
  await act(async () => { router.back(); });
  await fireEvent.press(await screen.findByRole('button', { name: 'Filtros' }));
  expect(await screen.findByRole('button', { name: 'Remover palavra: synthetic' })).toBeOnTheScreen();
  expect(screen).toHavePathname('/filters');
}, 120000);

test('route guards reject arrays malformed IDs and invalid chapter numbers', async () => {
  expect(novelRouteSchema.safeParse({ id: [appNovel.id], chapter: '2' }).success).toBe(false);
  expect(novelRouteSchema.safeParse({ id: appNovel.id, chapter: '-1' }).success).toBe(false);
  expect(novelRouteSchema.safeParse({ id: appNovel.id, chapter: '2x' }).success).toBe(false);
  await renderRouter(routes, { initialUrl: '/reading?id=invalid&chapter=2' });
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Obra ou capítulo inválido.'), { timeout: 10000 });
  expect(appTransport).not.toHaveBeenCalled();
}, 60000);


test('a deep link beyond the known end cannot fetch chapter text or write progress', async () => {
  await renderRouter(routes, { initialUrl: `/reading?id=${appNovel.id}&chapter=99` });
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Capítulo fora do intervalo.'), { timeout: 10000 });
  expect(appTransport.mock.calls.some(([url, init]) => url.includes('/chapters/text') || init.method === 'PATCH')).toBe(false);
}, 60000);
