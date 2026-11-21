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

test('the player composes saved speed, voice choice, controls and completion', async () => {
  const memory = memoryFiles(); const storage = createLocalStorage(memory.files); const client = readerQueryClient();
  await storage.saveChapter(readerScope, 1, 'Primeiro capítulo.'); await storage.saveChapter(readerScope, 2, 'Segundo capítulo.');
  const fake = speechDriver([voice('Voz PT', 'pt-BR'), voice('Voz alternativa', 'pt-BR'), voice('Voz Portugal', 'pt-PT'), voice('Voz EUA', 'en-US'), voice('Voz Reino Unido', 'en-GB')]);
  const request = createHttpResource({ baseUrl: () => 'https://api.example', transport: async (url, init) => {
    if (url.endsWith('/settings')) return jsonResponse({ speed: 2.25, updated_at: '2026-11-20T00:00:00Z' });
    expect(init.method).toBe('PATCH'); return jsonResponse(readerNovel);
  } });
  const services = { storage, request, driver: fake.driver, session: createSpeechSession(fake.driver) };
  try {
    await render(<QueryClientProvider client={client}><SpeechScreen novel={{ ...readerNovel, total_chapters: 2 }} services={services} /></QueryClientProvider>);
    await screen.findByText('Velocidade: 2x');
    expect(screen.queryByRole('button', { name: '2.25x' })).toBeNull();
    await screen.findByRole('button', { name: 'Voz: Voz PT' });
    await fireEvent.press(screen.getByRole('button', { name: 'Reproduzir' }));
    await waitFor(() => expect(fake.current().options).toMatchObject({ rate: 2, voice: 'Voz PT' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Pausar' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Retomar' }));
    await fireEvent.press(screen.getByRole('button', { name: '1.75x' }));
    await waitFor(() => expect(fake.current().options.rate).toBe(1.75));
    await fireEvent.press(screen.getByRole('button', { name: 'Voz: Voz PT' }));
    const languages = screen.getAllByRole('button', { expanded: false }).map(button => button.props.accessibilityLabel);
    expect(languages).toEqual(['Português (Brasil)', 'Inglês (Estados Unidos)']);
    expect(screen.queryByRole('button', { name: 'Voz alternativa (Default)' })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Inglês (Estados Unidos)' }));
    expect(screen.getByRole('button', { name: 'Voz EUA (Default)' })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Voz Reino Unido (Default)' })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Português (Brasil)' }));
    expect(screen.queryByRole('button', { name: 'Voz EUA (Default)' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Voz Portugal (Default)' })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Voz alternativa (Default)' }));
    await waitFor(() => expect(fake.current().options.voice).toBe('Voz alternativa'));
    expect(screen.queryByRole('button', { name: 'Mostrar status/log' })).toBeNull();
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

test('the player lists languages enabled in device preferences after the main languages', async () => {
  const storage = createLocalStorage(memoryFiles().files); const client = readerQueryClient();
  await storage.savePreferences({ extraVoiceLocales: ['en-gb', 'pt-pt'] });
  const fake = speechDriver([voice('Voz Reino Unido', 'en-GB'), voice('Voz EUA', 'en-US'), voice('Voz Portugal', 'pt-PT'), voice('Voz PT', 'pt-BR')]);
  const request = createHttpResource({ baseUrl: () => 'https://api.example', transport: async () => jsonResponse({ speed: 1, updated_at: '2026-11-20T00:00:00Z' }) });
  try {
    await render(<QueryClientProvider client={client}><SpeechScreen novel={readerNovel} services={{ storage, request, driver: fake.driver, session: createSpeechSession(fake.driver) }} /></QueryClientProvider>);
    await fireEvent.press(await screen.findByRole('button', { name: 'Voz: Voz PT' }));
    expect(await screen.findByRole('button', { name: 'Inglês (Reino Unido)' })).toBeOnTheScreen();
    const languages = screen.getAllByRole('button', { expanded: false }).map(button => button.props.accessibilityLabel);
    expect(languages.slice(0, 2)).toEqual(['Português (Brasil)', 'Inglês (Estados Unidos)']);
    expect(languages.slice(2).sort()).toEqual(['Inglês (Reino Unido)', 'Português (Portugal)']);
    await screen.unmount();
  } finally { client.clear(); }
});
