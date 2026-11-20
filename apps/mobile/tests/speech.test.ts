import { availableVoices, createSpeechPlayer, defaultVoice, groupedVoices, splitSentences } from '@core/tts-service';
import { speechDriver, voice } from './speech-driver';

const text = 'Primeira frase. Segunda frase! Terceira frase?';

test('segments punctuation and whitespace as observed without changing sentence content', () => {
  expect(splitSentences('  Um.\n Dois!   Três? Quatro…\n Cinco sem ponto  ')).toEqual(['Um.', 'Dois!', 'Três?', 'Quatro…', 'Cinco sem ponto']);
  expect(splitSentences('')).toEqual([]);
  expect(splitSentences('   \n ')).toEqual([]);
  expect(splitSentences('Um.Sem espaço.')).toEqual(['Um.Sem espaço.']);
});

test('chains sentences with progress and finishes exactly once', () => {
  const fake = speechDriver();
  const onSentence = jest.fn();
  const onEnd = jest.fn();
  const onStatus = jest.fn();
  const player = createSpeechPlayer(text, fake.driver, { onSentence, onEnd, onStatus });
  player.play();
  expect(fake.current().text).toBe('Primeira frase.');
  expect(player.status).toBe('speaking');
  fake.current().options.onDone();
  expect(fake.current().text).toBe('Segunda frase!');
  fake.current().options.onDone();
  const last = fake.current().options;
  last.onDone(); last.onDone();
  expect(onSentence.mock.calls).toEqual([[0, 3], [1, 3], [2, 3]]);
  expect(player.status).toBe('stopped');
  expect(onStatus.mock.calls).toEqual([['speaking'], ['stopped']]);
  expect(onEnd).toHaveBeenCalledTimes(1);
});

test('empty text finishes without invoking native speech', () => {
  const fake = speechDriver();
  const onEnd = jest.fn();
  createSpeechPlayer('', fake.driver, { onEnd }).play();
  expect(fake.driver.speak).not.toHaveBeenCalled();
  expect(onEnd).toHaveBeenCalledTimes(1);
});

test('simulates pause with stop and resumes the current sentence from its beginning', async () => {
  const fake = speechDriver();
  const player = createSpeechPlayer(text, fake.driver);
  player.play();
  fake.current().options.onDone();
  const pausedUtterance = fake.current();
  await player.pause();
  pausedUtterance.options.onStopped(); pausedUtterance.options.onDone();
  expect(player.sentenceIndex).toBe(1);
  expect(player.status).toBe('paused');
  expect(fake.driver.stop).toHaveBeenCalledTimes(1);
  player.resume();
  expect(fake.current().text).toBe(pausedUtterance.text);
  expect(fake.utterances).toHaveLength(3);
});

test('stop resets position and play starts again at the first sentence', async () => {
  const fake = speechDriver();
  const player = createSpeechPlayer(text, fake.driver);
  player.play(); fake.current().options.onDone();
  await player.stop();
  expect(player.sentenceIndex).toBe(0);
  expect(player.status).toBe('stopped');
  player.play();
  expect(fake.current().text).toBe('Primeira frase.');
  player.play();
  expect(fake.utterances).toHaveLength(3);
});

test('voice and speed changes replay the same sentence with new options', async () => {
  const fake = speechDriver();
  const player = createSpeechPlayer(text, fake.driver);
  player.configure({ rate: 1, voice: 'pt-old' });
  player.play();
  fake.current().options.onDone();
  const old = fake.current().options;
  await player.applyConfig({ rate: 1.5, voice: 'pt-new' });
  expect(fake.current()).toMatchObject({ text: 'Segunda frase!', options: { rate: 1.5, voice: 'pt-new' } });
  old.onDone();
  expect(player.sentenceIndex).toBe(1);
  expect(fake.utterances).toHaveLength(3);
});

test('configuration while paused affects resume without speaking early', async () => {
  const fake = speechDriver();
  const player = createSpeechPlayer(text, fake.driver);
  player.play(); await player.pause();
  await player.applyConfig({ rate: 0.75 });
  expect(fake.utterances).toHaveLength(1);
  player.resume();
  expect(fake.current().options.rate).toBe(0.75);
});

