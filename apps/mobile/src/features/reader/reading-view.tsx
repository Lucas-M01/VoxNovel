import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View, type NativeScrollEvent, type NativeSyntheticEvent, type ScrollViewInstance } from 'react-native';
import { useMutationState, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Novel } from '@core/api/schemas';
import type { TextMode } from '@core/text-mode';
import { activeSource, sourceChapterUrl } from '@core/chapter-source';
import { keys } from '@core/keys';
import { TextModeChoice } from '@features/reader/text-mode-choice';
import { formatReadingText } from '@core/chapter-format';
import { themes, widths, scrollSpeeds, useReadingPreferences } from '@core/reading-preferences';
import { readerServices, readingChapterOptions, readingKeys, type ReaderServices } from '@features/reader/reader-data';
import { useConnectivity, chapterAvailable } from '@core/connectivity';
import { localChaptersOptions } from '@core/local-queries';
import { useChapterPrefetch } from '@features/reader/use-chapter-prefetch';
import { ChapterNavigation } from '@features/reader/chapter-navigation';
import { useAutoScroll } from '@features/reader/use-auto-scroll';
import { ProgressBar } from '@ui/progress-bar';
import { ChapterBody } from '@features/reader/chapter-body';
import { ReadingControls } from '@features/reader/reading-controls';
import { OfflineNotice } from '@pattern/offline-notice';
import { Button } from '@ui/button';
import { ErrorMessage } from '@ui/error-message';

type Props = { novel: Novel; initialChapter?: number | undefined; initialMode?: TextMode | undefined; services?: ReaderServices | undefined; onListen?: ((chapter: number, mode?: TextMode) => void) | undefined };
export function ReadingView({ novel, initialChapter, initialMode = 'translated', services = readerServices, onListen }: Props) {
  const [chapter, setChapter] = useState(initialChapter ?? novel.current_chapter);
  const [mode, setMode] = useState<TextMode>(initialMode);
  const { preferences, update } = useReadingPreferences();
  const client = useQueryClient();
  const source = activeSource(novel);
  const prefetch = useChapterPrefetch(client, novel, services, mode);
  const query = useQuery(readingChapterOptions(client, novel, chapter, services, number => { void prefetch.activate(number); }, mode));
  const progress = useMutationState({ filters: { mutationKey: readingKeys.progress(novel.id, source?.id ?? '', chapter) }, select: mutation => mutation.state.status });
  const content = query.data ? formatReadingText(query.data.text) : null;
  const theme = themes[preferences.themeIndex];
  const connectivity = useConnectivity();
  const scope = { novelId: novel.id, sourceId: source?.id ?? '' };
  const locals = useQuery({ ...localChaptersOptions(scope, services.storage), enabled: source !== null });
  const downloaded = useMemo(() => new Set(locals.data ?? []), [locals.data]);
  const total = novel.total_chapters ?? source?.total_chapters ?? (source?.chapter_ids?.length || null);
  const scroll = useRef<ScrollViewInstance | null>(null);
  const offset = useRef(0);
  const dragging = useRef(false);
  const releaseDrag = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [fraction, setFraction] = useState(0);
  useAutoScroll(preferences.autoScroll && content !== null && !query.isPending, scrollSpeeds[preferences.scrollSpeedIndex]?.value ?? 0.5, scroll, offset);
  useEffect(() => () => { if (releaseDrag.current !== undefined) clearTimeout(releaseDrag.current); }, []);
  function available(number: number) {
    if (number < 1 || !Number.isInteger(number)) return false;
    const url = source ? sourceChapterUrl(source, number) : null;
    const cached = mode === 'original' ? new Set(url && client.getQueryData(keys.chapter(scope, url, number, mode)) !== undefined ? [number] : []) : downloaded;
    return source !== null && (total === null || number <= total) && chapterAvailable(connectivity === 'offline', cached, number);
  }
  function navigate(number: number) {
    if (!available(number)) return;
    offset.current = 0; setFraction(0); scroll.current?.scrollTo({ y: 0, animated: false }); setChapter(number);
  }
  function onScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    offset.current = contentOffset.y;
    const span = contentSize.height - layoutMeasurement.height;
    const fraction = span > 0 ? Math.max(0, Math.min(1, contentOffset.y / span)) : 0;
    setFraction(fraction); void prefetch.scroll(chapter, fraction);
  }
  function toggleControls() {
    if (!dragging.current) update({ controlsVisible: !preferences.controlsVisible });
  }
  return <View style={{ flex: 1, backgroundColor: theme?.background }}>
    {preferences.controlsVisible ? <View>
      <Text accessibilityRole="header" style={{ color: theme?.text }}>{novel.title}</Text>
      <Text style={{ color: theme?.text }}>Capítulo {chapter}</Text>
      <ChapterNavigation chapter={chapter} total={total} available={available} onSelect={navigate} />
      <ProgressBar label="Progresso da leitura" current={fraction} total={1} />
    </View> : null}
    <OfflineNotice mode="reading" />
    {preferences.controlsVisible ? <TextModeChoice mode={mode} originalAvailable={source !== null && (connectivity !== 'offline' || client.getQueryData(keys.chapter(scope, sourceChapterUrl(source, chapter) ?? '', chapter, 'original')) !== undefined)} onChange={selected => { offset.current = 0; setFraction(0); scroll.current?.scrollTo({ y: 0, animated: false }); setMode(selected); }} /> : null}
    {query.isPending ? <ActivityIndicator accessibilityLabel="Carregando capítulo" /> : null}
    {query.isError ? <ErrorMessage message={query.error instanceof Error ? query.error.message : 'Não foi possível carregar o capítulo.'} onRetry={() => { void query.refetch(); }} /> : null}
    {progress.at(-1) === 'error' ? <Text style={{ color: theme?.text }}>Não foi possível salvar o progresso.</Text> : null}
    {content ? <ScrollView ref={scroll} testID="reading-scroll" onScroll={onScroll} scrollEventThrottle={16}
      onScrollBeginDrag={() => { dragging.current = true; if (releaseDrag.current !== undefined) clearTimeout(releaseDrag.current); }}
      onScrollEndDrag={() => { releaseDrag.current = setTimeout(() => { dragging.current = false; }, 150); }}
      contentContainerStyle={{ paddingHorizontal: widths[preferences.widthIndex] ?? 0.9, paddingTop: 28, paddingBottom: 80 }} showsVerticalScrollIndicator={false}>
      <Pressable testID="reading-body-touch" accessibilityRole="button" accessibilityLabel={preferences.controlsVisible ? 'Ocultar controles' : 'Mostrar controles'} onPress={toggleControls}>
        <ChapterBody content={content} preferences={preferences} />
      </Pressable>
    </ScrollView> : null}
    {preferences.controlsVisible && onListen ? <Button title="Ouvir capítulo" onPress={() => mode === 'original' ? onListen(chapter, mode) : onListen(chapter)} /> : null}
    {preferences.controlsVisible ? <ReadingControls preferences={preferences} onChange={update} /> : null}
  </View>;
}
