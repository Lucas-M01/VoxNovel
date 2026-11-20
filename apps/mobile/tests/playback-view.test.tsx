import { QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { createSpeechSession } from '@core/tts-service';
import { createLocalStorage } from '@core/local-storage';
import { createHttpResource } from '@core/http-resource';
import SpeechScreen from '@screens/speech-screen';
import { memoryFiles } from './local-files';
import { speechDriver, voice } from './speech-driver';
import { readerNovel, readerScope, readerQueryClient, jsonResponse } from './reader-fixture';

jest.mock('@react-native-community/netinfo', () => jest.requireActual('@react-native-community/netinfo/jest/netinfo-mock.js'));
jest.mock('@core/native-speech', () => {
  const { createSpeechSession } = jest.requireActual<typeof import('@core/tts-service')>('@core/tts-service');
  const { speechDriver } = jest.requireActual<typeof import('./speech-driver')>('./speech-driver');
  const driver = speechDriver().driver;
  return { nativeSpeech: driver, speechSession: createSpeechSession(driver) };
});

test('the player composes saved speed, voice choice, controls, completion and local status', async () => {
  const memory = memoryFiles(); const storage = createLocalStorage(memory.files); const client = readerQueryClient();
  await storage.saveChapter(readerScope, 1, 'Primeiro capítulo.'); await storage.saveChapter(readerScope, 2, 'Segundo capítulo.');
  const fake = speechDriver([voice('Voz PT', 'pt-BR'), voice('Voz alternativa', 'pt-PT')]);
  const request = createHttpResource({ baseUrl: () => 'https://api.example', transport: async (url, init) => {
    if (url.endsWith('/settings')) return jsonResponse({ speed: 1.75, updated_at: '2026-11-20T00:00:00Z' });
    expect(init.method).toBe('PATCH'); return jsonResponse(readerNovel);
  } });
  const services = { storage, request, driver: fake.driver, session: createSpeechSession(fake.driver) };
  try {
    await render(<QueryClientProvider client={client}><SpeechScreen novel={{ ...readerNovel, total_chapters: 2 }} services={services} /></QueryClientProvider>);
    await screen.findByText('Velocidade: 1.75x');
    await screen.findByRole('button', { name: 'Voz: Voz PT' });
    await fireEvent.press(screen.getByRole('button', { name: 'Reproduzir' }));
    await waitFor(() => expect(fake.current().options).toMatchObject({ rate: 1.75, voice: 'Voz PT' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Pausar' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Retomar' }));
    await fireEvent.press(screen.getByRole('button', { name: '2x' }));
    await waitFor(() => expect(fake.current().options.rate).toBe(2));
    await fireEvent.press(screen.getByRole('button', { name: 'Voz: Voz PT' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Voz alternativa (Default)' }));
    await waitFor(() => expect(fake.current().options.voice).toBe('Voz alternativa'));
    await fireEvent.press(screen.getByRole('button', { name: 'Mostrar status/log' }));
    expect(screen.getByText('Retomando.')).toBeOnTheScreen();
    await act(async () => { fake.current().options.onDone(); });
    await waitFor(() => expect(fake.current().text).toBe('Segundo capítulo.'));
    await act(async () => { fake.current().options.onDone(); });
    expect(await screen.findByRole('header', { name: 'Fim!' })).toBeOnTheScreen();
    expect(screen.getAllByText('Você chegou ao último capítulo disponível.').length).toBeGreaterThan(0);
    const previous = fake.current().options; const calls = fake.utterances.length;
    await screen.unmount(); previous.onDone();
    await act(async () => {});
    expect(fake.utterances).toHaveLength(calls);
  } finally { client.clear(); }
}, 20000);
