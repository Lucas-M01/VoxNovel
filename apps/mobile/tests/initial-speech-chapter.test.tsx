import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { initialSpeechChapter } from '@core/initial-speech-chapter';
import { createSpeechSession } from '@core/tts-service';
import { createLocalStorage } from '@core/local-storage';
import { createHttpResource } from '@core/http-resource';
import SpeechScreen from '@screens/speech-screen';
import ReadingScreen from '@screens/reading-screen';
import { memoryFiles } from './local-files';
import { speechDriver } from './speech-driver';
import { jsonResponse, readerNovel, readerScope, readerQueryClient } from './reader-fixture';

jest.mock('@react-native-community/netinfo', () => jest.requireActual('@react-native-community/netinfo/jest/netinfo-mock.js'));
jest.mock('@core/native-speech', () => {
  const { createSpeechSession } = jest.requireActual<typeof import('@core/tts-service')>('@core/tts-service');
  const { speechDriver } = jest.requireActual<typeof import('./speech-driver')>('./speech-driver');
  const driver = speechDriver().driver;
  return { nativeSpeech: driver, speechSession: createSpeechSession(driver) };
});

test('explicit chapter wins, then active source progress, then novel progress', () => {
  const novel = { ...readerNovel, current_chapter: 4, sources: readerNovel.sources.map(source => ({ ...source, current_chapter: 3 })) };
  expect(initialSpeechChapter(novel, 2)).toBe(2);
  expect(initialSpeechChapter(novel)).toBe(3);
  expect(initialSpeechChapter({ ...novel, sources: [], active_source_id: null })).toBe(4);
});

test('opening the player from a selected chapter speaks and records that chapter only', async () => {
  const memory = memoryFiles(); const storage = createLocalStorage(memory.files); const client = readerQueryClient(); const fake = speechDriver();
  await storage.saveChapter(readerScope, 2, 'Capítulo escolhido.');
  const transport = jest.fn(async (url: string, init: RequestInit) => url.endsWith('/settings') ? jsonResponse({ speed: 1, updated_at: '2026-11-20T00:00:00Z' }) : (() => { expect(init.body).toBe(JSON.stringify({ chapter: 2 })); return jsonResponse(readerNovel); })());
  const services = { storage, request: createHttpResource({ baseUrl: () => 'https://api.example', transport }), driver: fake.driver, session: createSpeechSession(fake.driver) };
  try {
    await render(<QueryClientProvider client={client}><SpeechScreen novel={readerNovel} initialChapter={2} services={services} /></QueryClientProvider>);
    await fireEvent.press(screen.getByRole('button', { name: 'Reproduzir' }));
    await waitFor(() => expect(fake.current().text).toBe('Capítulo escolhido.'));
    expect(screen.getByText('Capítulo 2 · Lendo')).toBeOnTheScreen();
    await screen.unmount();
  } finally { client.clear(); }
});

test('the visual reader forwards the currently selected chapter to listening', async () => {
  const memory = memoryFiles(); const storage = createLocalStorage(memory.files); const client = readerQueryClient();
  await storage.saveChapter(readerScope, 2, 'Texto escolhido.');
  const request = createHttpResource({ baseUrl: () => 'https://api.example', transport: async (_url, init) => init.method === 'PATCH' ? jsonResponse(readerNovel) : jsonResponse({}, 503) });
  const listen = jest.fn();
  try {
    await render(<QueryClientProvider client={client}><ReadingScreen novel={readerNovel} initialChapter={2} services={{ storage, request }} onListen={listen} /></QueryClientProvider>);
    await screen.findByText('Texto escolhido.');
    await fireEvent.press(screen.getByRole('button', { name: 'Ouvir capítulo' }));
    expect(listen).toHaveBeenCalledWith(2);
    await screen.unmount();
  } finally { client.clear(); }
});

test('invalid explicit chapters are rejected before creating a player', async () => {
  const client = readerQueryClient(); const fake = speechDriver(); const memory = memoryFiles();
  const request = createHttpResource({ baseUrl: () => 'https://api.example', transport: async () => jsonResponse(readerNovel) });
  try {
    await render(<QueryClientProvider client={client}><SpeechScreen novel={readerNovel} initialChapter={0} services={{ request, storage: createLocalStorage(memory.files), driver: fake.driver, session: createSpeechSession(fake.driver) }} /></QueryClientProvider>);
    expect(screen.getByRole('alert')).toHaveTextContent('Capítulo inválido.');
    expect(fake.driver.speak).not.toHaveBeenCalled();
    await screen.unmount();
  } finally { client.clear(); }
});
