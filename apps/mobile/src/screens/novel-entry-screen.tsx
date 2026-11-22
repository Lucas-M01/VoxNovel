import { View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Novel } from '@core/api/schemas';
import type { TextMode } from '@core/text-mode';
import { novelRouteSchema, type NovelDestination } from '@core/navigation';
import { keys } from '@core/keys';
import { activeSource } from '@core/chapter-source';
import { detailOptions } from '@features/detail/detail-data';
import ReadingScreen from '@screens/reading-screen';
import SpeechScreen from '@screens/speech-screen';
import DownloadsScreen from '@screens/downloads-screen';
import SearchScreen from '@screens/search-screen';
import { LoadingMessage } from '@ui/loading-message';
import { ErrorMessage } from '@ui/error-message';
import { presentation as styles } from '@ui/presentation';

type Props = { destination: NovelDestination };
export default function NovelEntryScreen({ destination }: Props) {
  const params = novelRouteSchema.safeParse(useLocalSearchParams());
  if (!params.success) return <View style={[styles.page, styles.content]}><ErrorMessage message="Obra ou capítulo inválido." /></View>;
  return <ResolvedEntry destination={destination} id={params.data.id} chapter={params.data.chapter} mode={params.data.mode} />;
}
function ResolvedEntry({ destination, id, chapter, mode }: Props & { id: string; chapter: number | undefined; mode: TextMode | undefined }) {
  const query = useQuery(detailOptions(id)); const router = useRouter(); const client = useQueryClient();
  if (query.isPending) return <LoadingMessage message="Carregando obra…" />;
  if (!query.data) return <View style={[styles.page, styles.content]}><ErrorMessage message={query.error?.message ?? 'Obra não encontrada.'} onRetry={() => { void query.refetch(); }} /></View>;
  const novel = query.data;
  const source = activeSource(novel);
  const maximum = novel.total_chapters ?? source?.total_chapters ?? (source?.chapter_ids?.length || null);
  if (chapter !== undefined && maximum !== null && chapter > maximum) return <ErrorMessage message="Capítulo fora do intervalo." />;
  const open = (target: 'reading' | 'speech', selected: Novel, value?: number, selectedMode?: TextMode) => {
    client.setQueryData(keys.novel(selected.id), selected);
    router.push({ pathname: target === 'reading' ? '/reading' : '/speech', params: { id: selected.id, ...(value === undefined ? {} : { chapter: String(value) }), ...(selectedMode === 'original' ? { mode: selectedMode } : {}) } });
  };
  const back = () => { if (router.canGoBack()) router.back(); else router.replace('/'); };
  if (destination === 'reading' || destination === 'downloads') return <SafeAreaView edges={['top']} style={styles.page}>
    <Stack.Screen options={{ headerShown: destination === 'downloads' && source === null }} />
    {destination === 'reading'
      ? <ReadingScreen novel={novel} initialChapter={chapter} initialMode={mode} onBack={back} onListen={(value, selectedMode) => open('speech', novel, value, selectedMode)} />
      : <DownloadsScreen novel={novel} onBack={back} onRead={value => open('reading', novel, value)} onListen={value => open('speech', novel, value)} />}
  </SafeAreaView>;
  if (destination === 'speech') return <SpeechScreen novel={novel} initialChapter={chapter} initialMode={mode} onRead={(value, selectedMode) => router.replace({ pathname: '/reading', params: { id: novel.id, chapter: String(value), mode: selectedMode } })} />;
  return <SearchScreen existing={novel} onOpen={selected => { client.setQueryData(keys.novel(selected.id), selected); router.replace({ pathname: '/speech', params: { id: selected.id } }); }} />;
}
