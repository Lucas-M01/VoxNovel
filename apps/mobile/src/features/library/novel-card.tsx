import { Image, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import type { Novel } from '@core/api/schemas';
import { activeSource } from '@core/chapter-source';
import type { ReaderServices } from '@features/reader/reader-data';
import { Button } from '@ui/button';
import { ProgressBar } from '@ui/progress-bar';
import { presentation as styles } from '@ui/presentation';

type Props = { novel: Novel; services: ReaderServices; offline: boolean; onOpen: () => void; onRemove: () => void };
export function NovelCard({ novel, services, offline, onOpen, onRemove }: Props) {
  const source = activeSource(novel);
  const current = source?.current_chapter ?? novel.current_chapter;
  const total = source?.total_chapters ?? novel.total_chapters;
  const count = useQuery({ queryKey: ['library-offline', novel.id, ...novel.sources.map(item => item.id)], networkMode: 'always',
    queryFn: async () => (await Promise.all(novel.sources.map(item => services.storage.listChapters({ novelId: novel.id, sourceId: item.id })))).reduce((sum, chapters) => sum + chapters.length, 0) });
  return <View style={styles.card}>
    <View style={[styles.row, { alignItems: 'flex-start' }]}>
      {novel.image_url ? <Image source={{ uri: novel.image_url }} style={styles.cover} accessibilityLabel={`Capa de ${novel.title}`} /> : <View style={[styles.cover, { alignItems: 'center', justifyContent: 'center' }]}><Text style={styles.heading}>{novel.title.slice(0, 1)}</Text></View>}
      <View style={{ flex: 1, gap: 8 }}><Text style={styles.heading}>{novel.title}</Text><Text style={styles.subtitle}>{source?.provider ?? 'Sem fonte'}</Text><Text style={styles.text}>Capítulo {current}{total ? ` de ${total}` : ''}</Text>
        {count.data ? <Text style={styles.subtitle}>{count.data} {count.data === 1 ? 'capítulo' : 'capítulos'} offline</Text> : null}
      </View>
    </View>
    {total ? <ProgressBar current={current} total={total} label={`Progresso de ${novel.title}`} /> : null}
    <View style={styles.row}><Button title={`Abrir ${novel.title}`} onPress={onOpen} /><Button title={`Remover ${novel.title}`} disabled={offline} onPress={onRemove} /></View>
  </View>;
}
