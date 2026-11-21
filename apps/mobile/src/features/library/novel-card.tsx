import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import type { Novel } from '@core/api/schemas';
import { localChaptersOptions } from '@core/local-queries';
import { activeSource } from '@core/chapter-source';
import type { ReaderServices } from '@features/reader/reader-data';
import { ProgressBar } from '@ui/progress-bar';
import { colors } from '@ui/presentation';

type Props = { novel: Novel; landscape: boolean; services: ReaderServices; offline: boolean; onOpen: () => void; onRemove: () => void };
export function NovelCard({ novel, landscape, services, offline, onOpen, onRemove }: Props) {
  const source = activeSource(novel);
  const current = source?.current_chapter ?? novel.current_chapter;
  const total = source?.total_chapters ?? novel.total_chapters;
  const chapters = useQuery({
    ...localChaptersOptions({ novelId: novel.id, sourceId: source?.id ?? '' }, services.storage),
    enabled: source !== null,
  });
  const downloaded = chapters.data?.length ?? 0;
  const percent = total ? Math.min(100, Math.round(current / total * 100)) : null;

  const chapterLabel = `Cap. ${current}${total ? `/${total}` : ''}`;
  const offlineBadge = downloaded > 0 ? <View accessible accessibilityLabel={`${downloaded} ${downloaded === 1 ? 'capítulo' : 'capítulos'} offline`} style={[styles.offline, !landscape && styles.portraitOffline]}>
    <Text style={styles.offlineText}>↓ {downloaded}</Text>
  </View> : null;
  const progress = total ? <ProgressBar current={current} total={total} label={`Progresso de ${novel.title}`} /> : null;

  return <View style={[styles.cell, landscape && styles.landscapeCell]}>
    <View style={styles.card}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Abrir ${novel.title}`} onPress={onOpen} style={landscape && styles.landscapeCard}>
        <View style={[styles.cover, landscape && styles.landscapeCover]}>
          {novel.image_url
            ? <Image source={{ uri: novel.image_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            : <Text style={styles.placeholder}>📚</Text>}
          {!landscape ? <>
            {percent !== null ? <Text style={[styles.badge, styles.percent]}>{percent}%</Text> : null}
            <Text style={[styles.badge, styles.chapter]}>{chapterLabel}</Text>
            {offlineBadge}
            {progress ? <View style={styles.progress}>{progress}</View> : null}
          </> : null}
        </View>
        <View style={[styles.info, landscape && styles.landscapeInfo]}>
          <Text style={[styles.title, landscape && styles.landscapeTitle]} numberOfLines={2}>{novel.title}</Text>
          {source ? <Text style={[styles.provider, landscape && styles.landscapeMetadata]} numberOfLines={1}>{source.provider}</Text> : null}
          {landscape ? <>
            <View style={styles.landscapeStatus}>
              <Text style={styles.landscapeMetadata}>{chapterLabel}</Text>
              {offlineBadge}
            </View>
            {progress}
          </> : null}
        </View>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={`Remover ${novel.title}`} accessibilityState={{ disabled: offline }}
        disabled={offline} onPress={onRemove} hitSlop={8} style={[styles.remove, offline && styles.disabled]}>
        <Text style={styles.removeText}>×</Text>
      </Pressable>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  cell: { width: '50%', paddingHorizontal: 6 },
  landscapeCell: { width: '100%', marginBottom: 10 },
  landscapeCard: { flexDirection: 'row', alignItems: 'center', minHeight: 104 },
  landscapeCover: { width: 72, margin: 8, borderRadius: 6, overflow: 'hidden' },
  landscapeInfo: { flex: 1, paddingRight: 36, gap: 5 },
  landscapeTitle: { fontSize: 16, lineHeight: 21 },
  landscapeMetadata: { color: colors.muted, fontSize: 12 },
  landscapeStatus: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  card: { flex: 1, backgroundColor: colors.surface, borderRadius: 12, overflow: 'hidden' },
  cover: { aspectRatio: 1 / 1.45, backgroundColor: '#2A2A3E', alignItems: 'center', justifyContent: 'center' },
  placeholder: { fontSize: 40 },
  badge: { position: 'absolute', backgroundColor: '#000000BB', color: colors.text, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3, fontSize: 10, fontWeight: 'bold' },
  percent: { top: 8, left: 8 },
  chapter: { bottom: 7, right: 6 },
  portraitOffline: { position: 'absolute', bottom: 7, left: 6 },
  offline: { backgroundColor: '#0F1F12', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 },
  offlineText: { color: '#81C784', fontSize: 10, fontWeight: 'bold' },
  progress: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  info: { padding: 10, gap: 3 },
  title: { color: colors.text, fontSize: 13, lineHeight: 18, fontWeight: 'bold' },
  provider: { color: colors.muted, fontSize: 10 },
  remove: { position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: 11, backgroundColor: '#00000099', alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.55 },
  removeText: { color: colors.text, fontSize: 16, lineHeight: 19 },
});
