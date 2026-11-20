import { useEffect, useRef, useState } from 'react';
import { AppState, Modal, Platform, SectionList, ScrollView, Switch, Text, View } from 'react-native';
import { QueryClientProvider, useMutation } from '@tanstack/react-query';
import { Button } from '@ui/button';
import { ErrorMessage } from '@ui/error-message';
import { ProgressBar } from '@ui/progress-bar';
import { OfflineNotice } from '@pattern/offline-notice';
import { ReadingControls } from '@features/reader/reading-controls';
import { fonts, fontSizes, themes, useReadingPreferences } from '@core/reading-preferences';
import { createQueryClient } from '@core/queries';
import { localStorage } from '@core/local-storage';
import { nativeSpeech, speechSession } from '@core/native-speech';
import { defaultVoice, groupedVoices, type SpeechPlayer, type SpeechStatus } from '@core/tts-service';

const scope = { novelId: 's1-synthetic', sourceId: 's1-native' };
function syntheticText(chapter: number, long: boolean) {
  return Array.from({ length: long ? 24 : 3 }, (_, index) =>
    `Capítulo ${chapter}, frase ${index + 1}. Este texto sintético serve para verificar a continuidade da voz nativa e não contém dados pessoais.`
  ).join(' ');
}

function HarnessScreen() {
  const { preferences, update } = useReadingPreferences();
  const [status, setStatus] = useState<SpeechStatus>('stopped');
  const [chapter, setChapter] = useState(0);
  const [position, setPosition] = useState({ index: 0, total: 0 });
  const [rate, setRate] = useState(1);
  const [voiceId, setVoiceId] = useState<string | null>(null);
  const [long, setLong] = useState(false);
  const [picker, setPicker] = useState(false);
  const [events, setEvents] = useState<string[]>([]);
  const alive = useRef(true);
  const revision = useRef(0);
  const player = useRef<SpeechPlayer | null>(null);
  const currentChapter = useRef(0);
  const currentRate = useRef(1);
  const currentVoice = useRef<string | null>(null);
  function log(message: string) {
    if (alive.current) setEvents(previous => [...previous.slice(-79), `${new Date().toISOString()} ${message}`]);
  }
  useEffect(() => {
    alive.current = true;
    const listener = AppState.addEventListener('change', state => {
      if (alive.current) setEvents(previous => [...previous.slice(-79), `${new Date().toISOString()} AppState: ${state}`]);
    });
    return () => {
      alive.current = false; revision.current += 1; listener.remove();
      void player.current?.destroy().catch(() => {});
    };
  }, []);
  const prepare = useMutation({
    mutationFn: async () => {
      revision.current += 1; await speechSession.stop(); player.current = null;
      await Promise.all([localStorage.saveChapter(scope, 1, syntheticText(1, long)), localStorage.saveChapter(scope, 2, syntheticText(2, long))]);
      const [groups, selected] = await Promise.all([groupedVoices(nativeSpeech), defaultVoice(nativeSpeech)]);
      return { groups, selected };
    },
    onSuccess: data => {
      if (!alive.current) return;
      currentVoice.current = data.selected?.identifier ?? null;
      setVoiceId(currentVoice.current); setStatus('stopped');
      log('Dois capítulos sintéticos preparados no aparelho.');
    },
    onError: () => log('Falha ao preparar dados sintéticos.'),
  });
  async function run(action: () => Promise<void>) {
    try { await action(); } catch { log('Falha na operação de fala.'); }
  }
  async function playChapter(index: number) {
    if (index < 0 || index > 1) return;
    const ticket = ++revision.current;
    try {
      const data = await localStorage.readChapter(scope, index + 1);
      if (!alive.current || ticket !== revision.current) return;
      if (!data) { log('Prepare os capítulos primeiro.'); return; }
      const next = await speechSession.replace(data.text, {
        onStatus: value => { if (alive.current && ticket === revision.current) setStatus(value); },
        onSentence: (sentence, total) => {
          if (alive.current && ticket === revision.current) {
            setPosition({ index: sentence, total }); log(`Capítulo ${index + 1}, frase ${sentence + 1}/${total}`);
          }
        },
        onEnd: () => {
          if (!alive.current || ticket !== revision.current) return;
          log(`Capítulo ${index + 1} concluído.`);
          if (index === 0) void playChapter(1);
        },
        onError: () => log('Erro nativo de fala. Confira a voz instalada.'),
      }, { rate: currentRate.current, ...(currentVoice.current ? { voice: currentVoice.current } : {}) });
      if (!next) return;
      if (!alive.current || ticket !== revision.current) { await next.destroy(); return; }
      player.current = next; currentChapter.current = index;
      setChapter(index + 1); await next.play();
    } catch { log('Não foi possível iniciar o capítulo.'); }
  }
  const groups = prepare.data?.groups ?? [];
  return (
    <ScrollView contentContainerStyle={{ padding: 24, gap: 12 }}>
      <Text accessibilityRole="header">S1 privado — voz nativa</Text>
      <Text>{Platform.OS} {Platform.Version}. Registrar também motor, voz e Expo Go/build usado.</Text>
      <Text>Este harness testa serviços. O leitor completo ainda não está disponível.</Text>
      <Text>Texto longo para background/tela bloqueada</Text>
      <Switch accessibilityLabel="Texto longo para background" value={long} onValueChange={setLong} />
      <Button title="Preparar dois capítulos sintéticos" busy={prepare.isPending} onPress={() => prepare.mutate()} />
      {prepare.isError ? <ErrorMessage message="Falha ao preparar dados sintéticos." onRetry={() => prepare.mutate()} /> : null}
      <OfflineNotice mode="speech" />
      <ProgressBar label="Progresso da fala" current={position.total ? position.index + 1 : 0} total={position.total} />
      <Text>Capítulo {chapter || '—'} · {status} · frase {position.total ? position.index + 1 : 0}/{position.total}</Text>
      <Button title="Iniciar capítulo 1" disabled={!prepare.isSuccess} onPress={() => { void playChapter(0); }} />
      <Button title={status === 'paused' ? 'Retomar' : 'Pausar'} disabled={chapter === 0 || status === 'stopped'} onPress={() => { void run(async () => { if (status === 'paused') await player.current?.resume(); else await player.current?.pause(); }); }} />
      <Button title="Parar" onPress={() => { revision.current += 1; void run(async () => { await player.current?.stop(); setStatus('stopped'); }); }} />
      <Button title="Capítulo anterior" disabled={chapter < 2} onPress={() => { void playChapter(currentChapter.current - 1); }} />
      <Button title="Próximo capítulo" disabled={chapter !== 1} onPress={() => { void playChapter(currentChapter.current + 1); }} />
      <Text>Velocidade: {rate}</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {[0.75, 1, 1.25, 1.5, 2].map(value => <Button key={value} title={`${value}x`} onPress={() => {
          currentRate.current = value; setRate(value);
          void run(async () => { await player.current?.applyConfig({ rate: value }); });
        }} />)}
      </View>
      <Text>Voz: {voiceId ?? 'padrão do sistema'}</Text>
      <Button title="Escolher voz" onPress={() => setPicker(true)} />
      <Button title="Descartar player (simular saída da tela)" onPress={() => {
        revision.current += 1;
        void run(async () => { revision.current += 1; await speechSession.stop(); player.current = null; setStatus('stopped'); log('Player descartado. Não deve haver fala posterior.'); });
      }} />
      <ReadingControls preferences={preferences} onChange={update} />
      <Text style={{ fontSize: fontSizes[preferences.sizeIndex] ?? 18, fontFamily: fonts[preferences.fontIndex]?.family,
        color: themes[preferences.themeIndex]?.text, backgroundColor: themes[preferences.themeIndex]?.background }}>
        Prévia sintética das preferências de leitura. Rolagem e imersão serão compostas no leitor em F5.
      </Text>
      <Text accessibilityRole="header">Eventos da sessão</Text>
      <Text selectable>{events.join('\n')}</Text>
      <Modal visible={picker} onRequestClose={() => setPicker(false)}>
        <View style={{ flex: 1, padding: 24 }}>
          <Button title="Fechar vozes" onPress={() => setPicker(false)} />
          <SectionList
            sections={groups.map(group => ({ title: group.name, data: group.voices }))}
            keyExtractor={item => item.identifier}
            renderSectionHeader={({ section }) => <Text accessibilityRole="header">{section.title}</Text>}
            renderItem={({ item }) => <Button title={`${item.name} (${item.quality})`} onPress={() => {
              currentVoice.current = item.identifier; setVoiceId(item.identifier); setPicker(false);
              void run(async () => { await player.current?.applyConfig({ voice: item.identifier }); });
            }} />}
            ListEmptyComponent={<Text>Nenhuma voz encontrada</Text>}
          />
        </View>
      </Modal>
    </ScrollView>
  );
}

export default function SpeechHarness() {
  const [client] = useState(createQueryClient);
  return <QueryClientProvider client={client}><HarnessScreen /></QueryClientProvider>;
}
