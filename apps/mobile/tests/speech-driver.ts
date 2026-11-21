import type { SpeechDriver, Utterance, Voice } from '@core/tts-service';

export function voice(identifier: string, language: string): Voice {
  return { identifier, language, name: identifier, quality: 'Default' };
}

export function speechDriver(voices: Voice[] = []) {
  const utterances: { text: string; options: Utterance }[] = [];
  const driver: SpeechDriver = {
    speak: jest.fn((text, options) => { utterances.push({ text, options }); }),
    stop: jest.fn(async () => {}),
    voices: jest.fn(async () => voices),
  };
  const current = () => {
    const value = utterances.at(-1);
    if (!value) throw new Error('Expected an utterance');
    return value;
  };
  return { driver, utterances, current };
}

export function flushSpeech(): Promise<void> {
  return new Promise(resolve => setImmediate(resolve));
}

export function deferredStop() {
  let release = () => {};
  const promise = new Promise<void>(resolve => { release = resolve; });
  return { promise, release: () => release() };
}
