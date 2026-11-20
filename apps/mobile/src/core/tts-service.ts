import { z } from 'zod';

export const voiceSchema = z.object({ identifier: z.string(), name: z.string(), language: z.string(), quality: z.enum(['Default', 'Enhanced']) });
export type Voice = z.infer<typeof voiceSchema>;
const speechConfigSchema = z.object({
  rate: z.number().positive().optional(), pitch: z.number().positive().optional(),
  voice: z.string().optional(), language: z.string().optional(),
});
export type SpeechConfig = z.infer<typeof speechConfigSchema>;
export type SpeechStatus = 'stopped' | 'speaking' | 'paused';
export type Utterance = SpeechConfig & { onDone: () => void; onStopped: () => void; onError: (error: unknown) => void };
export type SpeechDriver = {
  speak: (text: string, options: Utterance) => void;
  stop: () => Promise<void>;
  voices: () => Promise<Voice[]>;
};
export type SpeechCallbacks = {
  onSentence?: (index: number, total: number) => void;
  onStatus?: (status: SpeechStatus) => void;
  onEnd?: () => void;
  onError?: (error: Error) => void;
};

export function splitSentences(text: string): string[] {
  return text.split(/(?<=[.!?…])\s+/u).map(sentence => sentence.trim()).filter(Boolean);
}

function createPlayer(text: string, driver: SpeechDriver, callbacks: SpeechCallbacks = {}) {
  const sentences = splitSentences(text);
  let index = 0;
  let status: SpeechStatus = 'stopped';
  let destroyed = false;
  let generation = 0;
  let config: SpeechConfig = {};
  let tail = Promise.resolve();
  let destruction: Promise<void> | undefined;
  let shutdownFailed = false;
  function enqueue(action: () => void | Promise<void>): Promise<void> {
    const result = tail.then(action);
    tail = result.catch(() => {});
    return result;
  }
  function setStatus(value: SpeechStatus) { status = value; callbacks.onStatus?.(value); }
  const message = () => new Error('Não foi possível reproduzir a fala. Confira a voz instalada.');
  async function shutdown() {
    try { await driver.stop(); shutdownFailed = false; }
    catch { shutdownFailed = true; if (!destroyed) setStatus('stopped'); throw message(); }
  }
  function invalidate() { destroyed = true; generation += 1; }
  function speakCurrent() {
    if (destroyed || status !== 'speaking') return;
    const sentence = sentences[index];
    if (sentence === undefined) { setStatus('stopped'); callbacks.onEnd?.(); return; }
    const token = ++generation;
    let consumed = false;
    const active = () => !destroyed && token === generation && status === 'speaking';
    const fail = () => {
      if (!active() || consumed) return;
      consumed = true;
      setStatus('stopped'); callbacks.onError?.(message());
    };
    callbacks.onSentence?.(index, sentences.length);
    if (!active()) return;
    try {
      driver.speak(sentence, {
        ...config,
        onDone: () => {
          if (!active() || consumed) return;
          consumed = true;
          void enqueue(() => { if (active()) { index += 1; speakCurrent(); } }).catch(() => {
            if (!destroyed) { setStatus('stopped'); callbacks.onError?.(message()); }
          });
        },
        onStopped: () => {},
        onError: fail,
      });
    } catch { fail(); }
  }
  function replay(action: () => void): Promise<void> {
    if (destroyed) return Promise.resolve();
    const ticket = ++generation;
    action();
    return enqueue(async () => {
      if (destroyed) return;
      await shutdown();
      if (!destroyed && ticket === generation && status === 'speaking') speakCurrent();
    });
  }
  function destroy(): Promise<void> {
    if (!destruction) { invalidate(); destruction = enqueue(shutdown); }
    return destruction;
  }
  const player = {
    configure(options: SpeechConfig) { if (!destroyed) config = { ...config, ...speechConfigSchema.parse(options) }; },
    applyConfig(options: SpeechConfig): Promise<void> {
      if (destroyed) return Promise.resolve();
      const parsed = speechConfigSchema.parse(options);
      if (status !== 'speaking') { config = { ...config, ...parsed }; return Promise.resolve(); }
      return replay(() => { config = { ...config, ...parsed }; });
    },
    play(): Promise<void> {
      if (destroyed || status === 'speaking') return Promise.resolve();
      const ticket = ++generation;
      setStatus('speaking');
      return enqueue(async () => {
        if (destroyed || ticket !== generation || status !== 'speaking') return;
        if (shutdownFailed) await shutdown();
        if (!destroyed && ticket === generation && status === 'speaking') speakCurrent();
      });
    },
    pause(): Promise<void> {
      if (destroyed || status !== 'speaking') return Promise.resolve();
      generation += 1; setStatus('paused');
      return enqueue(shutdown);
    },
    resume(): Promise<void> { return status === 'paused' ? player.play() : Promise.resolve(); },
    stop(): Promise<void> {
      if (destroyed) return Promise.resolve();
      generation += 1; index = 0; setStatus('stopped');
      return enqueue(shutdown);
    },
    jumpTo(position: number): Promise<void> {
      if (destroyed) return Promise.resolve();
      const next = Math.max(0, Math.min(z.int().parse(position), sentences.length - 1));
      if (status === 'speaking') return replay(() => { index = next; });
      generation += 1; index = next; return Promise.resolve();
    },
    nextSentence(): Promise<void> { return replay(() => { index = Math.min(index + 1, Math.max(0, sentences.length - 1)); }); },
    previousSentence(): Promise<void> { return replay(() => { index = Math.max(0, index - 1); }); },
    destroy,
    get status() { return status; },
    get sentenceIndex() { return index; },
    get totalSentences() { return sentences.length; },
    get sentences(): readonly string[] { return sentences; },
  };
  return { player, invalidate };
}

