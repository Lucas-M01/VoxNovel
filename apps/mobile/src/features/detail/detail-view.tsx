import { useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { localChaptersOptions } from '@core/local-queries';
import { novelResources } from '@core/api/novels';
import { activeSource } from '@core/chapter-source';
import { initialSpeechChapter } from '@core/initial-speech-chapter';
import { useConnectivity } from '@core/connectivity';
import type { Novel } from '@core/api/schemas';
import { readerServices, type ReaderServices } from '@features/reader/reader-data';
import { startingChapterSchema } from '@features/search/search-service';
import { detailOptions, rememberNovel } from '@features/detail/detail-data';
import { deleteLibraryNovel } from '@features/library/library-data';
import { Button } from '@ui/button';
import { Dialog } from '@ui/dialog';
import { ErrorMessage } from '@ui/error-message';
import { ProgressBar } from '@ui/progress-bar';
import { colors, presentation as styles } from '@ui/presentation';

const sourceColors = new Map([
  ['FreeWebNovel', '#4FC3F7'],
  ['CentralNovel', '#81C784'],
  ['NovelFire', '#FFB74D'],
  ['RoyalRoad', '#CE93D8'],
  ['Genérico', '#90A4AE'],
]);

type Destination = 'reading' | 'speech' | 'downloads';
type Props = { id: string; services?: ReaderServices; onNavigate: (destination: Destination, novel: Novel) => void; onAddSource: (novel: Novel) => void; onDeleted: () => void; onBack?: (() => void) | undefined };
type Change = { kind: 'progress'; chapter: number } | { kind: 'activate' | 'remove'; sourceId: string };
export function DetailView({ id, services = readerServices, onNavigate, onAddSource, onDeleted, onBack }: Props) {
  const client = useQueryClient(); const connectivity = useConnectivity();
  const query = useQuery(detailOptions(id, services));
  const sourceDownloads = useQueries({
    queries: (query.data?.sources ?? []).map(source => localChaptersOptions({ novelId: id, sourceId: source.id }, services.storage)),
  });
  const [chapter, setChapter] = useState<string | null>(null);
  const [inputError, setInputError] = useState('');
  const [confirmation, setConfirmation] = useState<{ sourceId: string; provider: string } | 'novel' | null>(null);
  const resources = novelResources(services.request);
  const change = useMutation({ mutationFn: async (input: Change) => {
    if (connectivity === 'offline') throw new Error('Conecte-se à internet para alterar a obra.');
    if (input.kind === 'progress') return resources.progress(id, input.chapter);
    if (input.kind === 'activate') return resources.activateSource(id, input.sourceId);
    if ((query.data?.sources.length ?? 0) <= 1) throw new Error('A última fonte não pode ser removida.');
    return resources.removeSource(id, input.sourceId);
  }, onSuccess: async novel => { await rememberNovel(client, novel, services); setChapter(null); setConfirmation(null); } });
  const remove = useMutation({ mutationFn: async () => { if (query.data) await deleteLibraryNovel(client, query.data, services); }, onSuccess: onDeleted });
  const back = onBack ? <Button title="Voltar" icon="arrow-left" iconOnly iconSize={22} variant="quiet" style={detail.back} onPress={onBack} /> : null;
  if (query.isPending) return <View style={styles.page}>{back}<ActivityIndicator color={colors.accent} accessibilityLabel="Carregando obra" /></View>;
  if (!query.data) return <View style={[styles.page, styles.content]}>{onBack ? <Button title="Voltar" onPress={onBack} /> : null}<ErrorMessage message={query.error?.message ?? 'Obra não encontrada.'} onRetry={() => { void query.refetch(); }} /></View>;
  const novel = query.data; const source = activeSource(novel); const current = initialSpeechChapter(novel);
  const maximum = novel.total_chapters ?? source?.total_chapters ?? source?.chapter_ids?.length ?? null;
  const percent = maximum ? Math.min(100, Math.round(current / maximum * 100)) : null;
  const offline = connectivity === 'offline'; const busy = change.isPending || remove.isPending;
  const saveProgress = () => {
    const parsed = startingChapterSchema.safeParse(chapter);
    if (!parsed.success || (maximum !== null && parsed.data > maximum)) { setInputError(maximum ? `Informe um capítulo entre 1 e ${maximum}.` : 'Capítulo inválido.'); return; }
    setInputError(''); change.mutate({ kind: 'progress', chapter: parsed.data });
  };
  return <ScrollView style={styles.page} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
    <View style={detail.hero}>
      {novel.image_url ? <Image source={{ uri: novel.image_url }} blurRadius={18} resizeMode="cover" style={StyleSheet.absoluteFill} /> : null}
      <View style={[StyleSheet.absoluteFill, detail.scrim]} />
      {back}
      <View style={detail.heroContent}>
        {novel.image_url
          ? <Image source={{ uri: novel.image_url }} style={detail.cover} accessibilityLabel={`Capa de ${novel.title}`} />
          : <View style={[detail.cover, detail.placeholder]}><Text style={detail.coverIcon}>📚</Text></View>}
        <View style={detail.heroInfo}>
          <Text accessibilityRole="header" style={detail.title} numberOfLines={3}>{novel.title}</Text>
          <Text style={detail.provider}>{source?.provider ?? 'Sem fonte'}</Text>
          {maximum ? <Text style={styles.subtitle}>{maximum} capítulos</Text> : null}
        </View>
      </View>
    </View>
    <View style={detail.sections}>
      {offline ? <Text style={styles.subtitle}>Offline · leitura disponível para capítulos baixados.</Text> : null}
      <View style={detail.progress}>
        <View style={detail.progressHeader}>
          <Text style={detail.sectionTitle}>Progresso</Text>
          {chapter === null ? <Button title="Editar capítulo" caption="Editar" icon="pencil-outline" iconSize={14} iconColor="#A9A3FF" variant="quiet" labelStyle={detail.provider} disabled={offline || busy} onPress={() => { setChapter(String(current)); setInputError(''); change.reset(); }} /> : null}
        </View>
        {chapter === null ? <View style={detail.progressHeader}>
          <Text style={detail.chapter}>Capítulo {current}{maximum ? ` de ${maximum}` : ''}</Text>
          {percent === null ? null : <Text style={detail.percent}>{percent}%</Text>}
        </View> : <>
          <View style={styles.row}>
            <TextInput accessibilityLabel="Novo capítulo" keyboardType="number-pad" style={[styles.input, detail.flex]} value={chapter} onChangeText={setChapter} editable={!busy} />
            <Button title="Salvar capítulo" icon="check" iconOnly variant="primary" busy={change.isPending} disabled={offline || busy} onPress={saveProgress} />
            <Button title="Cancelar edição" icon="close" iconOnly disabled={busy} onPress={() => setChapter(null)} />
          </View>
          {inputError ? <ErrorMessage message={inputError} /> : null}
        </>}
        {maximum ? <ProgressBar label="Progresso da obra" current={current} total={maximum} /> : null}
      </View>
      <View style={detail.actions}>
        <Button title="Ouvir obra" caption="Ouvir" icon="headphones" stacked iconColor="#A9A3FF" variant="quiet" style={detail.action} labelStyle={{ ...detail.actionLabel, color: '#A9A3FF' }} onPress={() => onNavigate('speech', novel)} />
        <Button title="Continuar leitura" caption="Ler" icon="book-open-variant" stacked iconColor="#4FC3F7" variant="quiet" style={detail.action} labelStyle={{ ...detail.actionLabel, color: '#4FC3F7' }} onPress={() => onNavigate('reading', novel)} />
        <Button title="Downloads" icon="download-box-outline" stacked iconColor="#81C784" variant="quiet" style={detail.action} labelStyle={{ ...detail.actionLabel, color: '#81C784' }} onPress={() => onNavigate('downloads', novel)} />
        <Button title="Adicionar fonte" caption="+ Fonte" icon="plus-box-outline" stacked iconColor="#FFB74D" variant="quiet" style={detail.action} labelStyle={{ ...detail.actionLabel, color: '#FFB74D' }} disabled={offline || busy} onPress={() => onAddSource(novel)} />
      </View>
      <View style={detail.sourceList}>
        <Text accessibilityRole="header" style={detail.sectionTitle}>Fontes da obra · {novel.sources.length}</Text>
        {novel.sources.map((item, index) => {
          const active = item.id === source?.id;
          const downloaded = sourceDownloads[index]?.data?.length ?? 0;
          const tint = sourceColors.get(item.provider) ?? '#A9A3FF';
          return <View key={item.id} style={[detail.sourceCard, active && detail.activeSource]}>
            <View style={[detail.sourceStripe, { backgroundColor: tint }]} />
            <View style={detail.sourceBody}>
              <View style={detail.sourceHeader}>
                <View style={detail.sourceIdentity} accessible accessibilityLabel={active ? `${item.provider} · Ativa` : item.provider}>
                  <View style={[detail.sourceDot, { backgroundColor: tint }]} />
                  <Text style={[detail.sourceName, { color: tint }]}>{item.provider}</Text>
                  {active ? <Text style={detail.activeTag}>Ativa</Text> : null}
                </View>
                <Text style={detail.sourceMeta}>{item.total_chapters ?? '?'} caps</Text>
              </View>
              <Text style={detail.sourceMeta}>
                Parado no cap. <Text style={detail.sourceChapter}>{item.current_chapter}</Text>{item.total_chapters ? ` / ${item.total_chapters}` : ''}
              </Text>
              {item.total_chapters ? <ProgressBar label={`Progresso em ${item.provider}`} current={item.current_chapter} total={item.total_chapters} color={tint} /> : null}
              {downloaded ? <Text style={detail.downloaded}>{downloaded} {downloaded === 1 ? 'capítulo offline' : 'capítulos offline'}</Text> : null}
              <View style={detail.sourceActions}>
                {!active ? <Button title={`Usar ${item.provider}`} caption="Usar esta" variant="quiet" icon="check-circle-outline" iconSize={14} iconColor={tint} style={detail.sourceAction} labelStyle={{ ...detail.sourceActionLabel, color: tint }} disabled={offline || busy} onPress={() => { change.reset(); change.mutate({ kind: 'activate', sourceId: item.id }); }} /> : null}
                <Button title={`Remover fonte ${item.provider}`} caption="Remover" variant="quiet" icon="trash-can-outline" iconSize={14} iconColor="#FF7777" style={detail.sourceAction} labelStyle={detail.removeLabel} disabled={offline || busy || novel.sources.length <= 1} onPress={() => { change.reset(); setConfirmation({ sourceId: item.id, provider: item.provider }); }} />
              </View>
            </View>
          </View>;
        })}
      </View>
      {change.error ? <ErrorMessage message={change.error.message} /> : null}
      <Button title="Remover obra" icon="trash-can-outline" iconColor="#FF7777" variant="danger" disabled={offline || busy} onPress={() => { remove.reset(); setConfirmation('novel'); }} />
      <Dialog title={confirmation === 'novel' ? 'Remover obra' : 'Remover fonte'} visible={confirmation !== null} closeTitle="Cancelar" onClose={() => { if (!busy) setConfirmation(null); }}
        confirm={{ title: 'Confirmar remoção', variant: 'danger', busy, disabled: offline, onPress: () => { if (confirmation === 'novel') remove.mutate(); else if (confirmation) change.mutate({ kind: 'remove', sourceId: confirmation.sourceId }); } }}>
        <Text style={styles.text}>{confirmation === 'novel' ? 'As fontes e o progresso desta obra serão apagados.' : `Remover ${confirmation?.provider}? O progresso desta fonte será perdido.`}</Text>
        {remove.error ? <ErrorMessage message={remove.error.message} /> : null}
        {change.error ? <ErrorMessage message={change.error.message} /> : null}
      </Dialog>
    </View>
  </ScrollView>;
}

const detail = StyleSheet.create({
  hero: { minHeight: 260, backgroundColor: '#1A1A2E', justifyContent: 'flex-end', overflow: 'hidden' },
  scrim: { experimental_backgroundImage: 'linear-gradient(180deg, #0F0F1A33, #0F0F1A)' },
  back: { position: 'absolute', top: 8, left: 16, zIndex: 1, backgroundColor: '#00000066', width: 44, borderRadius: 22 },
  heroContent: { flexDirection: 'row', alignItems: 'flex-end', padding: 16, gap: 14 },
  cover: { width: 90, height: 130, borderRadius: 10, backgroundColor: colors.surface },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  coverIcon: { fontSize: 36 },
  heroInfo: { flex: 1, paddingBottom: 4, gap: 4 },
  title: { color: colors.text, fontSize: 18, lineHeight: 24, fontWeight: 'bold' },
  provider: { color: '#A9A3FF', fontSize: 12, fontWeight: 'bold' },
  sections: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32, gap: 20 },
  progress: { gap: 8 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { color: colors.muted, fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase' },
  chapter: { color: colors.text, fontSize: 20, fontWeight: 'bold' },
  percent: { color: '#A9A3FF', fontWeight: 'bold', fontSize: 14 },
  flex: { flex: 1 },
  actions: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#16162A', borderRadius: 14, paddingVertical: 10 },
  action: { flex: 1, paddingHorizontal: 0 },
  sourceList: { gap: 10 },
  sourceCard: { flexDirection: 'row', backgroundColor: '#16162A', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#28283D' },
  activeSource: { borderColor: '#6C63FF88', backgroundColor: '#1A1A30' },
  sourceStripe: { width: 4 },
  sourceBody: { flex: 1, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 4, gap: 6 },
  sourceHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  sourceIdentity: { flex: 1, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  sourceDot: { width: 6, height: 6, borderRadius: 3 },
  sourceName: { fontSize: 13, fontWeight: 'bold' },
  activeTag: { color: '#B2ACFF', backgroundColor: '#6C63FF22', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
  sourceMeta: { color: colors.muted, fontSize: 12 },
  sourceChapter: { color: colors.text, fontWeight: 'bold' },
  sourceActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  sourceAction: { paddingHorizontal: 0, gap: 4 },
  sourceActionLabel: { fontSize: 12, fontWeight: 'bold' },
  downloaded: { color: '#81C784', fontSize: 12 },
  removeLabel: { color: '#FF7777', fontSize: 12 },
  actionLabel: { fontSize: 11, fontWeight: 'bold' },
});
