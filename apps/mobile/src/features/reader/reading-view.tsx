import { useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { useMutationState, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Novel } from '@core/api/schemas';
import { activeSource } from '@core/chapter-source';
import { formatReadingText } from '@core/chapter-format';
import { themes, widths, useReadingPreferences } from '@core/reading-preferences';
import { readerServices, readingChapterOptions, readingKeys, type ReaderServices } from '@features/reader/reader-data';
import { ChapterBody } from '@features/reader/chapter-body';
import { ReadingControls } from '@features/reader/reading-controls';
import { OfflineNotice } from '@pattern/offline-notice';
import { ErrorMessage } from '@ui/error-message';

type Props = { novel: Novel; initialChapter?: number | undefined; services?: ReaderServices | undefined };
export function ReadingView({ novel, initialChapter, services = readerServices }: Props) {
  const [chapter] = useState(initialChapter ?? novel.current_chapter);
  const { preferences, update } = useReadingPreferences();
  const client = useQueryClient();
  const source = activeSource(novel);
  const query = useQuery(readingChapterOptions(client, novel, chapter, services));
  const progress = useMutationState({ filters: { mutationKey: readingKeys.progress(novel.id, source?.id ?? '', chapter) }, select: mutation => mutation.state.status });
  const content = query.data ? formatReadingText(query.data.text) : null;
  const theme = themes[preferences.themeIndex];
  return <View style={{ flex: 1, backgroundColor: theme?.background }}>
    <Text accessibilityRole="header" style={{ color: theme?.text }}>{novel.title}</Text>
    <Text style={{ color: theme?.text }}>Capítulo {chapter}</Text>
    <OfflineNotice mode="reading" />
    {query.isPending ? <ActivityIndicator accessibilityLabel="Carregando capítulo" /> : null}
    {query.isError ? <ErrorMessage message={query.error instanceof Error ? query.error.message : 'Não foi possível carregar o capítulo.'} onRetry={() => { void query.refetch(); }} /> : null}
    {progress.at(-1) === 'error' ? <Text style={{ color: theme?.text }}>Não foi possível salvar o progresso.</Text> : null}
    {content ? <ScrollView contentContainerStyle={{ paddingHorizontal: widths[preferences.widthIndex] ?? 0.9, paddingTop: 28, paddingBottom: 80 }} showsVerticalScrollIndicator={false}>
      <ChapterBody content={content} preferences={preferences} />
    </ScrollView> : null}
    <ReadingControls preferences={preferences} onChange={update} />
  </View>;
}