export function createSpeechPlayer(text: string, driver: SpeechDriver, callbacks: SpeechCallbacks = {}) {
  return createPlayer(text, driver, callbacks).player;
}
export type SpeechPlayer = ReturnType<typeof createSpeechPlayer>;

export function createSpeechSession(driver: SpeechDriver) {
  let current: ReturnType<typeof createPlayer> | null = null;
  let generation = 0;
  let tail: Promise<unknown> = Promise.resolve();
  function enqueue<T>(action: () => Promise<T>): Promise<T> {
    const result = tail.then(action);
    tail = result.catch(() => {});
    return result;
  }
  async function shutdown() {
    const old = current;
    current = null;
    if (old) await old.player.destroy();
    else {
      try { await driver.stop(); }
      catch { throw new Error('Não foi possível encerrar a fala anterior. Tente novamente.'); }
    }
  }
  return {
    replace(text: string, callbacks: SpeechCallbacks = {}, options: SpeechConfig = {}): Promise<SpeechPlayer | null> {
      const config = speechConfigSchema.parse(options);
      const ticket = ++generation;
      current?.invalidate();
      return enqueue(async () => {
        await shutdown();
        if (ticket !== generation) return null;
        const next = createPlayer(text, driver, callbacks);
        next.player.configure(config);
        current = next;
        return next.player;
      });
    },
    stop(): Promise<void> {
      generation += 1; current?.invalidate();
      return enqueue(shutdown);
    },
  };
}

export async function availableVoices(driver: SpeechDriver): Promise<Voice[]> {
  try { return z.array(voiceSchema).parse(await driver.voices()); }
  catch { return []; }
}

export async function defaultVoice(driver: SpeechDriver): Promise<Voice | null> {
  const voices = await availableVoices(driver);
  return voices.find(voice => voice.language.toLowerCase() === 'pt-br') ??
    voices.find(voice => voice.language.toLowerCase().startsWith('pt')) ?? voices[0] ?? null;
}

type VoiceGroup = { code: string; name: string; voices: Voice[] };
const languageNames: Record<string, string> = {
  'pt-br': 'Português (Brasil)', 'pt-pt': 'Português (Portugal)', pt: 'Português',
  'en-us': 'Inglês (Estados Unidos)', 'en-gb': 'Inglês (Reino Unido)', 'en-au': 'Inglês (Austrália)', 'en-in': 'Inglês (Índia)', en: 'Inglês',
  'es-es': 'Espanhol (Espanha)', 'es-mx': 'Espanhol (México)', 'es-us': 'Espanhol (EUA)', es: 'Espanhol',
  'fr-fr': 'Francês (França)', 'fr-ca': 'Francês (Canadá)', fr: 'Francês',
  'de-de': 'Alemão (Alemanha)', de: 'Alemão', 'it-it': 'Italiano (Itália)', it: 'Italiano',
};
const languageLabels: [string, string][] = [
  ['ja', 'Japonês'], ['ko', 'Coreano'], ['ru', 'Russo'], ['nl', 'Holandês'], ['sv', 'Sueco'], ['pl', 'Polonês'], ['tr', 'Turco'], ['ar', 'Árabe'], ['hi', 'Hindi'], ['th', 'Tailandês'], ['vi', 'Vietnamita'], ['id', 'Indonésio'], ['el', 'Grego'], ['cs', 'Tcheco'], ['da', 'Dinamarquês'], ['fi', 'Finlandês'], ['no', 'Norueguês'], ['ro', 'Romeno'], ['hu', 'Húngaro'], ['uk', 'Ucraniano'],
];
const regionCodes: Record<string, string> = { ja: 'jp', ko: 'kr', ru: 'ru', nl: 'nl', sv: 'se', pl: 'pl', tr: 'tr', ar: 'sa', hi: 'in', th: 'th', vi: 'vn', id: 'id', el: 'gr', cs: 'cz', da: 'dk', fi: 'fi', no: 'no', ro: 'ro', hu: 'hu', uk: 'ua' };
for (const [code, label] of languageLabels) {
  languageNames[code] = label;
  languageNames[`${code}-${regionCodes[code]}`] = label;
}
languageNames['zh-cn'] = 'Chinês (Simplificado)'; languageNames['zh-tw'] = 'Chinês (Tradicional)'; languageNames.zh = 'Chinês';

function priority(code: string) {
  const value = code.toLowerCase();
  return value === 'pt-br' ? 0 : value === 'pt-pt' ? 1 : value.startsWith('pt') ? 2 : 3;
}
export async function groupedVoices(driver: SpeechDriver): Promise<VoiceGroup[]> {
  const groups = new Map<string, VoiceGroup>();
  for (const voice of await availableVoices(driver)) {
    const code = voice.language || '??';
    let group = groups.get(code);
    if (!group) { group = { code, name: languageNames[code.toLowerCase()] ?? code, voices: [] }; groups.set(code, group); }
    group.voices.push(voice);
  }
  return [...groups.values()].sort((a, b) => priority(a.code) - priority(b.code) || (priority(a.code) === 3 ? a.name.localeCompare(b.name) : 0));
}
