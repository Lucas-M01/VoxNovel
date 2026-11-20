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

export function createSpeechPlayer(text: string, driver: SpeechDriver, callbacks: SpeechCallbacks = {}) {
  const sentences = splitSentences(text);
  let index = 0;
  let status: SpeechStatus = 'stopped';
  let destroyed = false;
  let generation = 0;
  let config: SpeechConfig = {};
  function setStatus(value: SpeechStatus) { status = value; callbacks.onStatus?.(value); }
  function speakCurrent() {
    if (destroyed) return;
    const sentence = sentences[index];
    if (sentence === undefined) { setStatus('stopped'); callbacks.onEnd?.(); return; }
    const token = ++generation;
    const active = () => !destroyed && token === generation && status === 'speaking';
    const fail = () => {
      if (!active()) return;
      setStatus('stopped');
      callbacks.onError?.(new Error('Não foi possível reproduzir a fala. Confira a voz instalada.'));
    };
    callbacks.onSentence?.(index, sentences.length);
    try {
      driver.speak(sentence, {
        ...config,
        onDone: () => { if (active()) { index += 1; speakCurrent(); } },
        onStopped: () => { /* Pause and stop retain ownership of the position. */ },
        onError: fail,
      });
    } catch { fail(); }
  }
  return {
    configure(options: SpeechConfig) { if (!destroyed) config = { ...config, ...speechConfigSchema.parse(options) }; },
    async applyConfig(options: SpeechConfig) {
      if (destroyed) return;
      config = { ...config, ...speechConfigSchema.parse(options) };
      if (status === 'speaking') { await driver.stop(); speakCurrent(); }
    },
    play() { if (!destroyed && status !== 'speaking') { setStatus('speaking'); speakCurrent(); } },
    async pause() { if (!destroyed && status === 'speaking') { setStatus('paused'); await driver.stop(); } },
    resume() { if (!destroyed && status === 'paused') { setStatus('speaking'); speakCurrent(); } },
    async stop() {
      if (destroyed) return;
      setStatus('stopped'); await driver.stop(); index = 0;
    },
    jumpTo(position: number) {
      if (!destroyed) index = Math.max(0, Math.min(z.int().parse(position), sentences.length - 1));
    },
    async nextSentence() {
      if (destroyed) return;
      const playing = status === 'speaking';
      await driver.stop(); index = Math.min(index + 1, Math.max(0, sentences.length - 1));
      if (playing) speakCurrent();
    },
    async previousSentence() {
      if (destroyed) return;
      const playing = status === 'speaking';
      await driver.stop(); index = Math.max(0, index - 1);
      if (playing) speakCurrent();
    },
    async destroy() { if (!destroyed) { destroyed = true; await driver.stop(); } },
    get status() { return status; },
    get sentenceIndex() { return index; },
    get totalSentences() { return sentences.length; },
    get sentences(): readonly string[] { return sentences; },
  };
}

export type SpeechPlayer = ReturnType<typeof createSpeechPlayer>;

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
