import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent, type ScrollViewInstance } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Novel } from '@core/api/schemas';
import type { TextMode } from '@core/text-mode';
import { activeSource, sourceChapterUrl } from '@core/chapter-source';
import { keys } from '@core/keys';
import { TextModeChoice } from '@features/reader/text-mode-choice';
import { formatReadingText } from '@core/chapter-format';
import { themes, scrollSpeeds, useReadingPreferences } from '@core/reading-preferences';
import { readerServices, readingChapterOptions, type ReaderServices } from '@features/reader/reader-data';
import { useConnectivity, chapterAvailable } from '@core/connectivity';
import { devicePreferencesOptions, localChaptersOptions } from '@core/local-queries';
import { useChapterPrefetch } from '@features/reader/use-chapter-prefetch';
import { ChapterJump } from '@features/reader/chapter-jump';
import { useAutoScroll } from '@features/reader/use-auto-scroll';
import { ProgressBar } from '@ui/progress-bar';
import { ChapterBody } from '@features/reader/chapter-body';
import { ReadingControls } from '@features/reader/reading-controls';
import { OfflineNotice } from '@pattern/offline-notice';
import { Button } from '@ui/button';
import { LoadingMessage } from '@ui/loading-message';
import { ErrorMessage } from '@ui/error-message';

type Props = { novel: Novel; initialChapter?: number | undefined; initialMode?: TextMode | undefined; services?: ReaderServices | undefined; onListen?: ((chapter: number, mode?: TextMode) => void) | undefined; onBack?: (() => void) | undefined };
export function ReadingView({ novel, initialChapter, initialMode = 'translated', services = readerServices, onListen, onBack }: Props) {
  const { width, height } = useWindowDimensions();
  const landscape = width > height;
  const [chapter, setChapter] = useState(initialChapter ?? novel.current_chapter);
  const [mode, setMode] = useState<TextMode>(initialMode);
  const savedPreferences = useQuery(devicePreferencesOptions(services.storage));
  const { preferences, update } = useReadingPreferences(savedPreferences.data?.reading);
  const client = useQueryClient();
  const source = activeSource(novel);
  const prefetch = useChapterPrefetch(client, novel, services, mode);
  const query = useQuery(readingChapterOptions(client, novel, chapter, services, number => { void prefetch.activate(number); }, mode));
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
  const [settingsVisible, setSettingsVisible] = useState(false);
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
  if (query.isPending) return <LoadingMessage message="Carregando capítulo…" background={theme?.background} textColor={theme?.text} />;
  return <View style={{ flex: 1, backgroundColor: theme?.background }}>
    {preferences.controlsVisible ? <>
      <View style={[styles.toolbar, { borderBottomColor: theme?.line }]}>
        <View style={styles.toolbarSide}>
          {onBack ? <Button title="Voltar" icon="arrow-left" iconOnly iconColor={theme?.text} variant="quiet" onPress={onBack} /> : null}
        </View>
        <ChapterJump chapter={chapter} total={total} available={available} onSelect={navigate} color={theme?.text} />
        <Button title="Personalização" icon="format-size" iconOnly iconColor={theme?.text} variant="quiet" onPress={() => setSettingsVisible(true)} />
      </View>
      <ProgressBar label="Progresso da leitura" current={fraction} total={1} />
    </> : null}
    {preferences.controlsVisible ? <OfflineNotice mode="reading" /> : null}
    {query.isError ? <ErrorMessage message={query.error instanceof Error ? query.error.message : 'Não foi possível carregar o capítulo.'} onRetry={() => { void query.refetch(); }} /> : null}
    {content ? <ScrollView ref={scroll} style={styles.body} testID="reading-scroll" onScroll={onScroll} scrollEventThrottle={16}
      onScrollBeginDrag={() => { dragging.current = true; if (releaseDrag.current !== undefined) clearTimeout(releaseDrag.current); }}
      onScrollEndDrag={() => { releaseDrag.current = setTimeout(() => { dragging.current = false; }, 150); }}
      contentContainerStyle={[styles.text, landscape && styles.landscapeText]} showsVerticalScrollIndicator={false}>
      <Pressable testID="reading-body-touch" accessibilityRole="button" accessibilityLabel={preferences.controlsVisible ? 'Ocultar controles' : 'Mostrar controles'} onPress={toggleControls}>
        <ChapterBody content={content} novelTitle={novel.title} chapter={chapter} preferences={preferences} />
      </Pressable>
    </ScrollView> : null}
    {preferences.controlsVisible && content ? <View style={[styles.footer, landscape && styles.landscapeFooter, { borderTopColor: theme?.line }]}>
      <Button title="Capítulo anterior" icon="skip-previous" iconSize={24} iconOnly iconColor={theme?.text} variant="quiet" disabled={!available(chapter - 1)} onPress={() => navigate(chapter - 1)} />
      {onListen ? <Button title="Ouvir capítulo" icon="headphones" iconSize={16} iconOnly style={styles.pill} variant="primary" onPress={() => mode === 'original' ? onListen(chapter, mode) : onListen(chapter)} /> : null}
      <Button title={preferences.autoScroll ? 'Parar rolagem automática' : 'Iniciar rolagem automática'} icon={preferences.autoScroll ? 'pause' : 'play'} iconSize={16} iconOnly style={styles.pill} variant="primary" onPress={() => update({ autoScroll: !preferences.autoScroll })} />
      <Button title="Próximo capítulo" icon="skip-next" iconSize={24} iconOnly iconColor={theme?.text} variant="quiet" disabled={!available(chapter + 1)} onPress={() => navigate(chapter + 1)} />
    </View> : null}
    <ReadingControls visible={settingsVisible} onClose={() => setSettingsVisible(false)} preferences={preferences} onChange={update}>
      <Text style={styles.settingsLabel}>Idioma do capítulo</Text>
      <TextModeChoice mode={mode} originalAvailable={source !== null && (connectivity !== 'offline' || client.getQueryData(keys.chapter(scope, sourceChapterUrl(source, chapter) ?? '', chapter, 'original')) !== undefined)} onChange={selected => { offset.current = 0; setFraction(0); scroll.current?.scrollTo({ y: 0, animated: false }); setMode(selected); }} />
    </ReadingControls>
  </View>;
}

const styles = StyleSheet.create({
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  toolbarSide: { width: 44 },
  settingsLabel: { color: '#CCCCCC', fontSize: 13 },
  pill: { width: 52, borderRadius: 20 },
  body: { flex: 1 },
  text: { paddingTop: 28, paddingBottom: 80 },
  landscapeText: { width: '100%', maxWidth: 760, alignSelf: 'center', paddingTop: 12, paddingBottom: 28 },
  landscapeFooter: { paddingVertical: 0 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 6, borderTopWidth: StyleSheet.hairlineWidth },
});