test('next, previous and direct selection respect sentence bounds', async () => {
  const fake = speechDriver();
  const player = createSpeechPlayer(text, fake.driver);
  player.jumpTo(99); expect(player.sentenceIndex).toBe(2);
  player.jumpTo(-5); expect(player.sentenceIndex).toBe(0);
  player.play();
  await player.nextSentence(); expect(fake.current().text).toBe('Segunda frase!');
  await player.previousSentence(); expect(fake.current().text).toBe('Primeira frase.');
  await player.previousSentence(); expect(player.sentenceIndex).toBe(0);
  await player.pause();
  const count = fake.utterances.length;
  await player.nextSentence();
  expect(fake.utterances).toHaveLength(count);
  expect(player.sentenceIndex).toBe(1);
});

test('destroy stops speech and makes late callbacks and subsequent commands inert', async () => {
  const fake = speechDriver();
  const onEnd = jest.fn();
  const onError = jest.fn();
  const player = createSpeechPlayer(text, fake.driver, { onEnd, onError });
  player.play(); const old = fake.current().options;
  await player.destroy();
  old.onDone(); old.onError(new Error('Late native error'));
  player.play(); player.resume(); await player.applyConfig({ rate: 2 }); await player.nextSentence();
  expect(fake.utterances).toHaveLength(1);
  expect(onEnd).not.toHaveBeenCalled(); expect(onError).not.toHaveBeenCalled();
});

test('reports native speech errors with a fixed message and stops the player', () => {
  const fake = speechDriver();
  const onError = jest.fn();
  const player = createSpeechPlayer(text, fake.driver, { onError });
  player.play();
  fake.current().options.onError(new Error('Sensitive native diagnostic'));
  expect(player.status).toBe('stopped');
  expect(onError).toHaveBeenCalledWith(new Error('Não foi possível reproduzir a fala. Confira a voz instalada.'));
});

test('rejects nonfinite or nonpositive voice rates', () => {
  const fake = speechDriver();
  const player = createSpeechPlayer(text, fake.driver);
  for (const rate of [0, -1, NaN, Infinity]) expect(() => player.configure({ rate })).toThrow();
  expect(fake.driver.speak).not.toHaveBeenCalled();
});

test('groups installed voices with PT-BR, PT-PT and other PT variants first', async () => {
  const voices = [voice('English', 'en-US'), voice('Portugal', 'pt-PT'), voice('Unknown', 'sw-KE'), voice('Brazil', 'pt-BR'), voice('Portuguese', 'pt-AO'), voice('Brazil 2', 'pt-BR')];
  const fake = speechDriver(voices);
  const groups = await groupedVoices(fake.driver);
  expect(groups.map(group => group.code)).toEqual(['pt-BR', 'pt-PT', 'pt-AO', 'en-US', 'sw-KE']);
  expect(groups[0]).toMatchObject({ name: 'Português (Brasil)', voices: [voices[3], voices[5]] });
  expect(groups.at(-1)?.name).toBe('sw-KE');
});

test('chooses Brazilian Portuguese, any Portuguese, first voice or system fallback', async () => {
  const en = voice('English', 'en-US'); const pt = voice('Portugal', 'pt-PT'); const br = voice('Brazil', 'PT-BR');
  await expect(defaultVoice(speechDriver([en, pt, br]).driver)).resolves.toEqual(br);
  await expect(defaultVoice(speechDriver([en, pt]).driver)).resolves.toEqual(pt);
  await expect(defaultVoice(speechDriver([en]).driver)).resolves.toEqual(en);
  await expect(defaultVoice(speechDriver().driver)).resolves.toBeNull();
});

test('voice discovery failure falls back to an empty list without persisting any selection', async () => {
  const fake = speechDriver();
  fake.driver.voices = async () => { throw new Error('Synthetic failure'); };
  await expect(availableVoices(fake.driver)).resolves.toEqual([]);
  await expect(groupedVoices(fake.driver)).resolves.toEqual([]);
  await expect(defaultVoice(fake.driver)).resolves.toBeNull();
});
