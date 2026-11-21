import type { QueryClient } from '@tanstack/react-query';
import { chapterSchema, speedSchema, type Novel } from '@core/api/schemas';
import { initialSpeechChapter } from '@core/initial-speech-chapter';
import { activeSource, sourceChapterUrl } from '@core/chapter-source';
import { chapterAvailable } from '@core/connectivity';
import { keys } from '@core/keys';
import { textModeSchema, type TextMode } from '@core/text-mode';
import { apiQueries, apiMutations } from '@core/queries';
import { createSpeechSession, type SpeechDriver, type SpeechPlayer } from '@core/tts-service';
import type { ReaderServices } from '@features/reader/reader-data';

export type PlaybackSnapshot = {
  mode: TextMode;
  chapter: number; status: 'idle' | 'loading' | 'playing' | 'paused' | 'error';
  index: number; total: number; rate: number | null; voiceId: string | null;
  log: string; error: string | null; finished: boolean;
};
export type PlaybackDependencies = ReaderServices & {
  client: QueryClient; driver: SpeechDriver; session: ReturnType<typeof createSpeechSession>;
  defaults: () => { rate: number; voiceId: string | null };
  offline: () => boolean; downloaded: () => readonly number[];
};
export function createPlaybackController(novel: Novel, dependencies: PlaybackDependencies, explicitChapter?: number, initialMode: TextMode = 'translated') {
  const source = activeSource(novel);
  const maximum = novel.total_chapters ?? source?.total_chapters ?? (source?.chapter_ids?.length || null);
  let snapshot: PlaybackSnapshot = { mode: textModeSchema.parse(initialMode), chapter: chapterSchema.parse(initialSpeechChapter(novel, explicitChapter)), status: 'idle', index: 0, total: 0, rate: null, voiceId: null, log: '', error: null, finished: false };
  const listeners = new Set<() => void>();
  let player: SpeechPlayer | null = null;
  let generation = 0;
  let closed = false;
  function update(patch: Partial<PlaybackSnapshot>) {
    if (closed) return;
    snapshot = { ...snapshot, ...patch }; for (const listener of listeners) listener();
  }
  function available(chapter: number, mode: TextMode = snapshot.mode) {
    if (chapter < 1 || !Number.isInteger(chapter)) return false;
    const url = source ? sourceChapterUrl(source, chapter) : null;
    const chapters = mode === 'original'
      ? new Set(url && source && dependencies.client.getQueryData(keys.chapter({ novelId: novel.id, sourceId: source.id }, url, chapter, mode)) !== undefined ? [chapter] : [])
      : new Set(dependencies.downloaded());
    return source !== null && (maximum === null || chapter <= maximum) && chapterAvailable(dependencies.offline(), chapters, chapter);
  }
  function failure(error: unknown) {
    update({ status: 'error', error: error instanceof Error ? error.message : 'Não foi possível reproduzir o capítulo.', log: 'Falha na reprodução.' });
  }
  async function start(chapter = snapshot.chapter) {
    if (closed) return;
    if (!available(chapter)) { failure(new Error(`Capítulo ${chapter} não disponível.`)); return; }
    const mode = snapshot.mode;
    const ticket = ++generation;
    const active = () => !closed && ticket === generation;
    update({ chapter, status: 'loading', index: 0, total: 0, error: null, finished: false, log: `Carregando texto do capítulo ${chapter}...` });
    try {
      await player?.destroy(); player = null;
      if (!active() || !source) return;
      const url = sourceChapterUrl(source, chapter);
      if (!url) throw new Error(`Capítulo ${chapter} não disponível nesta fonte.`);
      const data = await dependencies.client.fetchQuery({ ...apiQueries(dependencies.request, dependencies.storage).chapter({ novelId: novel.id, sourceId: source.id }, url, chapter, mode), staleTime: Infinity });
      if (!active()) return;
      const defaults = dependencies.defaults();
      const next = await dependencies.session.replace(data.text, {
        onStatus: status => { if (active()) update({ status: status === 'speaking' ? 'playing' : status === 'paused' ? 'paused' : 'idle' }); },
        onSentence: (index, total) => { if (active()) update({ index, total }); },
        onError: error => { if (active()) failure(error); },
        onEnd: () => {
          if (!active()) return;
          if (maximum !== null && chapter >= maximum) { update({ status: 'idle', finished: true, log: 'Você chegou ao último capítulo disponível.' }); return; }
          if (!available(chapter + 1)) { update({ status: 'idle', log: 'Próximo capítulo não disponível.' }); return; }
          void start(chapter + 1);
        },
      }, { rate: snapshot.rate ?? defaults.rate, ...((snapshot.voiceId ?? defaults.voiceId) ? { voice: snapshot.voiceId ?? defaults.voiceId ?? undefined } : {}) });
      if (!next) return;
      if (!active()) { await next.destroy(); return; }
      player = next;
      update({ log: `Lendo capítulo ${chapter}${maximum === null ? '' : ` de ${maximum}`}` });
      await next.play();
      if (!active()) return;
      const options = apiMutations(dependencies.client, dependencies.request).progress();
      void dependencies.client.getMutationCache().build(dependencies.client, options).execute({ id: novel.id, chapter }).catch(() => {
        if (active()) update({ log: 'Texto disponível; não foi possível sincronizar o progresso.' });
      });
    } catch (error) { if (active()) failure(error); }
  }
  return {
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    getSnapshot: () => snapshot,
    available, maximum,
    open() { closed = false; },
    async destroy() { closed = true; generation += 1; await player?.destroy(); player = null; },
    start,
    async toggle() {
      try {
        if (snapshot.status === 'playing') { await player?.pause(); update({ log: 'Pausado.' }); }
        else if (snapshot.status === 'paused') { await player?.resume(); update({ log: 'Retomando.' }); }
        else if (snapshot.status !== 'loading') await start();
      } catch (error) { failure(error); }
    },
    async setMode(mode: TextMode) {
      if (closed || mode === snapshot.mode) return;
      const selected = textModeSchema.parse(mode);
      generation += 1;
      const previous = player; player = null;
      update({ mode: selected, status: 'idle', index: 0, total: 0, error: null, finished: false, log: selected === 'original' ? 'Texto original selecionado.' : 'Tradução para português selecionada.' });
      try { await previous?.destroy(); } catch (error) { failure(error); }
    },
    async setRate(rate: number) {
      try { const parsed = speedSchema.parse({ speed: rate }); update({ rate: parsed.speed }); await player?.applyConfig({ rate: parsed.speed }); }
      catch (error) { failure(error); }
    },
    async setVoice(voiceId: string) {
      update({ voiceId });
      try { await player?.applyConfig({ voice: voiceId }); } catch (error) { failure(error); }
    },
    dismissEnd() { update({ finished: false }); },
  };
}
