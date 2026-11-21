import { useState, useSyncExternalStore } from 'react';
import { Image, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Novel } from '@core/api/schemas';
import type { TextMode } from '@core/text-mode';
import { activeSource } from '@core/chapter-source';
import { getConnectivity, useConnectivity } from '@core/connectivity';
import { limitSpeechRate, speechRates } from '@core/device-preferences';
import { devicePreferencesOptions, localChaptersOptions } from '@core/local-queries';
import { nativeSpeech, speechSession } from '@core/native-speech';
import { apiQueries } from '@core/queries';
import { readerServices, type ReaderServices } from '@features/reader/reader-data';
import type { SpeechDriver, createSpeechSession } from '@core/tts-service';
import { createPlaybackController } from '@features/speech/playback-controller';
import { speechVoicesOptions, voicePickerGroups } from '@features/speech/speech-queries';
import { VoicePicker } from '@features/speech/voice-picker';
import { usePlaybackLifecycle } from '@features/speech/use-playback-lifecycle';
import { ChapterJump } from '@features/reader/chapter-jump';
import { TextModeChoice } from '@features/reader/text-mode-choice';
import { OfflineNotice } from '@pattern/offline-notice';
import { Button } from '@ui/button';
import { Dialog } from '@ui/dialog';
import { ErrorMessage } from '@ui/error-message';
import { ProgressBar } from '@ui/progress-bar';
import { colors, presentation } from '@ui/presentation';

