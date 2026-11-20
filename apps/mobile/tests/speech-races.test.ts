import { createSpeechPlayer, createSpeechSession } from '@core/tts-service';
import { deferredStop, flushSpeech, speechDriver } from './speech-driver';

const text = 'Primeira. Segunda. Terceira.';

test('invalidates callbacks as soon as configuration changes, before native stop resolves', async () => {
  const fake = speechDriver();
  const player = createSpeechPlayer(text, fake.driver);
  await player.play();
  const old = fake.current().options;
  const stop = deferredStop();
  fake.driver.stop = jest.fn(() => stop.promise);
  const changing = player.applyConfig({ rate: 2 });
  await flushSpeech();
  old.onDone(); old.onError(new Error('Late callback'));
  expect(player.sentenceIndex).toBe(0);
  expect(fake.utterances).toHaveLength(1);
  stop.release(); await changing;
  expect(fake.current()).toMatchObject({ text: 'Primeira.', options: { rate: 2 } });
  expect(fake.utterances).toHaveLength(2);
});

test('serializes rapid configuration changes and only replays the latest request', async () => {
  const fake = speechDriver();
  const player = createSpeechPlayer(text, fake.driver);
  await player.play();
  const stop = deferredStop();
  let calls = 0; let active = 0; let maximum = 0;
  fake.driver.stop = jest.fn(async () => {
    calls += 1; active += 1; maximum = Math.max(maximum, active);
    if (calls === 1) await stop.promise;
    active -= 1;
  });
  const first = player.applyConfig({ rate: 1.25 });
  const second = player.applyConfig({ voice: 'pt-new', rate: 1.5 });
  await flushSpeech();
  expect(calls).toBe(1);
  stop.release(); await Promise.all([first, second]);
  expect(maximum).toBe(1);
  expect(fake.utterances).toHaveLength(2);
  expect(fake.current().options).toMatchObject({ voice: 'pt-new', rate: 1.5 });
});

test('pause and resume during a pending cancellation wait before speaking again', async () => {
  const fake = speechDriver();
  const player = createSpeechPlayer(text, fake.driver);
  await player.play();
  const old = fake.current().options;
  const stop = deferredStop(); let calls = 0;
  fake.driver.stop = jest.fn(async () => { if (++calls === 1) await stop.promise; });
  const changing = player.applyConfig({ rate: 2 });
  const pause = player.pause();
  const resume = player.resume();
  await flushSpeech(); old.onDone();
  expect(fake.utterances).toHaveLength(1);
  stop.release(); await Promise.all([changing, pause, resume]);
  expect(fake.current().text).toBe('Primeira.');
  expect(fake.utterances).toHaveLength(2);
});

test('next and previous requests ignore completion of the cancelled utterance', async () => {
  const fake = speechDriver();
  const player = createSpeechPlayer(text, fake.driver);
  await player.play();
  const old = fake.current().options;
  const stop = deferredStop(); let calls = 0;
  fake.driver.stop = jest.fn(async () => { if (++calls === 1) await stop.promise; });
  const next = player.nextSentence();
  const previous = player.previousSentence();
  old.onDone();
  stop.release(); await Promise.all([next, previous]);
  expect(player.sentenceIndex).toBe(0);
  expect(fake.utterances).toHaveLength(2);
  expect(fake.current().text).toBe('Primeira.');
});

test('duplicate completion and error callbacks are consumed once', async () => {
  const fake = speechDriver(); const onEnd = jest.fn(); const onError = jest.fn();
  const player = createSpeechPlayer('Uma frase.', fake.driver, { onEnd, onError });
  await player.play();
  const callback = fake.current().options;
  callback.onDone(); callback.onDone(); callback.onError(new Error('Late error'));
  await flushSpeech();
  expect(onEnd).toHaveBeenCalledTimes(1);
  expect(onError).not.toHaveBeenCalled();
  expect(player.sentenceIndex).toBe(1);
});

