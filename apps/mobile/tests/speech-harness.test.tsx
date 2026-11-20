import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { nativeSpeech } from '@core/native-speech';
import SpeechHarness from '../tools/speech-harness-screen';

jest.mock('@core/native-speech', () => {
  const { createSpeechSession } = jest.requireActual<typeof import('@core/tts-service')>('@core/tts-service');
  const driver: import('@core/tts-service').SpeechDriver = {
    speak: jest.fn(), stop: jest.fn(async () => {}), voices: jest.fn(async () => []),
  };
  return { nativeSpeech: driver, speechSession: createSpeechSession(driver) };
});
jest.mock('@core/local-storage', () => {
  const actual = jest.requireActual<typeof import('@core/local-storage')>('@core/local-storage');
  const { memoryFiles } = jest.requireActual<typeof import('./local-files')>('./local-files');
  return { ...actual, localStorage: actual.createLocalStorage(memoryFiles().files) };
});
jest.mock('@core/queries', () => {
  const actual = jest.requireActual<typeof import('@core/queries')>('@core/queries');
  return { ...actual, createQueryClient: () => {
    const client = actual.createQueryClient();
    client.setDefaultOptions({ mutations: { retry: false, gcTime: Infinity } });
    return client;
  } };
});

function current() {
  const call = jest.mocked(nativeSpeech.speak).mock.calls.at(-1);
  if (!call) throw new Error('Expected native speech');
  return call;
}

jest.setTimeout(20000);

test('the private harness prepares synthetic text, changes controls, chains chapters and stops on exit', async () => {
  await render(<SpeechHarness />);
  expect(screen.getByRole('button', { name: 'Iniciar capítulo 1' })).toBeDisabled();
  await fireEvent.press(screen.getByRole('button', { name: 'Preparar dois capítulos sintéticos' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Iniciar capítulo 1' })).toBeEnabled());
  await fireEvent.press(screen.getByRole('button', { name: 'Iniciar capítulo 1' }));
  await waitFor(() => expect(nativeSpeech.speak).toHaveBeenCalled());
  expect(current()[0]).toContain('Capítulo 1');
  await fireEvent.press(screen.getByRole('button', { name: '1.25x' }));
  await waitFor(() => expect(current()[1].rate).toBe(1.25));
  await fireEvent.press(screen.getByRole('button', { name: 'Pausar' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Retomar' })).toBeEnabled());
  await fireEvent.press(screen.getByRole('button', { name: 'Retomar' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Pausar' })).toBeEnabled());
  for (let index = 0; index < 6; index += 1) {
    const count = jest.mocked(nativeSpeech.speak).mock.calls.length;
    await act(async () => { current()[1].onDone(); });
    await waitFor(() => expect(jest.mocked(nativeSpeech.speak).mock.calls.length).toBeGreaterThan(count));
  }
  await waitFor(() => expect(current()[0]).toContain('Capítulo 2'));
  const old = current()[1];
  const calls = jest.mocked(nativeSpeech.speak).mock.calls.length;
  await screen.unmount();
  await act(async () => {});
  old.onDone(); old.onError(new Error('Late callback'));
  await act(async () => {});
  expect(nativeSpeech.speak).toHaveBeenCalledTimes(calls);
  expect(nativeSpeech.stop).toHaveBeenCalled();
});