export type PlaybackServices = ReaderServices & { driver: SpeechDriver; session: ReturnType<typeof createSpeechSession> };
const defaults: PlaybackServices = { ...readerServices, driver: nativeSpeech, session: speechSession };
type Props = { novel: Novel; services?: PlaybackServices | undefined; initialChapter?: number | undefined; initialMode?: TextMode | undefined };
export function PlaybackView({ novel, services = defaults, initialChapter, initialMode }: Props) {
  const client = useQueryClient();
  const { width, height } = useWindowDimensions();
  const wide = width > height && width >= 580;
  useConnectivity();
  const source = activeSource(novel);
  const scope = { novelId: novel.id, sourceId: source?.id ?? '' };
  const localOptions = localChaptersOptions(scope, services.storage);
  useQuery({ ...localOptions, enabled: source !== null });
  const deviceOptions = devicePreferencesOptions(services.storage);
  const device = useQuery(deviceOptions);
  const settingsOptions = apiQueries(services.request, services.storage).settings();
  const settings = useQuery(settingsOptions);
  const voicesOptions = speechVoicesOptions(services.driver);
  const voices = useQuery(voicesOptions);
  const [controller] = useState(() => createPlaybackController(novel, {
    ...services, client,
    defaults: () => {
      const saved = client.getQueryData(deviceOptions.queryKey);
      const catalog = client.getQueryData(voicesOptions.queryKey);
      const voice = catalog?.groups.flatMap(group => group.voices).find(item => item.identifier === saved?.voiceId);
      return { rate: limitSpeechRate(saved?.speechRate ?? client.getQueryData(settingsOptions.queryKey)?.speed ?? 1), voiceId: voice?.identifier ?? catalog?.selected?.identifier ?? null };
    },
    offline: () => getConnectivity() === 'offline', downloaded: () => client.getQueryData(localOptions.queryKey) ?? [],
  }, initialChapter, initialMode));
  usePlaybackLifecycle(controller);
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  const [voicePicker, setVoicePicker] = useState(false);
  const rate = limitSpeechRate(state.rate ?? device.data?.speechRate ?? settings.data?.speed ?? 1);
  const preferredVoice = voices.data?.groups.flatMap(group => group.voices).find(voice => voice.identifier === device.data?.voiceId);
  const selectedVoice = state.voiceId ?? preferredVoice?.identifier ?? voices.data?.selected?.identifier ?? null;
  const voiceName = voices.data?.groups.flatMap(group => group.voices).find(voice => voice.identifier === selectedVoice)?.name ?? 'Voz padrão do sistema';
  const labels = { idle: 'Pronto', loading: 'Carregando', playing: 'Lendo', paused: 'Pausado', error: 'Erro' };
  const playLabel = state.status === 'playing' ? 'Pausar' : state.status === 'paused' ? 'Retomar' : 'Reproduzir';
  function available(chapter: number) {
    return state.status !== 'loading' && controller.available(chapter);
  }
  function select(chapter: number) {
    void controller.start(chapter);
  }
  return <ScrollView style={presentation.page} contentContainerStyle={[styles.content, wide && styles.wideContent]}>
    <View style={[styles.column, wide && styles.wideColumn]}>
      <View style={styles.header}>
        {novel.image_url ? <Image source={{ uri: novel.image_url }} style={styles.cover} accessibilityLabel={`Capa de ${novel.title}`} /> : null}
        <View style={styles.info}>
          <Text accessibilityRole="header" numberOfLines={2} style={styles.title}>{novel.title}</Text>
          {source ? <Text style={presentation.subtitle}>{source.provider}</Text> : null}
          <ChapterJump chapter={state.chapter} total={controller.maximum} available={available} onSelect={select} color="#A9A3FF" />
        </View>
      </View>
      <OfflineNotice mode="speech" />
      <TextModeChoice mode={state.mode} originalAvailable={controller.available(state.chapter, 'original')} onChange={selected => { void controller.setMode(selected); }} />
      {state.mode === 'original' ? <Text style={{ color: '#888888' }}>Escolha uma voz do idioma original em “Voz”.</Text> : null}
      {state.error ? <ErrorMessage message={state.error} onRetry={() => { void controller.start(); }} /> : null}
      <View style={[presentation.card, styles.status]}>
        <Text style={presentation.text}>Capítulo {state.chapter} · {labels[state.status]}</Text>
        <ProgressBar label="Progresso da fala" current={state.total ? state.index + 1 : 0} total={state.total} />
        <Text style={presentation.subtitle}>Frase {state.total ? state.index + 1 : 0}/{state.total}</Text>
      </View>
    </View>
    <View style={[styles.column, wide && styles.wideColumn]}>
      <Button title={`Voz: ${voiceName}`} caption={voiceName} icon="account-voice" trailingIcon="chevron-right" style={styles.voice} labelStyle={styles.voiceLabel} onPress={() => setVoicePicker(true)} />
      <View style={styles.playback}>
        <Button title="Capítulo anterior" icon="skip-previous" iconSize={28} iconOnly style={styles.skip} disabled={!available(state.chapter - 1)} onPress={() => select(state.chapter - 1)} />
        <Button title={playLabel} icon={state.status === 'playing' ? 'pause' : 'play'} iconSize={36} iconOnly variant="primary" style={styles.play} busy={state.status === 'loading'} disabled={state.status === 'idle' && !controller.available(state.chapter)} onPress={() => { void controller.toggle(); }} />
        <Button title="Próximo capítulo" icon="skip-next" iconSize={28} iconOnly style={styles.skip} disabled={!available(state.chapter + 1)} onPress={() => select(state.chapter + 1)} />
      </View>
      <Text style={[presentation.subtitle, styles.speedLabel]}>Velocidade: {rate}x</Text>
      <View style={styles.speeds}>{speechRates.map(value =>
        <Button key={value} title={`${value}x`} style={styles.speedButton} selected={rate === value} onPress={() => { void controller.setRate(value); }} />
      )}</View>
    </View>
    <VoicePicker visible={voicePicker} onClose={() => setVoicePicker(false)} groups={voicePickerGroups(voices.data?.groups ?? [], device.data?.extraVoiceLocales)} selected={selectedVoice} onSelect={voice => { void controller.setVoice(voice); }} />
    <Dialog title="Fim!" visible={state.finished} onClose={controller.dismissEnd}><Text style={{ color: '#FFFFFF' }}>Você chegou ao último capítulo disponível.</Text></Dialog>
  </ScrollView>;
}

const styles = StyleSheet.create({
  content: { padding: 24, gap: 12 },
  wideContent: { flexDirection: 'row', alignItems: 'flex-start', gap: 24, paddingVertical: 12 },
  column: { gap: 12 },
  wideColumn: { flex: 1, minWidth: 0 },
  header: { flexDirection: 'row', gap: 14, alignItems: 'center', marginBottom: 8 },
  cover: { width: 64, height: 90, borderRadius: 8, backgroundColor: colors.surface },
  info: { flex: 1, alignItems: 'flex-start' },
  title: { color: colors.text, fontSize: 16, fontWeight: 'bold' },
  status: { gap: 6 },
  playback: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 20, marginTop: 12 },
  skip: { width: 56, height: 56, borderRadius: 28 },
  play: { width: 80, height: 80, borderRadius: 40 },
  voice: { justifyContent: 'flex-start', paddingHorizontal: 12, backgroundColor: '#16162A', borderWidth: 1, borderColor: colors.border },
  voiceLabel: { flex: 1, textAlign: 'left', fontSize: 13 },
  speedButton: { borderRadius: 20, paddingHorizontal: 14 },
  speedLabel: { textAlign: 'center', marginTop: 12 },
  speeds: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
});