test('destroy during cancellation prevents replay and is idempotent', async () => {
  const fake = speechDriver(); const onEnd = jest.fn();
  const player = createSpeechPlayer(text, fake.driver, { onEnd });
  await player.play(); const old = fake.current().options;
  const stop = deferredStop(); let calls = 0;
  fake.driver.stop = jest.fn(async () => { if (++calls === 1) await stop.promise; });
  const config = player.applyConfig({ rate: 2 });
  const destroyed = player.destroy();
  const again = player.destroy();
  old.onDone(); old.onError(new Error('Late error'));
  stop.release(); await Promise.all([config, destroyed, again]);
  await player.play();
  expect(fake.utterances).toHaveLength(1);
  expect(onEnd).not.toHaveBeenCalled();
  expect(calls).toBe(1);
});

test('shutdown failure is redacted and must be cleared before play can resume', async () => {
  const fake = speechDriver(); const player = createSpeechPlayer(text, fake.driver);
  await player.play();
  fake.driver.stop = jest.fn(async () => { throw new Error('Private native diagnostic'); });
  await expect(player.pause()).rejects.toThrow('Não foi possível reproduzir a fala.');
  expect(player.status).toBe('stopped');
  const stop = deferredStop(); fake.driver.stop = jest.fn(() => stop.promise);
  const restarting = player.play();
  await flushSpeech(); expect(fake.utterances).toHaveLength(1);
  stop.release(); await restarting;
  expect(fake.utterances).toHaveLength(2);
});

test('replacement waits for old shutdown and stale screen cleanup cannot stop the new chapter', async () => {
  const fake = speechDriver(); const session = createSpeechSession(fake.driver);
  const first = await session.replace('Capítulo um.');
  if (!first) throw new Error('Expected first player');
  await first.play(); const old = fake.current().options;
  const stop = deferredStop(); fake.driver.stop = jest.fn(() => stop.promise);
  const replacing = session.replace('Capítulo dois.');
  await flushSpeech();
  old.onDone();
  expect(fake.utterances).toHaveLength(1);
  stop.release(); const second = await replacing;
  if (!second) throw new Error('Expected second player');
  await second.play();
  const count = jest.mocked(fake.driver.stop).mock.calls.length;
  await first.destroy();
  expect(fake.driver.stop).toHaveBeenCalledTimes(count);
  expect(fake.current().text).toBe('Capítulo dois.');
  await second.destroy();
});

test('rapid chapter replacements create only the latest requested player', async () => {
  const fake = speechDriver(); const session = createSpeechSession(fake.driver);
  const stop = deferredStop(); let calls = 0;
  fake.driver.stop = jest.fn(async () => { if (++calls === 1) await stop.promise; });
  const first = session.replace('Descartar.');
  const second = session.replace('Conservar.');
  await flushSpeech(); stop.release();
  await expect(first).resolves.toBeNull();
  const winner = await second;
  if (!winner) throw new Error('Expected latest player');
  await winner.play();
  expect(fake.utterances.map(value => value.text)).toEqual(['Conservar.']);
  await winner.destroy();
});

test('a failed replacement creates no player and a later retry can recover', async () => {
  const fake = speechDriver(); const session = createSpeechSession(fake.driver);
  fake.driver.stop = jest.fn(async () => { throw new Error('Synthetic stop failure'); });
  await expect(session.replace('Não iniciar.')).rejects.toThrow('Não foi possível encerrar a fala anterior.');
  expect(fake.driver.speak).not.toHaveBeenCalled();
  fake.driver.stop = jest.fn(async () => {});
  const player = await session.replace('Pode iniciar.');
  if (!player) throw new Error('Expected recovered player');
  await player.play(); expect(fake.current().text).toBe('Pode iniciar.');
  await player.destroy();
});

test('unmount requested in the progress callback prevents native speak', async () => {
  const fake = speechDriver();
  const player = createSpeechPlayer(text, fake.driver, { onSentence: () => { void player.destroy(); } });
  await player.play(); await player.destroy();
  expect(fake.driver.speak).not.toHaveBeenCalled();
});
