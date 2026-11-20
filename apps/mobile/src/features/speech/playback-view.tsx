import { useState, useSyncExternalStore } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Novel } from '@core/api/schemas';
import { activeSource } from '@core/chapter-source';
import { getConnectivity, useConnectivity } from '@core/connectivity';
import { localChaptersOptions } from '@core/local-queries';
import { nativeSpeech, speechSession } from '@core/native-speech';
import { apiQueries } from '@core/queries';
import { readerServices, type ReaderServices } from '@features/reader/reader-data';
import type { SpeechDriver, createSpeechSession } from '@core/tts-service';
import { createPlaybackController } from '@features/speech/playback-controller';
import { speechVoicesOptions } from '@features/speech/speech-queries';
import { VoicePicker } from '@features/speech/voice-picker';
import { usePlaybackLifecycle } from '@features/speech/use-playback-lifecycle';
import { ChapterNavigation } from '@features/reader/chapter-navigation';
import { OfflineNotice } from '@pattern/offline-notice';
import { Button } from '@ui/button';
import { Dialog } from '@ui/dialog';
import { ErrorMessage } from '@ui/error-message';
import { ProgressBar } from '@ui/progress-bar';

export type PlaybackServices = ReaderServices & { driver: SpeechDriver; session: ReturnType<typeof createSpeechSession> };
const defaults: PlaybackServices = { ...readerServices, driver: nativeSpeech, session: speechSession };
type Props = { novel: Novel; services?: PlaybackServices | undefined };
export function PlaybackView({ novel, services = defaults }: Props) {
  const client = useQueryClient();
  useConnectivity();
  const source = activeSource(novel);
  const scope = { novelId: novel.id, sourceId: source?.id ?? '' };
  const localOptions = localChaptersOptions(scope, services.storage);
  useQuery({ ...localOptions, enabled: source !== null });
  const settingsOptions = apiQueries(services.request, services.storage).settings();
  const settings = useQuery(settingsOptions);
  const voicesOptions = speechVoicesOptions(services.driver);
  const voices = useQuery(voicesOptions);
  const [controller] = useState(() => createPlaybackController(novel, {
    ...services, client,
    defaults: () => ({ rate: client.getQueryData(settingsOptions.queryKey)?.speed ?? 1, voiceId: client.getQueryData(voicesOptions.queryKey)?.selected?.identifier ?? null }),
    offline: () => getConnectivity() === 'offline', downloaded: () => client.getQueryData(localOptions.queryKey) ?? [],
  }));
  usePlaybackLifecycle(controller);
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  const [voicePicker, setVoicePicker] = useState(false);
  const [logs, setLogs] = useState(false);
  const rate = state.rate ?? settings.data?.speed ?? 1;
  const selectedVoice = state.voiceId ?? voices.data?.selected?.identifier ?? null;
  const voiceName = voices.data?.groups.flatMap(group => group.voices).find(voice => voice.identifier === selectedVoice)?.name ?? 'Voz padrão do sistema';
  const labels = { idle: 'Pronto', loading: 'Carregando', playing: 'Lendo', paused: 'Pausado', error: 'Erro' };
  return <ScrollView contentContainerStyle={{ padding: 24, gap: 12, backgroundColor: '#0F0F1A', flexGrow: 1 }}>
    <Text accessibilityRole="header" style={{ color: '#FFFFFF', fontSize: 18 }}>{novel.title}</Text>
    <Text style={{ color: '#CCCCCC' }}>Capítulo {state.chapter} · {labels[state.status]}</Text>
    <OfflineNotice mode="speech" />
    {state.error ? <ErrorMessage message={state.error} onRetry={() => { void controller.start(); }} /> : null}
    <ChapterNavigation chapter={state.chapter} total={controller.maximum} available={chapter => state.status !== 'loading' && controller.available(chapter)} onSelect={chapter => { void controller.start(chapter); }} />
    <ProgressBar label="Progresso da fala" current={state.total ? state.index + 1 : 0} total={state.total} />
    <Text style={{ color: '#CCCCCC' }}>Frase {state.total ? state.index + 1 : 0}/{state.total}</Text>
    <Button title={state.status === 'playing' ? 'Pausar' : state.status === 'paused' ? 'Retomar' : 'Reproduzir'} busy={state.status === 'loading'} disabled={state.status === 'idle' && !controller.available(state.chapter)} onPress={() => { void controller.toggle(); }} />
    <Button title={`Voz: ${voiceName}`} onPress={() => setVoicePicker(true)} />
    <Text style={{ color: '#CCCCCC' }}>Velocidade: {rate}x</Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{[1, 1.25, 1.5, 1.75, 2, 2.25].map(value =>
      <Button key={value} title={`${value}x`} selected={rate === value} onPress={() => { void controller.setRate(value); }} />
    )}</View>
    <Button title={logs ? 'Ocultar status/log' : 'Mostrar status/log'} onPress={() => setLogs(value => !value)} />
    {logs ? <Text selectable style={{ color: '#CCCCCC' }}>{state.log || 'Nenhuma mensagem.'}</Text> : null}
    <VoicePicker visible={voicePicker} onClose={() => setVoicePicker(false)} groups={voices.data?.groups ?? []} selected={selectedVoice} onSelect={voice => { void controller.setVoice(voice); }} />
    <Dialog title="Fim!" visible={state.finished} onClose={controller.dismissEnd}><Text style={{ color: '#FFFFFF' }}>Você chegou ao último capítulo disponível.</Text></Dialog>
  </ScrollView>;
}
