import { useState } from 'react';
import { Button, Text, View } from 'react-native';
import { QueryClientProvider, useMutation } from '@tanstack/react-query';
import { novelSchema } from '@core/api/schemas';
import { createQueryClient } from '@core/queries';
import { createHttpResource } from '@core/http-resource';
import { localStorage } from '@core/local-storage';
import ReadingScreen from '@screens/reading-screen';
import SpeechScreen from '@screens/speech-screen';
import { nativeSpeech, speechSession } from '@core/native-speech';

const novel = novelSchema.parse({
  id: '11111111-1111-4111-8111-111111111111', title: 'Obra sintética', slug: 'synthetic', current_chapter: 1,
  image_url: null, total_chapters: 2, active_source_id: '22222222-2222-4222-8222-222222222222', updated_at: '2026-11-20T00:00:00Z',
  sources: [{ id: '22222222-2222-4222-8222-222222222222', novel_id: '11111111-1111-4111-8111-111111111111', provider: 'Synthetic', title: 'Obra sintética', url_base: 'https://example.org/', chapter_url_pattern: 'https://example.org/chapter-{cap}', current_chapter: 1, updated_at: '2026-11-20T00:00:00Z' }],
});
const scope = { novelId: novel.id, sourceId: novel.active_source_id ?? '' };
const request = createHttpResource({ baseUrl: () => 'https://synthetic.invalid', transport: async (_url, init) => {
  if (init.method === 'GET' && _url.endsWith('/settings')) return { ok: true, status: 200, text: async () => JSON.stringify({ speed: 1, updated_at: '2026-11-20T00:00:00Z' }) };
  if (init.method !== 'PATCH') throw new Error('No network is available in the synthetic harness');
  return { ok: true, status: 200, text: async () => JSON.stringify(novel) };
} });
const services = { request, storage: localStorage };
function Harness() {
  const [listen, setListen] = useState<number | null>(null);
  const prepare = useMutation({ mutationFn: async () => {
    for (const chapter of [1, 2]) await localStorage.saveChapter(scope, chapter,
      `Obra sintética - Capítulo ${chapter}: Leitura\n\n` + Array.from({ length: 30 }, (_, index) => `Parágrafo sintético ${index + 1}. Este texto local permite testar a apresentação e as preferências de leitura.\n— Este diálogo tem recuo ${index + 1}.`).join('\n'));
  } });
  if (prepare.isSuccess && listen !== null) return <View style={{ flex: 1 }}>
    <Button title="Voltar ao leitor sintético" onPress={() => setListen(null)} />
    <SpeechScreen novel={novel} initialChapter={listen} services={{ ...services, driver: nativeSpeech, session: speechSession }} />
  </View>;
  if (prepare.isSuccess) return <ReadingScreen novel={novel} services={services} onListen={setListen} />;
  return <View style={{ padding: 24 }}><Text accessibilityRole="header">Leitor sintético privado</Text>
    <Text>Texto local e progresso simulado. Fonte externa/tradução não são exercitadas por este harness.</Text>
    <Button title="Preparar e abrir leitor" disabled={prepare.isPending} onPress={() => prepare.mutate()} />
    {prepare.isError ? <Text>Não foi possível preparar os capítulos sintéticos.</Text> : null}
  </View>;
}
export default function ReaderHarness() {
  const [client] = useState(createQueryClient);
  return <QueryClientProvider client={client}><Harness /></QueryClientProvider>;
}
